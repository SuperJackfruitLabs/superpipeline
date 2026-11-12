import { z } from 'zod';

/**
 * Why a claim handed out nothing, or why an agent is not eligible for a card.
 *
 * One vocabulary for both answers, because both come from one filter (`apps/api/src/board/claims.ts`):
 * a claim that returns `{claimed: false}` names the FIRST reason it met, and the eligibility read
 * names every reason that applies to each agent. The codes are stable; a client must tolerate a code
 * it does not know, since a later release adds more (a reservation, `card_reserved`, is next).
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
]);
export type ClaimReason = z.infer<typeof ClaimReason>;
