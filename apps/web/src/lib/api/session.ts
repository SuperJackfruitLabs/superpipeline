/** Who is signed in, renewing the session, signing out. */
import { fetch, headers } from './client';
import type { Role } from './members';

export interface User {
  userId: string;
  tenantId: string;
  /** This person's role in the workspace, as the server read it (memberships.role). */
  role?: Role | null;
  name?: string;
  login?: string;
  avatarUrl?: string;
}

/** The signed-in user, or null when signed out (drives the auth gate). */
export async function getMe(): Promise<User | null> {
  const res = await fetch('/auth/me', { headers });
  if (!res.ok) return null;
  return ((await res.json()) as { user: User | null }).user;
}

export type RenewReason = 'login_required' | 'no_refresh' | 'plane_unavailable' | 'unauthorized_after_renew';

export type RenewResult = { ok: true } | { ok: false; reason: RenewReason; issuer?: string; reauthorize?: string; retryable?: boolean };

/** Renew a lapsed session in the background (POST /hub/session). Never throws. */
export async function renewSession(): Promise<RenewResult> {
  let res: Response;
  try {
    res = await fetch('/hub/session', { method: 'POST', credentials: 'same-origin', headers });
  } catch {
    return { ok: false, reason: 'plane_unavailable', retryable: true };
  }
  if (res.status === 503) return { ok: false, reason: 'plane_unavailable', retryable: true };
  const body = (await res.json().catch(() => null)) as { ok?: boolean; reason?: string; issuer?: string; reauthorize?: string } | null;
  if (body?.ok === true) return { ok: true };
  if (body?.reason === 'login_required') return { ok: false, reason: 'login_required', ...(body.issuer ? { issuer: body.issuer } : {}), ...(body.reauthorize ? { reauthorize: body.reauthorize } : {}) };
  return { ok: false, reason: 'no_refresh' };
}

export async function logout(): Promise<void> {
  await fetch('/auth/logout', { method: 'POST', headers });
}
