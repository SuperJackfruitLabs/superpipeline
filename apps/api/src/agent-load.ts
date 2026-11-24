// `GET /v1/agents/load`: every agent's load over the workspace, for a placement service.
import type { Env } from './env';
import { refuse } from './api-errors';
import { DISPATCH_READ, resolveHubService } from './auth/resolve';
import { boardStub } from './board/stub';
import { listAgents, listBoards } from './db/catalog';
import { logError } from './log';

/** One agent's load, as treaty's `placement.v1` names it (`AgentLoad`). */
export interface AgentLoad {
  agentId: string;
  principalId: string | null;
  /** Its runs still `working`, summed over every board of the workspace. */
  inFlight: number;
  /** `agents.concurrency`: the ceiling a claim is held to. 0 takes nothing. */
  capacity: number;
  /** The latest heartbeat any of its runs sent on any board (ISO); null when it never ran. */
  lastHeartbeatAt: string | null;
}

/**
 * The capacity a claim actually allows: a whole number of at least 0. A claim reads anything else
 * (a negative or fractional value a row should never hold) as no room, and so does this.
 */
function capacityOf(concurrency: unknown): number {
  return typeof concurrency === 'number' && Number.isInteger(concurrency) && concurrency > 0 ? concurrency : 0;
}

/**
 * Every agent of the workspace, whether or not it has ever run, with:
 *
 * - `inFlight`: its runs still `working` over every board. This is the count a claim holds to the
 *   agent's concurrency, so a card it holds that waits on a person (`input-required`, its run
 *   ended) is not in flight. A claim enforces concurrency per board, so an agent working on two
 *   boards may read more in flight than its capacity; a placement service reads that as full.
 * - `capacity`: `agents.concurrency` (1 by default, 0 for an agent that takes nothing).
 * - `lastHeartbeatAt`: the latest heartbeat of any of its runs on any board, ended runs included.
 *
 * Every board must answer: a board that fails would under-count what an agent holds and place
 * work on an agent already full, so the read fails (500) and the reader knows no load.
 */
export async function agentLoads(env: Env, tenantId: string): Promise<AgentLoad[]> {
  const [agents, boards] = await Promise.all([listAgents(env.DB, tenantId), listBoards(env.DB, tenantId)]);
  const perBoard = await Promise.all(boards.map((b) => boardStub(env, tenantId, b.id).runLoad()));
  const total = new Map<string, { working: number; lastHeartbeatMs: number | null }>();
  for (const board of perBoard) {
    for (const [agentId, l] of Object.entries(board)) {
      const t = total.get(agentId) ?? { working: 0, lastHeartbeatMs: null };
      const latest = t.lastHeartbeatMs === null ? l.lastHeartbeatMs : l.lastHeartbeatMs === null ? t.lastHeartbeatMs : Math.max(t.lastHeartbeatMs, l.lastHeartbeatMs);
      total.set(agentId, { working: t.working + l.working, lastHeartbeatMs: latest });
    }
  }
  return agents.map((a) => {
    const t = total.get(a.id);
    return {
      agentId: a.id,
      principalId: a.externalId ?? null,
      inFlight: t?.working ?? 0,
      capacity: capacityOf(a.concurrency),
      lastHeartbeatAt: t?.lastHeartbeatMs != null ? new Date(t.lastHeartbeatMs).toISOString() : null,
    };
  });
}

/** The route: a service token on `dispatch:read`, GET only. Any other caller is refused 401. */
export async function agentsLoadRoute({ request, env }: { request: Request; env: Env }): Promise<Response> {
  if (request.method !== 'GET') return refuse('METHOD_NOT_ALLOWED', 'method not allowed');
  const svc = await resolveHubService(request, env);
  if (!svc) return refuse('UNAUTHORIZED', 'a service token for a mapped workspace is required');
  if (!svc.scopes.includes(DISPATCH_READ)) return refuse('FORBIDDEN', 'this principal does not hold dispatch:read');
  try {
    return Response.json({ agents: await agentLoads(env, svc.tenantId) });
  } catch (err) {
    // No load is known, rather than a count short of what an agent holds. The body stays generic;
    // the log says what failed.
    logError({ msg: 'agents load failed', tenantId: svc.tenantId, error: err instanceof Error ? err.message : String(err) });
    return refuse('UNEXPECTED', 'the workspace\'s load could not be read');
  }
}
