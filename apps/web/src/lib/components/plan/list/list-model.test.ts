// apps/web/src/lib/components/plan/list/list-model.test.ts
import { describe, expect, it } from 'vitest';
import {
  daylightSum, dueHuman, filterQuick, filtersActive, groupNo, groupRows, listCaption, listStateOf, nextInCycle, nextSort,
  ownerText, paperFacts, paperFoot, paperGroupCount, paperMastLine, priClass, quickCounts, quietEmptyFoot, quietFacts,
  quietLede, quietSortOptions, quietState, sortHint, sortRows, SORT_NOUN, STUDIO_SORT_CYCLE, studioFoot, studioHeadline,
  studioKicker, studioLede,
} from './list-model';
import { itemsFromBoard } from '$lib/components/attention/attention';
import { C1DFC, C4605, C481F, C58F8, C63AC, C9ED9, CF83F, DX_AGENTS, DX_BOARD, DX_MEMBERS, DX_NOW } from '$lib/test/dx-snapshot';
import { DX_STAGE_LIST, dxRows } from '$lib/test/list-props';

const rows = dxRows();
const r = (id: string) => rows.find((x) => x.s.id === id)!;
const SORT = { key: 'priority', ascending: true } as const;

describe('listStateOf — any card with an attention item needs you', () => {
  const items = itemsFromBoard(DX_BOARD, DX_AGENTS, DX_NOW);
  it('the four needs, with Quiet’s qualifier', () => {
    expect(listStateOf(C63AC, items)).toEqual({ word: 'Waiting on you', needsYou: true, tone: 'needs', sub: 'no owner' });
    expect(listStateOf(C4605, items).sub).toBe('stopped');
  });
  it('the rest by state', () => {
    expect(listStateOf(CF83F, items)).toEqual({ word: 'Queued', needsYou: false, tone: 'queued', sub: null });
    expect(listStateOf(C9ED9, items)).toEqual({ word: 'Done', needsYou: false, tone: 'done', sub: null });
    expect(listStateOf({ ...CF83F, state: 'working' }, [])).toMatchObject({ word: 'Working', tone: 'working' });
    expect(listStateOf({ ...CF83F, state: 'canceled' }, [])).toMatchObject({ word: 'Canceled', tone: 'closed' });
    expect(listStateOf({ ...CF83F, state: 'rejected' }, [])).toMatchObject({ word: 'Rejected', tone: 'closed' });
  });
});

describe('buildRows', () => {
  it('the agent that last ran the card, with its mood word (LI-G3)', () => {
    expect(r(C58F8.id).agent).toMatchObject({ name: 'tester-tim', mood: 'needs', moodWord: 'needs you' });
    expect(r(C9ED9.id).agent).toMatchObject({ name: 'coder-kai', mood: 'done', moodWord: 'done' });
    expect(r(CF83F.id).agent).toBeNull();
  });
  it('unclaimed says why', () => {
    expect(r(C63AC.id).unclaimedWord).toBe('Unclaimed');
    expect(r(CF83F.id).unclaimedWord).toBe('Not claimed yet');
    expect(r(C481F.id).unclaimedWord).toBe('Not claimed yet');
  });
  it('signals only rows that need you (LI-G5)', () => {
    expect(r(C63AC.id)).toMatchObject({ prioritySignal: true, dueSignal: true, overdue: true });
    expect(r(C4605.id).attemptsSignal).toBe(true);
    expect(r(C1DFC.id).attemptsSignal).toBe(true);
    expect(r(C58F8.id).attemptsSignal).toBe(false);
    expect(r(C9ED9.id)).toMatchObject({ attempts: 15, attemptsSignal: false });
  });
  it('priority, due, cost and age text', () => {
    expect(r(C63AC.id).priorityText).toBe('P1');
    expect(r(C1DFC.id).priorityText).toBeNull();
    expect(r(C63AC.id).dueHuman).toBe('6 Oct 2026');
    expect(dueHuman('2026-10-06')).toBe('6 Oct 2026');
    expect(r(C63AC.id).costText).toBeNull();
    expect(rows.map((x) => [x.s.id.slice(-4), x.ageText])).toEqual([
      ['4605', '2d'], ['9ed9', null], ['58f8', '33h'], ['f83f', '2d'], ['63ac', '2d'], ['1dfc', '33h'], ['481f', '33h'],
    ]);
  });
  it('labels: three shown, the unresolved fourth counted', () => {
    expect(r(C63AC.id)).toMatchObject({ labelNames: ['clean-room', 'evidence-required', 'superpipeline'], moreLabels: 1 });
  });
  it('asked by the agent that queued it, never a person', () => {
    expect([C63AC, C4605, C58F8, CF83F].map((c) => r(c.id).askedBy?.name)).toEqual(['super-chotu', 'super-chotu', 'super-chotu', 'super-chotu']);
    expect([C481F, C1DFC, C9ED9].map((c) => r(c.id).askedBy)).toEqual([null, null, null]);
    expect([CF83F, C481F].map((c) => r(c.id).blockedCount)).toEqual([3, 1]);
  });
  it('the priority class: P1 marked only when it signals', () => {
    expect(priClass(r(C63AC.id))).toBe('pri pri--1');
    expect(priClass(r(C4605.id))).toBe('pri pri--3');
    expect(priClass({ ...r(C63AC.id), prioritySignal: false })).toBe('pri');
  });
});

describe('sorting', () => {
  it('priority ascending is highest first; needs-you breaks the tie; no priority last', () => {
    const test = rows.filter((x) => x.s.stageKey === 'test');
    expect(sortRows(test, SORT).map((x) => x.s.id)).toEqual([C58F8.id, CF83F.id, C481F.id]);
    expect(sortRows(test, { key: 'priority', ascending: false }).map((x) => x.s.id)).toEqual([C58F8.id, CF83F.id, C481F.id]);
  });
  it('a missing value stays last whichever way', () => {
    expect(sortRows(rows, { key: 'agent', ascending: false }).slice(-3).map((x) => x.agent)).toEqual([null, null, null]);
    expect(sortRows(rows, { key: 'due', ascending: true })[0]!.s.id).toBe(C63AC.id);
  });
  it('nextSort flips the same key; a new key starts in its natural direction', () => {
    expect(nextSort(SORT, 'priority')).toEqual({ key: 'priority', ascending: false });
    expect(nextSort(SORT, 'cost')).toEqual({ key: 'cost', ascending: false });
    expect(nextSort(SORT, 'title')).toEqual({ key: 'title', ascending: true });
  });
  it('hints and nouns', () => {
    expect(sortHint(SORT)).toBe('highest first');
    expect(sortHint({ key: 'priority', ascending: false })).toBe('lowest first');
    expect(sortHint({ key: 'title', ascending: true })).toBe('A to Z');
    expect(sortHint({ key: 'due', ascending: true })).toBe('soonest first');
    expect(sortHint({ key: 'age', ascending: false })).toBe('highest first');
    expect(sortHint({ key: 'state', ascending: true })).toBe('most urgent first');
    expect(SORT_NOUN.title).toBe('card title');
    expect(STUDIO_SORT_CYCLE).toEqual(['priority', 'title', 'state', 'agent', 'attempts', 'age', 'due', 'cost']);
    expect(nextInCycle(STUDIO_SORT_CYCLE, 'cost')).toBe('priority');
  });
});

describe('grouping', () => {
  it('by stage: board order, non-empty only, with who works it', () => {
    const g = groupRows(rows, 'stage', SORT, DX_STAGE_LIST, DX_MEMBERS, DX_AGENTS);
    expect(g.map((x) => [x.label, x.rows.length, x.owner, x.order])).toEqual([
      ['Reported', 1, 'a person', 0], ['Reproduce', 1, 'diagnostics · error-eric', 1], ['Failing test', 3, 'testing · tester-tim', 2],
      ['Fix', 1, 'code · 2 agents', 3], ['Shipped', 1, 'a person', 6],
    ]);
    expect(g.map((x, i) => groupNo(x, i, 'stage'))).toEqual(['01', '02', '03', '04', '07']);
  });
  it('by state, by priority, by owner', () => {
    expect(groupRows(rows, 'state', SORT, DX_STAGE_LIST, DX_MEMBERS, DX_AGENTS).map((x) => [x.label, x.rows.length])).toEqual([['Waiting on you', 4], ['Queued', 2], ['Done', 1]]);
    expect(groupRows(rows, 'priority', SORT, DX_STAGE_LIST, DX_MEMBERS, DX_AGENTS).map((x) => x.label)).toEqual(['P1', 'P2', 'P3', 'No priority']);
    expect(groupRows(rows, 'owner', SORT, DX_STAGE_LIST, DX_MEMBERS, DX_AGENTS).map((x) => x.label)).toEqual([DX_MEMBERS[0]!.name]);
  });
  it('ownerText', () => {
    expect(DX_STAGE_LIST.map((s) => ownerText(s.owner))).toEqual(['a person', 'diagnostics · error-eric', 'testing · tester-tim', 'code · 2 agents', 'integration or api or testing · 3 agents', 'a person · approval', 'a person']);
  });
  it('quick counts and the quick filter', () => {
    expect(quickCounts(rows)).toEqual({ all: 7, needs: 4, working: 0, idle: 2, done: 1 });
    const g = groupRows(rows, 'stage', SORT, DX_STAGE_LIST, DX_MEMBERS, DX_AGENTS);
    expect(filterQuick(g, 'needs').map((x) => x.label)).toEqual(['Reported', 'Reproduce', 'Failing test', 'Fix']);
    expect(filterQuick(g, 'done').map((x) => x.label)).toEqual(['Shipped']);
    expect(filterQuick(g, 'all')).toBe(g);
  });
  it('filtersActive counts any axis', () => {
    const off = { states: [], owners: [], minPriority: null, needsReview: false, live: false, overBudget: false, labels: [], showArchived: false, projectId: null };
    expect(filtersActive(off)).toBe(false);
    expect(filtersActive({ ...off, minPriority: 2 })).toBe(true);
    expect(filtersActive({ ...off, labels: ['x'] })).toBe(true);
  });
});

describe('the words each vibe prints', () => {
  const empty = ['Integrate', 'Signed off'];
  it('Daylight and Paper', () => {
    expect(daylightSum(7, 4, SORT)).toBe('7 cards · 4 wait on you · sorted by priority');
    expect(listCaption('Developer Experience', 'stage', SORT)).toBe('Developer Experience cards, grouped by stage, sorted by priority');
    expect(listCaption('Developer Experience', 'stage', SORT, true)).toBe('Developer Experience cards, grouped by stage, sorted by priority ascending');
    expect(paperMastLine('Developer Experience', 7, 4)).toBe('Developer Experience, seven cards. Four wait on you.');
    expect(paperGroupCount(1)).toBe('— one card');
    expect(paperGroupCount(3)).toBe('— three cards');
    expect(paperFoot(SORT, empty)).toBe('Sorted by priority, highest first. Stages with no cards are left out: Integrate and Signed off.');
    expect(paperFacts(r(C63AC.id))).toBe('clean-room · evidence-required · superpipeline · +1 more · ');
    expect(paperFacts(r(CF83F.id))).toBe('Blocked by three other cards · ');
    expect(paperFacts(r(C481F.id))).toBe('Blocked by another card');
    expect(paperFacts(r(C4605.id))).toBe('');
  });
  it('Studio', () => {
    expect(studioKicker('stage', 'all')).toBe('Every card, by stage');
    expect(studioKicker('stage', 'needs')).toBe('Waiting cards, by stage');
    expect(studioHeadline(7, 5, 7, 'stage')).toEqual({ sr: '7 ', text: 'cards sit in 5 of the board’s 7 stages' });
    expect(studioHeadline(1, 1, 7, 'stage')).toEqual({ sr: '1 ', text: 'card sits in 1 of the board’s 7 stages' });
    expect(studioHeadline(7, 3, 7, 'state')).toEqual({ sr: '7 ', text: 'cards in 3 states' });
    expect(studioLede(SORT, empty)).toBe('Sorted by priority, highest first. The two empty stages, Integrate and Signed off, are left out of the list.');
    expect(studioFoot({ visible: 7, groups: 5, groupBy: 'stage', empty: 2, sort: SORT, total: 0, selected: 1 })).toEqual(['7 cards', '5 groups · 2 empty stages hidden', 'sort Pri ↑', '$0.00 total', 'row 2 of 7']);
    expect(studioFoot({ visible: 7, groups: 5, groupBy: 'stage', empty: 2, sort: SORT, total: 0, selected: null })).toHaveLength(4);
  });
  it('Quiet', () => {
    expect(quietLede(7, 4)).toBe('7 cards. 4 are waiting on you.');
    expect(quietLede(7, 1)).toBe('7 cards. 1 is waiting on you.');
    expect(quietLede(7, 0)).toBe('7 cards. No card is waiting on you.');
    expect(quietFacts(r(C63AC.id))).toBe('Labels: clean-room, evidence-required, superpipeline and 1 more. Asked for by super-chotu.');
    expect(quietFacts(r(CF83F.id))).toBe('Blocked by three other cards. Asked for by super-chotu.');
    expect(quietFacts(r(C481F.id))).toBe('Blocked by another card.');
    expect(quietState(r(C63AC.id).state)).toBe('Waiting on you, no owner');
    expect(quietState(r(C4605.id).state)).toBe('Waiting on you, stopped');
    expect(quietState(r(CF83F.id).state)).toBe('Queued');
    expect(quietEmptyFoot(empty)).toBe('Stages with no cards are not shown: Integrate, Signed off.');
  });
  it('Quiet’s sort picker, and a sort it does not list (LI-G14)', () => {
    expect(quietSortOptions(SORT).map((o) => [o.label, o.selected])).toEqual([
      ['Priority, highest first', true], ['Card title', false], ['State', false], ['Agent', false], ['Due date', false], ['Cost', false],
    ]);
    expect(quietSortOptions({ key: 'cost', ascending: false }).find((o) => o.selected)!.label).toBe('Cost');
    const age = quietSortOptions({ key: 'age', ascending: false });
    expect(age[0]).toMatchObject({ value: 'current', label: 'Age, highest first', selected: true });
  });
});
