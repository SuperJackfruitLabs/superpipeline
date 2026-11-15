/** Explicit private administration uses the strict bounded lexical reader before
 * parsing any parent keys. Flag-off requests retain their existing JSON behavior. */
import { checkpointBody } from './checkpoint-body';
import { parseCheckpointJSON } from '../../board/checkpoint-json';
import { changedCheckpointStages, checkpointPolicyFieldError } from '../../board/checkpoint-policy-admin';
import type { StageDef } from '../../board/model';
import type { Env } from '../../env';
import type { UserPrincipal } from '../../auth/resolve';
import { isWorkspaceAdmin } from '../callers';

export async function stageWriteInput(request: Request, enabled = false): Promise<unknown> {
  if (!enabled) return request.json();
  const raw = await checkpointBody(request);
  if (raw === null) throw new Error('checkpoint policy write exceeds 64 KiB');
  return parseCheckpointJSON(raw);
}
export function checkpointStageWriteRefusal(env: Env, user: UserPrincipal | null,
  before: StageDef[], after: StageDef[]): Response | null {
  for (const stage of after) {
    const bad = checkpointPolicyFieldError(stage.checkpointPolicy, env.PROPOSED_CHECKPOINT_POLICY === 'true');
    if (bad) return Response.json({ error: { code: 'INVALID_STAGES', message: bad } }, { status: 400 });
  }
  if (!changedCheckpointStages(before, after).length) return null;
  if (env.PROPOSED_CHECKPOINT_POLICY !== 'true')
    return Response.json({ error: { code: 'INVALID_STAGES', message: 'checkpointPolicy is proposed and not enabled' } }, { status: 400 });
  if (!isWorkspaceAdmin(env, user))
    return Response.json({ error: { code: 'WORKSPACE_ADMIN_REQUIRED', message: 'only a workspace owner or admin can administer checkpoint policy' } }, { status: 403 });
  return null;
}
