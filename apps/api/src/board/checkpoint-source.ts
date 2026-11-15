/** Private bind-once source admission. No HTTP/RPC route enables this candidate. */
import { Validator, type Schema } from '@cfworker/json-schema';
import type { VerifiedCheckpointReporter } from '../auth/checkpoint-reporter';
import type { BoardContext } from './context';
import { readCheckpointClaim, type PendingCheckpointClaim } from './checkpoint-claims';
import { canonicalCheckpoint, checkpointDigest, parseCheckpointJSON } from './checkpoint-json';
import type { CheckpointClaimSnapshot } from './checkpoint-candidate';
import type { CheckpointReport } from './checkpoint-proposal';
import reportSchema from './checkpoint-contract/run-checkpoint.v1.json';
import { HEARTBEAT_TIMEOUT_MS } from './rules';

export interface CheckpointSource {
  binding: CheckpointReport['binding'];
  start: CheckpointReport['start'];
  benchKey: string;
  benchId: string;
  requestId: string;
  sourceRequestSha256: string;
  workerContextSha256: string;
}
export interface CheckpointSourceReceipt {
  runId: string;
  leaseEpoch: number;
  sourceDigest: string;
  admittedAt: number;
}
type SourceBoard = Pick<BoardContext, 'sql' | 'ctx' | 'getMeta' | 'getRunRow' | 'getCardRow' | 'stages' | 'nowMs'>;
const shape: unknown = {
  type: 'object', additionalProperties: false,
  required: ['binding', 'start', 'benchKey', 'benchId', 'requestId', 'sourceRequestSha256', 'workerContextSha256'],
  properties: {
    binding: reportSchema.properties.binding, start: reportSchema.properties.start,
    benchKey: reportSchema.properties.checkpoint.properties.key,
    benchId: reportSchema.properties.checkpoint.properties.benchId,
    requestId: reportSchema.properties.checkpoint.properties.requestId,
    sourceRequestSha256: reportSchema.properties.sourceRequestSha256,
    workerContextSha256: reportSchema.properties.sourceRequestSha256,
  },
};
function pinned(value: unknown): value is Schema { return typeof value === 'object' && value !== null; }
if (!pinned(shape)) throw new Error('invalid private source schema');
const validator = new Validator(shape, '2020-12', false);
function isSource(value: unknown): value is CheckpointSource { return validator.validate(value).valid; }
function parseSource(raw: Uint8Array): CheckpointSource {
  const source = parseCheckpointJSON(raw);
  if (!isSource(source)) throw new Error('INVALID_CHECKPOINT_SOURCE');
  return source;
}
export function createCheckpointSourceTables(sql: SqlStorage): void {
  sql.exec('CREATE TABLE IF NOT EXISTS proposed_checkpoint_sources (run_id TEXT PRIMARY KEY, epoch INTEGER NOT NULL, bench_id TEXT NOT NULL, source_request TEXT NOT NULL, reporter_id TEXT NOT NULL, source_json TEXT NOT NULL, source_digest TEXT NOT NULL, admitted_at INTEGER NOT NULL, UNIQUE(bench_id,source_request))');
  sql.exec("CREATE TRIGGER IF NOT EXISTS checkpoint_source_no_update BEFORE UPDATE ON proposed_checkpoint_sources BEGIN SELECT RAISE(ABORT,'immutable checkpoint source'); END");
  sql.exec("CREATE TRIGGER IF NOT EXISTS checkpoint_source_no_delete BEFORE DELETE ON proposed_checkpoint_sources BEGIN SELECT RAISE(ABORT,'immutable checkpoint source'); END");
  sql.exec("CREATE TRIGGER IF NOT EXISTS checkpoint_source_no_replace BEFORE INSERT ON proposed_checkpoint_sources WHEN EXISTS (SELECT 1 FROM proposed_checkpoint_sources WHERE run_id=NEW.run_id OR (bench_id=NEW.bench_id AND source_request=NEW.source_request)) BEGIN SELECT RAISE(ABORT,'immutable checkpoint source'); END");
}
interface StoredSource {
  source: CheckpointSource;
  receipt: CheckpointSourceReceipt;
  reporterId: string;
}
function stored(sql: SqlStorage, runId: string): StoredSource | null {
  const rows = sql.exec('SELECT * FROM proposed_checkpoint_sources WHERE run_id=?', runId).toArray();
  if (!rows.length) return null;
  const row = rows[0];
  const keys = ['admitted_at', 'bench_id', 'epoch', 'reporter_id', 'run_id', 'source_digest', 'source_json', 'source_request'];
  if (rows.length !== 1 || !row || canonicalCheckpoint(Object.keys(row).toSorted()) !== canonicalCheckpoint(keys) || typeof row.source_json !== 'string' ||
    typeof row.source_digest !== 'string' || !/^[a-f0-9]{64}$/.test(row.source_digest) ||
    typeof row.reporter_id !== 'string' || typeof row.admitted_at !== 'number' ||
    !Number.isSafeInteger(row.admitted_at) || row.admitted_at < 0
  ) throw new Error('INVALID_CHECKPOINT_SOURCE');
  const source = parseSource(new TextEncoder().encode(row.source_json));
  if (canonicalCheckpoint(source) !== row.source_json || source.binding.runId !== row.run_id ||
    source.binding.leaseEpoch !== row.epoch || source.benchId !== row.bench_id || source.requestId !== row.source_request
  ) throw new Error('INVALID_CHECKPOINT_SOURCE');
  return {
    source, reporterId: row.reporter_id,
    receipt: { runId: source.binding.runId, leaseEpoch: source.binding.leaseEpoch, sourceDigest: row.source_digest, admittedAt: row.admitted_at },
  };
}
function claim(board: SourceBoard, source: CheckpointSource): PendingCheckpointClaim {
  const pending = readCheckpointClaim(board.sql, source.binding.runId);
  const b = source.binding;
  if (!pending || pending.boardId !== b.boardId || pending.cardId !== b.cardId ||
    pending.runId !== b.runId || pending.leaseEpoch !== b.leaseEpoch || pending.agentId !== b.agentId ||
    pending.stageKey !== b.stageKey || board.getMeta('tenantId') !== pending.tenantId ||
    board.getMeta('boardId') !== pending.boardId || pending.policy.nodeId !== b.nodeId ||
    !pending.policy.executors.some((e) => e.agentId === b.agentId && e.stationId === b.stationId) ||
    source.start.length !== pending.policy.repositories.length || source.start.some((m, i) => m.name !== pending.policy.repositories[i]?.name) ||
    canonicalCheckpoint(board.stages().find((stage) => stage.key === pending.stageKey)?.checkpointPolicy) !== canonicalCheckpoint(pending.policy)
  ) throw new Error('INVALID_CHECKPOINT_SOURCE');
  return pending;
}
function checkedNow(board: SourceBoard): number {
  const now = board.nowMs();
  if (!Number.isSafeInteger(now) || now < 0) throw new Error('INVALID_CHECKPOINT_SOURCE');
  return now;
}
function reporter(board: SourceBoard, actor: VerifiedCheckpointReporter, pending: PendingCheckpointClaim): void {
  if (actor.kind !== 'service' || actor.tenantId !== pending.tenantId ||
    actor.principalId !== pending.policy.reporterPrincipalId || !actor.scopes.includes('checkpoints:submit') ||
    !Number.isSafeInteger(actor.expiresAt) || actor.expiresAt <= checkedNow(board)
  ) throw new Error('NOT_CHECKPOINT_REPORTER');
}
function current(board: SourceBoard, source: CheckpointSource, pending: PendingCheckpointClaim): CheckpointClaimSnapshot {
  const b = source.binding;
  const run = board.getRunRow(b.runId);
  const card = board.getCardRow(b.cardId);
  if (!run || !card || run.card_id !== b.cardId || run.agent_id !== b.agentId || run.stage_key !== b.stageKey ||
    run.lease_epoch !== b.leaseEpoch || typeof run.status !== 'string' || typeof run.last_heartbeat_ms !== 'number'
  ) throw new Error('STALE_LEASE');
  // Historical exact replay may read an ended run; first settlement still calls
  // current()'s heartbeat/status gate. Active work must retain the real card owner.
  if (run.status === 'working' && (card.current_run_id !== b.runId || card.claim_seq !== b.leaseEpoch ||
    card.current_stage_key !== b.stageKey || card.delegate_agent_id !== b.agentId || card.state !== 'working'
  )) throw new Error('STALE_LEASE');
  return {
    tenantId: pending.tenantId, policy: pending.policy, policyDigest: pending.policyDigest,
    binding: source.binding, start: source.start, benchKey: source.benchKey, benchId: source.benchId,
    requestId: source.requestId, sourceRequestSha256: source.sourceRequestSha256,
    workerContextSha256: source.workerContextSha256,
    status: run.status, lastHeartbeatMs: run.last_heartbeat_ms,
  };
}
function active(board: SourceBoard, snapshot: CheckpointClaimSnapshot): void {
  const now = checkedNow(board);
  if (snapshot.status !== 'working' || !Number.isSafeInteger(snapshot.lastHeartbeatMs) ||
    snapshot.lastHeartbeatMs < 0 || snapshot.lastHeartbeatMs > now || now - snapshot.lastHeartbeatMs >= HEARTBEAT_TIMEOUT_MS
  ) throw new Error('STALE_LEASE');
}

/** Call only after the trusted coordinator has observed preparation/checkpoint
 * and before it dispatches the pinned worker. This captures a plan, not launch,
 * fence, release or cryptographic attestation. No capabilities are stored here.
 */
export async function admitCheckpointSourceCandidate(
  board: SourceBoard, authenticated: () => VerifiedCheckpointReporter, raw: Uint8Array,
  options?: { privateTestOnly: true },
): Promise<CheckpointSourceReceipt> {
  if (!options?.privateTestOnly) throw new Error('CHECKPOINT_SOURCE_DISABLED');
  const source = parseSource(raw);
  const pending = claim(board, source);
  reporter(board, authenticated(), pending);
  active(board, current(board, source, pending));
  const digest = await checkpointDigest(source);
  if (await checkpointDigest(pending.policy) !== pending.policyDigest) throw new Error('INVALID_CHECKPOINT_SOURCE');
  return board.ctx.storage.transactionSync(() => {
    const latest = claim(board, source);
    if (canonicalCheckpoint(latest) !== canonicalCheckpoint(pending)) throw new Error('STALE_LEASE');
    const actor = authenticated();
    reporter(board, actor, latest);
    active(board, current(board, source, latest));
    const prior = stored(board.sql, source.binding.runId);
    if (prior) {
      if (prior.receipt.sourceDigest !== digest || prior.reporterId !== actor.principalId ||
        canonicalCheckpoint(prior.source) !== canonicalCheckpoint(source)
      ) throw new Error('CHECKPOINT_SOURCE_CONFLICT');
      return prior.receipt;
    }
    board.sql.exec('INSERT INTO proposed_checkpoint_sources VALUES (?,?,?,?,?,?,?,?)',
      source.binding.runId, source.binding.leaseEpoch, source.benchId, source.requestId,
      actor.principalId, canonicalCheckpoint(source), digest, checkedNow(board));
    const saved = stored(board.sql, source.binding.runId);
    if (!saved || saved.receipt.sourceDigest !== digest || saved.reporterId !== actor.principalId ||
      canonicalCheckpoint(saved.source) !== canonicalCheckpoint(source)
    ) throw new Error('CHECKPOINT_SOURCE_NOT_SAVED');
    return saved.receipt;
  });
}

/** Actual stored source plus current Board SQL, never fields from a submitted report. */
export function currentCheckpointSource(board: SourceBoard, runId: string): CheckpointClaimSnapshot {
  const saved = stored(board.sql, runId);
  if (!saved) throw new Error('CHECKPOINT_SOURCE_MISSING');
  const pending = claim(board, saved.source);
  if (saved.reporterId !== pending.policy.reporterPrincipalId) throw new Error('NOT_CHECKPOINT_REPORTER');
  return current(board, saved.source, pending);
}
