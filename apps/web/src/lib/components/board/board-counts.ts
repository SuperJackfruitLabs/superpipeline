/**
 * The per-stage blocked count (Task 17b, Step 2).
 *
 * Because a blocked card is EXCLUDED from the claim query rather than refused, an agent reports
 * "no work" while a human looking at the board sees cards sitting in a column doing nothing. The
 * stage header's `N blocked` count is the only place that exclusion is ever explained — not
 * optional polish.
 *
 * Counted from `blockedBy.length > 0`, the same field the tile's ⛔ badge reads — never a second
 * expression for "is this card blocked".
 */
/**
 * THE rule for "blocked" on a board: a card is held only while it is still waiting on a blocker. A
 * finished or closed card keeps its badge (history) but is not held by anything. Every board, vibe
 * and count reads this one function.
 */
export function isHeld(c: { state: string; blockedBy: unknown[] }): boolean {
  return c.blockedBy.length > 0 && c.state !== 'completed' && c.state !== 'canceled' && c.state !== 'rejected';
}

export function blockedCountInStage(cards: Array<{ state: string; blockedBy: unknown[] }>): number {
  return cards.filter(isHeld).length;
}
