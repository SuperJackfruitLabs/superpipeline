import type { ServicePrincipal } from './principal';

/** Called only after signature/issuer/audience verification. Never extends NumericDate expiry. */
export function serviceExpiry(exp: unknown): Pick<ServicePrincipal, 'expiresAt'> {
  if (typeof exp !== 'number' || !Number.isFinite(exp)) return {};
  const expiresAt = Math.floor(exp * 1000);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= 0) return {};
  return { expiresAt };
}
