// apps/web/src/lib/components/plan/list/list-model.ts
/**
 * The List view as rows: what each cell says, which rows signal, how they sort and group — pure,
 * so every vibe prints the same facts (spec List §3.3). A row needs you exactly when the card has
 * an attention item; `card.state` alone never decides it.
 */
import type { Mood } from '@superjackfruitlabs/vibekit-ui';
import type { AgentSummary, Card, Member } from '$lib/api';
import type { AttentionItem, AttentionKind } from '$lib/components/attention/attention';
import type { CardSummary, StageSummary } from '$lib/components/board/card-summary';
import type { StageOwnerLabel } from '$lib/components/board/stage-owner';
import { moodWord } from '$lib/components/card/card-lead';
import { ageShort } from '$lib/age';
import { displayAgent, displayPrincipal } from '$lib/names';
import type { ListGroupBy } from '$lib/stores/app.svelte';
import type { ListAgent, ListGroup, ListRow, ListSort, ListSortKey, ListState, ListTone } from './types';

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
export const GROUP_NOUN: Record<ListGroupBy, string> = { stage: 'stage', state: 'state', owner: 'owner', priority: 'priority' };
export const GROUPS: Array<{ id: ListGroupBy; label: string }> = [
  { id: 'stage', label: 'Stage' }, { id: 'state', label: 'State' }, { id: 'owner', label: 'Owner' }, { id: 'priority', label: 'Priority' },
];
/** S cycles the sort through every key, the table's columns and attempts and age. */
export const SORT_CYCLE: ListSortKey[] = ['priority', 'title', 'state', 'agent', 'attempts', 'age', 'due', 'cost'];
export const GROUP_CYCLE: ListGroupBy[] = ['stage', 'state', 'owner', 'priority'];
export function nextInCycle<T>(cycle: readonly T[], cur: T): T {
  return cycle[(cycle.indexOf(cur) + 1) % cycle.length];
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

// ---- words ----
const capWord = (w: string): string => w.charAt(0).toUpperCase() + w.slice(1);

export function listCaption(boardName: string, groupBy: ListGroupBy, sort: ListSort): string {
  return `${boardName} cards, grouped by ${GROUP_NOUN[groupBy]}, sorted by ${SORT_NOUN[sort.key]}`;
}

/** The state with its qualifier when the row needs you: "Waiting on you, no owner". */
export const stateText = (s: ListState): string => (s.needsYou && s.sub ? `${s.word}, ${s.sub}` : s.word);

export const SORTS: Array<{ label: string; sort: ListSort }> = [
  { label: 'Priority, highest first', sort: { key: 'priority', ascending: true } },
  { label: 'Card title', sort: { key: 'title', ascending: true } },
  { label: 'State', sort: { key: 'state', ascending: true } },
  { label: 'Agent', sort: { key: 'agent', ascending: true } },
  { label: 'Due date', sort: { key: 'due', ascending: true } },
  { label: 'Cost', sort: { key: 'cost', ascending: false } },
];

/** The Sort by picker's options; a sort set by a header or S that it does not list is shown first, selected (LI-G14). */
export function sortOptions(current: ListSort): Array<{ value: string; label: string; sort: ListSort; selected: boolean }> {
  const opts = SORTS.map((o, i) => ({ value: String(i), label: o.label, sort: o.sort, selected: o.sort.key === current.key && o.sort.ascending === current.ascending }));
  if (opts.some((o) => o.selected)) return opts;
  return [{ value: 'current', label: capWord(`${SORT_NOUN[current.key]}, ${sortHint(current)}`), sort: current, selected: true }, ...opts];
}
