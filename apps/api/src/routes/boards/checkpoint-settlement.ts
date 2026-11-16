/** Proposed owner API. Both Worker and Board independently enforce default-off. */
import { resolveHubService } from '../../auth/resolve';
import type { VerifiedCheckpointReporter } from '../../auth/checkpoint-reporter';
import { boardStub } from '../../board/stub';
import type { Env } from '../../env';
import { methodNotAllowed, statusForCode } from '../errors';
import { checkpointBody } from './checkpoint-body';

const refuse = (status: number, code: string) => Response.json({ error: { code } }, { status });
export async function checkpointSettlement(
  request: Request, env: Env, boardId: string, runId: string, operation: 'submit' | 'read',
): Promise<Response> {
  if (env.PROPOSED_CHECKPOINT_SETTLEMENT !== 'true') return refuse(404, 'CHECKPOINT_SETTLEMENT_DISABLED');
  if (request.method !== (operation === 'submit' ? 'POST' : 'GET')) return methodNotAllowed();
  const service = await resolveHubService(request, env);
  if (!service || !Number.isSafeInteger(service.expiresAt) || (service.expiresAt ?? 0) <= Date.now())
    return refuse(401, 'UNAUTHORIZED');
  const scope = operation === 'submit' ? 'checkpoints:submit' : 'checkpoints:read';
  if (!service.scopes.includes(scope)) return refuse(403, 'FORBIDDEN');
  const actor: VerifiedCheckpointReporter = { kind: 'service', principalId: service.principalId,
    tenantId: service.tenantId, scopes: [...service.scopes], expiresAt: service.expiresAt ?? 0 };
  try {
    const stub = boardStub(env, service.tenantId, boardId);
    const raw = operation === 'submit' ? await checkpointBody(request) : null;
    if (operation === 'submit' && raw === null) return refuse(413, 'CHECKPOINT_SETTLEMENT_TOO_LARGE');
    const result = raw !== null ? await stub.submitCheckpointSettlement(actor, runId, raw) : await stub.readCheckpointReceipt(actor, runId);
    return result.ok ? Response.json(result.value) : refuse(statusForCode(result.code), result.code);
  } catch { return refuse(500, 'CHECKPOINT_SETTLEMENT_FAILED'); }
}
