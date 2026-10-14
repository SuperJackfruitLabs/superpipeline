/**
 * Loading, empty and failed: the three states every surface has, never mixed (loading-audit REPORT,
 * design rules). Loading draws the shape of the content with no numbers and no "nothing" words; empty
 * is only said after a read that worked came back with nothing; failed says it could not load and
 * offers Try again. A failed read is never drawn as empty.
 *
 * Timing: a skeleton appears only after 150 ms (a fast answer shows no flash) and, once shown, stays
 * at least 300 ms (no flicker). At 8 s the screen adds "Still loading — the server is slow."; at 20 s
 * a read gives up (api.ts aborts it) and the surface turns to Failed with Try again.
 */

export const SKELETON_DELAY_MS = 150;
export const SKELETON_MIN_MS = 300;
export const SLOW_MS = 8_000;
/** A read still unanswered after this is aborted (api.ts) and the surface says it failed. */
export const REQUEST_TIMEOUT_MS = 20_000;

export const SLOW_COPY = 'Still loading — the server is slow.';
export const UNREACHABLE_COPY = "Couldn't reach Superpipeline. Your boards are safe.";
export const MISSING_BOARD_COPY = "This board doesn't exist or isn't shared with you.";
export const TRY_AGAIN = 'Try again';

export type Outcome = 'loading' | 'ready' | 'empty' | 'failed';

/** What a read's state means for the page: loading until it answered, failed before empty. */
export function outcomeOf(s: { loaded: boolean; failed: boolean; count: number }): Outcome {
  if (s.failed) return 'failed';
  if (!s.loaded) return 'loading';
  return s.count === 0 ? 'empty' : 'ready';
}

/** A read the server refused, with its status: 404/403 is "not there for you", the rest "could not load". */
export class ApiError extends Error {
  constructor(readonly what: string, readonly status: number) {
    super(`${what} failed (${status})`);
    this.name = 'ApiError';
  }
}

/** The HTTP status a failure carries, when it carries one (an ApiError, or an older "x failed (404)" message). */
export function statusOf(e: unknown): number | null {
  if (e instanceof ApiError) return e.status;
  const m = /\((\d{3})\)/.exec(e instanceof Error ? e.message : String(e ?? ''));
  return m ? Number(m[1]) : null;
}

export type FailKind = 'missing' | 'failed';

/** 404 and 403 mean the thing is not there for this person; anything else (5xx, network, timeout) is a failure to load. */
export function failKind(e: unknown): FailKind {
  const s = statusOf(e);
  return s === 404 || s === 403 ? 'missing' : 'failed';
}

/** "Couldn't load comments." — the Failed sentence for one section. */
export const couldNotLoad = (what: string): string => `Couldn't load ${what}.`;

/** A count while it is pending: no number at all (never 0). */
export const PENDING_COUNT = '–';
export const countOrDash = (n: number, loaded: boolean): string => (loaded ? String(n) : PENDING_COUNT);

/** The live feed's state: connecting (first open), live, reconnecting (only after a drop) or offline. */
export type Connection = 'connecting' | 'live' | 'reconnecting' | 'offline';

export function connectionOf(s: { open: boolean; everOpened: boolean; online: boolean }): Connection {
  if (!s.online) return 'offline';
  if (s.open) return 'live';
  return s.everOpened ? 'reconnecting' : 'connecting';
}

export interface LiveView { state: 'live' | 'reconnecting' | 'offline'; label: string; detail?: string; attrs: Record<string, string> }

/**
 * The connection pill. Connecting is ink, not the warning colour (nothing went wrong yet); only a
 * drop says Reconnecting. vibekit's LiveDot knows live/reconnecting/offline, so connecting borrows
 * the calm offline form with its own words.
 */
export function liveView(c: Connection, quiet = false): LiveView {
  const stop = quiet ? '.' : '';
  if (c === 'live') return { state: 'live', label: `Live${stop}`, detail: quiet ? 'Changes appear as they happen.' : 'changes appear as they happen', attrs: { 'data-live': 'on', 'data-conn': c } };
  if (c === 'reconnecting') return { state: 'reconnecting', label: 'Reconnecting…', attrs: { 'data-live': 'off', 'data-conn': c } };
  if (c === 'offline') return { state: 'offline', label: 'Offline — showing what you had', attrs: { 'data-live': 'off', 'data-conn': c } };
  return { state: 'offline', label: 'Connecting…', attrs: { 'data-live': 'off', 'data-conn': c } };
}

export type PendingPhase = 'idle' | 'waiting' | 'showing' | 'holding';
export interface PendingState { phase: PendingPhase; slow: boolean }
interface Timers { set(fn: () => void, ms: number): unknown; clear(id: unknown): void; now(): number }
const realTimers: Timers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
  now: () => Date.now(),
};

/**
 * The skeleton's clock. `set(true)` starts a wait; after 150 ms the skeleton shows; `set(false)`
 * before then ends it with nothing shown; after it showed, the skeleton holds until it has been up
 * 300 ms. At 8 s `slow` turns on. `busy` (any phase but idle) is when the page draws its loading form.
 */
export class PendingClock {
  #s: PendingState = { phase: 'idle', slow: false };
  #shownAt = 0;
  #show: unknown;
  #slow: unknown;
  #hold: unknown;
  constructor(private readonly onChange: (s: PendingState) => void, private readonly t: Timers = realTimers) {}

  get state(): PendingState { return this.#s; }

  #emit(next: Partial<PendingState>): void {
    this.#s = { ...this.#s, ...next };
    this.onChange(this.#s);
  }
  #clear(): void {
    for (const id of [this.#show, this.#slow, this.#hold]) if (id !== undefined) this.t.clear(id);
    this.#show = this.#slow = this.#hold = undefined;
  }

  set(pending: boolean): void {
    const { phase } = this.#s;
    if (pending) {
      if (phase === 'waiting' || phase === 'showing') return;
      if (phase === 'holding') {
        if (this.#hold !== undefined) this.t.clear(this.#hold);
        this.#hold = undefined;
        this.#emit({ phase: 'showing' });
        return;
      }
      this.#show = this.t.set(() => { this.#show = undefined; this.#shownAt = this.t.now(); this.#emit({ phase: 'showing' }); }, SKELETON_DELAY_MS);
      this.#slow = this.t.set(() => { this.#slow = undefined; this.#emit({ slow: true }); }, SLOW_MS);
      this.#emit({ phase: 'waiting', slow: false });
      return;
    }
    if (phase === 'idle' || phase === 'holding') return;
    const left = phase === 'showing' ? this.#shownAt + SKELETON_MIN_MS - this.t.now() : 0;
    this.#clear();
    if (left > 0) {
      this.#hold = this.t.set(() => { this.#hold = undefined; this.#emit({ phase: 'idle' }); }, left);
      this.#emit({ phase: 'holding', slow: false });
    } else this.#emit({ phase: 'idle', slow: false });
  }

  dispose(): void { this.#clear(); }
}
