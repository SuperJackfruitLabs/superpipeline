/**
 * Reconnect: sign in again without losing your place.
 *
 * The Worker's /auth/callback always lands on "/", and changing that is an API change this
 * redesign does not make. So the page remembers where it was, in this tab only, and goes back
 * there once after sign-in. Only same-origin app paths are honoured: anything else in the slot
 * is ignored rather than followed.
 */
export const RETURN_KEY = 'superpipeline.returnTo';
const SAFE = /^\/(b\/[A-Za-z0-9_-]+(\/(c\/[A-Za-z0-9_-]+|operate(\/telemetry)?|settings))?|workspace(\/[a-z-]+)?)\/?(\?[^#]*)?$/;

export function reconnect(
  navigate: (url: string) => void = (url) => globalThis.location.assign(url),
  here: string = globalThis.location ? location.pathname + location.search : '/',
): void {
  try { sessionStorage.setItem(RETURN_KEY, here); } catch { /* no storage: you land on your board instead */ }
  navigate('/auth/login');
}

export function takeReturnTo(storage: Storage | undefined = globalThis.sessionStorage): string | null {
  if (!storage) return null;
  let v: string | null = null;
  try {
    v = storage.getItem(RETURN_KEY);
    storage.removeItem(RETURN_KEY);
  } catch {
    return null;
  }
  return v && SAFE.test(v) ? v : null;
}
