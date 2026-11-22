/** Pending policy discovery is not source admission or settlement authority. */
import { canonicalCheckpoint } from './checkpoint-json';
import { parseCheckpointPolicy, type CheckpointPolicy } from './checkpoint-proposal';
import {
  cardRepositoriesOf, isCheckpointSelection, narrowCheckpointPolicy, parseCardCheckpointPolicy,
  type CardCheckpointPolicy, type CheckpointSelection,
} from './checkpoint-selection';

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
  /**
   * On a stage whose cards choose (claim protocol v2): how its allowlist was narrowed for this
   * card. `policy` is then the narrowed v1 policy and `policyDigest` its digest. Absent otherwise.
   */
  selection?: CheckpointSelection;
  /** The stage's v2 policy the selection was narrowed from, exactly as it stood at claim. Internal. */
  stagePolicy?: CardCheckpointPolicy;
}
export const CHECKPOINT_CLAIM_PROTOCOL = 'superpipeline.checkpoint-claim.v1';
/** Claim protocol v2: a claimant that can check a narrowed claim (a stage whose cards choose). */
export const CHECKPOINT_CLAIM_PROTOCOL_V2 = 'superpipeline.checkpoint-claim.v2';
export const CHECKPOINT_CLAIM_PROTOCOLS = [CHECKPOINT_CLAIM_PROTOCOL, CHECKPOINT_CLAIM_PROTOCOL_V2] as const;
export type CheckpointClaimDiscovery = Omit<PendingCheckpointClaim, 'stagePolicy'> & { version: typeof CHECKPOINT_CLAIM_PROTOCOL };

/** The claim as the claimant reads it: the wire shape, never the internal stage policy copy. */
export function checkpointClaimDiscovery(claim: PendingCheckpointClaim): CheckpointClaimDiscovery {
  const { stagePolicy: internal, ...wire } = claim;
  return { ...wire, version: CHECKPOINT_CLAIM_PROTOCOL };
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
/**
 * The selection a claim on a stage whose cards choose froze, beside its claim row (one per claim;
 * a v1 claim has none, so its row is exactly what it always was): the selection with the stage
 * policy's digest, and that stage policy's canonical bytes, so a later reader can tell whether the
 * stage still holds the policy the card was narrowed from. Immutable, like the claim.
 */
export function createCheckpointSelectionTables(sql: SqlStorage): void {
  sql.exec(`CREATE TABLE IF NOT EXISTS proposed_checkpoint_selections (
    run_id TEXT PRIMARY KEY, epoch INTEGER NOT NULL, card_id TEXT NOT NULL,
    selection_json TEXT NOT NULL, stage_policy_json TEXT NOT NULL)`);
  sql.exec('CREATE INDEX IF NOT EXISTS idx_checkpoint_selections_card ON proposed_checkpoint_selections(card_id)');
  for (const action of ['UPDATE', 'DELETE']) {
    sql.exec(`CREATE TRIGGER IF NOT EXISTS checkpoint_selection_no_${action.toLowerCase()}
      BEFORE ${action} ON proposed_checkpoint_selections BEGIN
      SELECT RAISE(ABORT, 'immutable checkpoint selection'); END`);
  }
  sql.exec(`CREATE TRIGGER IF NOT EXISTS checkpoint_selection_no_replace BEFORE INSERT ON proposed_checkpoint_selections
    WHEN EXISTS (SELECT 1 FROM proposed_checkpoint_selections WHERE run_id=NEW.run_id) BEGIN
    SELECT RAISE(ABORT, 'immutable checkpoint selection'); END`);
}
function hasTable(sql: SqlStorage, name: string): boolean {
  return sql.exec("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", name).toArray().length > 0;
}
function text(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128;
}
function withoutDigest(selection: CheckpointSelection): Omit<CheckpointSelection, 'stagePolicyDigest'> {
  const { stagePolicyDigest: digest, ...rest } = selection;
  return rest;
}
/** A stored selection and its stage policy, checked against each other and the narrowed policy. */
function decodeSelection(row: Record<string, SqlStorageValue>, claim: PendingCheckpointClaim): Pick<PendingCheckpointClaim, 'selection' | 'stagePolicy'> {
  const keys = ['card_id', 'epoch', 'run_id', 'selection_json', 'stage_policy_json'];
  if (JSON.stringify(Object.keys(row).toSorted()) !== JSON.stringify(keys) || row.run_id !== claim.runId ||
    row.epoch !== claim.leaseEpoch || row.card_id !== claim.cardId) throw new Error('INVALID_CHECKPOINT_CLAIM');
  const policy = claim.policy;
  if (typeof row.selection_json !== 'string' || typeof row.stage_policy_json !== 'string') throw new Error('INVALID_CHECKPOINT_CLAIM');
  const selection: unknown = JSON.parse(row.selection_json);
  if (!isCheckpointSelection(selection) || canonicalCheckpoint(selection) !== row.selection_json) throw new Error('INVALID_CHECKPOINT_CLAIM');
  const stagePolicy = parseCardCheckpointPolicy(new TextEncoder().encode(row.stage_policy_json));
  if (canonicalCheckpoint(stagePolicy) !== row.stage_policy_json) throw new Error('INVALID_CHECKPOINT_CLAIM');
  // The narrowing is reproducible from what is stored: the same stage policy and the same choice
  // give the same narrowed policy. A card's choice is recorded as its names and start repository.
  const narrowed = narrowCheckpointPolicy(stagePolicy, selection.source === 'card'
    ? { repositories: selection.repositories, primaryRepository: selection.checkpointRepository } : null);
  if (!narrowed.ok || canonicalCheckpoint(narrowed.policy) !== canonicalCheckpoint(policy) ||
    narrowed.selection.source !== selection.source ||
    canonicalCheckpoint(narrowed.selection.repositories) !== canonicalCheckpoint(selection.repositories) ||
    narrowed.selection.checkpointRepository !== selection.checkpointRepository
  ) throw new Error('INVALID_CHECKPOINT_CLAIM');
  return { selection, stagePolicy };
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
function selectionRow(claim: PendingCheckpointClaim): Record<string, SqlStorageValue> | null {
  if (!claim.selection && !claim.stagePolicy) return null;
  if (!claim.selection || !claim.stagePolicy) throw new Error('INVALID_CHECKPOINT_CLAIM');
  return {
    run_id: claim.runId, epoch: claim.leaseEpoch, card_id: claim.cardId,
    selection_json: canonicalCheckpoint(claim.selection), stage_policy_json: canonicalCheckpoint(claim.stagePolicy),
  };
}

/**
 * Whether this card has been claimed on a stage whose cards choose: its bench exists from then
 * on, sized to the frozen selection, so the card's choice may no longer change.
 */
export function cardSelectionFrozen(sql: SqlStorage, cardId: string): boolean {
  if (!hasTable(sql, 'proposed_checkpoint_selections')) return false;
  return sql.exec('SELECT 1 FROM proposed_checkpoint_selections WHERE card_id=? LIMIT 1', cardId).toArray().length > 0;
}

/**
 * The checkpoint policy a stage gives this card now, the way a claim computes it: a v1 stage's
 * own policy, or a v2 stage's allowlist narrowed by the card's choice. Undefined when the stage
 * has neither, or a v2 narrowing refuses. Synchronous, so a transaction can recheck it.
 */
export function currentCheckpointPolicy(stage: unknown, cardRow: Record<string, SqlStorageValue> | undefined):
  { policy: CheckpointPolicy; stagePolicy?: CardCheckpointPolicy; selection?: Omit<CheckpointSelection, 'stagePolicyDigest'> } | undefined {
  if (!stage || typeof stage !== 'object') return undefined;
  if ('checkpointPolicy' in stage && stage.checkpointPolicy !== undefined) {
    if ('cardCheckpointPolicy' in stage && stage.cardCheckpointPolicy !== undefined) throw new Error('INVALID_CHECKPOINT_CLAIM');
    return { policy: parseCheckpointPolicy(new TextEncoder().encode(canonicalCheckpoint(stage.checkpointPolicy))) };
  }
  if (!('cardCheckpointPolicy' in stage) || stage.cardCheckpointPolicy === undefined || !cardRow) return undefined;
  const stagePolicy = parseCardCheckpointPolicy(new TextEncoder().encode(canonicalCheckpoint(stage.cardCheckpointPolicy)));
  const narrowed = narrowCheckpointPolicy(stagePolicy, cardRepositoriesOf(cardRow));
  return narrowed.ok ? { policy: narrowed.policy, stagePolicy, selection: narrowed.selection } : undefined;
}
/** Missing row means no captured checkpoint claim, NEVER admitted source. */
export function readCheckpointClaim(sql: SqlStorage, runId: string): PendingCheckpointClaim | null {
  if (!sql.exec("SELECT 1 FROM sqlite_master WHERE type='table' AND name='proposed_checkpoint_claims'").toArray().length) return null;
  const rows = sql.exec('SELECT * FROM proposed_checkpoint_claims WHERE run_id=?', runId).toArray();
  if (!rows.length) return null;
  if (rows.length !== 1 || !rows[0]) throw new Error('INVALID_CHECKPOINT_CLAIM');
  const claim = decode(rows[0]);
  if (!hasTable(sql, 'proposed_checkpoint_selections')) return claim;
  const chosen = sql.exec('SELECT * FROM proposed_checkpoint_selections WHERE run_id=?', runId).toArray();
  if (!chosen.length) return claim;
  if (chosen.length !== 1 || !chosen[0]) throw new Error('INVALID_CHECKPOINT_CLAIM');
  return { ...claim, ...decodeSelection(chosen[0], claim) };
}
/** Caller owns the synchronous claim transaction; do not use this to backfill an existing run. */
export function insertPendingCheckpointClaim(sql: SqlStorage, claim: PendingCheckpointClaim): PendingCheckpointClaim {
  const row = {
    run_id: claim.runId, epoch: claim.leaseEpoch, tenant_id: claim.tenantId, board_id: claim.boardId,
    card_id: claim.cardId, stage_key: claim.stageKey, agent_id: claim.agentId,
    policy_json: canonicalCheckpoint(claim.policy), policy_digest: claim.policyDigest,
    admission_state: claim.admissionState,
  };
  const chosen = selectionRow(claim);
  if (chosen) decodeSelection(chosen, decode(row));
  else decode(row);
  const run = sql.exec('SELECT * FROM runs WHERE id=?', claim.runId).toArray()[0];
  const card = sql.exec('SELECT * FROM cards WHERE id=?', claim.cardId).toArray()[0];
  const meta = (key: string) => sql.exec('SELECT v FROM meta WHERE k=?', key).toArray()[0]?.v;
  const stagesRaw = meta('stages');
  if (typeof stagesRaw !== 'string') throw new Error('INVALID_CHECKPOINT_CLAIM');
  const stages: unknown = JSON.parse(stagesRaw);
  let currentStage: unknown;
  if (Array.isArray(stages)) for (const value of stages) {
    const stage: unknown = value;
    if (stage && typeof stage === 'object' && 'key' in stage && stage.key === claim.stageKey) currentStage = stage;
  }
  // The claim's policy is exactly what the stage gives this card now: a v1 stage's own policy, or
  // the narrowing of the stage's current allowlist by the card's current choice, from the same
  // stage policy the selection names.
  const current = currentCheckpointPolicy(currentStage, card);
  if (!current || canonicalCheckpoint(current.policy) !== row.policy_json ||
    (current.stagePolicy ? canonicalCheckpoint(current.stagePolicy) : null) !== (chosen?.stage_policy_json ?? null) ||
    (current.selection && claim.selection
      ? canonicalCheckpoint(current.selection) !== canonicalCheckpoint(withoutDigest(claim.selection))
      : current.selection !== claim.selection)
  ) throw new Error('INVALID_CHECKPOINT_CLAIM');
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
  if (chosen) {
    createCheckpointSelectionTables(sql);
    sql.exec('INSERT INTO proposed_checkpoint_selections (run_id,epoch,card_id,selection_json,stage_policy_json) VALUES (?,?,?,?,?)',
      chosen.run_id, chosen.epoch, chosen.card_id, chosen.selection_json, chosen.stage_policy_json);
  }
  const saved = readCheckpointClaim(sql, claim.runId);
  if (!saved || canonicalCheckpoint(saved) !== canonicalCheckpoint(claim)) throw new Error('INVALID_CHECKPOINT_CLAIM');
  return saved;
}
