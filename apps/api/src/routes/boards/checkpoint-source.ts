/** Proposed source service API; disabled unless explicitly configured after acceptance. */
import { resolveHubService } from '../../auth/resolve';
import type { VerifiedCheckpointReporter } from '../../auth/checkpoint-reporter';
import { boardStub } from '../../board/stub';
import type { Env } from '../../env';
import { methodNotAllowed, statusForCode } from '../errors';
import { checkpointBody } from './checkpoint-body';

const refuse = (status: number, code: string) => Response.json({ error: { code } }, { status });
export async function checkpointSource(request: Request, env: Env, boardId: string, runId: string): Promise<Response> {
  if (env.PROPOSED_CHECKPOINT_SOURCE !== 'true') return refuse(404, 'CHECKPOINT_SOURCE_DISABLED');
  if (request.method !== 'POST' && request.method !== 'GET') return methodNotAllowed();
  const service = await resolveHubService(request, env);
  if (!service || !Number.isSafeInteger(service.expiresAt) || (service.expiresAt ?? 0) <= Date.now())
    return refuse(401, 'UNAUTHORIZED');
  const scope = request.method === 'POST' ? 'checkpoints:submit' : 'checkpoints:read';
  if (!service.scopes.includes(scope)) return refuse(403, 'FORBIDDEN');
  const actor: VerifiedCheckpointReporter = { kind: 'service', principalId: service.principalId,
    tenantId: service.tenantId, scopes: [...service.scopes], expiresAt: service.expiresAt ?? 0 };
  try {
    const stub = boardStub(env, service.tenantId, boardId);
    const raw = request.method === 'POST' ? await checkpointBody(request) : null;
    if (request.method === 'POST' && raw === null) return refuse(413, 'CHECKPOINT_SOURCE_TOO_LARGE');
    const result = raw !== null ? await stub.admitCheckpointSource(actor, runId, raw) : await stub.readCheckpointSource(actor, runId);
    return result.ok ? Response.json(result.value) : refuse(statusForCode(result.code), result.code);
  } catch { return refuse(500, 'CHECKPOINT_SOURCE_FAILED'); }
}
