/** Proposed private administration gate; no deployment configuration enables it. */
import type { BoardContext } from './context';
import type { Result, StageDef, StageEditor } from './model';
import { parseCheckpointPolicy } from './checkpoint-proposal';
import { canonicalCheckpoint } from './checkpoint-json';

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
function policyValue(stages: StageDef[], key: string): string {
  const value = stages.find((stage) => stage.key === key)?.checkpointPolicy;
  return value === undefined ? '<absent>' : canonicalCheckpoint(value);
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
