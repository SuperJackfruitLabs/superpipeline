/**
 * Does this card need a person now? The one rule behind every "need you" count — the board list,
 * the switcher, the shell badge and the attention lists — so no two surfaces can disagree.
 *
 * Pure: it reads nothing but what it is handed, so the API (counting a board's cards inside its
 * Durable Object) and the web app (building attention rows from a snapshot) run the same code.
 */
export interface NeedsYouContext {
  /** The board's stages in pipeline order. The last one is where arriving completes a card. */
  stages: Array<{ key: string; ownerKind?: string; gate?: string }>;
  pendingGateCardIds: Set<string>;
  pendingQuestionCardIds: Set<string>;
  /** How long a queued card may sit in a stage nobody works before it needs a person. */
  staleAfterHours: number;
  /** False when the board switched stale cards off; defaults to on. */
  staleEnabled?: boolean;
  nowMs: number;
}

/** A stage no agent claims, with no approval gate, that is not the last stage. */
function nobodyWorks(stages: NeedsYouContext['stages'], key: string): boolean {
  const stage = stages.find((s) => s.key === key);
  if (!stage) return false;
  if (stages[stages.length - 1]?.key === key) return false;
  const claimable = stage.ownerKind === 'capability' || stage.ownerKind === 'agent';
  return !claimable && stage.gate !== 'approval';
}

export function needsYou(
  card: { id?: string; state: string; archivedAt: string | null; overBudget?: boolean; currentStageKey: string; stateSince?: string | null },
  ctx: NeedsYouContext,
): boolean {
  if (card.archivedAt) return false;
  if (card.id && (ctx.pendingGateCardIds.has(card.id) || ctx.pendingQuestionCardIds.has(card.id))) return true;
  if (card.state === 'input-required' || card.state === 'failed' || card.overBudget) return true;
  if (card.state !== 'submitted' || ctx.staleEnabled === false) return false;
  const since = card.stateSince ? Date.parse(card.stateSince) : Number.NaN;
  if (Number.isNaN(since)) return false;
  return (ctx.nowMs - since) / 3_600_000 >= ctx.staleAfterHours && nobodyWorks(ctx.stages, card.currentStageKey);
}
