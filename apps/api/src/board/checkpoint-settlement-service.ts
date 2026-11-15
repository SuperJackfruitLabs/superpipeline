/** Proposed service boundary. Repository deployment configuration leaves it off. */
import type { VerifiedCheckpointReporter } from '../auth/checkpoint-reporter';
import { tenantById } from '../db/catalog';
import type { BoardContext } from './context';
import type { BoardErrorCode, Result } from './model';
import { settleCheckpoint, type ProposedCheckpointReceipt } from './checkpoint-candidate';
import { checkpointTransaction, commitCheckpointCompletion } from './checkpoint-completion';
import { currentCheckpointSource } from './checkpoint-source';
import { readCheckpointReceipt, requireCheckpointActor } from './checkpoint-receipt';

const codes = ['INVALID_CHECKPOINT', 'NOT_CHECKPOINT_REPORTER', 'STALE_LEASE', 'CHECKPOINT_CONFLICT',
  'CHECKPOINT_RECEIPT_MISSING', 'CHECKPOINT_RECEIPT_NOT_SAVED', 'INVALID_CHECKPOINT_RECEIPT',
  'CHECKPOINT_SOURCE_MISSING', 'INVALID_CHECKPOINT_SOURCE', 'CHECKPOINT_REFERENCE_MAPPING_REQUIRED',
  'INVALID_CHECKPOINT_REFERENCE', 'CHECKPOINT_REFERENCE_NOT_SAVED', 'COMPLETION_REQUIRED',
  'APPROVAL_SUBJECT_REQUIRED', 'INVALID_OUTCOME', 'INVALID_COMPLETION_STATE', 'INVALID_CHECKPOINT_STATE'] as const;
async function operation(board: BoardContext, perform: () => ProposedCheckpointReceipt | Promise<ProposedCheckpointReceipt>): Promise<Result<ProposedCheckpointReceipt>> {
  if (board.env.PROPOSED_CHECKPOINT_SETTLEMENT !== 'true')
    return { ok: false, code: 'CHECKPOINT_SETTLEMENT_DISABLED', message: 'checkpoint settlement is disabled' };
  if (!board.getMeta('boardId')) return { ok: false, code: 'NOT_INITIALIZED', message: 'board not found' };
  try { return { ok: true, value: await perform() }; }
  catch (error) {
    const message = error instanceof Error ? error.message : '';
    const code: BoardErrorCode = codes.find((candidate) => candidate === message) ?? 'CHECKPOINT_SETTLEMENT_FAILED';
    return { ok: false, code, message: code };
  }
}

export function submit(board: BoardContext, actor: VerifiedCheckpointReporter, runId: string, raw: Uint8Array) {
  return operation(board, async () => {
    const savedActor = { ...actor, scopes: [...actor.scopes] };
    const bytes = raw.slice();
    const source = currentCheckpointSource(board, runId);
    requireCheckpointActor(savedActor, source.tenantId, source.policy.reporterPrincipalId, board.nowMs(), 'checkpoints:submit');
    // The forge mapping comes from the actual tenant catalog, never report JSON.
    const tenant = await tenantById(board.env.DB, source.tenantId);
    if (!tenant || tenant.id !== source.tenantId) throw new Error('CHECKPOINT_REFERENCE_MAPPING_REQUIRED');
    const mapping = { tenantId: tenant.id, forgeHost: tenant.forgeHost, reporterPrincipalId: savedActor.principalId };
    return await settleCheckpoint({
      sql: board.sql, nowMs: () => board.nowMs(), reporter: () => savedActor,
      current: () => currentCheckpointSource(board, runId),
      transaction: (commit) => checkpointTransaction(board, commit),
      commit: (input) => commitCheckpointCompletion(board, input, mapping),
    }, bytes, runId);
  });
}
export function read(board: BoardContext, actor: VerifiedCheckpointReporter, runId: string) {
  return operation(board, () => readCheckpointReceipt(board, actor, runId));
}
