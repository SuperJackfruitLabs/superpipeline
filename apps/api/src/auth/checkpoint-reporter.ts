import type { Env } from '../env';
import { resolveHubService } from './resolve';

export interface VerifiedCheckpointReporter {
  principalId: string;
  tenantId: string;
  kind: 'service';
  scopes: string[];
  /** Absolute milliseconds from issuer-verified claims, never request JSON. */
  expiresAt: number;
}

/** Expected identity must come from the current server-owned stage policy.
 * This resolves issuer authority only; settlement must recheck current policy,
 * run/epoch, heartbeat and expiry after source verification. It proves no fence.
 * No public route imports this adapter while settlement remains disabled.
 */
export async function resolveCheckpointReporter(
  request: Request,
  env: Env,
  expected: { tenantId: string; reporterPrincipalId: string },
): Promise<VerifiedCheckpointReporter | null> {
  const service = await resolveHubService(request, env);
  if (
    !service ||
    service.tenantId !== expected.tenantId ||
    service.principalId !== expected.reporterPrincipalId ||
    !service.scopes.includes('checkpoints:submit') ||
    typeof service.expiresAt !== 'number' ||
    !Number.isSafeInteger(service.expiresAt) ||
    service.expiresAt <= Date.now()
  ) return null;
  return {
    kind: 'service', principalId: service.principalId, tenantId: service.tenantId,
    scopes: [...service.scopes], expiresAt: service.expiresAt,
  };
}
