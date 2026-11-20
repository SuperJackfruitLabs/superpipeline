// apps/web/src/lib/components/inbox/inbox-filters.svelte.ts
/**
 * The Inbox's filter row (contract rule 8): find, a chip per group, Agent, Label and Priority menus
 * and a sort. Hidden until asked for (`open`); the Filter control's count is `active`, the number of
 * fields that differ from their default. Held in memory for the visit.
 */
import type { AttentionItem } from '$lib/components/attention/attention';
import { GROUP_OF, type InboxGroupKey } from './inbox-groups';

export type InboxSort = 'oldest' | 'newest' | 'priority';

export interface InboxFilterContext {
  agentOf(i: AttentionItem): string | null;
  labelsOf(i: AttentionItem): string[];
  priorityOf(i: AttentionItem): number | null;
}

/** Older first; a card of unknown age goes last either way. */
const byAge = (dir: 1 | -1) => (a: AttentionItem, b: AttentionItem): number => {
  if (a.ageHours === null || b.ageHours === null) return (a.ageHours === null ? 1 : 0) - (b.ageHours === null ? 1 : 0);
  return dir * (b.ageHours - a.ageHours);
};

export class InboxFilters {
  find = $state('');
  group = $state<InboxGroupKey | null>(null);
  agent = $state<string | null>(null);
  label = $state<string | null>(null);
  priority = $state<number | null>(null);
  sort = $state<InboxSort>('oldest');
  /** Whether the row is shown; not a filter, so not counted. */
  open = $state(false);

  get active(): number {
    return [
      this.find.trim() !== '', this.group !== null, this.agent !== null, this.label !== null, this.priority !== null, this.sort !== 'oldest',
    ].filter(Boolean).length;
  }

  apply(items: AttentionItem[], ctx: InboxFilterContext): AttentionItem[] {
    const find = this.find.trim().toLowerCase();
    const out = items.filter((i) => {
      if (this.group !== null && GROUP_OF[i.kind] !== this.group) return false;
      if (this.agent !== null && ctx.agentOf(i) !== this.agent) return false;
      if (this.label !== null && !ctx.labelsOf(i).includes(this.label)) return false;
      if (this.priority !== null && ctx.priorityOf(i) !== this.priority) return false;
      if (find && ![i.title, i.boardName ?? '', i.stageName, i.detail ?? ''].some((t) => t.toLowerCase().includes(find))) return false;
      return true;
    });
    const oldest = byAge(1);
    if (this.sort === 'newest') return out.toSorted(byAge(-1));
    if (this.sort === 'priority') return out.toSorted((a, b) => (ctx.priorityOf(b) ?? -Infinity) - (ctx.priorityOf(a) ?? -Infinity) || oldest(a, b));
    return out.toSorted(oldest);
  }

  clear(): void {
    this.find = '';
    this.group = null;
    this.agent = null;
    this.label = null;
    this.priority = null;
    this.sort = 'oldest';
  }
}
