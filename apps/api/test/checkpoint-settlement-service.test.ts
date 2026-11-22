import { initPrivateCheckpointBoard } from './helpers/checkpoint-policy';
import { env, runInDurableObject } from 'cloudflare:test';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { BoardDO } from '../src/board/board-do';
import type { BoardContext } from '../src/board/context';
import { boards } from '../src/routes/boards/entry';
import { ensureOrgTenant } from '../src/auth/org-tenancy';
import { checkpointDigest } from '../src/board/checkpoint-json';
import { parseCheckpointPolicy } from '../src/board/checkpoint-proposal';
import corpus from './fixtures/checkpoint-settlement/cases.json';
import { setupCatalog } from './helpers/catalog';
import { withReporting, trackBoard, quietBoards } from './helpers/superwitness';
import { withOrgPlane, planeEnv, planeToken, SERVICE, ORG, OTHER_ORG } from './helpers/org-plane';

beforeAll(setupCatalog);
afterEach(quietBoards);
let serial = 0;
async function token(scope = 'checkpoints:submit', sub = SERVICE, org = ORG) {
  return planeToken({ sub, org, principalKind: 'service', scope });
}
async function send(path: string, auth: string, method = 'POST', body = '{}') {
  const request = new Request(`https://api.test${path}`, { method,
    headers: { authorization: `Bearer ${auth}` }, ...(method === 'POST' ? { body } : {}),
  });
  const match = path.match(/^\/v1\/boards\/([^/]+)\/(.*)$/);
  if (!match) throw new Error('invalid fixture path');
  return boards({ request, path, url: new URL(request.url),
    env: planeEnv({ PROPOSED_CHECKPOINT_SOURCE: 'true', PROPOSED_CHECKPOINT_SETTLEMENT: 'true' }),
  }, match);
}
async function fixture(check: (f: {
  path: string; readPath: string; raw: string; runId: string;
  inspect: <T>(fn: (b: BoardDO, c: BoardContext, state: DurableObjectState) => T | Promise<T>) => Promise<T>;
}) => Promise<void>) {
  return withReporting(() => withOrgPlane(async () => {
    const tenantId = await ensureOrgTenant(env.DB, ORG);
    await env.DB.prepare('UPDATE tenants SET forge_host=? WHERE id=?').bind('forge.example.test', tenantId).run();
    const id = `brd_settlementrouting${serial++}`;
    const stub = trackBoard(env.BOARD_DO.get(env.BOARD_DO.idFromName(`${tenantId}:${id}`)));
    const inspect = <T>(fn: (b: BoardDO, c: BoardContext, state: DurableObjectState) => T | Promise<T>) =>
      runInDurableObject(stub, async (board, state) => {
        if (!(board instanceof BoardDO)) throw new Error('expected BoardDO');
        const context: BoardContext = Reflect.get(board, 'board');
        return fn(board, context, state);
      });
    const prepared = await inspect(async (board, context) => {
      context.env.PROPOSED_CHECKPOINT_SOURCE = 'true';
      context.env.PROPOSED_CHECKPOINT_SETTLEMENT = 'true';
      const policy = parseCheckpointPolicy(new TextEncoder().encode(JSON.stringify({
        ...corpus.producerBaseline.policy, reporterPrincipalId: SERVICE,
      })));
      await initPrivateCheckpointBoard(board, { id, tenantId, name: 'Settlement', stages: [
        { key: 'test', name: 'Test', order: 0, ownerKind: 'capability', owner: 'code', checkpointPolicy: policy },
        { key: 'review', name: 'Review', order: 1, ownerKind: 'human' },
      ] });
      const card = await board.createCard({ title: 'Work', ownerUserId: 'usr_example' });
      if (!card.ok) throw new Error(card.message);
      const claim = await board.claim({ agentId: 'agt_example', capabilities: ['code'], checkpointProtocol: 'superpipeline.checkpoint-claim.v1' });
      if (!claim.claimed) throw new Error('expected claim');
      const body = structuredClone(corpus.producerBaseline.settlementRequest);
      body.checkpoint.policyDigest = await checkpointDigest(policy);
      body.checkpoint.binding = { ...body.checkpoint.binding, boardId: id, cardId: card.value.id,
        runId: claim.runId, leaseEpoch: claim.leaseEpoch };
      body.checkpoint.checkpoint.key = card.value.id;
      for (const member of body.checkpoint.checkpoint.members) member.branch = `card/${card.value.id}`;
      return body;
    });
    const r = prepared.checkpoint;
    const prefix = `/v1/boards/${id}/runs/${r.binding.runId}`;
    const source = { binding: r.binding, start: r.start, benchKey: r.checkpoint.key,
      benchId: r.checkpoint.benchId, requestId: r.checkpoint.requestId,
      sourceRequestSha256: r.sourceRequestSha256, workerContextSha256: '4'.repeat(64) };
    expect((await send(`${prefix}/checkpoint-source`, await token(), 'POST', JSON.stringify(source))).status).toBe(200);
    try { await check({ path: `${prefix}/checkpoint-settlements`, readPath: `${prefix}/checkpoint`,
      raw: JSON.stringify(prepared), runId: r.binding.runId, inspect }); }
    finally { await inspect(async (_board, context, state) => {
      delete context.env.PROPOSED_CHECKPOINT_SOURCE;
      delete context.env.PROPOSED_CHECKPOINT_SETTLEMENT;
      await state.storage.deleteAlarm();
    }); }
  }));
}

it('settles through real issuer, tenant routing, admitted source and atomic completion, then reads/replays without dispatch', () => fixture(async (f) => {
  const auth = await token();
  expect((await send(f.readPath, await token('checkpoints:read'), 'GET')).status).toBe(404);
  const first = await send(f.path, auth, 'POST', f.raw);
  expect(first.status).toBe(200);
  const receipt: unknown = await first.json();
  expect(receipt).toMatchObject({ version: 'superpipeline.run-checkpoint-receipt.v1', reportedBy: SERVICE, runId: f.runId });
  await f.inspect((_board, context, state) => {
    expect(context.getRunRow(f.runId)).toMatchObject({ status: 'ended', outcome: 'completed' });
    expect(state.storage.sql.exec('SELECT * FROM run_reports').toArray()).toHaveLength(1);
    expect(state.storage.sql.exec('SELECT * FROM card_references').toArray()).toHaveLength(1);
  });
  expect(await (await send(f.readPath, await token('checkpoints:read'), 'GET')).json()).toEqual(receipt);
  expect(await (await send(f.path, auth, 'POST', f.raw)).json()).toEqual(receipt);
  await f.inspect((_board, _context, state) => {
    expect(state.storage.sql.exec('SELECT * FROM run_reports').toArray()).toHaveLength(1);
    expect(state.storage.sql.exec('SELECT * FROM proposed_checkpoint_receipts').toArray()).toHaveLength(1);
  });
}));

it('refuses wrong scopes, selected reporters, tenants and path/body substitution before creating receipt state', () => fixture(async (f) => {
  expect((await send(f.path, await token('checkpoints:read'), 'POST', f.raw)).status).toBe(403);
  expect((await send(f.readPath, await token(), 'GET')).status).toBe(403);
  expect((await send(f.path, await token('checkpoints:*'), 'POST', f.raw)).status).toBe(403);
  const foreign = await token('checkpoints:submit checkpoints:read', 'prn_ffffffffffffffffffff');
  expect((await send(f.path, foreign, 'POST', f.raw)).status).toBe(403);
  expect((await send(f.readPath, foreign, 'GET')).status).toBe(403);
  await ensureOrgTenant(env.DB, OTHER_ORG);
  expect((await send(f.path, await token('checkpoints:submit', SERVICE, OTHER_ORG), 'POST', f.raw)).status).toBe(404);
  const body: typeof corpus.producerBaseline.settlementRequest = JSON.parse(f.raw);
  body.checkpoint.binding.runId = 'run_another';
  expect((await send(f.path, await token(), 'POST', JSON.stringify(body))).status).toBe(400);
  await f.inspect((_board, _context, state) => {
    expect(state.storage.sql.exec("SELECT name FROM sqlite_master WHERE name='proposed_checkpoint_receipts'").toArray()).toEqual([]);
  });
}));

it('enforces independent Board default-off before touching caller bytes and leaves receipt schema absent', () => fixture(async (f) => {
  await f.inspect(async (board, context, state) => {
    delete context.env.PROPOSED_CHECKPOINT_SETTLEMENT;
    expect(await Reflect.apply(board.submitCheckpointSettlement.bind(board), board, [null, f.runId, null]))
      .toMatchObject({ ok: false, code: 'CHECKPOINT_SETTLEMENT_DISABLED' });
    expect(await Reflect.apply(board.readCheckpointReceipt.bind(board), board, [null, f.runId]))
      .toMatchObject({ ok: false, code: 'CHECKPOINT_SETTLEMENT_DISABLED' });
    expect(state.storage.sql.exec("SELECT name FROM sqlite_master WHERE name='proposed_checkpoint_receipts'").toArray()).toEqual([]);
  });
}));

it('rolls back the whole real completion when receipt insertion is ignored', () => fixture(async (f) => {
  // Inject the failure into the actual receipt table used by the service transaction.
  await f.inspect(async (_board, context, state) => {
    // Observe rollback independently of the ordinary reporter's concurrent retry alarm.
    // Keep every outbox column in the assertion; do not hide a settlement mutation.
    await state.storage.deleteAlarm();
    if (context.reportDrain) await context.reportDrain;
    await state.storage.deleteAlarm();
    const { createProposedCheckpointTables } = await import('../src/board/checkpoint-candidate');
    createProposedCheckpointTables(state.storage.sql);
    state.storage.sql.exec(`CREATE TRIGGER ignore_service_receipt BEFORE INSERT ON proposed_checkpoint_receipts BEGIN SELECT RAISE(IGNORE); END`);
  });
  const before = await f.inspect((_board, _context, state) => state.storage.sql.exec('SELECT * FROM run_reports').toArray());
  const response = await send(f.path, await token(), 'POST', f.raw);
  expect(response.status).toBe(500);
  expect(await response.json()).toMatchObject({ error: { code: 'CHECKPOINT_RECEIPT_NOT_SAVED', message: expect.any(String) } });
  await f.inspect((_board, context, state) => {
    expect(context.getRunRow(f.runId)?.status).toBe('working');
    expect(state.storage.sql.exec('SELECT * FROM card_references').toArray()).toEqual([]);
    expect(state.storage.sql.exec('SELECT * FROM run_reports').toArray()).toEqual(before);
    expect(state.storage.sql.exec('SELECT * FROM proposed_checkpoint_receipts').toArray()).toEqual([]);
  });
}));

it('bounds the actual settlement stream before receipt admission and accepts exactly 64 KiB', () => fixture(async (f) => {
  const exact = f.raw + ' '.repeat(65536 - new TextEncoder().encode(f.raw).byteLength);
  const auth = await token();
  const excess = await send(f.path, auth, 'POST', exact + ' ');
  expect(excess.status).toBe(413);
  expect(await excess.json()).toMatchObject({ error: { code: 'CHECKPOINT_SETTLEMENT_TOO_LARGE', message: expect.any(String) } });
  await f.inspect((_board, context, state) => {
    expect(context.getRunRow(f.runId)?.status).toBe('working');
    expect(state.storage.sql.exec("SELECT name FROM sqlite_master WHERE name='proposed_checkpoint_receipts'").toArray()).toEqual([]);
  });
  expect((await send(f.path, auth, 'POST', exact)).status).toBe(200);
}));

it('refuses expired issuer credentials and altered historical settlement without repeating completion', () => fixture(async (f) => {
  const expired = await planeToken({ sub: SERVICE, principalKind: 'service', scope: 'checkpoints:submit' }, { exp: '0s' });
  expect((await send(f.path, expired, 'POST', f.raw)).status).toBe(401);
  const auth = await token();
  expect((await send(f.path, auth, 'POST', f.raw)).status).toBe(200);
  const changed: typeof corpus.producerBaseline.settlementRequest = JSON.parse(f.raw);
  changed.handoff.test = 'Changed after settlement';
  expect((await send(f.path, auth, 'POST', JSON.stringify(changed))).status).toBe(409);
  await f.inspect((_board, _context, state) => {
    expect(state.storage.sql.exec('SELECT * FROM proposed_checkpoint_receipts').toArray()).toHaveLength(1);
  });
}));
