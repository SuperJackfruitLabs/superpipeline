/** Explicit private administration uses the strict bounded lexical reader before
 * parsing any parent keys. Flag-off requests retain their existing JSON behavior. */
import { checkpointBody } from './checkpoint-body';
import { parseStageEnvelopeJSON } from '../../board/checkpoint-json';
import { changedCheckpointStages, stageCheckpointFieldError } from '../../board/checkpoint-policy-admin';
import type { StageDef } from '../../board/model';
import type { Env } from '../../env';
import type { UserPrincipal } from '../../auth/resolve';
import { isWorkspaceAdmin } from '../callers';
import { readJson, refuse } from '../errors';
import type { JsonBody } from '../../api-errors';

export async function stageWriteInput(request: Request, enabled = false): Promise<unknown> {
  if (!enabled) return request.json();
  const raw = await checkpointBody(request);
  if (raw === null) throw new Error('checkpoint policy write exceeds 64 KiB');
  return parseStageEnvelopeJSON(raw);
}
/**
 * `stageWriteInput` as a route reads it: malformed JSON (or a body the strict reader refuses) is
 * 400 `INVALID_JSON`; a body over its bound reads as null, which each route refuses in its own words.
 */
export async function readStageWrite(request: Request, enabled: boolean): Promise<JsonBody> {
  if (!enabled) return readJson(request, { emptyAs: null });
  try {
    return { ok: true, value: await stageWriteInput(request, true) };
  } catch (err) {
    if (err instanceof Error && err.message.includes('64 KiB')) return { ok: true, value: null };
    return { ok: false, response: refuse('INVALID_JSON', 'the request body is not valid JSON') };
  }
}

export function checkpointStageWriteRefusal(env: Env, user: UserPrincipal | null,
  before: StageDef[], after: StageDef[]): Response | null {
  for (const stage of after) {
    const bad = stageCheckpointFieldError(stage, env.PROPOSED_CHECKPOINT_POLICY === 'true');
    if (bad) return refuse('INVALID_STAGES', bad);
  }
  if (!changedCheckpointStages(before, after).length) return null;
  if (env.PROPOSED_CHECKPOINT_POLICY !== 'true')
    return refuse('INVALID_STAGES', 'checkpointPolicy is proposed and not enabled');
  if (!isWorkspaceAdmin(env, user))
    return refuse('WORKSPACE_ADMIN_REQUIRED', 'only a workspace owner or admin can administer checkpoint policy');
  return null;
}
