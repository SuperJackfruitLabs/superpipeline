// Approval gates and questions: the pending reads, deciding and answering.
import { viaFor } from '../../auth/resolve';
import type { GateDecision } from '../../board/board-do';
import { principalIdsFor } from '../../db/catalog';
import { flatError } from '../../flat-error';
import { statusForCode } from '../errors';
import type { BoardRequest } from './request';

// GET /v1/boards/:id/gates/pending — every gate still waiting on a human.
//
// The read half of the hub's reconciliation sweep (`charter →
// decisions/2026-08-30-a-gate-closes-over-chat.md` §5). Push carries a
// gate when it opens and dead-letters after five attempts; this is how a
// gate that was never delivered is found rather than waited for.
export async function gatesPending({ stub }: BoardRequest): Promise<Response> {
  return Response.json({ gates: await stub.pendingGateDeliveries() });
}

// GET /v1/boards/:id/gates/:gateId — one gate, including how it was decided.
export async function gateRead({ stub }: BoardRequest, oneGate: RegExpMatchArray): Promise<Response> {
  const result = await stub.getGate(oneGate[1]);
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  return Response.json({ gate: result.value });
}

// POST /v1/boards/:id/gates/:gateId/resolve — the signed-in human resolves an approval gate (docs/08 §6)
export async function gateResolve({ request, env, tenantId, user, agent, stub }: BoardRequest, gateMatch: RegExpMatchArray): Promise<Response> {
  const gp = (await request.json()) as {
    decision: GateDecision;
    comment?: string;
    approvalSubjectId?: string;
    approvalSubjectDigest?: string;
  };
  const localDeciderId = user?.userId ?? 'usr_dev';
  const gateView = await stub.getGate(gateMatch[1]);
  const principalIds =
    gateView.ok && gateView.value.approvalSubject
      ? await principalIdsFor(env.DB, tenantId, [localDeciderId])
      : new Map<string, string>();
  const result = await stub.resolveGate({
    gateId: gateMatch[1],
    decision: gp.decision,
    decidedBy: principalIds.get(localDeciderId) ?? localDeciderId,
    comment: gp.comment,
    approvalSubjectId: gp.approvalSubjectId,
    approvalSubjectDigest: gp.approvalSubjectDigest,
    // From who is calling, never from the body: a caller cannot claim another surface.
    via: viaFor(user, agent),
  });
  if (!result.ok) return Response.json({ error: flatError(result) }, { status: statusForCode(result.code) });
  return Response.json({ card: result.value });
}

// POST /v1/boards/:id/gates/:gateId/delivery — alter delivery, never approved bytes.
export async function gateDelivery({ request, env, tenantId, user, stub }: BoardRequest, deliveryMatch: RegExpMatchArray): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { mode?: unknown; liveUrl?: unknown; remindAt?: unknown } | null;
  if (!body || typeof body !== 'object') {
    return Response.json({ error: { code: 'INVALID_APPROVAL_DELIVERY', message: 'Expected a JSON object.' } }, { status: 400 });
  }
  if (body.mode !== undefined && body.mode !== 'manual' && body.mode !== 'automatic') {
    return Response.json(
      { error: { code: 'INVALID_APPROVAL_DELIVERY', message: 'mode must be manual or automatic' } },
      { status: 400 },
    );
  }
  if (body.liveUrl !== undefined && typeof body.liveUrl !== 'string') {
    return Response.json({ error: { code: 'INVALID_LIVE_URL', message: 'liveUrl must be a string' } }, { status: 400 });
  }
  if (body.remindAt !== undefined && typeof body.remindAt !== 'string') {
    return Response.json({ error: { code: 'INVALID_APPROVAL_DELIVERY', message: 'remindAt must be a string' } }, { status: 400 });
  }
  const localActorId = user?.userId ?? 'usr_dev';
  const principalIds = await principalIdsFor(env.DB, tenantId, [localActorId]);
  const result = await stub.updateApprovalDelivery({
    gateId: deliveryMatch[1],
    actor: principalIds.get(localActorId) ?? localActorId,
    ...(body.mode !== undefined ? { mode: body.mode } : {}),
    ...(body.liveUrl !== undefined ? { liveUrl: body.liveUrl } : {}),
    ...(body.remindAt !== undefined ? { remindAt: body.remindAt } : {}),
  });
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  return Response.json({ card: result.value, delivery: result.value.delivery });
}

// GET /v1/boards/:id/elicitations/pending — every question still waiting on a human.
//
// The read half of a projection's reconciliation sweep, and the mirror of
// `gates/pending` above. Push carries a question when it opens and dead-letters
// after five attempts; this is how a question that was never delivered is found
// rather than waited for.
//
// It also carries a meaning the gate version does not need as badly: a question is
// retired by the next question on the same card, so ABSENCE from this list is how a
// reader learns that a question it already showed can no longer be answered.
//
// Matched before the answer route below, which it cannot collide with — that one
// ends in `/answer` — but kept adjacent so the pair reads together.
export async function elicitationsPending({ stub }: BoardRequest): Promise<Response> {
  return Response.json({ elicitations: await stub.pendingElicitationDeliveries() });
}

// POST /v1/boards/:id/elicitations/:elicitationId/answer — the signed-in human answers an
// agent's question (docs/04 §4), which returns the card to `working` and unblocks the agent.
//
// Deliberately a *human* route: agent tokens authenticate `claims` and `runs/*` only, so an
// agent cannot reach this at all — and the DO refuses the asking agent's identity besides, so
// the rule holds on every surface rather than only at this door.
export async function elicitationAnswer({ request, user, stub }: BoardRequest, answerMatch: RegExpMatchArray): Promise<Response> {
  const ap = (await request.json()) as { option?: string; text?: string };
  const result = await stub.answerElicitation({
    elicitationId: answerMatch[1],
    answeredBy: user?.userId ?? 'usr_dev',
    // The role from the server's own session read: the only thing that may choose "Always allow".
    answererRole: user?.role ?? null,
    option: ap.option,
    text: ap.text,
  });
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  return Response.json(result.value);
}
