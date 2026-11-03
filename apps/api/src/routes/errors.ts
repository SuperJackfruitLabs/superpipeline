// How a refusal or a failure becomes a status: one code, one status, across the whole API.
import type { BoardErrorCode } from '../board/board-do';

/**
 * One code, one status, across the whole API. Every route that gets a `BoardErrorCode` back reads
 * its HTTP status from here — there is no second table anywhere that answers the same code
 * differently. A brief for Task 17a once asked for `NOT_INITIALIZED` to mean 409 on the link
 * routes specifically, while every other route here still answers it 404: a client cannot learn
 * "this code means X, except on these three routes where it means Y" from anything in this file,
 * so that request was wrong and this function stayed the single source of truth. If a future route
 * genuinely needs a code to carry a different status, that is a sign the DO should return a
 * different code for that case, not that this switch should grow a second entry for the same one.
 */
export function statusForCode(code: BoardErrorCode): number {
  switch (code) {
    case 'WIP_LIMIT':
      return 409;
    case 'UNKNOWN_STAGE':
    case 'INVALID_URL':
    case 'UNKNOWN_EVENT':
    case 'INVALID_DELIVERY':
    case 'INVALID_USAGE':
    case 'INVALID_STAGES':
    case 'INVALID_OUTCOME':
    case 'INVALID_APPROVAL_SUBJECT':
    case 'INVALID_APPROVAL_DELIVERY':
    case 'GATE_DECISION_NOT_ALLOWED':
    case 'INVALID_LIVE_URL':
      return 400;
    case 'BUDGET_EXCEEDED':
      return 402; // Payment Required — the board/card budget cap was reached
    case 'INVALID_STRICT_DECISION':
    case 'INVALID_ANSWER':
      return 400;
    case 'CARD_NOT_FOUND':
    case 'RUN_NOT_FOUND':
    case 'NOT_INITIALIZED':
    case 'GATE_NOT_FOUND':
    case 'ELICITATION_NOT_FOUND':
    case 'SCHEDULE_NOT_FOUND':
    case 'NO_SUCH_CARD':
      return 404;
    case 'STALE_LEASE':
    case 'GATE_NOT_PENDING':
    case 'APPROVAL_SUBJECT_MISMATCH':
    case 'APPROVAL_SUBJECT_NOT_VERIFIED':
    case 'APPROVAL_DELIVERY_NOT_AVAILABLE':
    case 'APPROVAL_DELIVERY_NOT_MANUAL':
    case 'APPROVAL_DELIVERY_STARTED':
    case 'APPROVAL_DELIVERY_DELIVERED':
    // The question was already settled (answered, or retired with its run) — a conflict with the
    // state the caller believed in, not a bad request. Retrying it will never succeed.
    case 'DECISION_EXPIRED':
    case 'DECISION_CONFLICT':
    case 'ELICITATION_NOT_PENDING':
    case 'CARD_NOT_WAITING':
    // The stage still holds cards. A conflict with the state the caller believed in, not a
    // malformed request: the same payload succeeds once the stage is emptied.
    case 'STAGE_NOT_EMPTY':
      return 409;
    case 'WORKSPACE_ADMIN_REQUIRED':
    case 'SEPARATION_OF_DUTIES':
    // The caller authenticated, but this run is another agent's: a permanent refusal of an
    // understood request, and deliberately NOT the 409 that means "your lease lapsed, re-claim".
    case 'NOT_RUN_OWNER':
    case 'APPROVAL_DECIDER_NOT_ALLOWED':
      return 403;
    case 'APPROVAL_SUBJECT_EXPIRED':
      return 410;
    case 'INVALID_SIGNATURE':
      return 401;
    case 'NOT_CONFIGURED':
      return 400;
    case 'INVALID_RULE':
    case 'INVALID_TIMEZONE':
    case 'INVALID_SCHEDULE':
      return 400;
    // A conflict with the graph the caller believed in, not a malformed request: the same payload
    // succeeds once the cycle is avoided or the existing parent edge is removed first.
    case 'LINK_WOULD_CYCLE':
    case 'ALREADY_HAS_PARENT':
    // Same shape: the same move succeeds once the open child resolves. Advancing is a refusal
    // (Task 13), not the exclusion `claim` uses, but it is still a conflict with the graph the
    // caller believed in, not a malformed request.
    case 'CARD_BLOCKED':
      return 409;
    // Malformed requests: too many lines, or nothing usable once stripped. The same payload will
    // never succeed unless the caller changes it, unlike the conflict codes above.
    case 'TOO_MANY_CHILDREN':
    case 'NOTHING_TO_SPLIT':
    case 'INVALID_COMMENT':
      return 400;
    case 'COMMENT_NOT_FOUND':
      return 404;
    // Both understood and permanently refused for THIS caller: someone else's comment, or a card
    // the agent's run does not hold.
    case 'NOT_COMMENT_AUTHOR':
    case 'NO_RUN_ON_CARD':
      return 403;
    // A failed precondition (`expectedUpdatedAt`): the card changed since the caller read it.
    // Re-read and retry; the same request will keep failing until it does.
    case 'CARD_CHANGED':
      return 409;
    // Resume refused for a reason the caller can act on: a later stage is a move (400); an open
    // question or review is answered or decided through its own form (409, the card's state).
    case 'INVALID_RESUME':
    case 'INVALID_STALE_SETTINGS':
      return 400;
    case 'QUESTION_PENDING':
    case 'GATE_PENDING':
      return 409;
  }
}

/**
 * Status mapping for Task 16's advisory D1 store (`db/card-links-external.ts`, `addExternalLink`'s
 * `AddResult['code']`) — a DIFFERENT code space from `BoardErrorCode` above, used in exactly one
 * place (the `toBoardId` arm of the `…/links` route below). That is why this is a second small
 * mapping function rather than a violation of "one code, one status": the duplicate-mapping mistake
 * `statusForCode` itself once made was the SAME code (`NOT_INITIALIZED`) getting two statuses. These
 * codes are not `BoardErrorCode` at all, so there is no second status for anything already mapped.
 */
export function statusForExternalLinkCode(code: string): number {
  switch (code) {
    case 'FOREIGN_BOARD':
      // The board exists but belongs to another tenant. 404, not 403 — a 403 would confirm the
      // board exists, which is a tenant-isolation leak by status code.
      return 404;
    case 'PARENT_MUST_BE_SAME_BOARD':
    case 'SELF_EDGE':
    case 'BAD_KIND':
      // The same payload can never succeed; the caller must change it.
      return 400;
    case 'SAME_BOARD_EDGE':
      // Unreachable through this route by construction — the route below sends a same-board edge
      // to the DO and never to `addExternalLink`. If this ever fires, the routing logic is broken,
      // not the caller's request, so the status says "our fault" rather than blaming them.
      return 500;
    default:
      return 500;
  }
}

/**
 * What an error nobody planned for looks like on the wire.
 *
 * One shape, shared by every route block, so a client can read a failure the
 * same way wherever it came from. `{ error: { message } }` rather than a bare
 * string because that is what the boards routes have always answered with and
 * the web app already parses.
 */
export function unexpected(err: unknown): Response {
  const message = (err as { message?: string })?.message ?? 'unexpected error';
  return Response.json({ error: { message } }, { status: 500 });
}

/** The answer for a path a route family owns, asked with a method it does not serve. */
export async function methodNotAllowed(): Promise<Response> {
  return Response.json({ error: 'method not allowed' }, { status: 405 });
}
