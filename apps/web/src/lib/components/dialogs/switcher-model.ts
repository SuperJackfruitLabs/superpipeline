// apps/web/src/lib/components/dialogs/switcher-model.ts
import type { BoardSummary } from '$lib/api';

export interface SwitcherGroup { label: string; right: string; boards: BoardSummary[] }

const recent = (a: BoardSummary, b: BoardSummary) => (b.lastActivityAt ?? '').localeCompare(a.lastActivityAt ?? '');

/** "Needs you" (this board first, then last used) and the rest by last use; a query filters names. */
export function groupBoards(boards: BoardSummary[], currentId: string | null, q: string): SwitcherGroup[] {
  const needle = q.trim().toLowerCase();
  const shown = needle === '' ? boards : boards.filter((b) => b.name.toLowerCase().includes(needle));
  const needs = shown.filter((b) => b.needsYouCount > 0).sort((a, b) => (a.id === currentId ? -1 : b.id === currentId ? 1 : recent(a, b)));
  const rest = shown.filter((b) => b.needsYouCount === 0).sort(recent);
  const sum = needs.reduce((n, b) => n + b.needsYouCount, 0);
  const out: SwitcherGroup[] = [];
  if (needs.length) out.push({ label: 'Needs you', right: `${sum} card${sum === 1 ? '' : 's'}`, boards: needs });
  if (rest.length) out.push({ label: needle === '' ? 'Everything else, last used first' : 'Other boards', right: `${rest.length} board${rest.length === 1 ? '' : 's'}`, boards: rest });
  return out;
}

/** The one board order the switcher and the palette share (D-18). */
export const switcherOrder = (boards: BoardSummary[], currentId: string | null): BoardSummary[] => groupBoards(boards, currentId, '').flatMap((g) => g.boards);

export const boardCountText = (n: number): string => (n === 0 ? 'No cards yet' : `${n} card${n === 1 ? '' : 's'}`);
export const needsChip = (k: number): string => (k === 1 ? '1 needs you' : `${k} need you`);
