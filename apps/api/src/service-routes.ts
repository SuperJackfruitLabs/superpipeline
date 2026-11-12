import type { Env } from './env';
import { APPROVAL_REQUESTS_READ, APPROVAL_REQUESTS_RELAY, APPROVAL_REQUESTS_WRITE, APPROVALS_READ, APPROVALS_WRITE, CARDS_READ, DISPATCH_READ, GATES_READ, PUSH_WRITE, resolveHubService } from './auth/resolve';
import { boardStub } from './board/stub';
import { boardNamesById, cardLinksBody } from './card-links';
import { listBoards } from './db/catalog';
import { eligibilityResponse } from './card-eligibility';
import { flatError } from './flat-error';
import { DECISION_EVENTS, SUBSCRIBABLE_EVENTS, isRecordEvent } from './push/events';

/**
 * A service (Superlibrary) reading boards and cards, and registering a push config. Every answer
 * has the JSON the human route answers, so a consumer sees one shape whoever asks. The tenant comes
 * from the service token, so a board in another tenant is simply not found.
 */
const READS = /^\/v1\/boards(?:\/(brd_[0-9a-f]{16})(?:\/cards\/(card_[0-9a-f]{16})(?:\/(attempts|comments|links|activities))?)?)?$/;
const PUSH = /^\/v1\/boards\/(brd_[0-9a-f]{16})\/push-configs$/;
const APPROVAL = /^\/v1\/boards\/(brd_[0-9a-f]{16})\/approval-subjects\/(aps_[0-9a-f]{16})\/verify$/;
const APPROVAL_REQUESTS = /^\/v1\/boards\/(brd_[0-9a-f]{16})\/approval-requests$/;
const APPROVAL_REQUEST = /^\/v1\/boards\/(brd_[0-9a-f]{16})\/approval-requests\/(apr_[0-9a-f]{16})$/;
const QUESTIONS_PENDING = /^\/v1\/boards\/(brd_[0-9a-f]{16})\/elicitations\/pending$/;
/** `gates/pending`, or one gate (`gate_<hex>`, which `pending` never matches). */
const GATES = /^\/v1\/boards\/(brd_[0-9a-f]{16})\/gates\/(pending|gate_[0-9a-f]{16})$/;
/** The same sweep's other reads: manual deliveries still owed a link, and cards waiting on a person. */
const FOLLOW_UPS = /^\/v1\/boards\/(brd_[0-9a-f]{16})\/(deliveries|attention)\/pending$/;
/** A card's checks, which the carrier reads to escalate a check left open too long. */
const CHECKS = /^\/v1\/boards\/(brd_[0-9a-f]{16})\/cards\/(card_[0-9a-f]{16})\/checks$/;
/** Who could claim a card now, and why not: a placement service's candidate filter. */
const ELIGIBILITY = /^\/v1\/boards\/(brd_[0-9a-f]{16})\/cards\/(card_[0-9a-f]{16})\/eligibility$/;
const APPROVAL_DELIVERY = /^\/v1\/boards\/(brd_[0-9a-f]{16})\/approval-subjects\/(aps_[0-9a-f]{16})\/delivery$/;

/** Decoded without verifying, only to route: resolveHubService verifies before anything is read. */
function looksLikeService(request: Request): boolean {
  const m = (request.headers.get('Authorization') ?? '').match(/^Bearer\s+([^.\s]+)\.([^.\s]+)\.[^.\s]+$/);
  if (!m) return false;
  try {
    const b64 = m[2].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))).principalKind === 'service';
  } catch {
    return false;
  }
}

const refuse = (status: number, code: string, message: string) => Response.json({ error: { code, message } }, { status });
/** The status of an approval-request refusal; the same as `routes/errors.ts` gives these codes. */
const requestStatus = (code: string) => (code === 'INVALID_APPROVAL_REQUEST' ? 400 : code === 'REQUEST_ID_CONFLICT' ? 409 : 404);
const notFound = (what: string) => Response.json({ error: `${what} not found` }, { status: 404 });

export async function serviceRoute(request: Request, env: Env, path: string): Promise<Response | null> {
  const read = request.method === 'GET' ? READS.exec(path) : null;
  const push = request.method === 'POST' ? PUSH.exec(path) : null;
  const approval = request.method === 'POST' ? APPROVAL.exec(path) : null;
  const approvalDelivery = request.method === 'POST' ? APPROVAL_DELIVERY.exec(path) : null;
  const requestCreate = request.method === 'POST' ? APPROVAL_REQUESTS.exec(path) : null;
  const requestRead = request.method === 'GET' ? APPROVAL_REQUEST.exec(path) : null;
  const questions = request.method === 'GET' ? QUESTIONS_PENDING.exec(path) : null;
  const gates = request.method === 'GET' ? GATES.exec(path) : null;
  const followUps = request.method === 'GET' ? FOLLOW_UPS.exec(path) : null;
  const checks = request.method === 'GET' ? CHECKS.exec(path) : null;
  const eligibility = request.method === 'GET' ? ELIGIBILITY.exec(path) : null;
  if ((!read && !push && !approval && !approvalDelivery && !requestCreate && !requestRead && !questions && !gates && !followUps && !checks && !eligibility) || !looksLikeService(request)) {
    return null;
  }

  const svc = await resolveHubService(request, env);
  if (!svc) return refuse(401, 'UNAUTHORIZED', 'a service token for a mapped workspace is required');

  /**
   * The decision carrier's sweep: every question waiting on a person, broker approval requests
   * included. Only a service holding `approval-requests:relay` reads it here; an agent's read of the
   * same path lists card questions only, since a request's preview carries every argument in full.
   */
  if (questions) {
    if (!svc.scopes.includes(APPROVAL_REQUESTS_RELAY)) return refuse(403, 'FORBIDDEN', 'this principal does not hold approval-requests:relay');
    const [, boardId] = questions;
    if (!(await boardNamesById(env.DB, svc.tenantId, [boardId])).has(boardId)) return notFound('board');
    return Response.json({ elicitations: await boardStub(env, svc.tenantId, boardId).pendingElicitationDeliveries({ approvalRequests: true }) });
  }

  /**
   * The chat carrier's gate sweep: the board's pending gates, and one gate with how it was decided,
   * so a gate decided on the web is settled in the room too. Only on `gates:read`, and only GET:
   * deciding, pulling back and delivery stay on the human routes, which a service token never reaches.
   */
  if (gates) {
    if (!svc.scopes.includes(GATES_READ)) return refuse(403, 'FORBIDDEN', 'this principal does not hold gates:read');
    const [, boardId, which] = gates;
    if (!(await boardNamesById(env.DB, svc.tenantId, [boardId])).has(boardId)) return notFound('board');
    const stub = boardStub(env, svc.tenantId, boardId);
    if (which === 'pending') return Response.json({ gates: await stub.pendingGateDeliveries() });
    const result = await stub.getGate(which);
    // Its one refusal is GATE_NOT_FOUND, a 404 as on the human route.
    return result.ok ? Response.json({ gate: result.value }) : Response.json({ error: result }, { status: 404 });
  }

  /**
   * The rest of the carrier's sweep, on the same `gates:read` and GET only: manual deliveries still
   * owed their live link, and cards waiting on a person. Recording a link, switching the mode,
   * resuming and archiving stay on the human routes.
   */
  if (followUps) {
    if (!svc.scopes.includes(GATES_READ)) return refuse(403, 'FORBIDDEN', 'this principal does not hold gates:read');
    const [, boardId, which] = followUps;
    if (!(await boardNamesById(env.DB, svc.tenantId, [boardId])).has(boardId)) return notFound('board');
    const stub = boardStub(env, svc.tenantId, boardId);
    if (which === 'deliveries') return Response.json({ deliveries: await stub.pendingDeliveryFollowUps() });
    return Response.json({ attention: await stub.pendingAttention() });
  }

  /**
   * A card's checks, on the same `gates:read` and GET only, with the body and refusals of the human
   * route: the carrier reads them to escalate a check left open too long. Overriding a check stays
   * on the human route.
   */
  if (checks) {
    if (!svc.scopes.includes(GATES_READ)) return refuse(403, 'FORBIDDEN', 'this principal does not hold gates:read');
    const [, boardId, cardId] = checks;
    if (!(await boardNamesById(env.DB, svc.tenantId, [boardId])).has(boardId)) return notFound('board');
    const result = await boardStub(env, svc.tenantId, boardId).cardChecks(cardId);
    // Its refusals are CARD_NOT_FOUND and NOT_INITIALIZED, both a 404 on the human route too.
    return result.ok ? Response.json({ checks: result.value }) : Response.json({ error: flatError(result) }, { status: 404 });
  }

  /**
   * Who could claim a card now, and why not, on `dispatch:read` and GET only: the filter a
   * placement service ranks candidates after. The person's route answers the same body.
   */
  if (eligibility) {
    if (!svc.scopes.includes(DISPATCH_READ)) return refuse(403, 'FORBIDDEN', 'this principal does not hold dispatch:read');
    const [, boardId, cardId] = eligibility;
    if (!(await boardNamesById(env.DB, svc.tenantId, [boardId])).has(boardId)) return notFound('board');
    return eligibilityResponse(env, svc.tenantId, boardStub(env, svc.tenantId, boardId), cardId);
  }

  /**
   * A broker's approval request (charter: waiting cards and broker approvals reach chat §3), on
   * scopes of its own so no other service credential (a publisher's `approvals:*`) can raise one.
   * Created on `approval-requests:write`; read back on `approval-requests:read` (or write): the
   * broker reads with a separate read credential, which is a different service principal, so a
   * read is not limited to the creator. Idempotency is per creating principal.
   */
  if (requestCreate || requestRead) {
    const [, boardId, approvalRequestId] = requestCreate ?? requestRead ?? [];
    if (requestCreate && !svc.scopes.includes(APPROVAL_REQUESTS_WRITE)) return refuse(403, 'FORBIDDEN', 'this principal does not hold approval-requests:write');
    if (requestRead && !svc.scopes.includes(APPROVAL_REQUESTS_READ) && !svc.scopes.includes(APPROVAL_REQUESTS_WRITE)) {
      return refuse(403, 'FORBIDDEN', 'this principal holds neither approval-requests:read nor approval-requests:write');
    }
    if (!boardId || !(await boardNamesById(env.DB, svc.tenantId, [boardId])).has(boardId)) return notFound('board');
    const stub = boardStub(env, svc.tenantId, boardId);
    if (requestRead && approvalRequestId) {
      const found = await stub.getApprovalRequest(approvalRequestId);
      return found.ok ? Response.json(found.value) : refuse(requestStatus(found.code), found.code, found.message);
    }
    const body: unknown = await request.json().catch(() => null);
    const created = await stub.createApprovalRequest({ requestedBy: svc.principalId, body });
    if (!created.ok) return refuse(requestStatus(created.code), created.code, created.message);
    const { approvalRequestId: id, state } = created.value.approvalRequest;
    return created.value.created ? Response.json({ approvalRequestId: id, state }, { status: 201 }) : Response.json({ approvalRequestId: id, state });
  }

  if (read) {
    if (!svc.scopes.includes(CARDS_READ)) return refuse(403, 'FORBIDDEN', 'this principal does not hold cards:read');
    const [, boardId, cardId, sub] = read;
    if (!boardId) return Response.json({ boards: await listBoards(env.DB, svc.tenantId) });
    if (!(await boardNamesById(env.DB, svc.tenantId, [boardId])).has(boardId)) return notFound('board');
    const stub = boardStub(env, svc.tenantId, boardId);
    if (!cardId) {
      const snapshot = await stub.getState();
      return snapshot.boardId ? Response.json(snapshot) : notFound('board');
    }
    if (!sub) {
      const r = await stub.getCardView(cardId);
      return r.ok ? Response.json({ card: r.value }) : Response.json({ error: r }, { status: 404 });
    }
    if (sub === 'attempts') return Response.json({ attempts: await stub.getAttempts(cardId) });
    if (sub === 'links') return Response.json(await cardLinksBody(env, svc.tenantId, stub, cardId));
    if (sub === 'activities') return Response.json(await stub.getCardActivities(cardId));
    const c = await stub.listComments(cardId);
    return c.ok ? Response.json({ comments: c.value }) : Response.json({ error: c }, { status: 404 });
  }

  if (approval) {
    if (!svc.scopes.includes(APPROVALS_READ)) return refuse(403, 'FORBIDDEN', 'this principal does not hold approvals:read');
    const [, boardId, subjectId] = approval;
    if (!(await boardNamesById(env.DB, svc.tenantId, [boardId])).has(boardId)) return notFound('board');
    const body: unknown = await request.json().catch(() => null);
    if (typeof body !== 'object' || body === null || !('expectedDigest' in body) || typeof body.expectedDigest !== 'string') {
      return refuse(400, 'INVALID_BODY', 'expectedDigest is required');
    }
    const result = await boardStub(env, svc.tenantId, boardId).confirmApprovalSubject({ subjectId, expectedDigest: body.expectedDigest });
    return result.ok ? Response.json(result.value) : refuse(403, result.code, result.message);
  }

  if (approvalDelivery) {
    if (!svc.scopes.includes(APPROVALS_WRITE)) return refuse(403, 'FORBIDDEN', 'this principal does not hold approvals:write');
    const [, boardId, subjectId] = approvalDelivery;
    if (!(await boardNamesById(env.DB, svc.tenantId, [boardId])).has(boardId)) return notFound('board');
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || !('expectedDigest' in body) || typeof body.expectedDigest !== 'string' || !('liveUrl' in body) || typeof body.liveUrl !== 'string') {
      return refuse(400, 'INVALID_BODY', 'expectedDigest and liveUrl are required');
    }
    const stub = boardStub(env, svc.tenantId, boardId);
    const confirmed = await stub.confirmApprovalSubject({ subjectId, expectedDigest: body.expectedDigest });
    if (!confirmed.ok) return refuse(403, confirmed.code, confirmed.message);
    if (!confirmed.value.approved) return refuse(403, 'APPROVAL_SUBJECT_NOT_VERIFIED', 'automatic delivery approval was not confirmed');
    if ('gateId' in body && typeof body.gateId === 'string' && body.gateId !== confirmed.value.gateId) {
      return refuse(403, 'APPROVAL_SUBJECT_NOT_VERIFIED', 'gate does not match the confirmed approval');
    }
    const result = await stub.recordAutomaticDelivery({
      gateId: confirmed.value.gateId,
      subjectId,
      expectedDigest: body.expectedDigest,
      actor: `svc:${svc.principalId}`,
      liveUrl: body.liveUrl,
    });
    return result.ok ? Response.json(result.value) : refuse(403, result.code, result.message);
  }

  const boardId = push![1];
  if (!(await boardNamesById(env.DB, svc.tenantId, [boardId])).has(boardId)) return notFound('board');
  const body = (await request.json().catch(() => null)) as { url?: unknown; token?: unknown; events?: unknown } | null;
  if (
    !body || typeof body.url !== 'string' || typeof body.token !== 'string' || body.token === '' ||
    !Array.isArray(body.events) || body.events.length === 0 ||
    !body.events.every((e): e is string => typeof e === 'string')
  ) {
    return refuse(400, 'INVALID_BODY', 'url, token and events are required');
  }
  const unknown = body.events.filter((e) => !SUBSCRIBABLE_EVENTS.has(e));
  if (unknown.length > 0) return refuse(400, 'UNKNOWN_EVENT', `cannot subscribe to: ${unknown.join(', ')}`);
  if (!body.events.every((e) => isRecordEvent(e) || DECISION_EVENTS.has(e))) {
    return refuse(400, 'INVALID_BODY', 'a service may subscribe to record events, and with approval-requests:relay to the decision events');
  }
  // Record events on `push:write`; the decision events (approval requests among them) only for a
  // carrier holding `approval-requests:relay`.
  if (body.events.some(isRecordEvent) && !svc.scopes.includes(PUSH_WRITE)) return refuse(403, 'FORBIDDEN', 'this principal does not hold push:write');
  if (body.events.some((e) => DECISION_EVENTS.has(e)) && !svc.scopes.includes(APPROVAL_REQUESTS_RELAY)) {
    return refuse(403, 'FORBIDDEN', 'this principal does not hold approval-requests:relay');
  }
  const result = await boardStub(env, svc.tenantId, boardId).registerPushConfig({
    agentId: `svc:${svc.principalId}`,
    url: body.url,
    token: body.token,
    events: body.events,
  });
  return result.ok ? Response.json(result.value, { status: 201 }) : Response.json({ error: result }, { status: 400 });
}
