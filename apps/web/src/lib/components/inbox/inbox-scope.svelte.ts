// apps/web/src/lib/components/inbox/inbox-scope.svelte.ts
/**
 * Which boards the Inbox shows: all of them (null) or one. Held in memory on purpose (operator
 * ruling, nav v2): no localStorage, no sessionStorage, no address. A refresh, a new tab or a new
 * session starts on all boards again.
 */
import { plural } from '$lib/words';

export interface ScopeBoard { id: string; name: string }
export interface ScopeChip { id: string | null; label: string; count: number }

class InboxScope {
  boardId = $state<string | null>(null);
  choose(id: string | null): void { this.boardId = id; }
}
export const inboxScope = new InboxScope();

/**
 * The Show row: "All boards N", then the boards that need you (most first, then by name), then the
 * chosen board if it needs nothing; every other board sits behind "N more boards".
 */
export function scopeChips(boards: readonly ScopeBoard[], asks: ReadonlyArray<{ boardId: string }>, chosen: string | null): { chips: ScopeChip[]; more: ScopeBoard[]; moreLabel: string } {
  const counts = new Map<string, number>();
  for (const a of asks) counts.set(a.boardId, (counts.get(a.boardId) ?? 0) + 1);
  const needing = boards.filter((b) => (counts.get(b.id) ?? 0) > 0).sort((a, b) => counts.get(b.id)! - counts.get(a.id)! || a.name.localeCompare(b.name));
  const chips: ScopeChip[] = [{ id: null, label: 'All boards', count: asks.length }, ...needing.map((b) => ({ id: b.id, label: b.name, count: counts.get(b.id)! }))];
  const pick = chosen ? boards.find((b) => b.id === chosen && !counts.get(b.id)) : undefined;
  if (pick) chips.push({ id: pick.id, label: pick.name, count: 0 });
  const shown = new Set(chips.map((c) => c.id));
  const more = boards.filter((b) => !shown.has(b.id));
  return { chips, more, moreLabel: `${plural(more.length, 'more board', 'more boards')}` };
}

export function scopeLabel(chosen: string | null, boards: readonly ScopeBoard[]): string {
  return chosen ? (boards.find((b) => b.id === chosen)?.name ?? 'This board') : 'All boards';
}

/** Boards that need you first (most first), then the rest in the order the API lists them. */
export function boardsNeedingFirst<T extends ScopeBoard>(boards: readonly T[], asks: ReadonlyArray<{ boardId: string }>): T[] {
  const counts = new Map<string, number>();
  for (const a of asks) counts.set(a.boardId, (counts.get(a.boardId) ?? 0) + 1);
  return boards.map((b, i) => ({ b, i })).sort((x, y) => (counts.get(y.b.id) ?? 0) - (counts.get(x.b.id) ?? 0) || x.i - y.i).map((x) => x.b);
}

export const SHOW_NOTE = 'Boards that need you come first. Your choice stays until you refresh or open the Inbox in a new tab.';
