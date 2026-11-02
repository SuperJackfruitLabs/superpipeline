/**
 * What every request to the API shares: the dev workspace and person, the lost-session handler,
 * the one `fetch` (with its read timeout) and the headers. The deployed app authenticates with a
 * session cookie (sent automatically, same-origin); the `X-Tenant-Id` header is a no-op there and
 * only enables the local dev workspace (when the server runs with DEV_AUTH on).
 */
import { REQUEST_TIMEOUT_MS } from '../loading';
import { allowsLocalFixtures } from '../local-fixtures';

/** Dev or literal loopback only: production-bundle rehearsals can select a local fixture person. */
const devRead = (k: string): string | null => {
  if (!allowsLocalFixtures(import.meta.env.DEV, globalThis.location?.hostname ?? '')) return null;
  try {
    return globalThis.localStorage?.getItem(k) ?? null;
  } catch {
    return null;
  }
};
export const TENANT = devRead('superpipeline.devTenant') || 'tnt_dev';
export const DEV_USER = devRead('superpipeline.devUser');

/**
 * What to do when the server says the session is gone.
 *
 * `authState` is decided once, at `init()`, and never revisited — so a session that expires while
 * a tab is open leaves the app certain it is signed in while every request 401s. What a person
 * sees then is a board that has stopped updating and buttons that do nothing, with no statement
 * anywhere that they are signed out. A gate rejected from another client, a card that will not
 * move, a live feed that never reconnects: all the same silence.
 *
 * Registered by the store, called from the reads that run on a timer and the writes a person
 * clicks — enough that an expired session is noticed within one refresh rather than never.
 */
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

/** Pass every response through this. Returns it untouched, so it can wrap a call in place. */
export function noteAuth(res: Response): Response {
  if (res.status === 401) onUnauthorized?.();
  return res;
}
/**
 * Every request in this module goes through here (it shadows the global `fetch`). A read (GET) that
 * has not answered in REQUEST_TIMEOUT_MS is aborted, so a server that never answers ends in Failed
 * with Try again instead of loading forever. Writes are never aborted: one may still land.
 */
export function fetch(input: string, init: RequestInit = {}): Promise<Response> {
  const read = !init.method || init.method === 'GET';
  const timeout = read && !init.signal && typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(REQUEST_TIMEOUT_MS) : undefined;
  return globalThis.fetch(input, timeout ? { ...init, signal: timeout } : init);
}

export const headers: Record<string, string> = {
  'X-Tenant-Id': TENANT,
  'Content-Type': 'application/json',
  ...(DEV_USER ? { 'X-User-Id': DEV_USER } : {}),
};
