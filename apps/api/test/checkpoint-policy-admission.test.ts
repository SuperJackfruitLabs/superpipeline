import { env, runInDurableObject } from 'cloudflare:test';
import { beforeAll, expect, it, vi } from 'vitest';
import { BoardDO } from '../src/board/board-do';
import type { BoardContext } from '../src/board/context';
import { parseCheckpointPolicy } from '../src/board/checkpoint-proposal';
import { internalStageEditor } from '../src/board/model';
import { boards } from '../src/routes/boards/entry';
import { agentRegistry } from '../src/routes/agents';
import { ensureOrgTenant } from '../src/auth/org-tenancy';
import * as ids from '../src/ids';
import { setupCatalog } from './helpers/catalog';
import { withOrgPlane, planeEnv, planeToken, AGENT, ORG } from './helpers/org-plane';
import corpus from './fixtures/checkpoint-settlement/cases.json';
import wrangler from '../wrangler.jsonc?raw';

beforeAll(setupCatalog);
const policy = parseCheckpointPolicy(new TextEncoder().encode(JSON.stringify(corpus.producerBaseline.policy)));
const plain = { key: 'code', name: 'Code', order: 0, ownerKind: 'capability' as const, owner: 'code' };
const stage = { ...plain, checkpointPolicy: policy };
const admin = internalStageEditor('explicit private policy administration fixture');
let serial = 0;
async function onBoard(stub: DurableObjectStub, check: (board: BoardDO, state: DurableObjectState) => Promise<void>) {
  return runInDurableObject(stub, async (board, state) => {
    if (!(board instanceof BoardDO)) throw new Error('expected BoardDO');
    await check(board, state);
  });
}
async function fixture(check: (ctx: { id: string; tenant: string; stub: DurableObjectStub; enable: (value: boolean) => Promise<void> }) => Promise<void>) {
  return withOrgPlane(async () => {
    const tenant = await ensureOrgTenant(env.DB, ORG);
    const id = `brd_policyadmission${serial++}`;
    const stub = env.BOARD_DO.get(env.BOARD_DO.idFromName(`${tenant}:${id}`));
    const original = ids.newId;
    const mocked = vi.spyOn(ids, 'newId').mockImplementation((prefix) => prefix === 'brd' ? id : original(prefix));
    async function enable(value: boolean) {
      await onBoard(stub, async (board) => {
        const context: BoardContext = Reflect.get(board, 'board');
        if (value) Reflect.set(context.env, 'PROPOSED_CHECKPOINT_POLICY', 'true');
        else Reflect.deleteProperty(context.env, 'PROPOSED_CHECKPOINT_POLICY');
      });
    }
    try { await check({ id, tenant, stub, enable }); }
    finally {
      mocked.mockRestore(); await enable(false);
      await onBoard(stub, async (_board, state) => { await state.storage.deleteAlarm(); });
    }
  });
}
async function send(path: string, body: unknown, options: { method?: string; enabled?: boolean; role?: string; kind?: string; subject?: string } = {}) {
  const token = await planeToken({ orgRole: options.role ?? 'owner', principalKind: options.kind ?? 'human',
    ...(options.subject ? { sub: options.subject } : {}), scope: options.kind === 'agent' ? 'compose' : '' });
  const request = new Request('https://api.test' + path, { method: options.method ?? 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const match = path.match(/^\/v1\/boards(?:\/([^/]+)(?:\/(.*))?)?$/);
  if (!match) throw new Error('bad route fixture');
  return boards({ request, path, url: new URL(request.url), env: planeEnv(options.enabled ? { PROPOSED_CHECKPOINT_POLICY: 'true' } : {}) }, match);
}

it('keeps policy creation off by default without enabling production configuration', () => fixture(async ({ stub }) => {
  const response = await send('/v1/boards', { name: 'Off', stages: [stage] });
  expect(response.status).toBe(400);
  await onBoard(stub, async (board) => { expect((await board.getState()).boardId).toBeNull(); });
  expect(wrangler).not.toContain('PROPOSED_CHECKPOINT_POLICY');
}));
it('admits a signed workspace admin through the actual Worker and independently enabled Board', () => fixture(async ({ enable, stub }) => {
  await enable(true);
  const response = await send('/v1/boards', { name: 'Private', stages: [stage] }, { enabled: true });
  expect(response.status).toBe(201);
  await onBoard(stub, async (board) => { expect((await board.getState()).stages[0]?.checkpointPolicy).toEqual(policy); });
}));
it.each(['member', 'viewer'])('does not let a signed %s administer policy', (role) => fixture(async ({ enable }) => {
  await enable(true);
  expect((await send('/v1/boards', { name: 'Denied', stages: [stage] }, { enabled: true, role })).status).toBe(403);
}));
it('does not let an authenticated registered composing agent select its reporter', () => fixture(async ({ enable }) => {
  await enable(true);
  const request = new Request('https://api.test/v1/agents', { method: 'POST', headers: { authorization: `Bearer ${await planeToken({ orgRole: 'owner' })}` },
    body: JSON.stringify({ name: 'Policy agent', externalId: AGENT, capabilities: ['code'] }) });
  const match = '/v1/agents'.match(/^\/v1\/agents(?:\/([^/]+))?$/);
  if (!match) throw new Error('bad agent fixture');
  expect((await agentRegistry({ request, env: planeEnv(), path: '/v1/agents', url: new URL(request.url) }, match)).status).toBe(201);
  const response = await send('/v1/boards', { name: 'Agent policy', stages: [stage] }, { enabled: true, kind: 'agent', subject: AGENT });
  expect(response.status).toBe(403);
  expect(await response.json()).toMatchObject({ error: { code: 'WORKSPACE_ADMIN_REQUIRED' } });
}));
it.each([null, {}, { ...policy, extra: true }, { ...policy, checkpointRepository: 'foreign' },
  { ...policy, reporterPrincipalId: 'x'.repeat(65537) }])('refuses malformed policy %# without initializing a Board', (bad) => fixture(async ({ enable, stub }) => {
  await enable(true);
  expect((await send('/v1/boards', { name: 'Malformed', stages: [{ ...plain, checkpointPolicy: bad }] }, { enabled: true })).status).toBe(400);
  await onBoard(stub, async (board) => { expect((await board.getState()).boardId).toBeNull(); });
}));
it('independently refuses direct initialization when disabled or without policy administration authority', () => fixture(async ({ id, tenant, stub, enable }) => {
  await onBoard(stub, async (board) => {
    await expect(Reflect.apply(board.init, board, [{ id, tenantId: tenant, name: 'RPC off', stages: [stage] }, admin])).rejects.toThrow();
    expect((await board.getState()).boardId).toBeNull();
  });
  await enable(true);
  await onBoard(stub, async (board) => {
    await expect(board.init({ id, tenantId: tenant, name: 'RPC unprivileged', stages: [stage] })).rejects.toThrow();
    expect((await board.getState()).boardId).toBeNull();
  });
}));
it('blocks adding policy to an actual legacy working run without changing its claim', () => fixture(async ({ id, tenant, stub, enable }) => {
  await onBoard(stub, async (board) => {
    await board.init({ id, tenantId: tenant, name: 'Legacy', stages: [plain] });
    await board.createCard({ title: 'Active', ownerUserId: 'usr_fixture' });
    const claim = await board.claim({ agentId: 'agt_fixture', capabilities: ['code'] });
    expect(claim.claimed).toBe(true);
  });
  await enable(true);
  await onBoard(stub, async (board, state) => {
    const before = state.storage.sql.exec('SELECT * FROM runs').toArray();
    expect(await board.setStages([stage], admin)).toMatchObject({ ok: false, code: 'STAGE_NOT_EMPTY' });
    expect(await board.updateStage('code', { checkpointPolicy: policy }, admin)).toMatchObject({ ok: false, code: 'STAGE_NOT_EMPTY' });
    expect(state.storage.sql.exec('SELECT * FROM runs').toArray()).toEqual(before);
    expect((await board.getState()).stages).toEqual([plain]);
  });
}));
it('requires admin authority on add, replacement and removal through patch and whole-pipeline routes', () => fixture(async ({ id, enable, stub }) => {
  await enable(true);
  expect((await send('/v1/boards', { name: 'Admin edit', stages: [plain] })).status).toBe(201);
  for (const method of ['PATCH', 'PUT']) {
    const path = `/v1/boards/${id}/stages` + (method === 'PATCH' ? '/code' : '');
    const addition = method === 'PATCH' ? { checkpointPolicy: policy } : { stages: [stage] };
    expect((await send(path, addition, { method, enabled: true, role: 'member' })).status).toBe(403);
    expect((await send(path, addition, { method, enabled: true })).status).toBe(200);
    const removal = method === 'PATCH' ? { checkpointPolicy: null } : { stages: [plain] };
    expect((await send(path, removal, { method, enabled: true, role: 'member' })).status).toBe(403);
    expect((await send(path, removal, { method, enabled: true })).status).toBe(200);
  }
  await onBoard(stub, async (board) => { expect((await board.getState()).stages).toEqual([plain]); });
}));
