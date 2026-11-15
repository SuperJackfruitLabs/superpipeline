/** Private, default-disabled producer candidate. No HTTP/RPC entry imports it. */
import { HEARTBEAT_TIMEOUT_MS } from './rules';
import { canonicalCheckpoint, checkpointDigest } from './checkpoint-json';
import {
  parseCheckpointSubmission,
  type CheckpointPolicy,
  type CheckpointReport,
  type CheckpointSubmission,
} from './checkpoint-proposal';

export interface VerifiedCheckpointReporter {
  principalId: string;
  tenantId: string;
  kind: 'service';
  scopes: string[];
  /** Absolute milliseconds from issuer-verified claims, never request JSON. */
  expiresAt: number;
}
export interface CheckpointClaimSnapshot {
  tenantId: string;
  policy: CheckpointPolicy;
  policyDigest: string;
  binding: CheckpointReport['binding'];
  start: CheckpointReport['start'];
  benchKey: string;
  benchId: string;
  requestId: string;
  status: string;
  lastHeartbeatMs: number;
}
export interface ProposedCheckpointReceipt {
  version: 'superpipeline.run-checkpoint-receipt.v1';
  settlementId: string;
  requestDigest: string;
  reportDigest: string;
  reportedBy: string;
  runId: string;
  leaseEpoch: number;
  recordedAt: string;
  checkpoint: CheckpointReport['checkpoint'];
}
export interface CheckpointCandidateDeps {
  sql: SqlStorage;
  transaction<T>(fn: () => T): T;
  nowMs(): number;
  /** Re-read authoritative issuer context, policy, current run/card and stored claim snapshot. */
  reporter(): VerifiedCheckpointReporter;
  current(): CheckpointClaimSnapshot;
  /** Must inspect exact trusted service/worker evidence; booleans/hashes supplied by a harness are not proof. */
  verifySource(input: CheckpointSubmission): Promise<void>;
  /** Synchronous run/card/reference/outbox mutation, inside the SAME transaction. No awaits. */
  commit: (input: CheckpointSubmission, receipt: ProposedCheckpointReceipt) => undefined;
}
interface StoredReceipt extends Record<string, SqlStorageValue> {
  request_digest: string;
  reporter_id: string;
  receipt: string;
  run_id: string;
  epoch: number;
}
export function createProposedCheckpointTables(sql: SqlStorage): void {
  sql.exec(`CREATE TABLE IF NOT EXISTS proposed_checkpoint_receipts (
    settlement_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, epoch INTEGER NOT NULL,
    request_digest TEXT NOT NULL, report_digest TEXT NOT NULL, reporter_id TEXT NOT NULL,
    execution_id TEXT NOT NULL UNIQUE, bench_id TEXT NOT NULL, source_request TEXT NOT NULL,
    submission TEXT NOT NULL, receipt TEXT NOT NULL, UNIQUE(run_id, epoch), UNIQUE(bench_id, source_request))`);
}
function checkedNow(deps: CheckpointCandidateDeps): number {
  const now = deps.nowMs();
  if (!Number.isSafeInteger(now) || now < 0) throw new Error('INVALID_CHECKPOINT_STATE');
  return now;
}
// A runtime miswiring must roll back the synchronous transaction. This cannot
// cancel effects an invalid async callback schedules after it returns.
function requireSynchronousCommit(result: unknown): void {
  if (result !== undefined) throw new Error('ASYNC_CHECKPOINT_COMMIT');
}
function reporter(deps: CheckpointCandidateDeps, snapshot: CheckpointClaimSnapshot): VerifiedCheckpointReporter {
  const actor = deps.reporter();
  if (
    actor.kind !== 'service' ||
    actor.tenantId !== snapshot.tenantId ||
    actor.principalId !== snapshot.policy.reporterPrincipalId ||
    !actor.scopes.includes('checkpoints:submit') ||
    !Number.isSafeInteger(actor.expiresAt) ||
    actor.expiresAt <= checkedNow(deps)
  )
    throw new Error('NOT_CHECKPOINT_REPORTER');
  return actor;
}
function current(deps: CheckpointCandidateDeps, input: CheckpointSubmission, snapshot: CheckpointClaimSnapshot): void {
  const r = input.checkpoint;
  if (
    !Number.isSafeInteger(snapshot.lastHeartbeatMs) ||
    snapshot.lastHeartbeatMs < 0 ||
    snapshot.status !== 'working' ||
    checkedNow(deps) - snapshot.lastHeartbeatMs >= HEARTBEAT_TIMEOUT_MS ||
    canonicalCheckpoint(r.binding) !== canonicalCheckpoint(snapshot.binding) ||
    r.policyDigest !== snapshot.policyDigest ||
    canonicalCheckpoint(r.start) !== canonicalCheckpoint(snapshot.start)
  )
    throw new Error('STALE_LEASE');
  const p = snapshot.policy;
  if (
    p.nodeId !== r.binding.nodeId ||
    !p.executors.some((e) => e.agentId === r.binding.agentId && e.stationId === r.binding.stationId) ||
    (r.disposition === 'unchanged' && !p.allowUnchanged)
  )
    throw new Error('INVALID_CHECKPOINT');
  if (
    r.checkpoint.key !== snapshot.benchKey ||
    r.checkpoint.benchId !== snapshot.benchId ||
    r.checkpoint.requestId !== snapshot.requestId ||
    r.checkpoint.checkpointRepository !== p.checkpointRepository ||
    p.repositories.length !== r.checkpoint.members.length
  )
    throw new Error('INVALID_CHECKPOINT');
  for (const [i, repository] of p.repositories.entries()) {
    const member = r.checkpoint.members[i];
    if (
      !member ||
      member.name !== repository.name ||
      member.repository !== repository.repository ||
      member.provider !== repository.provider
    )
      throw new Error('INVALID_CHECKPOINT');
  }
}
function existing(
  deps: CheckpointCandidateDeps,
  input: CheckpointSubmission,
  digest: string,
  actor: VerifiedCheckpointReporter,
): ProposedCheckpointReceipt | null {
  const r = input.checkpoint;
  const rows = deps.sql
    .exec<StoredReceipt>(
      'SELECT * FROM proposed_checkpoint_receipts WHERE settlement_id = ? OR (run_id = ? AND epoch = ?)',
      r.settlementId,
      r.binding.runId,
      r.binding.leaseEpoch,
    )
    .toArray();
  if (!rows.length) return null;
  const row = rows[0];
  if (
    !row ||
    rows.length !== 1 ||
    row.request_digest !== digest ||
    row.reporter_id !== actor.principalId ||
    row.run_id !== r.binding.runId ||
    row.epoch !== r.binding.leaseEpoch
  )
    throw new Error('CHECKPOINT_CONFLICT');
  // This is our own transactionally-written immutable JSON, not untrusted wire input.
  return JSON.parse(row.receipt);
}

function authority(snapshot: CheckpointClaimSnapshot): string {
  return canonicalCheckpoint({
    tenantId: snapshot.tenantId,
    policy: snapshot.policy,
    policyDigest: snapshot.policyDigest,
    binding: snapshot.binding,
    start: snapshot.start,
    benchKey: snapshot.benchKey,
    benchId: snapshot.benchId,
    requestId: snapshot.requestId,
  });
}
export async function settleCheckpointCandidate(
  deps: CheckpointCandidateDeps,
  raw: Uint8Array,
  options?: { privateTestOnly: true },
): Promise<ProposedCheckpointReceipt> {
  if (!options?.privateTestOnly) throw new Error('CHECKPOINT_SETTLEMENT_DISABLED');
  const input = parseCheckpointSubmission(raw);
  const canonicalInput = canonicalCheckpoint(input);
  const requestDigest = await checkpointDigest(input);
  const reportDigest = await checkpointDigest(input.checkpoint);
  const snapshot = deps.current();
  const actor = reporter(deps, snapshot);
  const replay = existing(deps, input, requestDigest, actor);
  if (replay) return replay;
  current(deps, input, snapshot);
  if ((await checkpointDigest(snapshot.policy)) !== snapshot.policyDigest) throw new Error('INVALID_CHECKPOINT');
  const frozen = authority(snapshot);
  await deps.verifySource(input);
  if (canonicalCheckpoint(input) !== canonicalInput) throw new Error('INVALID_CHECKPOINT');
  return deps.transaction(() => {
    const latest = deps.current();
    const latestActor = reporter(deps, latest);
    const completed = existing(deps, input, requestDigest, latestActor);
    if (completed) return completed;
    if (authority(latest) !== frozen) throw new Error('STALE_LEASE');
    current(deps, input, latest);
    const r = input.checkpoint;
    const receipt: ProposedCheckpointReceipt = {
      version: 'superpipeline.run-checkpoint-receipt.v1',
      settlementId: r.settlementId,
      requestDigest,
      reportDigest,
      reportedBy: latestActor.principalId,
      runId: r.binding.runId,
      leaseEpoch: r.binding.leaseEpoch,
      recordedAt: new Date(checkedNow(deps)).toISOString(),
      checkpoint: r.checkpoint,
    };
    const saved = JSON.stringify(receipt);
    if (new TextEncoder().encode(saved).byteLength > 65536) throw new Error('INVALID_CHECKPOINT');
    deps.sql.exec(
      'INSERT INTO proposed_checkpoint_receipts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      r.settlementId,
      r.binding.runId,
      r.binding.leaseEpoch,
      requestDigest,
      reportDigest,
      latestActor.principalId,
      r.execution.id,
      r.checkpoint.benchId,
      r.checkpoint.requestId,
      canonicalCheckpoint(input),
      saved,
    );
    requireSynchronousCommit(deps.commit(input, receipt));
    return receipt;
  });
}
