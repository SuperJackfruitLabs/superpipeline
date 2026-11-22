/** Proposed owner API. Both Worker and Board independently enforce default-off. */
import { resolveHubService } from '../../auth/resolve';
import type { VerifiedCheckpointReporter } from '../../auth/checkpoint-reporter';
import { boardStub } from '../../board/stub';
import type { Env } from '../../env';
import { methodNotAllowed, refuse, refusal } from '../errors';
import { checkpointBody } from './checkpoint-body';

export async function checkpointSettlement(
  request: Request, env: Env, boardId: string, runId: string, operation: 'submit' | 'read',
): Promise<Response> {
  if (env.PROPOSED_CHECKPOINT_SETTLEMENT !== 'true') return refuse('CHECKPOINT_SETTLEMENT_DISABLED', 'checkpoint settlement is not enabled on this plane');
  if (request.method !== (operation === 'submit' ? 'POST' : 'GET')) return methodNotAllowed();
  const service = await resolveHubService(request, env);
  if (!service || !Number.isSafeInteger(service.expiresAt) || (service.expiresAt ?? 0) <= Date.now())
    return refuse('UNAUTHORIZED', 'a current service token for a mapped workspace is required');
  const scope = operation === 'submit' ? 'checkpoints:submit' : 'checkpoints:read';
  if (!service.scopes.includes(scope)) return refuse('FORBIDDEN', `this principal does not hold ${scope}`);
  const actor: VerifiedCheckpointReporter = { kind: 'service', principalId: service.principalId,
    tenantId: service.tenantId, scopes: [...service.scopes], expiresAt: service.expiresAt ?? 0 };
  try {
    const stub = boardStub(env, service.tenantId, boardId);
    const raw = operation === 'submit' ? await checkpointBody(request) : null;
    if (operation === 'submit' && raw === null) return refuse('CHECKPOINT_SETTLEMENT_TOO_LARGE', 'a checkpoint settlement is at most 64 KiB');
    const result = raw !== null ? await stub.submitCheckpointSettlement(actor, runId, raw) : await stub.readCheckpointReceipt(actor, runId);
    return result.ok ? Response.json(result.value) : refusal(result);
  } catch { return refuse('CHECKPOINT_SETTLEMENT_FAILED', 'the checkpoint settlement could not be read or saved'); }
}
