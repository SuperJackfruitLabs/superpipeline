import { parseWindowMs } from '../metering/window';
import type { BoardContext } from './context';
import type { BoardUsage, EstimateView, Result, UsageSummary } from './model';
import { RESOLVED_SQL } from './rules';

/**
 * Cost and budgets: usage records rolled up per board, card, model and agent, and the caps.
 */

/** What metering needs from the rest of the board. */
export type MeteringDeps = Pick<
  BoardContext,
  | 'getCard'
  | 'getMeta'
  | 'now'
  | 'nowMs'
  | 'setMeta'
  | 'sql'
>;

/** Set or clear the board-level and per-card USD budget caps (docs/07 §6). `null` clears a cap. */
export async function setBudget(deps: MeteringDeps, input: { boardUsdCap?: number | null; cardUsdCap?: number | null }): Promise<Result<{ ok: true }>> {
  if (!deps.getMeta('boardId')) {
    return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  }
  const apply = (key: string, value: number | null | undefined): void => {
    if (value === undefined) return;
    if (value === null) deps.sql.exec(`DELETE FROM meta WHERE k = ?`, key);
    else deps.setMeta(key, String(value));
  };
  apply('budgetBoardUsdCap', input.boardUsdCap);
  apply('budgetCardUsdCap', input.cardUsdCap);
  return { ok: true, value: { ok: true } };
}

/** Cost/usage rollup across this board's runs (docs/07 §6); `window` ("5h"/"7d") limits to recent spend. */
export async function getUsage(deps: MeteringDeps, opts?: { window?: string }): Promise<UsageSummary> {
  if (!opts?.window) return computeUsage(deps);
  const ms = parseWindowMs(opts.window);
  const since = ms === null ? undefined : new Date(deps.nowMs() - ms).toISOString();
  return computeUsage(deps, since);
}

/**
 * This board's slice of one project's rollup (Task 19) — see the `BoardStub` interface comment
 * for why nothing on the claim or advance path may ever call it.
 *
 * Returns a `Result`, like every other externally-callable method here, rather than throwing a
 * bare exception across the RPC boundary for the uninitialized case: workerd logs a thrown RPC
 * exception as its own top-level "uncaught exception" regardless of whether the caller catches
 * the rejection, which is harmless in production but makes a deliberately-exercised failure path
 * indistinguishable from a real crash in a test run. `computeRollup` (`db/projects.ts`) still
 * wraps its call in try/catch for genuinely unexpected throws; the `Result` is what keeps the
 * one failure this is actually built to survive — a board whose DO was never initialized — from
 * ever being a real exception in the first place.
 *
 * `done` matches `RESOLVED_SQL`, the same "resolved, not merely terminal" rule
 * `unresolvedBlockerExists`/`openChildCount` already enforce elsewhere in this file: a `failed`
 * card is terminal but not done, so counting it as done would report a project complete while
 * part of its work failed.
 *
 * `overdue` mirrors `sweepBoard`'s own overdue predicate (due, not archived, not terminal) —
 * the same fact, read here instead of notified.
 */
export async function projectSummary(deps: MeteringDeps, projectId: string): Promise<Result<{ total: number; done: number; overdue: number; costUsd: number }>> {
  if (!deps.getMeta('boardId')) return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  const today = deps.now().slice(0, 10);
  const counts = deps.sql
    .exec(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(CASE WHEN state IN ${RESOLVED_SQL} THEN 1 ELSE 0 END), 0) AS done,
         COALESCE(SUM(CASE WHEN due_at IS NOT NULL AND due_at < ? AND archived_at IS NULL
                           AND state NOT IN ('completed', 'canceled', 'rejected', 'failed')
                      THEN 1 ELSE 0 END), 0) AS overdue
       FROM cards WHERE project_id = ?`,
      today,
      projectId,
    )
    .one();
  const cost = deps.sql
    .exec(
      `SELECT COALESCE(SUM(u.cost_usd), 0) AS c FROM usage_records u
         JOIN cards c ON c.id = u.card_id WHERE c.project_id = ?`,
      projectId,
    )
    .one();
  return {
    ok: true,
    value: {
      total: Number(counts.total),
      done: Number(counts.done),
      overdue: Number(counts.overdue),
      costUsd: Number(cost.c),
    },
  };
}

/**
 * Pre-run cost estimate for a card's current stage (docs/07 §6): the average spend per **ended**
 * billed run at that stage. `status = 'ended'` excludes the card's own in-flight run (no
 * self-skew); the INNER join means `sampleSize` counts ended runs that actually reported usage.
 */
export async function estimateCardCost(deps: MeteringDeps, cardId: string): Promise<Result<EstimateView>> {
  if (!deps.getMeta('boardId')) {
    return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  }
  const card = deps.getCard(cardId);
  if (!card) return { ok: false, code: 'CARD_NOT_FOUND', message: `card not found: ${cardId}` };
  const stageKey = card.currentStageKey;
  const row = deps.sql
    .exec(
      `SELECT COUNT(DISTINCT u.run_id) AS runs, COALESCE(SUM(u.cost_usd), 0) AS cost
       FROM usage_records u JOIN runs r ON u.run_id = r.id WHERE r.stage_key = ? AND r.status = 'ended'`,
      stageKey,
    )
    .one();
  const runs = Number(row.runs);
  return { ok: true, value: { stageKey, estimatedUsd: runs > 0 ? Number(row.cost) / runs : null, sampleSize: runs } };
}

export function cardCost(deps: MeteringDeps, cardId: string): number {
  return Number(deps.sql.exec(`SELECT COALESCE(SUM(cost_usd), 0) AS c FROM usage_records WHERE card_id = ?`, cardId).one().c);
}

/**
 * The summed cost of a card's direct children.
 *
 * One level deep, matching `costUsdRollup`. Deliberately a sibling of `cardCost` rather than a
 * parameter to it: `cardCost` feeds the budget gate (`boardOverBudget`'s cousin, the per-card cap
 * check in `postActivity`) and must keep meaning "what this card itself spent".
 */
export function childrenCost(deps: MeteringDeps, cardId: string): number {
  return Number(
    deps.sql
      .exec(
        `SELECT COALESCE(SUM(u.cost_usd), 0) AS c FROM usage_records u
           WHERE u.card_id IN (SELECT to_card_id FROM card_links WHERE from_card_id = ? AND kind = 'parent')`,
        cardId,
      )
      .one().c,
  );
}

function boardCost(deps: MeteringDeps): number {
  return Number(deps.sql.exec(`SELECT COALESCE(SUM(cost_usd), 0) AS c FROM usage_records`).one().c);
}

export function budgetCap(deps: MeteringDeps, key: 'budgetBoardUsdCap' | 'budgetCardUsdCap'): number | null {
  const v = deps.getMeta(key);
  return v === null ? null : Number(v);
}

export function boardOverBudget(deps: MeteringDeps): boolean {
  const cap = budgetCap(deps, 'budgetBoardUsdCap');
  return cap !== null && boardCost(deps) >= cap;
}

function computeUsage(deps: MeteringDeps, sinceIso?: string): UsageSummary {
  // Optional rolling-window filter (docs/07 §6), parameterized. ts is an ISO string, so >= is chronological.
  const w = sinceIso ? ` WHERE ts >= ?` : '';
  const p = sinceIso ? [sinceIso] : [];
  const totals = deps.sql
    .exec(
      `SELECT COALESCE(SUM(cost_usd), 0) AS cost,
              COALESCE(SUM(CASE WHEN estimated = 1 THEN cost_usd ELSE 0 END), 0) AS est,
              COALESCE(SUM(input_tokens), 0) AS itok,
              COALESCE(SUM(output_tokens), 0) AS otok
       FROM usage_records${w}`,
      ...p,
    )
    .one();
  const unpriced = deps.sql
    .exec(`SELECT COUNT(*) AS n FROM usage_records WHERE estimated = 1 AND cost_usd = 0${sinceIso ? ' AND ts >= ?' : ''}`, ...p)
    .one();
  const byModel = deps.sql
    .exec(
      `SELECT COALESCE(model, '(unknown)') AS model, SUM(cost_usd) AS cost, SUM(input_tokens) AS itok, SUM(output_tokens) AS otok
       FROM usage_records${w} GROUP BY model ORDER BY cost DESC`,
      ...p,
    )
    .toArray()
    .map((r) => ({ model: r.model as string, costUsd: Number(r.cost), inputTokens: Number(r.itok), outputTokens: Number(r.otok) }));
  const byAgent = deps.sql
    .exec(`SELECT agent_id, SUM(cost_usd) AS cost FROM usage_records${w} GROUP BY agent_id ORDER BY cost DESC`, ...p)
    .toArray()
    .map((r) => ({ agentId: r.agent_id as string, costUsd: Number(r.cost) }));
  const byCard = deps.sql
    .exec(`SELECT card_id, SUM(cost_usd) AS cost FROM usage_records${w} GROUP BY card_id ORDER BY cost DESC`, ...p)
    .toArray()
    .map((r) => ({ cardId: r.card_id as string, costUsd: Number(r.cost) }));
  // The Spend chart's seven bars: the last seven UTC days, oldest first, independent of the window.
  const nowMs = Date.parse(deps.now());
  const days = Array.from({ length: 7 }, (_, i) => new Date(nowMs - (6 - i) * 86_400_000).toISOString().slice(0, 10));
  const daySums = new Map<string, number>();
  for (const r of deps.sql
    .exec(`SELECT substr(ts, 1, 10) AS day, SUM(cost_usd) AS c FROM usage_records WHERE ts >= ? GROUP BY day`, `${days[0]}T00:00:00Z`)
    .toArray()) {
    daySums.set(r.day as string, Number(r.c));
  }
  const byDay = days.map((day) => ({ day, costUsd: daySums.get(day) ?? 0 }));
  return {
    totalCostUsd: Number(totals.cost),
    estimatedCostUsd: Number(totals.est),
    totalInputTokens: Number(totals.itok),
    totalOutputTokens: Number(totals.otok),
    unpricedRecords: Number(unpriced.n),
    byModel,
    byAgent,
    byCard,
    byDay,
  };
}

export function boardUsage(deps: MeteringDeps): BoardUsage {
  const u = computeUsage(deps);
  const boardCap = budgetCap(deps, 'budgetBoardUsdCap');
  return {
    totalCostUsd: u.totalCostUsd,
    estimatedCostUsd: u.estimatedCostUsd,
    budgetUsd: boardCap,
    cardUsdCap: budgetCap(deps, 'budgetCardUsdCap'),
    overBudget: boardCap !== null && u.totalCostUsd >= boardCap, // consistent with the claim/billing gate
  };
}
