
/**
 * Pure predicates from `AppStore.filteredCards` (`app.svelte.ts`), extracted so they can be
 * tested: `app.svelte.ts` uses Svelte 5 runes (`$state`) and cannot be imported by a plain Vitest
 * unit test in this project's config (no `$lib` alias, no rune compilation outside SvelteKit) —
 * the same reason `board/card-due.ts` is a plain module.
 */

/**
 * Should a card pass the "show archived" filter?
 *
 * `Card.archivedAt` (`packages/contract`) is `string | null`, but a card can also arrive with the
 * field genuinely absent — an optimistic local update, a partial snapshot, anything that built a
 * `Card`-shaped object without setting it. `c.archivedAt !== null` treats that `undefined` as "not
 * archived, so keep it visible only when NOT filtered" incorrectly: `undefined !== null` is `true`,
 * so an undated-archived card fails the `!f.showArchived && archivedAt !== null` check and gets
 * hidden even when it was never archived. `!archivedAt` treats `null` and `undefined` alike, which
 * is the only distinction that matters here — "has an archive date" vs. not.
 */
export function passesArchivedFilter(showArchived: boolean, archivedAt: string | null | undefined): boolean {
  if (showArchived) return true;
  return !archivedAt;
}

/**
 * Should a card pass the project filter? `null` means "no filter" — every card passes, including
 * one with no project of its own. Once a project IS selected, a card with no `projectId` (or a
 * different one) no longer matches: narrowing is what a filter is for, same as every other axis.
 */
export function passesProjectFilter(filterProjectId: string | null, cardProjectId: string | null): boolean {
  if (!filterProjectId) return true;
  return cardProjectId === filterProjectId;
}

/** The filter shape `AppStore.filters` holds (`CardFilters` in app.svelte.ts). */
export interface FilterShape {
  states: string[];
  owners: string[];
  minPriority: number | null;
  needsReview: boolean;
  live: boolean;
  overBudget: boolean;
  labels: string[];
  showArchived: boolean;
  projectId: string | null;
}

export function noFilters(): FilterShape {
  return { states: [], owners: [], minPriority: null, needsReview: false, live: false, overBudget: false, labels: [], showArchived: false, projectId: null };
}

/** How many filters are on, each counted once: the "Filter cards · none on / 2 on" figure. */
export function activeFilterCount(f: FilterShape): number {
  return [
    f.states.length > 0, f.owners.length > 0, f.minPriority !== null, f.needsReview, f.live, f.overBudget,
    f.labels.length > 0, f.showArchived, f.projectId !== null,
  ].filter(Boolean).length;
}
