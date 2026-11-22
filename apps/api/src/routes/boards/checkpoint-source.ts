/** Proposed source service API; disabled unless explicitly configured after acceptance. */
import { resolveHubService } from '../../auth/resolve';
import type { VerifiedCheckpointReporter } from '../../auth/checkpoint-reporter';
import { boardStub } from '../../board/stub';
import type { Env } from '../../env';
import { methodNotAllowed, refuse, refusal } from '../errors';
import { checkpointBody } from './checkpoint-body';

export async function checkpointSource(request: Request, env: Env, boardId: string, runId: string): Promise<Response> {
  if (env.PROPOSED_CHECKPOINT_SOURCE !== 'true') return refuse('CHECKPOINT_SOURCE_DISABLED', 'checkpoint sources are not enabled on this plane');
  if (request.method !== 'POST' && request.method !== 'GET') return methodNotAllowed();
  const service = await resolveHubService(request, env);
  if (!service || !Number.isSafeInteger(service.expiresAt) || (service.expiresAt ?? 0) <= Date.now())
    return refuse('UNAUTHORIZED', 'a current service token for a mapped workspace is required');
  const scope = request.method === 'POST' ? 'checkpoints:submit' : 'checkpoints:read';
  if (!service.scopes.includes(scope)) return refuse('FORBIDDEN', `this principal does not hold ${scope}`);
  const actor: VerifiedCheckpointReporter = { kind: 'service', principalId: service.principalId,
    tenantId: service.tenantId, scopes: [...service.scopes], expiresAt: service.expiresAt ?? 0 };
  try {
    const stub = boardStub(env, service.tenantId, boardId);
    const raw = request.method === 'POST' ? await checkpointBody(request) : null;
    if (request.method === 'POST' && raw === null) return refuse('CHECKPOINT_SOURCE_TOO_LARGE', 'a checkpoint source is at most 64 KiB');
    const result = raw !== null ? await stub.admitCheckpointSource(actor, runId, raw) : await stub.readCheckpointSource(actor, runId);
    return result.ok ? Response.json(result.value) : refusal(result);
  } catch { return refuse('CHECKPOINT_SOURCE_FAILED', 'the checkpoint source could not be read or saved'); }
}
