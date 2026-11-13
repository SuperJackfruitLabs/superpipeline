import { logError } from '../log';
import { type ClaimsDeps, notifyWorkAvailable, readyAt } from './claims';
import { cardReadyBody, placementWindowMs } from './placement-window';
import { queueRelay } from './push';

/**
 * A card just became ready to be claimed: every place that puts a card back in an agent's queue
 * (created, moved, returned, resumed, re-queued after a failed or reclaimed run, unblocked) calls
 * this, as the board's `notifyWorkAvailable`.
 *
 * On a board with a placement window (`placement-window.ts`) the card records when it became ready,
 * which opens its window, and `card.ready` is queued for the event relay and sent at once, so the
 * placement service can reserve the card inside the window. Then, on every board, the agents that
 * could claim it are pinged with `work.available`, as before.
 *
 * Making or clearing a reservation pings too (`reservations.ts`), but calls `notifyWorkAvailable`
 * itself: a hold changes who may take a card, not when it became ready, so it opens no window.
 */
export function cardBecameReady(deps: ClaimsDeps, cardId: string): void {
  openPlacementWindow(deps, cardId);
  notifyWorkAvailable(deps, cardId);
}

/**
 * The window half alone, for a card a person moved into an agent stage: that move has never pinged
 * `work.available` (agents find the card on their next poll), and still does not, but on a board
 * opted into scheduling it opens the card's window like any other way of becoming ready.
 */
export function openPlacementWindow(deps: ClaimsDeps, cardId: string): void {
  const windowMs = placementWindowMs(deps);
  // A board with no window reads its setting and nothing else.
  if (windowMs <= 0) return;
  const boardId = deps.getMeta('boardId');
  const ready = boardId ? readyAt(deps, cardId) : null;
  if (ready && boardId) {
    const nowMs = deps.nowMs();
    deps.sql.exec(`UPDATE cards SET ready_since_ms = ? WHERE id = ?`, nowMs, cardId);
    queueRelay(deps, cardReadyBody({ boardId, cardId, stageKey: ready.stage.key, readyAtMs: nowMs, windowMs }));
    // The alarm drains it now rather than after the usual first delay (`scheduleReclaim`).
    void deps.scheduleReclaim().catch((err) => logError('card.ready: alarm not armed', String(err)));
  }
}
