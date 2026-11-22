/** Explicit private administration uses the strict bounded lexical reader before
 * parsing any parent keys. Flag-off requests retain their existing JSON behavior. */
import { checkpointBody } from './checkpoint-body';
import { parseStageEnvelopeJSON } from '../../board/checkpoint-json';
import { changedCheckpointStages, checkpointPolicyFieldError } from '../../board/checkpoint-policy-admin';
import type { StageDef } from '../../board/model';
import type { Env } from '../../env';
import type { UserPrincipal } from '../../auth/resolve';
import { isWorkspaceAdmin } from '../callers';
import { refuse } from '../errors';

export async function stageWriteInput(request: Request, enabled = false): Promise<unknown> {
  if (!enabled) return request.json();
  const raw = await checkpointBody(request);
  if (raw === null) throw new Error('checkpoint policy write exceeds 64 KiB');
  return parseStageEnvelopeJSON(raw);
}
export function checkpointStageWriteRefusal(env: Env, user: UserPrincipal | null,
  before: StageDef[], after: StageDef[]): Response | null {
  for (const stage of after) {
    const bad = checkpointPolicyFieldError(stage.checkpointPolicy, env.PROPOSED_CHECKPOINT_POLICY === 'true');
    if (bad) return refuse('INVALID_STAGES', bad);
  }
  if (!changedCheckpointStages(before, after).length) return null;
  if (env.PROPOSED_CHECKPOINT_POLICY !== 'true')
    return refuse('INVALID_STAGES', 'checkpointPolicy is proposed and not enabled');
  if (!isWorkspaceAdmin(env, user))
    return refuse('WORKSPACE_ADMIN_REQUIRED', 'only a workspace owner or admin can administer checkpoint policy');
  return null;
}
