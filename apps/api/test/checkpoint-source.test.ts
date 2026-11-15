import { env, runInDurableObject } from 'cloudflare:test';
import { expect, it, vi } from 'vitest';
import { BoardDO } from '../src/board/board-do';
import type { BoardContext } from '../src/board/context';
import type { VerifiedCheckpointReporter } from '../src/auth/checkpoint-reporter';
import { parseCheckpointPolicy } from '../src/board/checkpoint-proposal';
import { admitCheckpointSourceCandidate, createCheckpointSourceTables, currentCheckpointSource, type CheckpointSource } from '../src/board/checkpoint-source';
import { withReporting } from './helpers/superwitness';
import { settleCheckpointCandidate, createProposedCheckpointTables, type CheckpointCandidateDeps } from '../src/board/checkpoint-candidate';
import { checkpointTransaction, commitCheckpointCompletion } from '../src/board/checkpoint-completion';
import corpus from './fixtures/checkpoint-settlement/cases.json';

let serial = 0;
const privateOnly = { privateTestOnly: true } as const;
const bytes = (source: CheckpointSource) => new TextEncoder().encode(JSON.stringify(source));
async function fixture(check: (board: BoardContext, source: CheckpointSource, actor: VerifiedCheckpointReporter) => Promise<void>) {
  const id = `brd_source${serial++}example`;
  await withReporting(() => runInDurableObject(env.BOARD_DO.get(env.BOARD_DO.idFromName(id)), async (board, state) => {
    if (!(board instanceof BoardDO)) throw new Error('expected BoardDO');
    const policy = parseCheckpointPolicy(new TextEncoder().encode(JSON.stringify(corpus.producerBaseline.policy)));
    await board.init({ id, tenantId: 'tnt_sourceexample', name: 'Source', stages: [{ key: 'test', name: 'Test', order: 0, ownerKind: 'capability', owner: 'code', checkpointPolicy: policy }] });
    const made = await board.createCard({ title: 'Work', ownerUserId: 'usr_example' });
    if (!made.ok) throw new Error(made.message);
    const claimed = await board.claim({ agentId: 'agt_example', capabilities: ['code'], checkpointProtocol: 'superpipeline.checkpoint-claim.v1' });
    if (!claimed.claimed) throw new Error('expected claimed');
    const context: BoardContext = Reflect.get(board, 'board');
    const baseline = corpus.producerBaseline.settlementRequest.checkpoint;
    const source: CheckpointSource = {
      binding: { ...baseline.binding, boardId: id, cardId: made.value.id, runId: claimed.runId, leaseEpoch: claimed.leaseEpoch },
      start: baseline.start, benchKey: made.value.id, benchId: baseline.checkpoint.benchId,
      requestId: baseline.checkpoint.requestId, sourceRequestSha256: baseline.sourceRequestSha256,
      workerContextSha256: '4'.repeat(64),
    };
    const actor: VerifiedCheckpointReporter = { kind: 'service', tenantId: 'tnt_sourceexample', principalId: policy.reporterPrincipalId, scopes: ['checkpoints:submit'], expiresAt: Date.now() + 60000 };
    createCheckpointSourceTables(state.storage.sql);
    try { await check(context, source, actor); }
    finally { await state.storage.deleteAlarm(); }
  }));
}
it('is disabled before parsing, authentication or storage access', () => fixture(async (board) => {
  await expect(admitCheckpointSourceCandidate(board, () => { throw new Error('must not authenticate'); }, new Uint8Array()))
    .rejects.toThrow('CHECKPOINT_SOURCE_DISABLED');
}));
it('binds actual pending claim once and reads saved facts independently of later report objects', () => fixture(async (board, source, actor) => {
  expect(() => currentCheckpointSource(board, source.binding.runId)).toThrow('CHECKPOINT_SOURCE_MISSING');
  const saved = await admitCheckpointSourceCandidate(board, () => actor, bytes(source), privateOnly);
  expect(await admitCheckpointSourceCandidate(board, () => actor, bytes(source), privateOnly)).toEqual(saved);
  const snapshot = currentCheckpointSource(board, source.binding.runId);
  expect(snapshot).toMatchObject({ binding: source.binding, start: source.start, sourceRequestSha256: source.sourceRequestSha256 });
  source.start = source.start.map((member) => ({ ...member, commit: 'a'.repeat(40) }));
  await expect(admitCheckpointSourceCandidate(board, () => actor, bytes(source), privateOnly)).rejects.toThrow('CHECKPOINT_SOURCE_CONFLICT');
  expect(currentCheckpointSource(board, source.binding.runId).start).toEqual(snapshot.start);
  expect(() => board.sql.exec('DELETE FROM proposed_checkpoint_sources')).toThrow('immutable checkpoint source');
  expect(() => board.sql.exec("UPDATE proposed_checkpoint_sources SET source_json='{}'" )).toThrow('immutable checkpoint source');
  expect(() => board.sql.exec('INSERT OR REPLACE INTO proposed_checkpoint_sources SELECT * FROM proposed_checkpoint_sources')).toThrow('immutable checkpoint source');
}));
it.each(['kind', 'tenant', 'principal', 'scope', 'expired', 'node', 'station', 'epoch', 'members', 'no-claim'] as const)('refuses changed %s without admitting source', (field) => fixture(async (board, source, actor) => {
  if (field === 'kind') Object.assign(actor, { kind: 'human' });
  if (field === 'tenant') actor.tenantId = 'tnt_foreign';
  if (field === 'principal') actor.principalId = 'prn_foreign';
  if (field === 'scope') actor.scopes = [];
  if (field === 'expired') actor.expiresAt = Date.now();
  if (field === 'node') source.binding.nodeId = 'node_foreign';
  if (field === 'station') source.binding.stationId = 'station_foreign';
  if (field === 'epoch') source.binding.leaseEpoch++;
  if (field === 'members') source.start = [];
  if (field === 'no-claim') source.binding.runId = 'run_missingclaim';
  await expect(admitCheckpointSourceCandidate(board, () => actor, bytes(source), privateOnly)).rejects.toThrow(/INVALID_CHECKPOINT|STALE_LEASE|NOT_CHECKPOINT_REPORTER/);
  expect(board.sql.exec('SELECT * FROM proposed_checkpoint_sources').toArray()).toHaveLength(0);
}));
it('ignored source insertion cannot acknowledge admission or mutate the working run', () => fixture(async (board, source, actor) => {
  const run = board.getRunRow(source.binding.runId);
  board.sql.exec('CREATE TRIGGER ignore_source BEFORE INSERT ON proposed_checkpoint_sources BEGIN SELECT RAISE(IGNORE); END');
  await expect(admitCheckpointSourceCandidate(board, () => actor, bytes(source), privateOnly)).rejects.toThrow('CHECKPOINT_SOURCE_NOT_SAVED');
  expect(board.getRunRow(source.binding.runId)).toEqual(run);
  expect(() => currentCheckpointSource(board, source.binding.runId)).toThrow('CHECKPOINT_SOURCE_MISSING');
}));
it.each(['capability', 'duplicate', 'oversized'] as const)('refuses %s input before admitting source', (field) => fixture(async (board, source, actor) => {
  let raw = JSON.stringify(source);
  if (field === 'capability') raw = raw.slice(0, -1) + ',"leaseToken":"synthetic-not-a-grant"}';
  if (field === 'duplicate') raw = raw.slice(0, -1) + ',"requestId":"conflicting"}';
  if (field === 'oversized') raw += ' '.repeat(65536);
  await expect(admitCheckpointSourceCandidate(board, () => actor, new TextEncoder().encode(raw), privateOnly)).rejects.toThrow('INVALID_CHECKPOINT');
  expect(board.sql.exec('SELECT * FROM proposed_checkpoint_sources').toArray()).toHaveLength(0);
}));
it.each(['policy', 'owner', 'expiry', 'scope', 'heartbeat'] as const)('rechecks %s after asynchronous source hashing', (field) => fixture(async (board, source, actor) => {
  const original = crypto.subtle.digest.bind(crypto.subtle);
  const hash = vi.spyOn(crypto.subtle, 'digest').mockImplementation(async (...args) => {
    const result = await original(...args);
    if (field === 'policy') board.sql.exec("UPDATE meta SET v='[]' WHERE k='stages'");
    if (field === 'owner') board.sql.exec("UPDATE cards SET delegate_agent_id='agt_foreign'");
    if (field === 'expiry') actor.expiresAt = Date.now();
    if (field === 'scope') actor.scopes = [];
    if (field === 'heartbeat') board.sql.exec('UPDATE runs SET last_heartbeat_ms=0');
    return result;
  });
  try {
    await expect(admitCheckpointSourceCandidate(board, () => actor, bytes(source), privateOnly)).rejects.toThrow(/INVALID_CHECKPOINT|STALE_LEASE|NOT_CHECKPOINT_REPORTER/);
    expect(board.sql.exec('SELECT * FROM proposed_checkpoint_sources').toArray()).toHaveLength(0);
  } finally { hash.mockRestore(); }
}));
it('real Board completion joins stored source and refuses a relabeled request', () => fixture(async (board, source, actor) => {
  await admitCheckpointSourceCandidate(board, () => actor, bytes(source), privateOnly);
  createProposedCheckpointTables(board.sql);
  const submission = structuredClone(corpus.producerBaseline.settlementRequest);
  submission.checkpoint.binding = source.binding;
  submission.checkpoint.start = source.start;
  submission.checkpoint.checkpoint.key = source.benchKey;
  submission.checkpoint.checkpoint.members[0].branch = `card/${source.binding.cardId}`;
  // This integration checks Board storage/completion, not a real service fence.
  // Actual Hub validation of authenticated node Completion is required before enablement.
  const deps: CheckpointCandidateDeps = {
    sql: board.sql, nowMs: () => board.nowMs(), reporter: () => actor,
    current: () => currentCheckpointSource(board, source.binding.runId),
    transaction: (commit) => checkpointTransaction(board, commit),
    commit: (input) => commitCheckpointCompletion(board, input, { tenantId: 'tnt_sourceexample', forgeHost: 'forge.example.test', reporterPrincipalId: actor.principalId }),
  };
  submission.checkpoint.sourceRequestSha256 = 'a'.repeat(64);
  await expect(settleCheckpointCandidate(deps, new TextEncoder().encode(JSON.stringify(submission)), privateOnly)).rejects.toThrow('INVALID_CHECKPOINT');
  expect(board.getRunRow(source.binding.runId)?.status).toBe('working');
  submission.checkpoint.sourceRequestSha256 = source.sourceRequestSha256;
  const saved = await settleCheckpointCandidate(deps, new TextEncoder().encode(JSON.stringify(submission)), privateOnly);
  expect(board.getRunRow(source.binding.runId)?.status).toBe('ended');
  expect(await settleCheckpointCandidate(deps, new TextEncoder().encode(JSON.stringify(submission)), privateOnly)).toEqual(saved);
}));
