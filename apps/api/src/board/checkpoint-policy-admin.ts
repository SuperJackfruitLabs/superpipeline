import { cardSelectionFrozen, createCheckpointClaimTables } from './checkpoint-claims';
import { CommitEffects } from './commit-effects';
/** Proposed private administration gate; no deployment configuration enables it. */
import type { BoardContext } from './context';
import type { Result, StageDef, StageEditor } from './model';
import { parseCheckpointPolicy } from './checkpoint-proposal';
import { canonicalCheckpoint } from './checkpoint-json';
import { cardCheckpointPolicyError, entryRefusal, isCardRepositories, narrowingWords, stageCardPolicy, type CardRepositories } from './checkpoint-selection';

export function checkpointPolicyFieldError(value: unknown, enabled: boolean): string | null {
  if (value === undefined) return null;
  if (!enabled) return 'checkpointPolicy is proposed and not enabled';
  try {
    const raw = JSON.stringify(value);
    if (typeof raw !== 'string') return 'checkpointPolicy is invalid';
    parseCheckpointPolicy(new TextEncoder().encode(raw));
    return null;
  } catch { return 'checkpointPolicy is invalid'; }
}
/**
 * A stage whose cards choose their repositories (treaty run-checkpoint-policy.v2). Refused in the
 * words of treaty's selection vectors when a relation fails, so a reader can tell which one.
 */
export function cardCheckpointPolicyFieldError(value: unknown, enabled: boolean): string | null {
  if (value === undefined) return null;
  if (!enabled) return 'cardCheckpointPolicy is proposed and not enabled';
  const raw = JSON.stringify(value);
  if (typeof raw !== 'string') return 'cardCheckpointPolicy is invalid';
  const why = cardCheckpointPolicyError(new TextEncoder().encode(raw));
  return why === null ? null : why === 'invalid' ? 'cardCheckpointPolicy is invalid' : `cardCheckpointPolicy is invalid: ${why}`;
}
/** Both checkpoint fields of one stage, and the rule that a stage carries at most one of them. */
export function stageCheckpointFieldError(stage: Pick<StageDef, 'checkpointPolicy' | 'cardCheckpointPolicy'>, enabled: boolean): string | null {
  const fixed = checkpointPolicyFieldError(stage.checkpointPolicy, enabled);
  if (fixed) return fixed;
  const chosen = cardCheckpointPolicyFieldError(stage.cardCheckpointPolicy, enabled);
  if (chosen) return chosen;
  if (stage.checkpointPolicy !== undefined && stage.cardCheckpointPolicy !== undefined)
    return 'a stage carries checkpointPolicy or cardCheckpointPolicy, never both';
  return null;
}
/** Whether a stage needs checkpoint settlement: it has either checkpoint policy. */
export function hasCheckpointPolicy(stage: Pick<StageDef, 'checkpointPolicy' | 'cardCheckpointPolicy'> | undefined): boolean {
  return stage !== undefined && (stage.checkpointPolicy !== undefined || stage.cardCheckpointPolicy !== undefined);
}
/** A card choice's stored spelling: canonical card-repositories.v1 JSON. */
export function canonicalCardRepositories(value: unknown): string {
  if (!isCardRepositories(value)) throw new Error('INVALID_CARD_REPOSITORIES');
  return canonicalCheckpoint(value);
}
/**
 * A card entering `stage` (created in it, moved into it, or edited while in it) with `choice`:
 * refused when the stage's cards choose and the choice does not fit its allowlist. A card that
 * names none enters, and waits for a person at claim when the stage has no default.
 */
export function cardRepositoriesEntryRefusal(stage: StageDef | undefined, choice: CardRepositories | null): Result<never> | null {
  const policy = stageCardPolicy(stage);
  if (!stage || policy === undefined) return null;
  const refusal = entryRefusal(policy, choice);
  if (refusal === null) return null;
  return { ok: false, code: 'REPOSITORY_CHOICE_REFUSED', message: narrowingWords(refusal, stage.name, choice, policy), detail: { reason: refusal, stageKey: stage.key } };
}
/** A change to a card's choice once its bench exists: refused, because the bench is sized to it. */
export function cardRepositoriesFrozenRefusal(sql: SqlStorage, cardId: string, before: CardRepositories | null, after: CardRepositories | null): Result<never> | null {
  const same = (before === null ? null : canonicalCheckpoint(before)) === (after === null ? null : canonicalCheckpoint(after));
  if (same || !cardSelectionFrozen(sql, cardId)) return null;
  return {
    ok: false, code: 'REPOSITORY_CHOICE_REFUSED',
    message: 'this card\'s repositories are fixed: its bench exists. Make a new card to work in other repositories',
    detail: { reason: 'frozen' },
  };
}
function policyValue(stages: StageDef[], key: string): string {
  const stage = stages.find((s) => s.key === key);
  if (stage?.checkpointPolicy === undefined && stage?.cardCheckpointPolicy === undefined) return '<absent>';
  // A v1-only stage keeps the spelling it always had, so this comparison is unchanged for it.
  if (stage.cardCheckpointPolicy === undefined) return canonicalCheckpoint(stage.checkpointPolicy);
  return canonicalCheckpoint({
    cardCheckpointPolicy: stage.cardCheckpointPolicy,
    ...(stage.checkpointPolicy !== undefined ? { checkpointPolicy: stage.checkpointPolicy } : {}),
  });
}
export function changedCheckpointStages(before: StageDef[], after: StageDef[]): string[] {
  const keys = new Set([...before.map((stage) => stage.key), ...after.map((stage) => stage.key)]);
  return [...keys].filter((key) => policyValue(before, key) !== policyValue(after, key));
}
export function checkpointPolicyWriteError(board: Pick<BoardContext, 'sql' | 'env'>,
  before: StageDef[], after: StageDef[], editor: StageEditor): Result<never> | null {
  const changed = changedCheckpointStages(before, after);
  if (!changed.length) return null;
  if (board.env.PROPOSED_CHECKPOINT_POLICY !== 'true')
    return { ok: false, code: 'INVALID_STAGES', message: 'checkpointPolicy is proposed and not enabled' };
  if (!editor.mayChangeDecisionPolicy)
    return { ok: false, code: 'WORKSPACE_ADMIN_REQUIRED', message: 'only a workspace owner or admin can administer checkpoint policy' };
  for (const key of changed) {
    // Include suspended human-input work as well as a live writer. No await occurs
    // between this check and the pipeline write; a claim cannot interleave here.
    if (board.sql.exec("SELECT 1 FROM runs WHERE stage_key=? AND status='working' LIMIT 1", key).toArray().length ||
      board.sql.exec("SELECT 1 FROM cards WHERE current_stage_key=? AND state IN ('working','input-required') LIMIT 1", key).toArray().length)
      return { ok: false, code: 'STAGE_NOT_EMPTY', message: `checkpoint policy on stage "${key}" cannot change while work is active` };
  }
  return null;
}

/** Called only after policy authorization/validation, immediately before the durable stage write. */
export function prepareCheckpointPolicy(board: Pick<BoardContext, 'sql' | 'env' | 'commitEffects'>, stages: StageDef[]): void {
  if (board.env.PROPOSED_CHECKPOINT_POLICY === 'true') board.commitEffects ??= new CommitEffects();
  if (stages.some(hasCheckpointPolicy)) createCheckpointClaimTables(board.sql);
}
