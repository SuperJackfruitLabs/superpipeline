// apps/web/src/lib/components/inbox/inbox-filters.test.ts
import { describe, expect, it } from 'vitest';
import type { AttentionItem, AttentionKind } from '$lib/components/attention/attention';
import { InboxFilters } from './inbox-filters.svelte';

const item = (n: number, kind: AttentionKind, title: string, ageHours: number | null): AttentionItem => ({
  id: `${kind}:brd:card_${n}`, kind, boardId: 'brd', boardName: 'Planning & Roadmap', cardId: `card_${n}`,
  title, stageKey: 'idea', stageName: 'Idea', headline: '', detail: null, instruction: '', actions: ['open'], ageHours,
});
const ITEMS = [
  item(1, 'review', 'Decide the roadmap', 5),
  item(2, 'question', 'Shape the pricing page', 3),
  item(3, 'no-owner', 'Archive finished cards', 120),
  item(4, 'blocked', 'Publish the launch thread', 9),
  item(5, 'no-owner', 'Import a GitHub board', null),
];
const AGENT: Record<string, string> = { card_1: 'agt_sam', card_2: 'agt_sam', card_4: 'agt_melissa' };
const LABELS: Record<string, string[]> = { card_1: ['lbl_q1'], card_3: ['lbl_q1', 'lbl_ops'] };
const PRIORITY: Record<string, number> = { card_1: 2, card_2: 1, card_4: 1 };
const ctx = {
  agentOf: (i: AttentionItem) => AGENT[i.cardId] ?? null,
  labelsOf: (i: AttentionItem) => LABELS[i.cardId] ?? [],
  priorityOf: (i: AttentionItem) => PRIORITY[i.cardId] ?? null,
};
const ids = (xs: AttentionItem[]) => xs.map((i) => i.cardId);

describe('InboxFilters', () => {
  it('active counts non-default fields', () => {
    const f = new InboxFilters();
    expect(f.active).toBe(0);
    f.open = true;
    expect(f.active).toBe(0);
    f.find = '   ';
    expect(f.active).toBe(0);
    f.find = 'roadmap';
    f.group = 'review';
    f.agent = 'agt_sam';
    f.label = 'lbl_q1';
    f.priority = 0;
    f.sort = 'newest';
    expect(f.active).toBe(6);
    f.sort = 'oldest';
    expect(f.active).toBe(5);
    f.clear();
    expect(f.active).toBe(0);
    expect([f.find, f.group, f.agent, f.label, f.priority, f.sort]).toEqual(['', null, null, null, null, 'oldest']);
    // Clearing the fields leaves the row as the person had it.
    expect(f.open).toBe(true);
  });
  it('apply narrows by group, agent, label, priority and find, and sorts', () => {
    const f = new InboxFilters();
    // Oldest first by default; a card of unknown age goes last.
    expect(ids(f.apply(ITEMS, ctx))).toEqual(['card_3', 'card_4', 'card_1', 'card_2', 'card_5']);
    f.sort = 'newest';
    expect(ids(f.apply(ITEMS, ctx))).toEqual(['card_2', 'card_1', 'card_4', 'card_3', 'card_5']);
    f.sort = 'priority';
    expect(ids(f.apply(ITEMS, ctx))).toEqual(['card_1', 'card_4', 'card_2', 'card_3', 'card_5']);
    f.clear();
    f.group = 'unclaimed';
    expect(ids(f.apply(ITEMS, ctx))).toEqual(['card_3', 'card_5']);
    f.group = 'resume';
    expect(ids(f.apply(ITEMS, ctx))).toEqual(['card_4']);
    f.clear();
    f.agent = 'agt_sam';
    expect(ids(f.apply(ITEMS, ctx))).toEqual(['card_1', 'card_2']);
    f.clear();
    f.label = 'lbl_q1';
    expect(ids(f.apply(ITEMS, ctx))).toEqual(['card_3', 'card_1']);
    f.clear();
    f.priority = 1;
    expect(ids(f.apply(ITEMS, ctx))).toEqual(['card_4', 'card_2']);
    f.clear();
    f.find = '  PUBLISH ';
    expect(ids(f.apply(ITEMS, ctx))).toEqual(['card_4']);
    f.find = 'planning & roadmap';
    expect(ids(f.apply(ITEMS, ctx))).toHaveLength(5);
    // Together: every field narrows.
    f.find = 'shape';
    f.agent = 'agt_sam';
    f.group = 'answer';
    expect(ids(f.apply(ITEMS, ctx))).toEqual(['card_2']);
    f.group = 'review';
    expect(f.apply(ITEMS, ctx)).toEqual([]);
    // The input list is not reordered.
    expect(ids(ITEMS)).toEqual(['card_1', 'card_2', 'card_3', 'card_4', 'card_5']);
  });
});
