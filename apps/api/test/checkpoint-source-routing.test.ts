import { initPrivateCheckpointBoard } from './helpers/checkpoint-policy';
import { beforeAll, expect, it, vi } from 'vitest';
import wranglerJsonc from '../wrangler.jsonc?raw';
import { checkpointSource } from '../src/routes/boards/checkpoint-source';
import { env, runInDurableObject } from 'cloudflare:test';
import { BoardDO } from '../src/board/board-do';
import type { BoardContext } from '../src/board/context';
import type { CheckpointSource } from '../src/board/checkpoint-source';
import { parseCheckpointPolicy } from '../src/board/checkpoint-proposal';
import corpus from './fixtures/checkpoint-settlement/cases.json';
import { withReporting } from './helpers/superwitness';
import { ensureOrgTenant } from '../src/auth/org-tenancy';
import { boards } from '../src/routes/boards/entry';
import { setupCatalog } from './helpers/catalog';
import { withOrgPlane, planeEnv, planeToken, SERVICE, ORG, OTHER_ORG } from './helpers/org-plane';

beforeAll(setupCatalog);
const path = '/v1/boards/brd_example/runs/run_example/checkpoint-source';
async function signed(scope = 'checkpoints:submit', principalKind = 'service') {
  await ensureOrgTenant(env.DB, ORG);
  return planeToken({ sub: SERVICE, principalKind, scope });
}
async function send(token?: string, body = '{}', enabled = true, method = 'POST', routePath = path) {
  const request = new Request(`https://api.test${routePath}`, { method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    ...(method === 'POST' ? { body } : {}),
  });
  const match = routePath.match(/^\/v1\/boards\/([^/]+)\/(.*)$/);
  if (!match) throw new Error('bad fixture path');
  return boards({ request, path: routePath, url: new URL(request.url),
    env: planeEnv(enabled ? { PROPOSED_CHECKPOINT_SOURCE: 'true' } : {}),
  }, match);
}

it('keeps the proposed source endpoint disabled without explicit deployment configuration', () => withOrgPlane(async () => {
  const response = await send(await signed(), '{}', false);
  expect(response.status).toBe(404);
  expect(await response.json()).toMatchObject({ error: { code: 'CHECKPOINT_SOURCE_DISABLED', message: expect.any(String) } });
}));

it('requires an issuer-verified service and exact submit scope before reading the source body', () => withOrgPlane(async () => {
  expect((await send()).status).toBe(401);
  for (const kind of ['human', 'agent']) expect((await send(await signed('checkpoints:submit', kind))).status).toBe(401);
  for (const scope of ['checkpoints:read', 'checkpoints:*', 'run claim', ''])
    expect((await send(await signed(scope))).status).toBe(403);
}));

it('bounds actual source bytes independently of content-length before reaching a board', () => withOrgPlane(async () => {
  const response = await send(await signed(), ' '.repeat(65537));
  expect(response.status).toBe(413);
  expect(await response.json()).toMatchObject({ error: { code: 'CHECKPOINT_SOURCE_TOO_LARGE', message: expect.any(String) } });
}));

it('owns the source path for every method without falling back to agent or human dispatch', () => withOrgPlane(async () => {
  expect((await send(await signed(), '', true, 'DELETE')).status).toBe(405);
}));

it('does not consume denied request bodies or enable the proposal in deployment config', () => withOrgPlane(async () => {
  const request = new Request(`https://api.test${path}`, { method: 'POST', body: 'not JSON',
    headers: { authorization: `Bearer ${await signed('checkpoints:read')}` } });
  if (!request.body) throw new Error('expected body');
  const reader = vi.spyOn(request.body, 'getReader');
  try {
    expect((await checkpointSource(request, planeEnv({ PROPOSED_CHECKPOINT_SOURCE: 'true' }), 'brd_example', 'run_example')).status).toBe(403);
    expect(reader).not.toHaveBeenCalled();
  } finally { reader.mockRestore(); }
  const [production, environments] = wranglerJsonc.split('"env": {');
  expect(production).toContain('"PROPOSED_CHECKPOINT_SOURCE": "true"');
  expect(environments).not.toContain('PROPOSED_CHECKPOINT_SOURCE');
}));

let serial = 0;
async function fixture(check: (source: CheckpointSource, routePath: string, context: { tenantId: string }) => Promise<void>) {
  return withReporting(() => withOrgPlane(async () => {
    const tenantId = await ensureOrgTenant(env.DB, ORG);
    const id = `brd_sourcerouting${serial++}`;
    const stub = env.BOARD_DO.get(env.BOARD_DO.idFromName(`${tenantId}:${id}`));
    let previous: string | undefined;
    const source = await runInDurableObject(stub, async (board) => {
      if (!(board instanceof BoardDO)) throw new Error('expected BoardDO');
      const context: BoardContext = Reflect.get(board, 'board');
      previous = context.env.PROPOSED_CHECKPOINT_SOURCE;
      context.env.PROPOSED_CHECKPOINT_SOURCE = 'true';
      const policy = parseCheckpointPolicy(new TextEncoder().encode(JSON.stringify({
        ...corpus.producerBaseline.policy, reporterPrincipalId: SERVICE,
      })));
      await initPrivateCheckpointBoard(board, { id, tenantId, name: 'Source', stages: [{ key: 'test', name: 'Test', order: 0,
        ownerKind: 'capability', owner: 'code', checkpointPolicy: policy }] });
      const card = await board.createCard({ title: 'Work', ownerUserId: 'usr_example' });
      if (!card.ok) throw new Error(card.message);
      const claim = await board.claim({ agentId: 'agt_example', capabilities: ['code'], checkpointProtocol: 'superpipeline.checkpoint-claim.v1' });
      if (!claim.claimed) throw new Error('expected claim');
      const baseline = corpus.producerBaseline.settlementRequest.checkpoint;
      return { binding: { ...baseline.binding, boardId: id, cardId: card.value.id, runId: claim.runId, leaseEpoch: claim.leaseEpoch },
        start: baseline.start, benchKey: card.value.id, benchId: baseline.checkpoint.benchId,
        requestId: baseline.checkpoint.requestId, sourceRequestSha256: baseline.sourceRequestSha256,
        workerContextSha256: '4'.repeat(64) };
    });
    try { await check(source, `/v1/boards/${id}/runs/${source.binding.runId}/checkpoint-source`, { tenantId }); }
    finally {
      await runInDurableObject(stub, async (board, state) => {
        const context: BoardContext = Reflect.get(board, 'board');
        if (previous === undefined) delete context.env.PROPOSED_CHECKPOINT_SOURCE;
        else context.env.PROPOSED_CHECKPOINT_SOURCE = previous;
        await state.storage.deleteAlarm();
      });
    }
  }), {});
}

it('admits and reads the actual source through tenant-bound Board RPC with distinct scopes', () => fixture(async (source, routePath) => {
  const read = await signed('checkpoints:read');
  expect((await send(read, '', true, 'GET', routePath)).status).toBe(404);
  const token = await signed();
  const response = await send(token, JSON.stringify(source), true, 'POST', routePath);
  expect(response.status).toBe(200);
  const receipt: unknown = await response.json();
  expect(receipt).toMatchObject({ runId: source.binding.runId, leaseEpoch: source.binding.leaseEpoch,
    sourceDigest: expect.stringMatching(/^[a-f0-9]{64}$/) });
  expect(await (await send(token, JSON.stringify(source), true, 'POST', routePath)).json()).toEqual(receipt);
  expect((await send(token, '', true, 'GET', routePath)).status).toBe(403);
  const observation = await send(read, '', true, 'GET', routePath);
  expect(observation.status).toBe(200);
  expect(await observation.json()).toMatchObject({ binding: source.binding, start: source.start, status: 'working',
    sourceRequestSha256: source.sourceRequestSha256, workerContextSha256: source.workerContextSha256 });
}));

it('refuses foreign reporters, path/body run substitutions and changed source replay', () => fixture(async (source, routePath) => {
  const foreign = await planeToken({ sub: 'prn_ffffffffffffffffffff', principalKind: 'service', scope: 'checkpoints:submit checkpoints:read' });
  expect((await send(foreign, JSON.stringify(source), true, 'POST', routePath)).status).toBe(403);
  expect((await send(foreign, '', true, 'GET', routePath)).status).toBe(403);
  const token = await signed();
  expect((await send(token, JSON.stringify({ ...source, binding: { ...source.binding, runId: 'run_another' } }), true, 'POST', routePath)).status).toBe(400);
  expect((await send(token, JSON.stringify({ ...source, tenantId: 'tnt_bodyclaim' }), true, 'POST', routePath)).status).toBe(400);
  expect((await send(token, JSON.stringify(source), true, 'POST', routePath)).status).toBe(200);
  expect((await send(token, JSON.stringify({ ...source, workerContextSha256: 'a'.repeat(64) }), true, 'POST', routePath)).status).toBe(409);
}));

it('accepts exactly 64 KiB, refuses excess without admission, and derives tenant only from the token', () => fixture(async (source, routePath) => {
  const token = await signed();
  const raw = JSON.stringify(source);
  const exact = raw + ' '.repeat(65536 - new TextEncoder().encode(raw).byteLength);
  expect((await send(token, exact + ' ', true, 'POST', routePath)).status).toBe(413);
  expect((await send(await signed('checkpoints:read'), '', true, 'GET', routePath)).status).toBe(404);
  await ensureOrgTenant(env.DB, OTHER_ORG);
  const foreignTenant = await planeToken({ sub: SERVICE, org: OTHER_ORG, principalKind: 'service', scope: 'checkpoints:submit checkpoints:read' });
  expect((await send(foreignTenant, raw, true, 'POST', routePath)).status).toBe(404);
  expect((await send(foreignTenant, '', true, 'GET', routePath)).status).toBe(404);
  expect((await send(token, exact, true, 'POST', routePath)).status).toBe(200);
}));

it('enforces the disabled default inside the Board RPC before touching submitted actor or bytes', () => fixture(async (source, _routePath, { tenantId }) => {
  const stub = env.BOARD_DO.get(env.BOARD_DO.idFromName(`${tenantId}:${source.binding.boardId}`));
  await runInDurableObject(stub, async (board, state) => {
    if (!(board instanceof BoardDO)) throw new Error('expected BoardDO');
    const context: BoardContext = Reflect.get(board, 'board');
    delete context.env.PROPOSED_CHECKPOINT_SOURCE;
    try {
      expect(await Reflect.apply(board.admitCheckpointSource.bind(board), board, [null, source.binding.runId, null]))
        .toMatchObject({ ok: false, code: 'CHECKPOINT_SOURCE_DISABLED' });
      expect(await Reflect.apply(board.readCheckpointSource.bind(board), board, [null, source.binding.runId]))
        .toMatchObject({ ok: false, code: 'CHECKPOINT_SOURCE_DISABLED' });
      expect(state.storage.sql.exec("SELECT name FROM sqlite_master WHERE name='proposed_checkpoint_sources'").toArray()).toEqual([]);
    } finally { context.env.PROPOSED_CHECKPOINT_SOURCE = 'true'; }
  });
}));
