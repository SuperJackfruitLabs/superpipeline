import { type CardReservation, RESERVATION_TTL_SECONDS } from '@superpipeline/contract';
import { type ClaimsDeps, type EligibilityCandidate, cardEligibility, notifyWorkAvailable } from './claims';
import { CLEAR_HOLD_SQL, reservationOf } from './hold';
import type { Result } from './model';

/**
 * Making and clearing a reservation (`hold.ts`): a placement service holds a ready card for the
 * agent it chose, for a short while (charter: SuperDispatch owns the scheduler, decision 2). The
 * claim enforces the hold; this file only writes it.
 */

export interface ReserveInput {
  cardId: string;
  /** The agent to hold the card for, judged by the claim's own filter before anything is written. */
  agent: EligibilityCandidate;
  ttlSeconds?: number;
  /** The placement decision asking for the hold. */
  decisionId: string;
  /** The service principal making it. */
  reservedBy: string;
}

/** A decision id: short, printable, no spaces. */
const DECISION_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;

/** Why a reservation body is out of shape, or null. Shared by the route and the board. */
export function reservationInputError(input: { ttlSeconds?: unknown; decisionId?: unknown }): string | null {
  if (typeof input.decisionId !== 'string' || !DECISION_ID.test(input.decisionId)) {
    return '`decisionId` is required: up to 128 letters, digits and `_.:-`';
  }
  const ttl = input.ttlSeconds;
  if (ttl !== undefined && (typeof ttl !== 'number' || !Number.isInteger(ttl) || ttl < RESERVATION_TTL_SECONDS.min || ttl > RESERVATION_TTL_SECONDS.max)) {
    return `\`ttlSeconds\` must be a whole number from ${RESERVATION_TTL_SECONDS.min} to ${RESERVATION_TTL_SECONDS.max}`;
  }
  return null;
}

/**
 * Hold a card for one agent. Refused when the card may not be claimed by anyone now
 * (`CARD_NOT_CLAIMABLE`), when the agent may not claim it (`AGENT_NOT_ELIGIBLE`), both judged by the
 * eligibility read, and when a live hold for another agent from another decision is in place
 * (`CARD_RESERVED`). The same decision may move its own hold to another agent, and a hold for the
 * same agent is replaced (a renewal). The agent it is held for is pinged with `work.available`.
 */
export async function reserveCard(deps: ClaimsDeps, input: ReserveInput): Promise<Result<CardReservation>> {
  const shape = reservationInputError(input);
  if (shape) return { ok: false, code: 'INVALID_RESERVATION', message: shape };
  const judged = await cardEligibility(deps, { cardId: input.cardId, agents: [input.agent] });
  if (!judged.ok) return judged;
  const { reasons, agents } = judged.value;
  if (reasons.length > 0) {
    return { ok: false, code: 'CARD_NOT_CLAIMABLE', message: `no agent may claim this card now: ${reasons.join(', ')}`, detail: { reasons } };
  }
  // The hold already on the card is judged next, by its own rule, not as an eligibility reason.
  const mine = agents[0].reasons.filter((r) => r !== 'card_reserved');
  if (mine.length > 0) {
    return { ok: false, code: 'AGENT_NOT_ELIGIBLE', message: `${input.agent.agentId} may not claim this card now: ${mine.join(', ')}`, detail: { reasons: mine } };
  }
  const nowMs = deps.nowMs();
  const row = deps.sql.exec(`SELECT * FROM cards WHERE id = ?`, input.cardId).one();
  const held = reservationOf(row, nowMs);
  if (held && held.agentId !== input.agent.agentId && held.decisionId !== input.decisionId) {
    return { ok: false, code: 'CARD_RESERVED', message: `this card is held for ${held.agentId} until ${held.reservedUntil}`, detail: { reservation: held } };
  }
  const ttl = input.ttlSeconds ?? RESERVATION_TTL_SECONDS.default;
  deps.sql.exec(
    `UPDATE cards SET reserved_for = ?, reserved_until_ms = ?, reserved_stage_key = current_stage_key, reserved_decision_id = ?, reserved_by = ? WHERE id = ?`,
    input.agent.agentId,
    nowMs + ttl * 1000,
    input.decisionId,
    input.reservedBy,
    input.cardId,
  );
  const reservation = reservationOf(deps.sql.exec(`SELECT * FROM cards WHERE id = ?`, input.cardId).one(), nowMs);
  if (!reservation) throw new Error(`reservation on ${input.cardId} did not read back`);
  deps.emit('card.reserved', { cardId: input.cardId, ...reservation });
  notifyWorkAvailable(deps, input.cardId);
  return { ok: true, value: reservation };
}

/**
 * Clear a card's hold, live or lapsed. Idempotent: a card with none answers `cleared: false`.
 * `by` names who cleared it, for the event log.
 */
export function clearReservation(deps: ClaimsDeps, input: { cardId: string; by: string }): Result<{ cleared: boolean }> {
  if (!deps.getMeta('boardId')) return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  const row = deps.sql.exec(`SELECT * FROM cards WHERE id = ?`, input.cardId).toArray()[0];
  if (!row) return { ok: false, code: 'CARD_NOT_FOUND', message: `card not found: ${input.cardId}` };
  const live = reservationOf(row, deps.nowMs());
  if (row.reserved_for !== null && row.reserved_for !== undefined) deps.sql.exec(CLEAR_HOLD_SQL, input.cardId);
  if (!live) return { ok: true, value: { cleared: false } };
  deps.emit('card.unreserved', { cardId: input.cardId, agentId: live.agentId, decisionId: live.decisionId, by: input.by });
  // The others may claim it now; tell the ones who could.
  notifyWorkAvailable(deps, input.cardId);
  return { ok: true, value: { cleared: true } };
}
