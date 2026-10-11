import { describe, expect, it } from 'vitest';
import type { BoardSnapshot, Card } from '$lib/api';
import { stageOwner } from './stage-owner';
import { crewOf, groupByUrgency, stageSummaries, summarize } from './card-summary';

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

  it('shows three known labels and counts the rest; an unknown (deleted) label renders nothing and is not counted', () => {
    // Matches today's tile: a deleted label id draws no chip and is not in the "+N".
    const known = new Map([...ctx.labels, ['a', { name: 'a', colour: '' }], ['b', { name: 'b', colour: '' }], ['c', { name: 'c', colour: '' }], ['d', { name: 'd', colour: '' }]]);
    const c = card({ labels: ['lbl_1', 'gone', 'a', 'b', 'c', 'd'] });
    const [s] = summarize(board([c]), [c], { ...ctx, labels: known });
    expect(s!.labels.map((l) => l.name)).toEqual(['ux', 'a', 'b']);
    expect(s!.moreLabels).toBe(2);
    const [t] = summarize(board([card({ labels: ['gone'] })]), [card({ labels: ['gone'] })], ctx);
    expect(t!.labels).toEqual([]);
    expect(t!.moreLabels).toBe(0);
  });

  it('an agent-queued card keeps its "asked by" chip even when the queuing agent row is gone', () => {
    const gone = card({ queuedBy: 'agt_gone', queuedByAgentId: 'agt_gone' } as Partial<Card>);
    const here = card({ queuedBy: 'agt_r', queuedByAgentId: 'agt_r' } as Partial<Card>);
    const human = card({ queuedBy: 'usr_a' });
    const [g, h, u] = summarize(board([gone, here, human]), [gone, here, human], ctx);
    expect(g!.queuedBy).not.toBeNull();
    expect(g!.queuedBy!.agent).toBeNull();
    expect(h!.queuedBy!.agent).toMatchObject({ id: 'agt_r' });
    expect(u!.queuedBy).toBeNull();
  });

  it('a rejected card is closed', () => {
    const c = card({ state: 'rejected' });
    expect(summarize(board([c]), [c], ctx)[0]!.urgency).toBe('closed');
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

describe('groupByUrgency tiebreaks', () => {
  it('same priority: older first, then title', () => {
    const cs = [
      card({ state: 'working', title: 'B', stateSince: '2026-10-11T11:00:00Z' }),
      card({ state: 'working', title: 'A', stateSince: '2026-10-11T11:00:00Z' }),
      card({ state: 'working', title: 'Z', stateSince: '2026-10-11T08:00:00Z' }),
    ];
    const g = groupByUrgency(summarize(board(cs), cs, ctx)).find((x) => x.urgency === 'working')!;
    expect(g.cards.map((x) => x.title)).toEqual(['Z', 'A', 'B']);
  });
});

describe('stageSummaries', () => {
  it('carries the stage owner', () => {
    const out = stageSummaries(board([]), [], []);
    expect(out[2]!.owner).toEqual(stageOwner(stages[2] as never, []));
  });

  it('orders stages and carries count, WIP, gate, manager and empty', () => {
    const cs = [card({ currentStageKey: 'b' }), card({ currentStageKey: 'b', blockedBy: [{ cardId: 'x', title: 'X' }] })];
    const out = stageSummaries(board(cs), cs, []);
    expect(out.map((s) => s.name)).toEqual(['Plan', 'Build', 'Review']);
    expect(out[1]).toMatchObject({ count: 2, wipLimit: 1, atLimit: true, blocked: 1, empty: false });
    expect(out[2]).toMatchObject({ gate: true, manager: true, empty: true });
  });
});

describe('crewOf', () => {
  it('lists each holding agent once, leaving out archived, done and closed cards', () => {
    const open1 = card({ delegateAgentId: 'agt_r', state: 'working' });
    const open2 = card({ delegateAgentId: 'agt_r', state: 'working' });
    const archived = card({ delegateAgentId: 'agt_a', state: 'working', archivedAt: '2026-10-01T00:00:00Z' });
    const done = card({ delegateAgentId: 'agt_d', state: 'completed' });
    const closed = card({ delegateAgentId: 'agt_c', state: 'canceled' });
    const none = card({ state: 'working' });
    const cs = [open1, open2, archived, done, closed, none];
    const gates = [{ id: 'g', cardId: open1.id, stageKey: 'a', status: 'pending', options: [], producedBy: 'agt_r', summary: 's' }] as never;
    const crew = crewOf(summarize(board(cs, { gates }), cs, ctx));
    expect(crew.map((a) => a.id)).toEqual(['agt_r']);
    expect(crew[0]!.mood).toBe('needs'); // the first card's mood wins, so a later card cannot replace it

  });
});
