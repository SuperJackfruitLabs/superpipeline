/**
 * The reactive side of loading.ts: a pending gate a component (or a model built in one) reads, and the
 * one polite status line per screen that every skeleton reports to.
 */
import { onDestroy, untrack } from 'svelte';
import { PendingClock, SKELETON_DELAY_MS, SLOW_MS, type PendingPhase } from './loading';

export interface Pending {
  /** Draw the loading form (reserved space; skeleton bars once `skeleton`). */
  readonly busy: boolean;
  /** The skeleton is showing: 150 ms in, held at least 300 ms. */
  readonly skeleton: boolean;
  /** Still pending after 8 s. */
  readonly slow: boolean;
}

/**
 * Follow `get()` (true while a read is pending) through the skeleton clock. Must be called during
 * component initialisation (it owns effects). The first value is read synchronously, so the first
 * frame is already the loading form, never a flash of "nothing".
 */
export function pending(get: () => boolean): Pending {
  const s = $state<{ phase: PendingPhase; slow: boolean }>({ phase: 'idle', slow: false });
  const clock = new PendingClock((next) => { s.phase = next.phase; s.slow = next.slow; });
  clock.set(untrack(get));
  $effect.pre(() => { clock.set(get()); });
  $effect(() => () => clock.dispose());
  return {
    get busy() { return s.phase !== 'idle'; },
    get skeleton() { return s.phase === 'showing' || s.phase === 'holding'; },
    get slow() { return s.slow; },
  };
}

export type LoadPhase = 'idle' | 'skeleton' | 'slow' | 'failed' | 'ready';

/**
 * Where a list read stands, for a model that owns one (Crew and Settings). `value` is the list (null
 * until a read worked), `failed` that the last read failed. While nothing is known the phase is
 * `idle` (reserve the space), then `skeleton` from 150 ms, then `slow` from 8 s, when the page says
 * the server is slow and offers Try again: a skeleton is never where a wait rests. A list once read
 * stays `ready` through a later refresh or a failed one; `failed` is only for a list never read.
 *
 * Usable from a model built in a component or on its own (tests): the clock lives in its own effect
 * root, closed with the component when there is one.
 */
export function loadState(get: () => { value: unknown; failed: boolean }): { readonly phase: LoadPhase } {
  const t = $state({ skeleton: false, slow: false });
  const waiting = () => { const s = get(); return s.value === null && !s.failed; };
  const stop = $effect.root(() => {
    $effect(() => {
      if (waiting()) {
        const show = setTimeout(() => { t.skeleton = true; }, SKELETON_DELAY_MS);
        const slow = setTimeout(() => { t.slow = true; }, SLOW_MS);
        return () => { clearTimeout(show); clearTimeout(slow); };
      }
      t.skeleton = t.slow = false;
      return undefined;
    });
  });
  try { onDestroy(stop); } catch { /* built outside a component: lives as long as the model */ }
  return {
    get phase(): LoadPhase {
      const s = get();
      if (s.value !== null) return 'ready';
      if (s.failed) return 'failed';
      return t.slow ? 'slow' : t.skeleton ? 'skeleton' : 'idle';
    },
  };
}

/**
 * The screen's one polite status line for loading (drawn once, in +layout.svelte). Each skeleton
 * adds its words while it is up; the line says the first, and from 8 s on, that the server is slow.
 */
class LoadingStatus {
  #items = $state<{ id: number; label: string; since: number }[]>([]);
  #next = 0;
  now = $state(Date.now());
  #tick: ReturnType<typeof setInterval> | undefined;

  add(label: string): () => void {
    const id = ++this.#next;
    this.#items.push({ id, label, since: Date.now() });
    this.#watch();
    return () => {
      this.#items = this.#items.filter((i) => i.id !== id);
      this.#watch();
    };
  }
  #watch(): void {
    if (typeof window === 'undefined') return;
    if (this.#items.length > 0 && this.#tick === undefined) {
      this.now = Date.now();
      this.#tick = setInterval(() => { this.now = Date.now(); }, 1000);
    } else if (this.#items.length === 0 && this.#tick !== undefined) {
      clearInterval(this.#tick);
      this.#tick = undefined;
    }
  }
  get label(): string { return this.#items[0]?.label ?? ''; }
  get slow(): boolean {
    const first = this.#items.reduce((t, i) => Math.min(t, i.since), Infinity);
    return this.#items.length > 0 && this.now - first >= SLOW_MS;
  }
}

export const loadingStatus = new LoadingStatus();
