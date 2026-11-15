import { commitCheckpointReferences, type CheckpointReferenceMapping } from './checkpoint-references';
import { evaluateCompletion, outcomeInputError, routeOutcome, CompletionRequirement } from '@superpipeline/contract';
import type { BoardContext } from './context';
import { commitCompletion } from './completion-commit';
import type { CheckpointSubmission } from './checkpoint-proposal';
import type { ProposedCheckpointReceipt } from './checkpoint-candidate';
import type { CompleteVerbInput } from './model';
import { CIRCUIT_BREAKER_LIMIT } from './rules';

/** Actual Board SQLite/effect boundary; this is not a source-proof verifier or public route. */
export function checkpointTransaction(
  board: BoardContext,
  commit: () => ProposedCheckpointReceipt,
): ProposedCheckpointReceipt {
  if (!board.commitEffects) throw new Error('COMMIT_EFFECTS_REQUIRED');
  return board.commitEffects.run(board.ctx.storage, commit);
}

/** Reuse the real synchronous completion span only after candidate authorization/source proof.
 * Bound approval payloads need a separate contract review and are refused here. No async complete()
 * is smuggled into a void callback; return type is deliberately explicit.
 */
export function commitCheckpointCompletion(board: BoardContext, submission: CheckpointSubmission, mapping: CheckpointReferenceMapping): undefined {
  board.commitEffects?.requireActive();
  if (!board.commitEffects) throw new Error('COMMIT_EFFECTS_REQUIRED');
  const binding = submission.checkpoint.binding;
  const input: CompleteVerbInput = {
    runId: binding.runId,
    leaseEpoch: binding.leaseEpoch,
    agentId: binding.agentId,
    handoff: submission.handoff,
    outcome: submission.outcome,
    ...(submission.findings !== undefined ? { findings: submission.findings } : {}),
  };
  const authorized = board.authorizeRun(input);
  if (!authorized.ok) throw new Error(authorized.code);
  if (authorized.run.card_id !== binding.cardId || authorized.run.stage_key !== binding.stageKey)
    throw new Error('STALE_LEASE');
  const card = board.mustGetCard(binding.cardId);
  const stages = board.stages();
  const index = stages.findIndex((s) => s.key === card.currentStageKey);
  const stage = stages[index];
  if (!stage || stage.key !== binding.stageKey) throw new Error('STALE_LEASE');
  const next = stages[index + 1];
  if (next?.approvalSubjectSchema && next.gate === 'approval' && !board.isAgentClaimable(next))
    throw new Error('APPROVAL_SUBJECT_REQUIRED');
  if (outcomeInputError(input)) throw new Error('INVALID_OUTCOME');
  let override: CompletionRequirement | undefined;
  if (card.spec && typeof card.spec === 'object' && !Array.isArray(card.spec) && card.spec.completion !== undefined) {
    const parsed = CompletionRequirement.safeParse(card.spec.completion);
    if (!parsed.success) throw new Error('INVALID_COMPLETION_STATE');
    override = parsed.data;
  }
  commitCheckpointReferences(board, submission, mapping);
  const requirement = override ?? stage.completion;
  if (requirement) {
    const references = board.sql
      .exec('SELECT provider,source_type FROM card_references WHERE card_id=?', binding.cardId)
      .toArray()
      .map((row) => {
        if (typeof row.provider !== 'string' || typeof row.source_type !== 'string')
          throw new Error('INVALID_REFERENCE_STATE');
        return { provider: row.provider, sourceType: row.source_type };
      });
    if (!evaluateCompletion(requirement, { handoff: input.handoff, references }).met)
      throw new Error('COMPLETION_REQUIRED');
  }
  const route = routeOutcome(
    { key: stage.key, ...(stage.returnStage ? { returnStage: stage.returnStage } : {}) },
    input,
    { returnsSoFar: Number(board.getCardRow(card.id)?.auto_returns ?? 0), limit: CIRCUIT_BREAKER_LIMIT },
  );
  if (route.kind === 'refuse') throw new Error('INVALID_OUTCOME');
  commitCompletion(board, input, authorized.run, card, stages, null, true);
  // The owned effect scope queues this alarm until the receipt/run transaction commits.
  void board.scheduleReclaim();
  return undefined;
}
