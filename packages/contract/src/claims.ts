import { z } from 'zod';

/**
 * Why a claim handed out nothing, or why an agent is not eligible for a card.
 *
 * One vocabulary for both answers, because both come from one filter (`apps/api/src/board/claims.ts`):
 * a claim that returns `{claimed: false}` names the FIRST reason it met, and the eligibility read
 * names every reason that applies to each agent. The codes are stable; a client must tolerate a code
 * it does not know, since a later release may add more.
 *
 * Each code says something about this board, this card or the asking agent only — never about
 * another workspace.
 *
 * - `board_not_initialized` — the board does not exist (claim only).
 * - `board_over_budget` — the board reached its spending ceiling and hands out no new work.
 * - `concurrency_reached` — the agent already holds as many working runs on this board as it may.
 * - `capability_mismatch` — no stage (claim), or not this card's stage (eligibility), is one the
 *   agent can take: its capability, a `requires` set, or an agent-owned stage naming someone else.
 *   Capabilities include those the workspace's implication edges add.
 * - `no_matching_card` — the agent could take some stage, but no card there is ready (claim only).
 * - `grant_denied` — whoever queued the card may not dispatch this agent. On a claim the card is
 *   also parked for a person, as before.
 * - `card_not_ready` — the card is not waiting to be claimed: in progress, finished, waiting on a
 *   person, or archived (eligibility only).
 * - `card_held_back` — the card waits on an unresolved blocker or an open sub-task (eligibility only).
 * - `stage_not_agent_claimable` — the card's stage belongs to a person (eligibility only).
 * - `card_reserved` — the card is held for another agent until its reservation lapses
 *   (`CardReservation`). On a claim it is the reason only when nothing else was claimable: a held
 *   card is skipped, and the claimant gets the next card it may take.
 */
export const ClaimReason = z.enum([
  'board_not_initialized',
  'board_over_budget',
  'concurrency_reached',
  'capability_mismatch',
  'no_matching_card',
  'grant_denied',
  'card_not_ready',
  'card_held_back',
  'stage_not_agent_claimable',
  'card_reserved',
]);
export type ClaimReason = z.infer<typeof ClaimReason>;

/**
 * A card held for one agent for a short while: a placement service chose that agent, and until
 * `reservedUntil` every other claimant passes the card over. It outranks priority for the agent it
 * is held for, expires on its own (an expired hold is no hold, and is never shown), applies only
 * at the stage it was made for, and is cleared when the card is claimed.
 *
 * - `agentId` — the agent the card is held for (`agt_…`).
 * - `reservedUntil` — when the hold lapses (ISO 8601).
 * - `decisionId` — the placement decision that asked for it, so a hold can be traced to its reason.
 * - `reservedBy` — the service principal that made it.
 */
export const CardReservation = z.object({
  agentId: z.string(),
  reservedUntil: z.string(),
  decisionId: z.string(),
  reservedBy: z.string(),
});
export type CardReservation = z.infer<typeof CardReservation>;

/** How long a hold may last, in seconds: short, because another idle agent waits it out. */
export const RESERVATION_TTL_SECONDS = { min: 10, max: 300, default: 60 } as const;
