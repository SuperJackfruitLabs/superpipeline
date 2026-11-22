/** Strict cap-free historical receipt reads; this never grants execution authority. */
import { Validator, type Schema } from '@cfworker/json-schema';
import type { VerifiedCheckpointReporter } from '../auth/checkpoint-reporter';
import type { BoardContext } from './context';
import type { ProposedCheckpointReceipt } from './checkpoint-candidate';
import { parseCheckpointJSON } from './checkpoint-json';
import { readCheckpointClaim } from './checkpoint-claims';
import schema from './checkpoint-contract/run-checkpoint-receipt.v1.json';

function pinned(value: unknown): value is Schema { return typeof value === 'object' && value !== null; }
if (!pinned(schema)) throw new Error('invalid checkpoint receipt schema');
const validator = new Validator(schema, '2020-12', false);
function receipt(value: unknown): value is ProposedCheckpointReceipt { return validator.validate(value).valid; }

export function requireCheckpointActor(
  actor: VerifiedCheckpointReporter, tenantId: string | null, reporterId: string | undefined,
  now: number, scope: 'checkpoints:submit' | 'checkpoints:read',
): void {
  if (!Number.isSafeInteger(now) || now < 0) throw new Error('INVALID_CHECKPOINT_STATE');
  if (actor.kind !== 'service' || actor.tenantId !== tenantId || actor.principalId !== reporterId ||
    !actor.scopes.includes(scope) || !Number.isSafeInteger(actor.expiresAt) || actor.expiresAt <= now)
    throw new Error('NOT_CHECKPOINT_REPORTER');
}

export function readCheckpointReceipt(board: BoardContext, actor: VerifiedCheckpointReporter, runId: string): ProposedCheckpointReceipt {
  const run = board.getRunRow(runId);
  if (!run) throw new Error('CHECKPOINT_RECEIPT_MISSING');
  if (typeof run.card_id !== 'string' || typeof run.stage_key !== 'string' ||
    !Number.isSafeInteger(run.lease_epoch)) throw new Error('INVALID_CHECKPOINT_RECEIPT');
  const cardId = run.card_id;
  const stage = board.stages().find((s) => s.key === run.stage_key);
  // The stage's selected reporter, as for a v1 stage; on a stage whose cards choose, that reporter
  // must also be the one the claim froze in its narrowed policy.
  let reporterId = stage?.checkpointPolicy?.reporterPrincipalId;
  if (stage?.cardCheckpointPolicy !== undefined) {
    const frozen = readCheckpointClaim(board.sql, runId)?.policy.reporterPrincipalId;
    reporterId = frozen === stage.cardCheckpointPolicy.reporterPrincipalId ? frozen : undefined;
  }
  requireCheckpointActor(actor, board.getMeta('tenantId'), reporterId, board.nowMs(), 'checkpoints:read');
  if (!board.getCardRow(run.card_id)) throw new Error('CHECKPOINT_RECEIPT_MISSING');
  if (!board.sql.exec("SELECT 1 FROM sqlite_master WHERE type='table' AND name='proposed_checkpoint_receipts'").toArray().length)
    throw new Error('CHECKPOINT_RECEIPT_MISSING');
  const rows = board.sql.exec('SELECT * FROM proposed_checkpoint_receipts WHERE run_id=? AND epoch=?', runId, run.lease_epoch).toArray();
  if (!rows.length) throw new Error('CHECKPOINT_RECEIPT_MISSING');
  const row = rows[0];
  if (rows.length !== 1 || !row || typeof row.receipt !== 'string') throw new Error('INVALID_CHECKPOINT_RECEIPT');
  const saved = parseCheckpointJSON(new TextEncoder().encode(row.receipt));
  if (!receipt(saved) || saved.runId !== runId || saved.leaseEpoch !== run.lease_epoch ||
    saved.settlementId !== row.settlement_id || saved.reportedBy !== row.reporter_id ||
    saved.requestDigest !== row.request_digest || saved.reportDigest !== row.report_digest)
    throw new Error('INVALID_CHECKPOINT_RECEIPT');
  const members = saved.checkpoint.members;
  const seal = members.find((member) => member.name === saved.checkpoint.checkpointRepository);
  if (!seal || saved.checkpoint.seal.length !== (seal.objectFormat === 'sha1' ? 40 : 64) ||
    members.some((member, i) => member.branch !== `card/${cardId}` ||
      member.commit.length !== (member.objectFormat === 'sha1' ? 40 : 64) ||
      i > 0 && members[i - 1].name >= member.name)) throw new Error('INVALID_CHECKPOINT_RECEIPT');
  return saved;
}
