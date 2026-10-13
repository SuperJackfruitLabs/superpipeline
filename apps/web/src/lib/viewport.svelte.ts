// apps/web/src/lib/viewport.svelte.ts
/**
 * The two widths that change layout. Below 900px the shell and the board use their phone forms;
 * below 640px the card does. Superpipeline keeps 900 for the shell (shell-and-board X-6) and hands
 * PHONE_QUERY to vibekit's AppShell (`phoneQuery`) and `usePhone`, so the two are named apart.
 */
export const PHONE_QUERY = '(max-width: 899.98px)';
export const NARROW_QUERY = '(max-width: 639.98px)';

function watch(query: string, set: (matches: boolean) => void): void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
  const mq = window.matchMedia(query);
  set(mq.matches);
  mq.addEventListener('change', (e) => set(e.matches));
}

class ViewportStore {
  phone = $state(false);
  narrow = $state(false);
  constructor() {
    watch(PHONE_QUERY, (m) => (this.phone = m));
    watch(NARROW_QUERY, (m) => (this.narrow = m));
  }
}

export const viewport = new ViewportStore();
