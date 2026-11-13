import { PLACEMENT_WINDOW_SECONDS } from '@superpipeline/contract';
import type { BoardContext } from './context';
import type { Result, Row } from './model';

/**
 * The placement window: on a board opted into scheduling, a card that just became ready is held
 * back from pull for a few seconds, so a placement service can reserve it for the agent it chooses
 * before an agent's poll takes it (charter: SuperDispatch owns the scheduler, decisions 2 and 9).
 *
 * - **Opt-in, per board.** A placement service sets `placementWindowSeconds` (1 to 30) when it opts
 *   the board in, and 0 when it opts out. A board with none (0, or never set) behaves as before: the
 *   claim's SQL is today's, no card records when it became ready, and nothing is relayed.
 * - **When a card becomes ready** (created in, moved or returned to an agent stage, queued again
 *   after a failed or reclaimed run, resumed, unblocked) on such a board, the card records
 *   `ready_since_ms` and the board relays `card.ready`, so the service reacts at once.
 * - **The claim** passes over a card inside its window (`ready_since_ms + window > now`) unless it is
 *   held for the claimant: a hold wins, as it does outside the window. A claimant with nothing else
 *   to take is told `placement_window`.
 * - **Nothing requires the service.** When no hold comes, the window ends on its own and pull
 *   proceeds; nothing sweeps.
 */

/** The meta key the board's window is kept under, in whole seconds. */
const META_KEY = 'placementWindowSeconds';

/** The board's placement window in milliseconds; 0 when it has none. */
export function placementWindowMs(deps: Pick<BoardContext, 'getMeta'>): number {
  const raw = Number(deps.getMeta(META_KEY));
  return Number.isInteger(raw) && raw > 0 && raw <= PLACEMENT_WINDOW_SECONDS.max ? raw * 1000 : 0;
}

/** The board's scheduling settings, as the route answers them. */
export interface SchedulingSettings {
  placementWindowSeconds: number;
}

export function schedulingSettings(deps: Pick<BoardContext, 'getMeta'>): SchedulingSettings {
  return { placementWindowSeconds: placementWindowMs(deps) / 1000 };
}

/** A scheduling body's window in seconds, or why the body is out of shape. */
export function readSchedulingInput(input: unknown): { ok: true; placementWindowSeconds: number } | { ok: false; message: string } {
  const value = typeof input === 'object' && input !== null && 'placementWindowSeconds' in input ? input.placementWindowSeconds : undefined;
  const { min, max } = PLACEMENT_WINDOW_SECONDS;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    return { ok: false, message: `\`placementWindowSeconds\` must be a whole number from ${min} to ${max}` };
  }
  return { ok: true, placementWindowSeconds: value };
}

/** Why a scheduling body is out of shape, or null. */
export function schedulingInputError(input: unknown): string | null {
  const read = readSchedulingInput(input);
  return read.ok ? null : read.message;
}

/** Set the board's placement window; 0 turns it off. `by` names who set it, for the event log. */
export function setPlacementWindow(
  deps: Pick<BoardContext, 'emit' | 'getMeta' | 'setMeta' | 'sql'>,
  input: { placementWindowSeconds: number; by: string },
): Result<SchedulingSettings> {
  if (!deps.getMeta('boardId')) return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  const shape = schedulingInputError(input);
  if (shape) return { ok: false, code: 'INVALID_SCHEDULING', message: shape };
  if (input.placementWindowSeconds === 0) {
    deps.sql.exec(`DELETE FROM meta WHERE k = ?`, META_KEY);
    // Off means off: no card is held back by a window that no longer exists.
    deps.sql.exec(`UPDATE cards SET ready_since_ms = NULL WHERE ready_since_ms IS NOT NULL`);
  } else {
    deps.setMeta(META_KEY, String(input.placementWindowSeconds));
  }
  const settings = schedulingSettings(deps);
  deps.emit('board.placement_window', { ...settings, by: input.by });
  return { ok: true, value: settings };
}

/**
 * SQL: the card aliased `c` is inside its placement window. Two `?`: the window in milliseconds,
 * then the current time in milliseconds. Only used while the board has a window.
 */
export function inWindowWhere(): string {
  return `(c.ready_since_ms IS NOT NULL AND c.ready_since_ms + ? > ?)`;
}

/** When this card's placement window ends (ISO), or null when it is not inside one at `nowMs`. */
export function placementWindowUntil(row: Row, windowMs: number, nowMs: number): string | null {
  if (windowMs <= 0 || row.ready_since_ms === null || row.ready_since_ms === undefined) return null;
  const until = Number(row.ready_since_ms) + windowMs;
  return until > nowMs ? new Date(until).toISOString() : null;
}

/**
 * `card.ready`, as relayed (treaty's `superpipeline/card.ready.v1.json`). `placementWindowUntil` is
 * the end of the window the card is held back for.
 */
export interface CardReadyBody {
  event: 'card.ready';
  boardId: string;
  cardId: string;
  stageKey: string;
  readyAt: string;
  placementWindowUntil?: string;
  ts: string;
}

export function cardReadyBody(input: { boardId: string; cardId: string; stageKey: string; readyAtMs: number; windowMs: number }): CardReadyBody {
  const readyAt = new Date(input.readyAtMs).toISOString();
  return {
    event: 'card.ready',
    boardId: input.boardId,
    cardId: input.cardId,
    stageKey: input.stageKey,
    readyAt,
    ...(input.windowMs > 0 ? { placementWindowUntil: new Date(input.readyAtMs + input.windowMs).toISOString() } : {}),
    ts: readyAt,
  };
}
