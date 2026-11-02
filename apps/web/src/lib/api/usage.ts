/** Usage, budgets and estimates. */
import { ApiError } from '../loading';
import { fetch, headers } from './client';

export interface BoardUsage {
  totalCostUsd: number;
  estimatedCostUsd: number;
  budgetUsd: number | null;
  cardUsdCap: number | null;
  overBudget: boolean;
}

/** Cost rollup from `GET /v1/boards/:id/usage` (docs/07 §6) — totals plus by-model/agent/card. */
export interface UsageSummary {
  totalCostUsd: number;
  estimatedCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  unpricedRecords: number;
  byModel: Array<{ model: string; costUsd: number; inputTokens: number; outputTokens: number }>;
  byAgent: Array<{ agentId: string; costUsd: number }>;
  byCard: Array<{ cardId: string; costUsd: number }>;
  /** The last seven UTC days, oldest first, zero-filled, whatever the window. */
  byDay: Array<{ day: string; costUsd: number }>;
}

export interface Estimate {
  stageKey: string;
  estimatedUsd: number | null;
  sampleSize: number;
}

/** Set or clear the board / per-card USD budget caps (pass null to clear). */
export function setBudget(boardId: string, caps: { boardUsdCap?: number | null; cardUsdCap?: number | null }): Promise<Response> {
  return fetch(`/v1/boards/${boardId}/budget`, { method: 'PUT', headers, body: JSON.stringify(caps) });
}

/** Pre-run cost estimate for a card's current stage, from history (docs/07 §6). */
export async function getEstimate(boardId: string, cardId: string): Promise<Estimate | null> {
  const res = await fetch(`/v1/boards/${boardId}/cards/${cardId}/estimate`, { headers });
  if (res.status >= 500) throw new ApiError('getEstimate', res.status);
  if (!res.ok) return null;
  return (await res.json()) as Estimate;
}

/**
 * Cost/usage rollup for the telemetry view; `window` filters to a recent span.
 *
 * **Throws on failure rather than returning zeros.** It used to answer a failed fetch with a
 * fully zeroed summary, which made a broken telemetry API indistinguishable from a board that has
 * spent nothing — the one reading an operator would act on. "$0.00" is a claim, and a claim the
 * client cannot support must not be made.
 */
export async function getUsage(boardId: string, window: '5h' | '7d' = '7d'): Promise<UsageSummary> {
  const res = await fetch(`/v1/boards/${boardId}/usage?window=${window}`, { headers });
  if (!res.ok) throw new ApiError('getUsage', res.status);
  return (await res.json()) as UsageSummary;
}
