// apps/web/src/lib/components/plan/list/list-model.ts
/**
 * The List view as rows: what each cell says, which rows signal, how they sort and group — pure,
 * so every vibe prints the same facts (spec List §3.3). A row needs you exactly when the card has
 * an attention item; `card.state` alone never decides it.
 */
import type { Mood } from '@superjackfruit/vibekit';
import type { AgentSummary, Card, Member } from '$lib/api';
import type { AttentionItem, AttentionKind } from '$lib/components/attention/attention';
import type { CardSummary, StageSummary } from '$lib/components/board/card-summary';
import type { StageOwnerLabel } from '$lib/components/board/stage-owner';
import { moodWord } from '$lib/components/card/card-lead';
import { ageShort } from '$lib/age';
import { joinAnd } from '$lib/words';
import { displayAgent, displayPrincipal } from '$lib/names';
import type { CardFilters, ListGroupBy } from '$lib/stores/app.svelte';
import type { ListAgent, ListGroup, ListRow, ListSort, ListSortKey, ListState, ListTone, QuickFilter } from './types';

const SUB: Record<AttentionKind, string> = {
  review: 'review', question: 'question asked', blocked: 'stopped', 'repeated-failure': 'failing', refused: 'refused',
  'sub-tasks': 'waiting on sub-tasks', 'no-owner': 'no owner', failed: 'failed', budget: 'over budget',
};

export function listStateOf(card: Card, items: AttentionItem[]): ListState {
  const item = items.find((i) => i.cardId === card.id);
  if (item) return { word: 'Waiting on you', needsYou: true, tone: 'needs', sub: SUB[item.kind] };
  switch (card.state) {
    case 'working': return { word: 'Working', needsYou: false, tone: 'working', sub: null };
    case 'completed': return { word: 'Done', needsYou: false, tone: 'done', sub: null };
    case 'canceled': return { word: 'Canceled', needsYou: false, tone: 'closed', sub: null };
    case 'rejected': return { word: 'Rejected', needsYou: false, tone: 'closed', sub: null };
    default: return { word: 'Queued', needsYou: false, tone: 'queued', sub: null };
  }
}

function rowAgent(s: CardSummary, state: ListState, agents: AgentSummary[]): ListAgent | null {
  const id = s.card.delegateAgentId ?? s.card.lastAgentId ?? null;
  if (!id) return null;
  const mood: Mood = state.needsYou ? 'needs' : state.tone === 'working' ? 'working' : state.tone === 'done' ? 'done' : s.card.delegateAgentId ? 'thinking' : 'resting';
  return { id, name: displayAgent(id, agents), iconUrl: agents.find((a) => a.id === id)?.iconUrl ?? null, mood, moodWord: moodWord(mood) };
}

export function dueHuman(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function buildRows(summaries: CardSummary[], ctx: { boardId: string; agents: AgentSummary[] }): ListRow[] {
  return summaries.map((s) => {
    const state = listStateOf(s.card, s.attention ? [s.attention] : []);
    const needs = state.needsYou;
    const closed = state.tone === 'done' || state.tone === 'closed';
    const shown = s.labels.slice(0, 3);
    return {
      s, href: `/b/${ctx.boardId}/c/${s.id}`, state, agent: rowAgent(s, state, ctx.agents),
      unclaimedWord: s.attention?.kind === 'no-owner' ? 'Unclaimed' : 'Not claimed yet',
      priorityText: s.priority > 0 ? `P${s.priority}` : null,
      prioritySignal: s.priority === 1 && needs,
      dueIso: s.dueAt, dueHuman: s.dueAt ? dueHuman(s.dueAt) : null, overdue: s.overdue, dueSignal: s.overdue && needs,
      costText: s.cost > 0 ? `$${s.cost.toFixed(2)}` : null, costSignal: s.overBudget && needs,
      attempts: s.attemptCount, attemptsSignal: s.attemptCount >= 2 && needs,
      ageText: s.ageHours === null || closed ? null : ageShort(s.ageHours, false),
      askedBy: s.queuedBy?.agent ? { name: s.queuedBy.name, agentId: s.queuedBy.agent.id, iconUrl: s.queuedBy.agent.iconUrl } : null,
      blockedCount: s.card.blockedBy.length,
      labelNames: shown.map((l) => l.name),
      moreLabels: Math.max(0, s.card.labels.length - shown.length),
    };
  });
}

/** Daylight and Paper mark P1 in signal only when the row needs you; other priorities keep their class. */
export function priClass(r: ListRow): string {
  if (r.prioritySignal) return 'pri pri--1';
  return r.s.priority === 1 ? 'pri' : `pri pri--${r.s.priority}`;
}

// ---- sorting ----
const TONES: readonly ListTone[] = ['needs', 'working', 'queued', 'done', 'closed'];

function keyOf(r: ListRow, key: ListSortKey): number | string | null {
  switch (key) {
    case 'priority': return r.s.priority > 0 ? r.s.priority : null;
    case 'title': return r.s.title;
    case 'state': return TONES.indexOf(r.state.tone);
    case 'agent': return r.agent?.name ?? null;
    case 'due': return r.dueIso;
    case 'cost': return r.s.cost;
    case 'attempts': return r.attempts;
    case 'age': return r.s.ageHours;
  }
}

/** By the key (descending reverses only the key), missing values last; then needs-you, age, title. */
export function sortRows(rows: ListRow[], sort: ListSort): ListRow[] {
  return [...rows].sort((a, b) => {
    const x = keyOf(a, sort.key);
    const y = keyOf(b, sort.key);
    if (x === null && y !== null) return 1;
    if (y === null && x !== null) return -1;
    if (x !== null && y !== null) {
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      if (c !== 0) return sort.ascending ? c : -c;
    }
    return Number(b.state.needsYou) - Number(a.state.needsYou) || (b.s.ageHours ?? -1) - (a.s.ageHours ?? -1) || a.s.title.localeCompare(b.s.title);
  });
}

export function nextSort(cur: ListSort, k: ListSortKey): ListSort {
  if (cur.key === k) return { key: k, ascending: !cur.ascending };
  return { key: k, ascending: !(k === 'cost' || k === 'attempts' || k === 'age') };
}

export function sortHint(s: ListSort): string {
  switch (s.key) {
    case 'priority': return s.ascending ? 'highest first' : 'lowest first';
    case 'title': case 'agent': return s.ascending ? 'A to Z' : 'Z to A';
    case 'due': return s.ascending ? 'soonest first' : 'latest first';
    case 'state': return s.ascending ? 'most urgent first' : 'least urgent first';
    default: return s.ascending ? 'lowest first' : 'highest first';
  }
}

export const SORT_NOUN: Record<ListSortKey, string> = { priority: 'priority', title: 'card title', state: 'state', agent: 'agent', due: 'due date', cost: 'cost', attempts: 'attempts', age: 'age' };
export const STUDIO_HEADER: Record<ListSortKey, string> = { priority: 'Pri', title: 'Card', state: 'State', agent: 'Agent', attempts: 'Att', age: 'Age', due: 'Due', cost: 'Cost' };
export const GROUP_NOUN: Record<ListGroupBy, string> = { stage: 'stage', state: 'state', owner: 'owner', priority: 'priority' };
export const GROUPS: Array<{ id: ListGroupBy; label: string }> = [
  { id: 'stage', label: 'Stage' }, { id: 'state', label: 'State' }, { id: 'owner', label: 'Owner' }, { id: 'priority', label: 'Priority' },
];
export const STUDIO_SORT_CYCLE: ListSortKey[] = ['priority', 'title', 'state', 'agent', 'attempts', 'age', 'due', 'cost'];
export const GROUP_CYCLE: ListGroupBy[] = ['stage', 'state', 'owner', 'priority'];
export function nextInCycle<T>(cycle: readonly T[], cur: T): T {
  return cycle[(cycle.indexOf(cur) + 1) % cycle.length]!;
}

// ---- grouping ----
const TONE_LABEL: Record<ListTone, string> = { needs: 'Waiting on you', working: 'Working', queued: 'Queued', done: 'Done', closed: 'Closed' };

/** "diagnostics · error-eric", "code · 2 agents", "a person". */
export function ownerText(o: StageOwnerLabel): string {
  if (o.kind !== 'capability' || o.declaredBy.length === 0) return o.label;
  return o.declaredBy.length === 1 ? `${o.label} · ${o.declaredBy[0]}` : `${o.label} · ${o.declaredBy.length} agents`;
}

export function groupRows(rows: ListRow[], groupBy: ListGroupBy, sort: ListSort, stageList: StageSummary[], members: Member[], agents: AgentSummary[]): ListGroup[] {
  let groups: ListGroup[];
  if (groupBy === 'stage') {
    groups = stageList.map((st) => ({ key: st.key, label: st.name, order: st.order, owner: ownerText(st.owner), rows: rows.filter((r) => r.s.stageKey === st.key) }));
  } else if (groupBy === 'state') {
    groups = TONES.map((t, i) => ({ key: t, label: TONE_LABEL[t], order: i, owner: null, rows: rows.filter((r) => r.state.tone === t) }));
  } else if (groupBy === 'owner') {
    groups = [...new Set(rows.map((r) => r.s.card.ownerUserId))]
      .map((id) => ({ key: id, label: displayPrincipal(id, members, agents) || id, order: 0, owner: null, rows: rows.filter((r) => r.s.card.ownerUserId === id) }))
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((g, i) => ({ ...g, order: i }));
  } else {
    const rank = (p: number) => (p > 0 ? p : Number.MAX_SAFE_INTEGER);
    groups = [...new Set(rows.map((r) => r.s.priority))]
      .sort((a, b) => rank(a) - rank(b))
      .map((p, i) => ({ key: p > 0 ? `P${p}` : 'none', label: p > 0 ? `P${p}` : 'No priority', order: i, owner: null, rows: rows.filter((r) => r.s.priority === p) }));
  }
  return groups.filter((g) => g.rows.length > 0).map((g) => ({ ...g, rows: sortRows(g.rows, sort) }));
}

export function quickCounts(rows: ListRow[]): Record<QuickFilter, number> {
  const n = (t: ListTone) => rows.filter((r) => r.state.tone === t).length;
  return { all: rows.length, needs: n('needs'), working: n('working'), idle: n('queued'), done: n('done') + n('closed') };
}

const QUICK_TONES: Record<QuickFilter, ListTone[] | null> = { all: null, needs: ['needs'], working: ['working'], idle: ['queued'], done: ['done', 'closed'] };
/** Studio's quick filter: rows by tone after grouping; groups left empty drop. */
export function filterQuick(groups: ListGroup[], quick: QuickFilter): ListGroup[] {
  const tones = QUICK_TONES[quick];
  if (!tones) return groups;
  return groups.map((g) => ({ ...g, rows: g.rows.filter((r) => tones.includes(r.state.tone)) })).filter((g) => g.rows.length > 0);
}

export function filtersActive(f: CardFilters): boolean {
  return f.states.length > 0 || f.owners.length > 0 || f.minPriority !== null || f.needsReview || f.live || f.overBudget || f.labels.length > 0 || f.showArchived || f.projectId !== null;
}

// ---- words ----
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
/** The List counts in words up to twelve (Operate stops at ten). */
export const listNumberWord = (n: number): string => WORDS[n] ?? String(n);
const capWord = (w: string): string => w.charAt(0).toUpperCase() + w.slice(1);
const cardsText = (n: number): string => `${n} ${n === 1 ? 'card' : 'cards'}`;
const blockedText = (n: number): string => (n === 1 ? 'Blocked by another card' : `Blocked by ${listNumberWord(n)} other cards`);

export function daylightSum(cardCount: number, needs: number, sort: ListSort): string {
  return `${cardsText(cardCount)}${needs > 0 ? ` · ${needs} ${needs === 1 ? 'waits' : 'wait'} on you` : ''} · sorted by ${SORT_NOUN[sort.key]}`;
}

export function listCaption(boardName: string, groupBy: ListGroupBy, sort: ListSort, withDirection = false): string {
  return `${boardName} cards, grouped by ${GROUP_NOUN[groupBy]}, sorted by ${SORT_NOUN[sort.key]}${withDirection ? (sort.ascending ? ' ascending' : ' descending') : ''}`;
}

export function paperMastLine(boardName: string, cardCount: number, needs: number): string {
  const head = `${boardName}, ${listNumberWord(cardCount)} ${cardCount === 1 ? 'card' : 'cards'}.`;
  return head + (needs === 0 ? ' Nothing waits on you.' : ` ${capWord(listNumberWord(needs))} ${needs === 1 ? 'waits' : 'wait'} on you.`);
}

export const paperGroupCount = (n: number): string => `— ${listNumberWord(n)} ${n === 1 ? 'card' : 'cards'}`;

export function paperFoot(sort: ListSort, empty: string[]): string {
  return `Sorted by ${SORT_NOUN[sort.key]}, ${sortHint(sort)}.${empty.length ? ` Stages with no cards are left out: ${joinAnd(empty)}.` : ''}`;
}

/** Paper's facts run, up to (and including the separator before) the asked-by span. */
export function paperFacts(r: ListRow): string {
  const parts = [...r.labelNames, ...(r.moreLabels ? [`+${r.moreLabels} more`] : []), ...(r.blockedCount ? [blockedText(r.blockedCount)] : [])];
  return parts.join(' · ') + (r.askedBy && parts.length ? ' · ' : '');
}

const QUICK_WORD: Record<Exclude<QuickFilter, 'all'>, string> = { needs: 'Waiting', working: 'Working', idle: 'Idle', done: 'Done' };
export function studioKicker(groupBy: ListGroupBy, quick: QuickFilter): string {
  return quick === 'all' ? `Every card, by ${GROUP_NOUN[groupBy]}` : `${QUICK_WORD[quick]} cards, by ${GROUP_NOUN[groupBy]}`;
}

export function studioHeadline(visible: number, groups: number, stageCount: number, groupBy: ListGroupBy): { sr: string; text: string } {
  const text = groupBy === 'stage'
    ? `${visible === 1 ? 'card sits' : 'cards sit'} in ${groups} of the board’s ${stageCount} stages`
    : `${visible === 1 ? 'card' : 'cards'} in ${groups} ${GROUP_NOUN[groupBy]}${groups === 1 ? '' : 's'}`;
  return { sr: `${visible} `, text };
}

export function studioLede(sort: ListSort, empty: string[]): string {
  const k = empty.length;
  return `Sorted by ${SORT_NOUN[sort.key]}, ${sortHint(sort)}.` + (k ? ` The ${listNumberWord(k)} empty stage${k === 1 ? '' : 's'}, ${joinAnd(empty)}, ${k === 1 ? 'is' : 'are'} left out of the list.` : '');
}

export function studioFoot(f: { visible: number; groups: number; groupBy: ListGroupBy; empty: number; sort: ListSort; total: number; selected: number | null }): string[] {
  return [
    cardsText(f.visible),
    `${f.groups} ${f.groups === 1 ? 'group' : 'groups'}${f.groupBy === 'stage' && f.empty ? ` · ${f.empty} empty ${f.empty === 1 ? 'stage' : 'stages'} hidden` : ''}`,
    `sort ${STUDIO_HEADER[f.sort.key]} ${f.sort.ascending ? '↑' : '↓'}`,
    `$${f.total.toFixed(2)} total`,
    ...(f.selected === null ? [] : [`row ${f.selected + 1} of ${f.visible}`]),
  ];
}

/** Studio's group number: the stage's own number, else the group's position. */
export function groupNo(g: ListGroup, index: number, groupBy: ListGroupBy): string {
  return String((groupBy === 'stage' ? g.order : index) + 1).padStart(2, '0');
}

export function quietLede(cardCount: number, needs: number): string {
  return `${cardsText(cardCount)}.` + (needs === 0 ? ' No card is waiting on you.' : needs === 1 ? ' 1 is waiting on you.' : ` ${needs} are waiting on you.`);
}

export function quietFacts(r: ListRow): string {
  const out: string[] = [];
  if (r.labelNames.length) out.push(r.moreLabels ? `Labels: ${r.labelNames.join(', ')} and ${r.moreLabels} more.` : `Labels: ${joinAnd(r.labelNames)}.`);
  if (r.blockedCount) out.push(`${blockedText(r.blockedCount)}.`);
  if (r.askedBy) out.push(`Asked for by ${r.askedBy.name}.`);
  return out.join(' ');
}

export const quietState = (s: ListState): string => (s.needsYou && s.sub ? `${s.word}, ${s.sub}` : s.word);
export const quietEmptyFoot = (empty: string[]): string => `Stages with no cards are not shown: ${empty.join(', ')}.`;

export const QUIET_SORTS: Array<{ label: string; sort: ListSort }> = [
  { label: 'Priority, highest first', sort: { key: 'priority', ascending: true } },
  { label: 'Card title', sort: { key: 'title', ascending: true } },
  { label: 'State', sort: { key: 'state', ascending: true } },
  { label: 'Agent', sort: { key: 'agent', ascending: true } },
  { label: 'Due date', sort: { key: 'due', ascending: true } },
  { label: 'Cost', sort: { key: 'cost', ascending: false } },
];

/** The picker's options; a sort set by a header it does not list is shown first, selected (LI-G14). */
export function quietSortOptions(current: ListSort): Array<{ value: string; label: string; sort: ListSort; selected: boolean }> {
  const opts = QUIET_SORTS.map((o, i) => ({ value: String(i), label: o.label, sort: o.sort, selected: o.sort.key === current.key && o.sort.ascending === current.ascending }));
  if (opts.some((o) => o.selected)) return opts;
  return [{ value: 'current', label: capWord(`${SORT_NOUN[current.key]}, ${sortHint(current)}`), sort: current, selected: true }, ...opts];
}

export const emptyText = (p: { filtersOn: boolean; hasCards: boolean }): string => (p.hasCards ? 'No cards match these filters.' : 'No cards on this board');
