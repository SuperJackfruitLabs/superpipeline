import { describe, expect, it } from 'vitest';
import type { AgentSummary, Card, Milestone } from '$lib/api';
import {
  agentsOn, blockersOf, cardsByBoard, cardStatus, computedHealth, milestoneStatus, spendByBoard, type ProjectCard,
} from './project-detail';

const TODAY = '2026-10-14';
const NOW = Date.parse('2026-10-14T12:00:00Z');

function card(over: Partial<Card> & { id: string }): Card {
  return {
    title: over.id, ownerUserId: 'usr_a', currentStageKey: 'doing', state: 'ready', priority: 0, costUsd: 0, overBudget: false,
    attemptCount: 0, lastAgentId: null, queuedGrantOwner: null, stageSince: '2026-10-13T12:00:00Z', createdAt: '2026-10-01T00:00:00Z',
    queuedBy: null, queuedByAgentId: null, queuedGrant: null, labels: [], dueAt: null, archivedAt: null, parentCardId: null,
    openChildCount: 0, costUsdRollup: 0, blockedBy: [], projectId: 'prj_1', milestoneId: null, ...over,
  } as Card;
}
const on = (c: Card, boardId = 'brd_a', boardName = 'Alpha'): ProjectCard => ({ card: c, boardId, boardName, stageName: c.currentStageKey });
const ms = (id: string, targetDate: string | null): Milestone => ({ id, projectId: 'prj_1', tenantId: 't', name: id, targetDate, sortOrder: 0, createdAt: '' });
const agents = [{ id: 'agt_1', name: 'Coder' }, { id: 'agt_2', name: 'Tester' }] as AgentSummary[];

describe('milestoneStatus', () => {
  it('is reached when it has cards and every one is done', () => {
    const cards = [on(card({ id: 'a', milestoneId: 'm', state: 'completed' })), on(card({ id: 'b', milestoneId: 'm', state: 'completed' }))];
    expect(milestoneStatus(ms('m', '2026-10-01'), cards, TODAY)).toBe('reached');
  });
  it('is overdue when its date has passed and a card is still open', () => {
    const cards = [on(card({ id: 'a', milestoneId: 'm', state: 'completed' })), on(card({ id: 'b', milestoneId: 'm' }))];
    expect(milestoneStatus(ms('m', '2026-10-12'), cards, TODAY)).toBe('overdue');
  });
  it('is open on its own date, with no date, and with no cards yet', () => {
    expect(milestoneStatus(ms('m', TODAY), [on(card({ id: 'a', milestoneId: 'm' }))], TODAY)).toBe('open');
    expect(milestoneStatus(ms('m', null), [], TODAY)).toBe('open');
    expect(milestoneStatus(ms('m', '2026-10-20'), [], TODAY)).toBe('open');
  });
  it('a past milestone with no cards is overdue: nothing reached it', () => {
    expect(milestoneStatus(ms('m', '2026-10-01'), [], TODAY)).toBe('overdue');
  });
});

describe('computedHealth', () => {
  it('is on track with nothing overdue', () => {
    expect(computedHealth({ targetDate: '2026-11-01' }, [ms('m', '2026-10-20')], [], TODAY)).toEqual({ health: 'on-track', reason: 'nothing overdue' });
  });
  it('an overdue milestone puts it at risk, and says which', () => {
    const h = computedHealth({ targetDate: '2026-11-01' }, [ms('m', '2026-10-12')], [on(card({ id: 'a', milestoneId: 'm' }))], TODAY);
    expect(h).toEqual({ health: 'at-risk', reason: '1 milestone overdue' });
  });
  it('a passed target date with open cards is off track', () => {
    const h = computedHealth({ targetDate: '2026-10-10' }, [], [on(card({ id: 'a' }))], TODAY);
    expect(h.health).toBe('off-track');
    expect(h.reason).toBe('target date passed with 1 card open');
  });
  it('two overdue milestones are off track', () => {
    const h = computedHealth({ targetDate: null }, [ms('m1', '2026-10-01'), ms('m2', '2026-10-02')], [], TODAY);
    expect(h).toEqual({ health: 'off-track', reason: '2 milestones overdue' });
  });
  it('a finished project past its date is on track', () => {
    expect(computedHealth({ targetDate: '2026-10-10' }, [], [on(card({ id: 'a', state: 'completed' }))], TODAY).health).toBe('on-track');
  });
});

describe('blockersOf', () => {
  it('derives blockers from cards waiting on a person and cards blocked by another card', () => {
    const waits = card({ id: 'w', title: 'Restore a run', state: 'needs-human', lastAgentId: 'agt_2', needsHuman: { reason: 'question', summary: 'May I kill a run?' }, stateSince: '2026-10-13T12:00:00Z' });
    const blocked = card({ id: 'b', title: 'Resume it', blockedBy: [{ cardId: 'w', title: 'Restore a run' }], stageSince: '2026-10-12T12:00:00Z' });
    const free = card({ id: 'f' });
    const done = card({ id: 'd', state: 'completed', blockedBy: [{ cardId: 'x', title: 'gone' }] });
    const out = blockersOf([on(waits), on(blocked), on(free), on(done)], agents, NOW);
    expect(out).toEqual([
      { kind: 'waiting', cardId: 'w', boardId: 'brd_a', boardName: 'Alpha', title: 'Restore a run', on: 'you', detail: 'May I kill a run?', agent: 'Tester', age: '24 hours' },
      { kind: 'blocked', cardId: 'b', boardId: 'brd_a', boardName: 'Alpha', title: 'Resume it', on: 'Restore a run', detail: null, agent: null, age: '2 days' },
    ]);
  });
});

describe('cardStatus', () => {
  it('names each state the way the project page lists it', () => {
    expect(cardStatus(card({ id: 'a', state: 'completed' }))).toBe('Done');
    expect(cardStatus(card({ id: 'a', state: 'needs-human', needsHuman: { reason: 'review' } }))).toBe('Waiting on you');
    expect(cardStatus(card({ id: 'a', blockedBy: [{ cardId: 'x', title: 'x' }] }))).toBe('Blocked');
    expect(cardStatus(card({ id: 'a', state: 'working' }))).toBe('Working');
    expect(cardStatus(card({ id: 'a', state: 'ready' }))).toBe('Queued');
  });
});

describe('grouping, agents and spend', () => {
  const cards = [
    on(card({ id: 'a', currentStageKey: 'fix', lastAgentId: 'agt_1', costUsd: 1.25, state: 'completed' }), 'brd_a', 'Alpha'),
    on(card({ id: 'b', currentStageKey: 'test', lastAgentId: 'agt_1', costUsd: 0.5 }), 'brd_a', 'Alpha'),
    on(card({ id: 'c', currentStageKey: 'fix', lastAgentId: 'agt_2', costUsd: 2 }), 'brd_b', 'Beta'),
    on(card({ id: 'd', currentStageKey: 'fix', costUsd: 0 }), 'brd_a', 'Alpha'),
  ];
  it('groups cards by board, then stage', () => {
    const g = cardsByBoard(cards);
    expect(g.map((b) => [b.boardName, b.total, b.done, b.costUsd])).toEqual([['Alpha', 3, 1, 1.75], ['Beta', 1, 0, 2]]);
    expect(g[0]!.stages.map((s) => [s.stage, s.cards.map((c) => c.card.id)])).toEqual([['fix', ['a', 'd']], ['test', ['b']]]);
  });
  it('names the agents on it, never their ids', () => {
    expect(agentsOn(cards, agents)).toEqual([{ name: 'Coder', cards: 2 }, { name: 'Tester', cards: 1 }]);
  });
  it('sums spend by board, largest first', () => {
    expect(spendByBoard(cards)).toEqual([{ boardId: 'brd_b', boardName: 'Beta', costUsd: 2 }, { boardId: 'brd_a', boardName: 'Alpha', costUsd: 1.75 }]);
  });
});
