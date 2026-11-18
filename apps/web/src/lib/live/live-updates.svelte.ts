// apps/web/src/lib/live/live-updates.svelte.ts
/**
 * Whether live updates apply as they arrive or wait behind the masthead's Live toggle.
 *
 * A stub with the final shape, so the shell's Live toggle compiles and draws: pausing marks the
 * pill Paused, but nothing queues yet (`push` applies at once). Task B8 replaces this file with the
 * real queue (paused diffs held, counted and applied together).
 */
export class LiveUpdates {
  live = $state(true);
  queued = $state<Array<() => void>>([]);
  pause(): void { this.live = false; }
  resume(): void { this.live = true; }
  apply(): void {}
  push(fn: () => void): void { fn(); }
}

export const liveUpdates = new LiveUpdates();
