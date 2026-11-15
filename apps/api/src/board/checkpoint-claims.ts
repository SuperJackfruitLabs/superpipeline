/** Private pending-source foundation. No public admission or settlement route is enabled. */
import { canonicalCheckpoint } from './checkpoint-json';
import { parseCheckpointPolicy, type CheckpointPolicy } from './checkpoint-proposal';

/** The policy and actual run owner exist at claim time; source/execution facts do not. */
export interface PendingCheckpointClaim {
  tenantId: string;
  boardId: string;
  cardId: string;
  stageKey: string;
  agentId: string;
  runId: string;
  leaseEpoch: number;
  policy: CheckpointPolicy;
  policyDigest: string;
  admissionState: 'pending';
}
export function createCheckpointClaimTables(sql: SqlStorage): void {
  sql.exec(`CREATE TABLE IF NOT EXISTS proposed_checkpoint_claims (
    run_id TEXT NOT NULL UNIQUE, epoch INTEGER NOT NULL CHECK(epoch>=1 AND epoch<=9007199254740991),
    tenant_id TEXT NOT NULL, board_id TEXT NOT NULL, card_id TEXT NOT NULL,
    stage_key TEXT NOT NULL, agent_id TEXT NOT NULL,
    policy_json TEXT NOT NULL, policy_digest TEXT NOT NULL,
    admission_state TEXT NOT NULL CHECK(admission_state='pending'),
    PRIMARY KEY(run_id,epoch), UNIQUE(card_id,epoch))`);
  // Later source binding belongs in a separate bind-once row. This identity is never rewritten.
  for (const action of ['UPDATE', 'DELETE']) {
    sql.exec(`CREATE TRIGGER IF NOT EXISTS checkpoint_claim_no_${action.toLowerCase()}
      BEFORE ${action} ON proposed_checkpoint_claims BEGIN
      SELECT RAISE(ABORT, 'immutable checkpoint claim'); END`);
  }
}
function text(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128;
}
function decode(row: Record<string, SqlStorageValue>): PendingCheckpointClaim {
  const keys = ['admission_state', 'agent_id', 'board_id', 'card_id', 'epoch', 'policy_digest', 'policy_json', 'run_id', 'stage_key', 'tenant_id'];
  if (JSON.stringify(Object.keys(row).toSorted()) !== JSON.stringify(keys)) throw new Error('INVALID_CHECKPOINT_CLAIM');
  if (
    !text(row.tenant_id) || !text(row.board_id) || !text(row.card_id) || !text(row.stage_key) ||
    !text(row.agent_id) || !text(row.run_id) || typeof row.epoch !== 'number' ||
    !Number.isSafeInteger(row.epoch) || row.epoch < 1 || row.admission_state !== 'pending' ||
    typeof row.policy_json !== 'string' || typeof row.policy_digest !== 'string' ||
    !/^[0-9a-f]{64}$/.test(row.policy_digest)
  ) throw new Error('INVALID_CHECKPOINT_CLAIM');
  const policy = parseCheckpointPolicy(new TextEncoder().encode(row.policy_json));
  if (canonicalCheckpoint(policy) !== row.policy_json) throw new Error('INVALID_CHECKPOINT_CLAIM');
  return {
    tenantId: row.tenant_id, boardId: row.board_id, cardId: row.card_id, stageKey: row.stage_key,
    agentId: row.agent_id, runId: row.run_id, leaseEpoch: row.epoch, policy,
    policyDigest: row.policy_digest, admissionState: 'pending',
  };
}
/** Missing row means no captured checkpoint claim, NEVER admitted source. */
export function readCheckpointClaim(sql: SqlStorage, runId: string): PendingCheckpointClaim | null {
  const rows = sql.exec('SELECT * FROM proposed_checkpoint_claims WHERE run_id=?', runId).toArray();
  if (!rows.length) return null;
  if (rows.length !== 1 || !rows[0]) throw new Error('INVALID_CHECKPOINT_CLAIM');
  return decode(rows[0]);
}
/** Caller owns the synchronous claim transaction; do not use this to backfill an existing run. */
export function insertPendingCheckpointClaim(sql: SqlStorage, claim: PendingCheckpointClaim): void {
  const row = {
    run_id: claim.runId, epoch: claim.leaseEpoch, tenant_id: claim.tenantId, board_id: claim.boardId,
    card_id: claim.cardId, stage_key: claim.stageKey, agent_id: claim.agentId,
    policy_json: canonicalCheckpoint(claim.policy), policy_digest: claim.policyDigest,
    admission_state: claim.admissionState,
  };
  decode(row);
  const run = sql.exec('SELECT * FROM runs WHERE id=?', claim.runId).toArray()[0];
  const card = sql.exec('SELECT * FROM cards WHERE id=?', claim.cardId).toArray()[0];
  const meta = (key: string) => sql.exec('SELECT v FROM meta WHERE k=?', key).toArray()[0]?.v;
  const stagesRaw = meta('stages');
  if (typeof stagesRaw !== 'string') throw new Error('INVALID_CHECKPOINT_CLAIM');
  const stages: unknown = JSON.parse(stagesRaw);
  let currentPolicy: unknown;
  if (Array.isArray(stages)) for (const value of stages) {
    const stage: unknown = value;
    if (stage && typeof stage === 'object' && 'key' in stage && stage.key === claim.stageKey && 'checkpointPolicy' in stage)
      currentPolicy = stage.checkpointPolicy;
  }
  if (canonicalCheckpoint(currentPolicy) !== row.policy_json) throw new Error('INVALID_CHECKPOINT_CLAIM');
  if (!run || !card || run.card_id !== claim.cardId || run.stage_key !== claim.stageKey ||
    run.agent_id !== claim.agentId || run.lease_epoch !== claim.leaseEpoch || run.status !== 'working' ||
    card.current_run_id !== claim.runId || card.claim_seq !== claim.leaseEpoch || card.state !== 'working' ||
    card.current_stage_key !== claim.stageKey || card.delegate_agent_id !== claim.agentId ||
    meta('tenantId') !== claim.tenantId || meta('boardId') !== claim.boardId
  ) throw new Error('INVALID_CHECKPOINT_CLAIM');
  sql.exec(`INSERT INTO proposed_checkpoint_claims
    (run_id,epoch,tenant_id,board_id,card_id,stage_key,agent_id,policy_json,policy_digest,admission_state)
    VALUES (?,?,?,?,?,?,?,?,?,?)`,
    row.run_id, row.epoch, row.tenant_id, row.board_id, row.card_id, row.stage_key, row.agent_id,
    row.policy_json, row.policy_digest, row.admission_state);
  const saved = readCheckpointClaim(sql, claim.runId);
  if (!saved || canonicalCheckpoint(saved) !== canonicalCheckpoint(claim)) throw new Error('INVALID_CHECKPOINT_CLAIM');
}
