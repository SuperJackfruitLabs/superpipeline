// apps/web/src/lib/live/live-updates.svelte.ts
/**
 * Whether live updates apply as they arrive or wait behind the masthead's Live toggle (contract
 * rule 10). Every live handler hands its change to `push`: live, it runs at once; paused, it waits
 * in `queued` (one entry per key), which the pill counts, until Apply or resuming plays the queue in order. Nothing is
 * dropped while paused.
 *
 * The choice is the person's and is remembered in this browser (`superpipeline.liveUpdates` =
 * `on` | `paused`). Storage that refuses (a private window) leaves the toggle working, unremembered.
 */
export const LIVE_UPDATES_KEY = 'superpipeline.liveUpdates';

function remembered(): boolean {
  try {
    return globalThis.localStorage?.getItem(LIVE_UPDATES_KEY) !== 'paused';
  } catch {
    return true;
  }
}
function remember(live: boolean): void {
  try {
    globalThis.localStorage?.setItem(LIVE_UPDATES_KEY, live ? 'on' : 'paused');
  } catch {
    /* a private window: the choice lasts as long as the page */
  }
}

/** One held change: `key` names what it updates, so a later change to the same thing replaces it. */
export interface QueuedUpdate { key: string; fn: () => void }

export class LiveUpdates {
  live = $state(remembered());
  /** What waits while paused, one entry per key (the pill counts these). */
  queued = $state<QueuedUpdate[]>([]);

  pause(): void {
    this.live = false;
    remember(false);
  }
  /** Plays what waited, then goes live again. */
  resume(): void {
    this.apply();
    this.live = true;
    remember(true);
  }
  /** Plays the queue in the order it arrived and empties it; stays paused. */
  apply(): void {
    const run = this.queued;
    this.queued = [];
    for (const q of run) q.fn();
  }
  /**
   * Runs `fn` now when live, otherwise queues it under `key`. A key already waiting keeps its place
   * and takes the latest `fn` (a board read again replaces its older read), so a long pause holds one
   * entry per board, not one per event. Incremental changes use a key of their own each (`feed:<seq>`).
   */
  push(key: string, fn: () => void): void {
    if (this.live) { fn(); return; }
    const at = this.queued.findIndex((q) => q.key === key);
    if (at === -1) this.queued.push({ key, fn });
    else this.queued[at] = { key, fn };
  }
}

export const liveUpdates = new LiveUpdates();
