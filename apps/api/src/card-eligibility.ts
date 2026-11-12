// Who could claim a card now, and why not: the body a person's route and a service's route share.
import type { BoardStub } from './board/board-do';
import { listAgents } from './db/catalog';
import { expand, listImplications } from './db/implications';
import type { Env } from './env';
import { flatError } from './flat-error';

/**
 * The eligibility body for one card: every agent in the board's workspace (superpipeline keeps no
 * per-board roster; an agent's capabilities are workspace-wide), each judged by the claim's own
 * filter. Capabilities are expanded through the workspace's implication edges here, at the Worker
 * boundary, exactly as a claim expands them; the board's concurrency limit is the agent's
 * `agents.concurrency` column, the ceiling a claim is held to.
 *
 * Its refusals are `NOT_INITIALIZED` and `CARD_NOT_FOUND`, both a 404.
 */
export async function eligibilityResponse(env: Env, tenantId: string, stub: BoardStub, cardId: string): Promise<Response> {
  const [agents, edges] = await Promise.all([listAgents(env.DB, tenantId), listImplications(env.DB, tenantId)]);
  const result = await stub.cardEligibility({
    cardId,
    agents: agents.map((a) => ({
      agentId: a.id,
      name: a.name,
      principalId: a.externalId,
      capabilities: expand(a.capabilities, edges),
      maxConcurrency: a.concurrency,
    })),
  });
  if (!result.ok) return Response.json({ error: flatError(result) }, { status: 404 });
  return Response.json(result.value);
}
