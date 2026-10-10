import { describe, expect, it } from 'vitest';
import type { BoardSnapshot, Card } from '$lib/api';
import { groupByUrgency, stageSummaries, summarize } from './card-summary';

const NOW = Date.parse('2026-10-11T12:00:00Z');
const stages = [
  { key: 'b', name: 'Build', order: 1, wipLimit: 1 },
  { key: 'a', name: 'Plan', order: 0 },
  { key: 'r', name: 'Review', order: 2, gate: 'approval' as const, routing: 'manager' as const },
];
let n = 0;
const card = (over: Partial<Card> = {}): Card => ({
  id: `crd_${++n}`, title: `Card ${n}`, spec: null, ownerUserId: 'usr_a', currentStageKey: 'a', state: 'submitted', priority: 0,
  costUsd: 0, overBudget: false, attemptCount: 0, delegateAgentId: null, queuedBy: null, queuedByAgentId: null, queuedGrant: null,
  labels: [], dueAt: null, archivedAt: null, parentCardId: null, openChildCount: 0, costUsdRollup: 0, blockedBy: [],
  projectId: null, milestoneId: null, stateSince: '2026-10-11T09:00:00Z', ...over,
});
const board = (cards: Card[], extra: Partial<BoardSnapshot> = {}): BoardSnapshot =>
  ({ boardId: 'brd_1', tenantId: 'tnt', name: 'Board', stages, cards, gates: [], elicitations: [], references: [], usage: { cardUsdCap: 2 }, stale: { enabled: true, afterHours: 24 }, ...extra }) as unknown as BoardSnapshot;
const ctx = { agents: [{ id: 'agt_r', name: 'Sample agent', iconUrl: null }] as never, members: [], labels: new Map([['lbl_1', { name: 'ux', colour: 'teal' }]]), nowMs: NOW };

describe('summarize', () => {
  it('a gated card needs you, with the gate summary as its lead', () => {
    const c = card({ currentStageKey: 'r', delegateAgentId: 'agt_r' });
    const [s] = summarize(board([c], { gates: [{ id: 'g', cardId: c.id, stageKey: 'r', status: 'pending', options: [], producedBy: 'agt_r', summary: 'Ready to ship.' }] as never }), [c], ctx);
    expect(s).toMatchObject({ urgency: 'needs', gatePending: true, mood: 'needs', stageName: 'Review', stageIndex: 2, stageCount: 3 });
    expect(s!.lead).toMatchObject({ kind: 'review', sentence: 'Ready to ship.' });
    expect(s!.attention?.kind).toBe('review');
    expect(s!.delegate).toEqual({ id: 'agt_r', name: 'Sample agent', iconUrl: null });
  });

  it('buckets by state', () => {
    const cs = [card({ state: 'working' }), card({ state: 'completed' }), card({ state: 'canceled' }), card({ delegateAgentId: 'agt_r' })];
    const out = summarize(board(cs), cs, ctx);
    expect(out.map((s) => s.urgency)).toEqual(['working', 'done', 'closed', 'queued']);
    expect(out[0]!.live).toBe(true);
    expect(out[3]!.mood).toBe('thinking');
  });

  it('shows three labels and counts the rest, falling back to the id for an unknown label', () => {
    const c = card({ labels: ['lbl_1', 'x2', 'x3', 'x4', 'x5'] });
    const [s] = summarize(board([c]), [c], ctx);
    expect(s!.labels.map((l) => l.name)).toEqual(['ux', 'x2', 'x3']);
    expect(s!.moreLabels).toBe(2);
  });

  it('cost against the card cap', () => {
    const a = card({ costUsd: 1 }), b = card({ costUsd: 0 });
    const [sa, sb] = summarize(board([a, b]), [a, b], ctx);
    expect(sa!.costPct).toBe(50);
    expect(sb!.costPct).toBeNull();
    const [sc] = summarize(board([a], { usage: {} as never }), [a], ctx);
    expect(sc!.costPct).toBeNull();
  });

  it('overdue and age', () => {
    const c = card({ dueAt: '2026-10-10' });
    const [s] = summarize(board([c]), [c], ctx);
    expect(s!.overdue).toBe(true);
    expect(s!.ageHours).toBe(3);
  });
});

describe('groupByUrgency', () => {
  it('keeps every group, in urgency order, P1 before P2 before no priority', () => {
    const cs = [card({ state: 'working', priority: 0 }), card({ state: 'working', priority: 2 }), card({ state: 'working', priority: 1 })];
    const groups = groupByUrgency(summarize(board(cs), cs, ctx));
    expect(groups.map((g) => g.urgency)).toEqual(['needs', 'working', 'queued', 'done', 'closed']);
    expect(groups[1]!.cards.map((s) => s.priority)).toEqual([1, 2, 0]);
    expect(groups[0]!.cards).toEqual([]);
  });
});

describe('stageSummaries', () => {
  it('orders stages and carries count, WIP, gate, manager and empty', () => {
    const cs = [card({ currentStageKey: 'b' }), card({ currentStageKey: 'b', blockedBy: [{ cardId: 'x', title: 'X' }] })];
    const out = stageSummaries(board(cs), cs, []);
    expect(out.map((s) => s.name)).toEqual(['Plan', 'Build', 'Review']);
    expect(out[1]).toMatchObject({ count: 2, wipLimit: 1, atLimit: true, blocked: 1, empty: false });
    expect(out[2]).toMatchObject({ gate: true, manager: true, empty: true });
  });
});
