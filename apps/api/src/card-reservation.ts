// Holding a card for one agent, and clearing the hold: the bodies a service's route and a person's share.
import type { BoardStub } from './board/board-do';
import { reservationInputError } from './board/reservations';
import { listAgents } from './db/catalog';
import { expand, listImplications } from './db/implications';
import type { Env } from './env';

/**
 * The reservation refusals' statuses: the same as `routes/errors.ts` gives these codes (that file
 * sits above this one, so it is not imported).
 */
const statusFor = (code: string): number =>
  code === 'INVALID_RESERVATION' ? 400 : code === 'CARD_NOT_FOUND' || code === 'NOT_INITIALIZED' ? 404 : 409;

const refuse = (status: number, code: string, message: string, detail?: Record<string, unknown>) =>
  Response.json({ error: { code, message, ...(detail ? { detail } : {}) } }, { status });

/**
 * `PUT …/cards/:cardId/reservation` `{agentId, ttlSeconds?, decisionId}`: hold the card for an agent
 * of this workspace. The agent is judged as the eligibility read judges it (`card-eligibility.ts`):
 * capabilities expanded through the workspace's implication edges, `agents.concurrency` as its
 * ceiling. 200 with the reservation; 400 for a malformed body, 404 for an unknown agent or card,
 * 409 for a card or agent that cannot take it now, or a card already held for someone else.
 */
export async function reserveResponse(env: Env, tenantId: string, stub: BoardStub, cardId: string, reservedBy: string, body: unknown): Promise<Response> {
  if (!body || typeof body !== 'object') return refuse(400, 'INVALID_RESERVATION', 'expected a JSON object');
  const { agentId, ttlSeconds, decisionId } = body as { agentId?: unknown; ttlSeconds?: unknown; decisionId?: unknown };
  if (typeof agentId !== 'string' || agentId === '') return refuse(400, 'INVALID_RESERVATION', '`agentId` is required');
  const shape = reservationInputError({ ttlSeconds, decisionId });
  if (shape) return refuse(400, 'INVALID_RESERVATION', shape);
  // Already checked by `reservationInputError`; narrowed here for the compiler.
  if (typeof decisionId !== 'string' || (ttlSeconds !== undefined && typeof ttlSeconds !== 'number')) return refuse(400, 'INVALID_RESERVATION', 'malformed reservation');
  const [agents, edges] = await Promise.all([listAgents(env.DB, tenantId), listImplications(env.DB, tenantId)]);
  const a = agents.find((x) => x.id === agentId);
  if (!a) return refuse(404, 'AGENT_NOT_FOUND', `no agent ${agentId} in this workspace`);
  const result = await stub.reserveCard({
    cardId,
    agent: { agentId: a.id, name: a.name, principalId: a.externalId, capabilities: expand(a.capabilities, edges), maxConcurrency: a.concurrency },
    ttlSeconds,
    decisionId,
    reservedBy,
  });
  if (!result.ok) return refuse(statusFor(result.code), result.code, result.message, result.detail);
  return Response.json({ reservation: result.value });
}

/** `DELETE …/cards/:cardId/reservation`: clear the hold, if any. 204 either way; 404 for an unknown card. */
export async function clearReservationResponse(stub: BoardStub, cardId: string, by: string): Promise<Response> {
  const result = await stub.clearReservation({ cardId, by });
  if (!result.ok) return refuse(statusFor(result.code), result.code, result.message);
  return new Response(null, { status: 204 });
}
