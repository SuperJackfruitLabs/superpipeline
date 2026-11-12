// Each agent's load and last heartbeat over every board of a workspace: a placement service's read.
import { boardStub } from './board/stub';
import { listAgents, listBoards } from './db/catalog';
import type { Env } from './env';

/** One agent of the workspace, with what it has in hand and when it was last heard from on a run. */
export interface AgentLoadEntry {
  agentId: string;
  principalId: string | null;
  /** Cards it holds now, summed over every board: claimed, not finished, not archived. */
  inFlight: number;
  /** The most cards it may hold at once (`agents.concurrency`), as a claim is held to it. */
  capacity: number;
  /** Its latest run heartbeat on any board (a claim sets the first), ISO; null when it never ran. */
  lastHeartbeatAt: string | null;
}

/**
 * The body of `GET /v1/agents/load`: every agent of the workspace, each with `inFlight`,
 * `capacity` and `lastHeartbeatAt`, summed over every board (each board's `agentLoad`).
 *
 * A board that does not answer fails the whole read (`LOAD_INCOMPLETE`, 503) rather than
 * undercount: a missing board would show a busy agent as idle, and a placement service would hold
 * work for it. The person's agent list (`GET /v1/agents`) skips such a board instead; it only
 * displays the counts.
 */
export async function agentLoadResponse(env: Env, tenantId: string): Promise<Response> {
  const [agents, boards] = await Promise.all([listAgents(env.DB, tenantId), listBoards(env.DB, tenantId)]);
  const loads = await Promise.allSettled(boards.map((b) => boardStub(env, tenantId, b.id).agentLoad()));
  const total = new Map<string, { inFlight: number; lastHeartbeatMs: number | null }>();
  for (const l of loads) {
    if (l.status !== 'fulfilled') {
      return Response.json({ error: { code: 'LOAD_INCOMPLETE', message: 'a board of this workspace did not answer; try again' } }, { status: 503 });
    }
    for (const [agentId, v] of Object.entries(l.value)) {
      const t = total.get(agentId) ?? { inFlight: 0, lastHeartbeatMs: null };
      const hb = v.lastHeartbeatMs;
      total.set(agentId, {
        inFlight: t.inFlight + v.claimed,
        lastHeartbeatMs: hb === null ? t.lastHeartbeatMs : Math.max(hb, t.lastHeartbeatMs ?? hb),
      });
    }
  }
  const body: { agents: AgentLoadEntry[] } = {
    agents: agents.map((a) => {
      const t = total.get(a.id);
      const hb = t?.lastHeartbeatMs ?? null;
      return {
        agentId: a.id,
        principalId: a.externalId,
        inFlight: t?.inFlight ?? 0,
        capacity: a.concurrency,
        lastHeartbeatAt: hb === null ? null : new Date(hb).toISOString(),
      };
    }),
  };
  return Response.json(body);
}
