import { logout } from '$lib/api';

/**
 * Sign out, from wherever the person is.
 *
 * One function because three places offer it — the rail, the phone's bottom-nav menu and the
 * command palette — and they must not drift: a reload after the session cookie is cleared is what
 * drops the app back to the landing page.
 */
export async function signOut(): Promise<void> {
  clearSessionDrafts();
  await logout();
  location.reload();
}

/** The name of the theme the toggle would switch TO — what the control does, not what is on. */
export function otherThemeLabel(theme: 'dark' | 'light'): string {
  return theme === 'dark' ? 'Light theme' : 'Dark theme';
}

/** What this tab kept for the signed-in person: half-typed notes and which card sections were open. */
const PERSONAL_KEYS = ['sp:draft:', 'sp:card-open:'];

/** Forget it on sign-out, so the next person on this tab never sees it. */
export function clearSessionDrafts(store: Storage | undefined = globalThis.sessionStorage): void {
  try {
    if (!store) return;
    const keys: string[] = [];
    for (let i = 0; i < store.length; i++) { const k = store.key(i); if (k && PERSONAL_KEYS.some((p) => k.startsWith(p))) keys.push(k); }
    for (const k of keys) store.removeItem(k);
  } catch { /* storage blocked: nothing kept */ }
}
