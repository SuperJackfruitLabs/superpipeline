import { describe, expect, it } from 'vitest';
import { itemsFromBoard, type AttentionKind } from '$lib/components/attention/attention';
import { realisticWorkspace, REALISTIC_NOW_MS } from './realistic';

const kinds = (board: Parameters<typeof itemsFromBoard>[0], agents: Parameters<typeof itemsFromBoard>[1]) => {
  const out: Partial<Record<AttentionKind, number>> = {};
  for (const i of itemsFromBoard(board, agents, REALISTIC_NOW_MS)) out[i.kind] = (out[i.kind] ?? 0) + 1;
  return out;
};

/** The one board with this name; throws when there is none, so a test never reads past a missing board. */
function named(w: ReturnType<typeof realisticWorkspace>, name: string) {
  const board = w.boards.find((b) => b.name === name);
  if (!board) throw new Error(`no board named ${name}`);
  return board;
}

describe('realisticWorkspace', () => {
  it('the realistic workspace has the counts the contract tests against', () => {
    const w = realisticWorkspace();
    expect(w.boards).toHaveLength(3);
    const needs = w.boards.flatMap((b) => itemsFromBoard(b, w.agents, REALISTIC_NOW_MS));
    expect(needs).toHaveLength(18);
    expect(new Set(needs.map((n) => n.boardId)).size).toBe(3);
    const notifications = Object.values(w.notifications).reduce((n, list) => n + list.length, 0);
    expect(notifications).toBe(548);
    expect(w.boards.flatMap((b) => b.cards).some((c) => c.title.length > 100)).toBe(true);
    expect(w.boards.flatMap((b) => b.stages).some((s) => s.name === 'Failing test')).toBe(true);
  });

  it('each board needs what production showed, with one question, one budget and one blocked item', () => {
    const w = realisticWorkspace();
    const byName = Object.fromEntries(w.boards.map((b) => [b.name, kinds(b, w.agents)]));
    expect(byName['Planning & Roadmap']).toEqual({ review: 1, question: 1, budget: 1, 'no-owner': 10 });
    expect(byName['Developer Experience']).toEqual({ 'no-owner': 3 });
    expect(byName['Marketing & Community']).toEqual({ blocked: 1, 'no-owner': 1 });
    const dx = named(w, 'Developer Experience');
    expect(dx.stages.map((s) => s.name)).toEqual(['Reported', 'Reproduce', 'Failing test', 'Fix', 'Integrate', 'Signed off', 'Shipped']);
    expect(dx.cards.filter((c) => c.currentStageKey === 'shipped')).toHaveLength(13);
    expect(dx.cards.filter((c) => c.currentStageKey === 'reported')).toHaveLength(3);
  });

  it('titles run long but never past 110 characters', () => {
    const titles = realisticWorkspace().boards.flatMap((b) => b.cards.map((c) => c.title));
    expect(Math.max(...titles.map((t) => t.length))).toBe(110);
  });

  it('is deterministic: two calls give the same workspace, and every board has notifications and usage', () => {
    const a = realisticWorkspace();
    expect(realisticWorkspace()).toEqual(a);
    for (const b of a.boards) {
      const id = b.boardId ?? '';
      expect(a.notifications[id]?.length).toBeGreaterThan(0);
      expect(a.usage[id]).toBeDefined();
    }
    // Card ids are unique across the workspace, and every notification names a card on its board.
    const ids = a.boards.flatMap((b) => b.cards.map((c) => c.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const b of a.boards) {
      const cards = new Set(b.cards.map((c) => c.id));
      expect((a.notifications[b.boardId ?? ''] ?? []).every((n) => cards.has(n.cardId))).toBe(true);
    }
  });

  it('the budget card is over its cap and the board names the cap', () => {
    const w = realisticWorkspace();
    const pr = named(w, 'Planning & Roadmap');
    const over = pr.cards.filter((c) => c.overBudget);
    expect(over).toHaveLength(1);
    const cap = pr.usage.cardUsdCap ?? Number.NaN;
    expect(cap).toBeGreaterThan(0);
    expect(over[0]?.costUsd).toBeGreaterThanOrEqual(cap);
    for (const c of pr.cards.filter((x) => !x.overBudget)) expect(c.costUsd).toBeLessThan(cap);
  });
});
