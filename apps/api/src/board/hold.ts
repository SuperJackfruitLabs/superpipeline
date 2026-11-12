import type { CardReservation } from '@superpipeline/contract';
import type { Row } from './model';

/**
 * A reservation (a hold): a card kept for one agent for a short while, because a placement service
 * chose it. Soft, visible and self-expiring. It is checked inside the claim, never in the shared
 * `claimableWhere`: discovery and push must still show the card to the agent it is held for.
 *
 * A hold is LIVE while its time has not passed and the card is still at the stage it was made for.
 * Nothing sweeps: a dead hold is ignored by every reader, and overwritten or cleared by the next
 * writer.
 */

/**
 * SQL: the card aliased `c` carries a live hold. One `?`, the current time in milliseconds.
 */
export function liveHoldWhere(): string {
  return `(c.reserved_for IS NOT NULL AND c.reserved_until_ms > ? AND c.reserved_stage_key IS c.current_stage_key)`;
}

/** Whether this card row carries a live hold at `nowMs`. The JS twin of `liveHoldWhere`. */
export function isLiveHold(row: Row, nowMs: number): boolean {
  return (
    typeof row.reserved_for === 'string' &&
    Number(row.reserved_until_ms) > nowMs &&
    row.reserved_stage_key === row.current_stage_key
  );
}

/** The live hold on this card row, as readers see it, or null. */
export function reservationOf(row: Row, nowMs: number): CardReservation | null {
  if (!isLiveHold(row, nowMs) || typeof row.reserved_for !== 'string') return null;
  return {
    agentId: row.reserved_for,
    reservedUntil: new Date(Number(row.reserved_until_ms)).toISOString(),
    decisionId: typeof row.reserved_decision_id === 'string' ? row.reserved_decision_id : '',
    reservedBy: typeof row.reserved_by === 'string' ? row.reserved_by : '',
  };
}

/** SQL that clears a card's hold, live or dead. One `?`, the card id. */
export const CLEAR_HOLD_SQL = `UPDATE cards SET reserved_for = NULL, reserved_until_ms = NULL, reserved_stage_key = NULL, reserved_decision_id = NULL, reserved_by = NULL WHERE id = ?`;
