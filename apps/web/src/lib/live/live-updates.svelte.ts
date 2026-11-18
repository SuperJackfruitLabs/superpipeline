// apps/web/src/lib/live/live-updates.svelte.ts
/**
 * Whether live updates apply as they arrive or wait behind the masthead's Live toggle (contract
 * rule 10). Every live handler hands its change to `push`: live, it runs at once; paused, it waits
 * in `queued`, which the pill counts, until Apply or resuming plays the queue in order. Nothing is
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

export class LiveUpdates {
  live = $state(remembered());
  queued = $state<Array<() => void>>([]);

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
    for (const fn of run) fn();
  }
  /** Runs `fn` now when live, otherwise queues it behind the pill's count. */
  push(fn: () => void): void {
    if (this.live) fn();
    else this.queued.push(fn);
  }
}

export const liveUpdates = new LiveUpdates();
