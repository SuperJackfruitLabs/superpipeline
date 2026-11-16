import { parseCheckpointJSON, parseStageEnvelopeJSON } from '../src/board/checkpoint-json';
import { changedCheckpointStages } from '../src/board/checkpoint-policy-admin';
import { stageWriteInput } from '../src/routes/boards/checkpoint-policy-input';
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
async function send(path: string, body: unknown, options: { method?: string; enabled?: boolean; role?: string; kind?: string; subject?: string; raw?: string } = {}) {
  const token = await planeToken({ orgRole: options.role ?? 'owner', principalKind: options.kind ?? 'human',
    ...(options.subject ? { sub: options.subject } : {}), scope: options.kind === 'agent' ? 'compose' : '' });
  const request = new Request('https://api.test' + path, { method: options.method ?? 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: options.raw ?? JSON.stringify(body) });
  const match = path.match(/^\/v1\/boards(?:\/([^/]+)(?:\/(.*))?)?$/);
  if (!match) throw new Error('bad route fixture');
  return boards({ request, path, url: new URL(request.url), env: planeEnv({ PROPOSED_CHECKPOINT_POLICY: options.enabled ? 'true' : undefined }) }, match);
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
    await expect(board.init({ id, tenantId: tenant, name: 'RPC off', stages: [stage] }, admin)).rejects.toThrow('checkpointPolicy is proposed and not enabled');
    expect((await board.getState()).boardId).toBeNull();
  });
  await enable(true);
  await onBoard(stub, async (board) => {
    await expect(board.init({ id, tenantId: tenant, name: 'RPC unprivileged', stages: [stage] })).rejects.toThrow('WORKSPACE_ADMIN_REQUIRED');
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
    const replacement = method === 'PATCH' ? { checkpointPolicy: { ...policy, reporterPrincipalId: 'prn_alternative' } } : { stages: [{ ...stage, checkpointPolicy: { ...policy, reporterPrincipalId: 'prn_alternative' } }] };
    expect((await send(path, replacement, { method, enabled: true, role: 'member' })).status).toBe(403);
    expect((await send(path, replacement, { method, enabled: true })).status).toBe(200);
    const removal = method === 'PATCH' ? { checkpointPolicy: null } : { stages: [plain] };
    expect((await send(path, removal, { method, enabled: true, role: 'member' })).status).toBe(403);
    expect((await send(path, removal, { method, enabled: true })).status).toBe(200);
  }
  await onBoard(stub, async (board) => { expect((await board.getState()).stages).toEqual([plain]); });
}));

it('refuses duplicate policy keys and oversized policy-bearing wire bytes while ordinary JSON remains compatible', () => fixture(async ({ enable }) => {
  await enable(true);
  const raw = JSON.stringify({ name: 'Lexical', stages: [stage] });
  const duplicate = raw.replace('"nodeId":', '"nodeId":"node_duplicate","nodeId":');
  expect((await send('/v1/boards', {}, { enabled: true, raw: duplicate })).status).toBe(400);
  const parentDuplicate = '{"name":"Duplicate parent","stages":[' + JSON.stringify(stage) + '],"stages":[' + JSON.stringify(plain) + ']}';
  expect((await send('/v1/boards', {}, { enabled: true, raw: parentDuplicate })).status).toBe(400);
  expect((await send('/v1/boards', { name: 'Bounded', stages: [stage], padding: 'x'.repeat(65536) }, { enabled: true })).status).toBe(400);
  expect((await send('/v1/boards', { name: 'Legacy', stages: [plain], padding: 'x'.repeat(65536) })).status).toBe(201);
}));
it('blocks policy change and removal for a live required run, preserving the original policy and events', () => fixture(async ({ enable, stub }) => {
  await enable(true);
  expect((await send('/v1/boards', { name: 'Required', stages: [stage] }, { enabled: true })).status).toBe(201);
  await onBoard(stub, async (board, state) => {
    await board.createCard({ title: 'Required work', ownerUserId: 'usr_fixture' });
    const claim = await board.claim({ agentId: 'agt_example', capabilities: ['code'], checkpointProtocol: 'superpipeline.checkpoint-claim.v1' });
    expect(claim.claimed).toBe(true);
    const before = state.storage.sql.exec('SELECT * FROM runs').toArray();
    const events = state.storage.sql.exec('SELECT COUNT(*) AS n FROM events').one().n;
    for (const checkpointPolicy of [null, { ...policy, allowUnchanged: !policy.allowUnchanged }]) {
      expect(await board.updateStage('code', { checkpointPolicy }, admin)).toMatchObject({ ok: false, code: 'STAGE_NOT_EMPTY' });
    }
    expect(await board.setStages([plain], admin)).toMatchObject({ ok: false, code: 'STAGE_NOT_EMPTY' });
    expect(state.storage.sql.exec('SELECT * FROM runs').toArray()).toEqual(before);
    expect(state.storage.sql.exec('SELECT COUNT(*) AS n FROM events').one().n).toBe(events);
    expect((await board.getState()).stages[0]?.checkpointPolicy).toEqual(policy);
  });
}));
it('independently validates direct initialization and refuses removal after its private gate is disabled', () => fixture(async ({ id, tenant, stub, enable }) => {
  await enable(true);
  await onBoard(stub, async (board) => {
    await expect(board.init({ id, tenantId: tenant, name: 'Malformed RPC', stages: [{ ...stage, checkpointPolicy: { ...policy, checkpointRepository: 'foreign' } }] }, admin)).rejects.toThrow('checkpointPolicy is invalid');
    expect((await board.getState()).boardId).toBeNull();
    await board.init({ id, tenantId: tenant, name: 'Valid RPC', stages: [stage] }, admin);
  });
  await enable(false);
  await onBoard(stub, async (board) => {
    expect(await board.updateStage('code', { checkpointPolicy: null }, admin)).toMatchObject({ ok: false, code: 'INVALID_STAGES' });
    expect(await board.setStages([plain], admin)).toMatchObject({ ok: false, code: 'INVALID_STAGES' });
    expect((await board.getState()).stages[0]?.checkpointPolicy).toEqual(policy);
  });
}));

it('cancels an oversized private write stream at the actual byte bound without buffering text or trusting content-length', async () => {
  let pulls = 0, cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) { pulls++; controller.enqueue(new Uint8Array(pulls === 1 ? 65536 : 1).fill(32)); },
    cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  const request = new Request('https://api.test/v1/boards', { method: 'POST', headers: { 'content-length': '1' }, body });
  const text = vi.spyOn(request, 'text');
  await expect(stageWriteInput(request, true)).rejects.toThrow('64 KiB');
  expect(pulls).toBe(2); expect(cancelled).toBe(true); expect(body.locked).toBe(false);
  expect(text).not.toHaveBeenCalled();
});

it('compares absence without admitting null into the strict canonicalizer and ignores policy property ordering', () => {
  expect(changedCheckpointStages([], [plain])).toEqual([]);
  expect(changedCheckpointStages([plain], [])).toEqual([]);
  expect(changedCheckpointStages([plain], [stage])).toEqual(['code']);
  expect(changedCheckpointStages([stage], [plain])).toEqual(['code']);
  const reordered = parseCheckpointPolicy(new TextEncoder().encode(JSON.stringify(Object.fromEntries(Object.entries(policy).toReversed()))));
  expect(changedCheckpointStages([stage], [{ ...stage, checkpointPolicy: reordered }])).toEqual([]);
});

it('preserves nullable ordinary stage patches without widening checkpoint protocol JSON', () => fixture(async ({ id, enable, stub }) => {
  await enable(true);
  expect((await send('/v1/boards', { name: 'Nullable', stages: [{ ...plain, order: -0.5, instructions: 'Remove me' }] }, { enabled: true })).status).toBe(201);
  expect((await send(`/v1/boards/${id}/stages/code`, { instructions: null }, { method: 'PATCH', enabled: true })).status).toBe(200);
  await onBoard(stub, async (board) => {
    const current = (await board.getState()).stages[0];
    expect(current.instructions).toBeUndefined(); expect(current.order).toBe(-0.5);
  });
  expect(() => parseCheckpointJSON(new TextEncoder().encode('{"instructions":null}'))).toThrow('INVALID_CHECKPOINT');
}));

const stageBytes = (text: string) => new TextEncoder().encode(text);
it('keeps the general stage envelope lexically strict while retaining JSON scalar grammar', () => {
  expect(parseStageEnvelopeJSON(stageBytes('{"instructions":null,"order":-0.5,"extra":1e2}'))).toEqual({ instructions: null, order: -0.5, extra: 100 });
  for (const raw of [stageBytes('{"stages":[],"stages":[]}'), stageBytes('{"instructions":"\\ud800"}'), new Uint8Array([123, 34, 120, 34, 58, 34, 255, 34, 125])])
    expect(() => parseStageEnvelopeJSON(raw)).toThrow('INVALID_STAGE_WRITE');
  expect(() => parseCheckpointJSON(stageBytes('{"order":-0.5}'))).toThrow('INVALID_CHECKPOINT');
});
