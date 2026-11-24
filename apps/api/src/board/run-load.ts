import type { BoardContext } from './context';

/** One agent's runs on this board: how many it works now, and its latest heartbeat (ms), if any. */
export interface AgentRunLoad {
  working: number;
  lastHeartbeatMs: number | null;
}

/**
 * Every agent that has a run on this board, with its runs still `working` (the count a claim holds
 * to the agent's concurrency) and the latest heartbeat any of its runs sent, ended runs included:
 * the board's share of `GET /v1/agents/load` (`agent-load.ts`). An uninitialized board has none.
 */
export function runLoad(deps: Pick<BoardContext, 'sql' | 'getMeta'>): Record<string, AgentRunLoad> {
  const out: Record<string, AgentRunLoad> = {};
  if (!deps.getMeta('boardId')) return out;
  for (const r of deps.sql
    .exec(
      `SELECT agent_id AS a, SUM(CASE WHEN status = 'working' THEN 1 ELSE 0 END) AS w, MAX(last_heartbeat_ms) AS h
         FROM runs GROUP BY agent_id`,
    )
    .toArray()) {
    if (typeof r.a !== 'string') continue;
    const h = r.h === null ? null : Number(r.h);
    out[r.a] = { working: Number(r.w), lastHeartbeatMs: h !== null && Number.isFinite(h) ? h : null };
  }
  return out;
}
