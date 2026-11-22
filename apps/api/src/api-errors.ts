// The one shape of an API error, and the one status each code carries.
//
// Every refusal or failure a route answers is `{ "error": { "code", "message", "detail"? } }`, treaty's
// `schemas/common/error.v1.json`. This file is the only place that body is built: a route calls
// `refuse` (a code it chose) or `refusal` (a result the board returned), never `Response.json` with
// an `error` of its own.
import type { BoardErrorCode } from './board/board-do';

/**
 * The codes a route answers itself, beside the board's own (`BoardErrorCode`), with their statuses.
 * Each is in treaty's `contracts/error-codes.json` under the same status, except those its test
 * (`test/error-codes-registry.test.ts`) lists as not yet registered.
 */
export const ROUTE_ERROR_STATUS = {
  // No credential, or one that is not accepted here.
  UNAUTHORIZED: 401,
  // A credential that is accepted, refused this act: a role, a scope, a principal kind.
  FORBIDDEN: 403,
  // A body that is not JSON at all.
  INVALID_JSON: 400,
  // JSON that is not the object the route reads.
  INVALID_BODY: 400,
  // An object with a field out of shape.
  INVALID_INPUT: 400,
  INVALID_WAIT_ID: 400,
  BOARD_NOT_FOUND: 404,
  UNKNOWN_RUN_ACTION: 404,
  METHOD_NOT_ALLOWED: 405,
  CHECKPOINT_SETTLEMENT_TOO_LARGE: 413,
  CHECKPOINT_SOURCE_TOO_LARGE: 413,
  UNEXPECTED: 500,
  EVIDENCE_LINK_UNAVAILABLE: 503,
  // Card fields a person or an agent sends.
  INVALID_DUE_AT: 400,
  INVALID_ARCHIVED_AT: 400,
  INVALID_LABELS: 400,
  UNKNOWN_LABEL: 400,
  INVALID_PROJECT: 400,
  UNKNOWN_PROJECT: 400,
  MILESTONE_NOT_IN_PROJECT: 400,
  INVALID_PRECONDITION: 400,
  INVALID_INTRO: 400,
  // Links between cards, and the advisory cross-board store (`db/card-links-external.ts`).
  INVALID_LINK: 400,
  INVALID_LINK_KIND: 400,
  PARENT_MUST_BE_SAME_BOARD: 400,
  SELF_EDGE: 400,
  BAD_KIND: 400,
  FOREIGN_BOARD: 404,
  SAME_BOARD_EDGE: 500,
  // An agent composing or queueing work (`auth/agent-queue.ts`, `routes/boards/collection.ts`).
  FIELD_NOT_COMPOSABLE: 403,
  AGENT_NOT_FOUND: 404,
  AGENT_HAS_NO_OWNER: 403,
  AGENT_QUEUE_POLICY_UNKNOWN: 403,
  AGENT_CANNOT_SET_OWNER: 403,
  BOARD_NOT_PERMITTED: 403,
  DISPATCH_GRANT_UNKNOWN: 403,
  NO_DISPATCH_AUTHORITY: 403,
  QUEUE_CEILING_REACHED: 429,
  BOARD_CEILING_REACHED: 429,
} as const satisfies Record<string, number>;

export type RouteErrorCode = keyof typeof ROUTE_ERROR_STATUS;
/** Every code the API answers. */
export type ApiErrorCode = BoardErrorCode | RouteErrorCode;

const isRouteCode = (code: string): code is RouteErrorCode => Object.hasOwn(ROUTE_ERROR_STATUS, code);

/** The status a code carries, wherever it is answered. */
export function statusFor(code: ApiErrorCode): number {
  return isRouteCode(code) ? ROUTE_ERROR_STATUS[code] : statusForCode(code);
}

/** A refusal as the board returns it, or as a route builds it. */
export interface Refusal {
  ok?: false;
  code: ApiErrorCode;
  message: string;
  detail?: Record<string, unknown>;
}

/**
 * The error body. `detail` is carried under `detail` and, for the readers written before it was,
 * also beside `code` (a gate's `reason`, `decidedBy`, `decidedAt`, `via`; a held approval's
 * `releaseAt`). `code`, `message` and `ok` always win: a detail key may add to the body but never
 * rewrite what the refusal is, so a careless detail cannot turn one error into another.
 */
export function errorBody(r: Refusal): { error: Record<string, unknown> & { code: string; message: string } } {
  const { detail, ...rest } = r;
  return { error: { ...detail, ...rest, ...(detail ? { detail } : {}) } };
}

/** Refuse with a code the route chose. The status is the code's own unless `status` says otherwise. */
export function refuse(code: ApiErrorCode, message: string, opts: { detail?: Record<string, unknown>; status?: number } = {}): Response {
  return Response.json(errorBody({ code, message, ...(opts.detail ? { detail: opts.detail } : {}) }), { status: opts.status ?? statusFor(code) });
}

/** Answer a refusal the board returned, `ok: false` included. The status is the code's own unless given. */
export function refusal(r: Refusal, status?: number): Response {
  return Response.json(errorBody(r), { status: status ?? statusFor(r.code) });
}

/** A request body read as JSON: the value, or the 400 to answer instead. */
export type JsonBody = { ok: true; value: unknown } | { ok: false; response: Response };

/**
 * Read a request's JSON body. Malformed JSON is 400 `INVALID_JSON`, never a 500 and never read as
 * something else. With `emptyAs`, a request with no body at all reads as that value.
 */
export async function readJson(request: Request, opts: { emptyAs?: unknown } = {}): Promise<JsonBody> {
  const text = await request.text();
  if (text.trim() === '' && 'emptyAs' in opts) return { ok: true, value: opts.emptyAs };
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, response: refuse('INVALID_JSON', 'the request body is not valid JSON') };
  }
}

/** Read a request body that must be a JSON object: malformed JSON is `INVALID_JSON`, anything else `INVALID_BODY`. */
export async function readObject(request: Request): Promise<{ ok: true; value: Record<string, unknown> } | { ok: false; response: Response }> {
  const sent = await readJson(request);
  if (!sent.ok) return sent;
  if (sent.value === null || typeof sent.value !== 'object' || Array.isArray(sent.value)) {
    return { ok: false, response: refuse('INVALID_BODY', 'the request body must be a JSON object') };
  }
  return { ok: true, value: sent.value as Record<string, unknown> };
}

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
    case 'CHECKPOINT_SETTLEMENT_DISABLED':
    case 'CHECKPOINT_RECEIPT_MISSING':
      return 404;
    case 'INVALID_CHECKPOINT':
    case 'INVALID_CHECKPOINT_REFERENCE':
      return 400;
    case 'CHECKPOINT_CONFLICT':
    case 'COMPLETION_REQUIRED':
    case 'APPROVAL_SUBJECT_REQUIRED':
      return 409;
    case 'INVALID_COMPLETION_STATE':
    case 'INVALID_CHECKPOINT_STATE':
    case 'CHECKPOINT_SETTLEMENT_FAILED':
    case 'CHECKPOINT_RECEIPT_NOT_SAVED':
    case 'INVALID_CHECKPOINT_RECEIPT':
    case 'CHECKPOINT_REFERENCE_MAPPING_REQUIRED':
    case 'CHECKPOINT_REFERENCE_NOT_SAVED':
      return 500;
    case 'CHECKPOINT_SOURCE_DISABLED':
    case 'CHECKPOINT_SOURCE_MISSING':
      return 404;
    case 'NOT_CHECKPOINT_REPORTER':
      return 403;
    case 'INVALID_CHECKPOINT_SOURCE':
      return 400;
    case 'CHECKPOINT_SOURCE_CONFLICT':
      return 409;
    case 'CHECKPOINT_SOURCE_NOT_SAVED':
    case 'CHECKPOINT_SOURCE_FAILED':
      return 500;
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
    case 'INVALID_APPROVAL_REQUEST':
      return 400;
    case 'BUDGET_EXCEEDED':
      return 402; // Payment Required — the board/card budget cap was reached
    case 'INVALID_STRICT_DECISION':
    case 'INVALID_ANSWER':
    case 'INVALID_ELICITATION':
      return 400;
    case 'CARD_NOT_FOUND':
    case 'RUN_NOT_FOUND':
    case 'NOT_INITIALIZED':
    case 'GATE_NOT_FOUND':
    case 'ELICITATION_NOT_FOUND':
    case 'SCHEDULE_NOT_FOUND':
    case 'NO_SUCH_CARD':
    case 'APPROVAL_REQUEST_NOT_FOUND':
    case 'CHECK_NOT_FOUND':
      return 404;
    case 'CHECKPOINT_REQUIRED':
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
    // Already counted on this quorum gate: the state the caller believed in, not a bad request.
    case 'QUORUM_ALREADY_APPROVED':
    // An approval held for its release time, already released, never held, or one whose release
    // time falls after its subject's expiry: each a conflict with the gate's state or the subject's
    // own timing, not a malformed request (charter 2026-11-09, release time).
    case 'APPROVAL_HELD':
    case 'APPROVAL_RELEASED':
    case 'GATE_NOT_HELD':
    case 'APPROVAL_RELEASE_AFTER_EXPIRY':
    // A check that already passed or was overridden, or whose arrival is over: a conflict with the
    // state the caller believed in (charter 2026-11-09, a gate may be decided by checks, decision 5).
    case 'CHECK_NOT_OPEN':
    case 'ELICITATION_NOT_PENDING':
    case 'CARD_NOT_WAITING':
    // A late tap on a wait that has ended: the card stopped waiting, or waits on something else.
    case 'WAIT_CHANGED':
    // A broker's idempotency key, replayed for a different request.
    case 'REQUEST_ID_CONFLICT':
    // The stage still holds cards. A conflict with the state the caller believed in, not a
    // malformed request: the same payload succeeds once the stage is emptied.
    case 'STAGE_NOT_EMPTY':
    // A reservation asked of a card or an agent that cannot take it now, or of a card already held
    // for someone else: the state the placement service read has moved on (dispatch, step 1).
    case 'CARD_NOT_CLAIMABLE':
    case 'AGENT_NOT_ELIGIBLE':
    case 'CARD_RESERVED':
      return 409;
    case 'INVALID_RESERVATION':
    case 'INVALID_SCHEDULING':
      return 400;
    case 'WORKSPACE_ADMIN_REQUIRED':
    case 'SEPARATION_OF_DUTIES':
    case 'CHECK_OVERRIDE_NOT_ALLOWED':
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
    case 'INVALID_TIMEOUT':
      return 400;
    case 'QUESTION_PENDING':
    case 'GATE_PENDING':
      return 409;
  }
}

