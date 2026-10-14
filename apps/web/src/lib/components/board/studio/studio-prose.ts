// apps/web/src/lib/components/board/studio/studio-prose.ts
/**
 * The Studio board's report prose (SB §4.2), pure functions of the board model. The hero sentence,
 * the notes and the multiples share one footnote numbering, set by `buildBoardModel`.
 */
import type { Mood } from '@superjackfruit/vibekit';
import { firstSentence, joinAnd, lcFirst, numWord, plural } from '$lib/words';
import type { BoardModel, BoardStage, Unit } from '../board-model';
import { daysOverdue, dueLong, dueShort, isStopped, needsAction, type CardAction } from '../board-words';
import type { CardSummary } from '../card-summary';

export const pad2 = (n: number): string => String(n).padStart(2, '0');
export const fmtUsd = (n: number | null | undefined): string => (n === null || n === undefined ? '—' : `$${n.toFixed(2)}`);
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const terminalOf = (m: BoardModel): string => m.stages[m.stages.length - 1]?.name ?? 'Done';

export type Quick = 'all' | 'needs' | 'working' | 'queued' | 'done';
export function quickFilters(m: BoardModel): Array<{ key: Quick; label: string; n: number; sig: boolean }> {
  return [
    { key: 'all', label: 'All', n: m.counts.all, sig: false },
    { key: 'needs', label: 'Need you', n: m.counts.needs, sig: true },
    { key: 'working', label: 'Working', n: m.counts.working, sig: false },
    { key: 'queued', label: 'Queued', n: m.counts.queued, sig: false },
    { key: 'done', label: 'Done', n: m.counts.done, sig: false },
  ];
}
export const quickMatch = (s: CardSummary, q: Quick): boolean => q === 'all' || s.urgency === q;

export function heroH1(m: BoardModel): { sr: string | null; text: string } {
  const { all, needs } = m.counts;
  if (needs === 0) return { sr: null, text: `None of the ${all} ${all === 1 ? 'card' : 'cards'} is waiting on a person` };
  return { sr: `${needs} `, text: `of ${all} ${all === 1 ? 'card' : 'cards'} ${needs === 1 ? 'is' : 'are'} waiting on a person` };
}

export interface Clause { text: string; fn: number }
function needsClause(s: CardSummary, nowMs: number): string {
  if (s.kind === 'no-owner') {
    if (!s.overdue || !s.dueAt) return 'one sits in a stage nobody works';
    const d = daysOverdue(s.dueAt, nowMs);
    return `one sits in a stage nobody works and is ${numWord(d)} ${d === 1 ? 'day' : 'days'} overdue`;
  }
  if (isStopped(s.kind)) return s.attemptCount <= 1 ? `one stopped in ${s.stageName} on its first try` : `one stopped in ${s.stageName} after ${numWord(s.attemptCount)} tries`;
  if (s.kind === 'question') return `one asks a question in ${s.stageName}`;
  if (s.kind === 'review') return `one waits for your review in ${s.stageName}`;
  return `one waits on you in ${s.stageName}`;
}
/** The hero paragraph, one clause per footnote. Each clause carries its own leading space. */
export function heroSentence(m: BoardModel): Clause[] {
  const out: Clause[] = m.needs.map((s, i, all) => ({
    text: `${i === 0 ? cap(needsClause(s, m.nowMs)) : ` ${needsClause(s, m.nowMs)}`}${i === all.length - 1 ? '.' : ';'}`,
    fn: s.fnNumber,
  }));
  const qb = m.queued.filter((s) => s.held);
  const more = m.needs.length > 0 ? ' more' : '';
  const tail: Clause[] = [];
  if (qb.length) tail.push({ text: `${numWord(qb.length, true)}${more} ${qb.length === 1 ? 'is' : 'are'} queued behind a blocker`, fn: qb[0]!.fnNumber });
  if (m.done.length) tail.push({ text: `${numWord(m.done.length)} ${m.done.length === 1 ? 'has' : 'have'} shipped`, fn: m.done[0]!.fnNumber });
  const lead = out.length ? ' ' : '';
  if (tail.length === 2) {
    out.push({ text: `${lead}${cap(tail[0]!.text)},`, fn: tail[0]!.fn }, { text: ` and ${tail[1]!.text}.`, fn: tail[1]!.fn });
  } else if (tail.length === 1) {
    out.push({ text: `${lead}${cap(tail[0]!.text)}.`, fn: tail[0]!.fn });
  }
  return out;
}

export interface Figure { value: string; label: string; sig: boolean; zero: boolean; fn: number | null }
export function studioFigures(m: BoardModel): Figure[] {
  const c = m.counts;
  return [
    { value: String(c.all), label: 'Cards', sig: false, zero: c.all === 0, fn: null },
    { value: String(c.needs), label: 'Need you', sig: c.needs > 0, zero: c.needs === 0, fn: null },
    { value: String(c.working), label: 'Working', sig: false, zero: c.working === 0, fn: null },
    { value: fmtUsd(m.spend7d), label: 'Spend this week', sig: false, zero: !m.spend7d, fn: m.fn.spend },
    { value: String(c.overBudget), label: 'Over budget', sig: false, zero: c.overBudget === 0, fn: null },
    { value: String(c.overdue), label: 'Overdue', sig: false, zero: c.overdue === 0, fn: null },
  ];
}

export interface Multiple { stage: BoardStage; href: string; band: string; zero: boolean; units: Unit[]; gate: string | null; note: { text: string; fn: number | null }; aria: string }
export function multiplesNote(st: BoardStage, cards: CardSummary[]): { text: string; fn: number | null } {
  if (cards.length === 0) return { text: 'Empty', fn: null };
  if (cards.every((s) => s.urgency === 'done')) return { text: 'Done', fn: cards[0]!.fnNumber };
  const needs = cards.filter((s) => s.urgency === 'needs');
  if (cards.length === 1 && needs.length === 1) {
    const s = needs[0]!;
    if (s.kind === 'no-owner') return { text: s.overdue && s.dueAt ? `Overdue since ${dueShort(s.dueAt)}` : 'Waiting on you', fn: s.fnNumber };
    if (isStopped(s.kind)) return { text: s.attemptCount > 1 ? `Stopped after ${s.attemptCount} tries` : 'Stopped on its first try', fn: s.fnNumber };
    return { text: 'Waiting on you', fn: s.fnNumber };
  }
  const count = (f: (s: CardSummary) => boolean) => cards.filter(f).length;
  const parts = [
    [count((s) => s.urgency === 'queued' && s.held), 'blocked'],
    [needs.length, 'stopped'],
    [count((s) => s.urgency === 'working'), 'working'],
    [count((s) => s.urgency === 'queued' && !s.held), 'queued'],
    [count((s) => s.urgency === 'done'), 'done'],
  ] as const;
  return { text: parts.filter(([n]) => n > 0).map(([n, w]) => `${n} ${w}`).join(', '), fn: (needs[0] ?? cards[0]!).fnNumber };
}
const UNIT_WORD: Record<Unit, string> = { needs: 'waiting on you', blocked: 'blocked', queued: 'queued', working: 'working', done: 'done', off: 'closed' };
function multiplesWho(st: BoardStage): string {
  if (st.gate) return 'Approval gate, a person';
  if (st.owner.kind === 'human') return st.terminal ? 'A person' : 'Worked by a person';
  if (st.declaredBy.length === 1) return `Worked by ${st.declaredBy[0]}`;
  return cap(st.ownerLong.replace(' · ', ', '));
}
/** Reproduces the reference's seven labels (X-5): one state is named bare, several are counted. */
export function multiplesAria(st: BoardStage): string {
  const kinds = [...new Set(st.units)];
  const state = kinds.length === 0 ? '' : kinds.length === 1 ? `, ${UNIT_WORD[kinds[0]!]}` : kinds.map((k) => `, ${st.units.filter((u) => u === k).length} ${UNIT_WORD[k]}`).join('');
  return `Stage ${st.index}, ${st.name}: ${plural(st.count, 'card', 'cards')}${state}. ${multiplesWho(st)}`;
}
export function multiples(m: BoardModel): Multiple[] {
  return m.stages.map((st) => ({
    stage: st,
    href: `#stage-${st.index}`,
    band: `c${Math.min(st.index, 7)}`,
    zero: st.count === 0,
    units: st.units,
    gate: st.gate ? 'Gate · approval' : null,
    note: multiplesNote(st, m.ordered.filter((s) => s.stageKey === st.key)),
    aria: multiplesAria(st),
  }));
}

export const rampAria = (s: CardSummary, stageNames: string[]): string =>
  `Stage ${s.stageIndex + 1} of ${s.stageCount}: ${s.stageName}${s.urgency === 'needs' && isStopped(s.kind) ? ', stopped' : ''}. Stages: ${stageNames.join(', ')}`;

export interface Share { cols: string; aria: string; parts: Array<{ n: number; label: string; signal: boolean; bar: Unit }> }
export function shareBar(m: BoardModel): Share {
  const allBlocked = m.queued.length > 0 && m.queued.every((s) => s.held);
  const segs = [
    { n: m.counts.needs, label: 'waiting on you', aria: 'waiting on you', signal: true, bar: 'needs' as Unit },
    { n: m.counts.queued, label: allBlocked ? 'queued, blocked' : 'queued', aria: allBlocked ? 'queued and blocked' : 'queued', signal: false, bar: (allBlocked ? 'blocked' : 'queued') as Unit },
    { n: m.counts.working, label: 'working', aria: 'working', signal: false, bar: 'working' as Unit },
    { n: m.counts.done, label: 'done', aria: 'done', signal: false, bar: 'done' as Unit },
    { n: m.counts.closed, label: 'closed', aria: 'closed', signal: false, bar: 'off' as Unit },
  ].filter((s) => s.n > 0);
  return {
    cols: segs.map((s) => `${s.n}fr`).join(' '),
    aria: segs.map((s) => `${s.n} ${s.aria}`).join(', '),
    parts: segs.map(({ n, label, signal, bar }) => ({ n, label, signal, bar })),
  };
}

export type NotePart = string | { i: string };
export const noteText = (parts: NotePart[]): string => parts.map((p) => (typeof p === 'string' ? p : `<i>${p.i}</i>`)).join('');
const lineOf = (s: CardSummary): string => s.summaryLine ?? firstSentence(s.stopReason ?? '');
function needsNote(s: CardSummary): NotePart[] {
  const ix = pad2(s.ix);
  if (s.kind === 'no-owner') {
    const whose = s.owner.isMe ? 'yours' : `${s.owner.name}’s`;
    return [`Card ${ix} is ${whose}, in ${s.stageName}.`, ...(s.dueAt ? [' It was due on ', { i: dueLong(s.dueAt) }, '.'] : []), ' No agent works this stage and no review is asked for here, so it will sit until it is moved.'];
  }
  if (isStopped(s.kind)) {
    if (s.attemptCount <= 1) return [`Card ${ix} stopped on ${s.lastAgent?.name ?? 'its agent'}’s first try, ${s.ageLong} ago: it ${lcFirst(lineOf(s))}`];
    return [`Card ${ix} stopped in ${s.stageName} after ${numWord(s.attemptCount)} tries: ${lcFirst(lineOf(s))}`];
  }
  if (s.kind === 'question') return [`Card ${ix} asks a question in ${s.stageName}: ${s.stopReason ?? ''}`];
  if (s.kind === 'review') return [`Card ${ix} waits for your review in ${s.stageName}.`];
  return [`Card ${ix} waits on you in ${s.stageName}.`];
}
function groupNote(cs: CardSummary[], one: (ix: string, stage: string) => string, many: (ixs: string, stage: string) => string): NotePart[] {
  const stages = joinAnd([...new Set(cs.map((s) => s.stageName))]);
  return [cs.length === 1 ? one(pad2(cs[0]!.ix), stages) : many(joinAnd(cs.map((s) => pad2(s.ix))), stages)];
}
export function studioNotes(m: BoardModel): Array<{ n: number; parts: NotePart[] }> {
  const out = m.needs.map((s) => ({ n: s.fnNumber, parts: needsNote(s) }));
  const titles = (cs: CardSummary[]) => `${cs.map((s) => s.title).join('; ')}.`;
  const groups: Array<[CardSummary[], (cs: CardSummary[]) => NotePart[]]> = [
    [m.working, (cs) => groupNote(cs, (ix) => `Card ${ix} is being worked on now.`, (ixs) => `Cards ${ixs} are being worked on now.`)],
    [m.queued.filter((s) => s.held), (cs) => groupNote(cs,
      (ix, st) => `Card ${ix} is queued in ${st} behind another card. Nobody has claimed it; it starts on its own when unblocked.`,
      (ixs, st) => `Cards ${ixs} are queued in ${st} behind another card. Nobody has claimed them; each starts on its own when unblocked.`)],
    [m.queued.filter((s) => !s.held), (cs) => groupNote(cs,
      (ix, st) => `Card ${ix} is queued in ${st}, waiting for an agent to claim it.`,
      (ixs, st) => `Cards ${ixs} are queued in ${st}, waiting for an agent to claim them.`)],
    [m.done, (cs) => [`${terminalOf(m)}, nothing to do: `, { i: titles(cs) }]],
    [m.closed, (cs) => ['Closed, nothing to do: ', { i: titles(cs) }]],
  ];
  for (const [cs, note] of groups) if (cs.length) out.push({ n: cs[0]!.fnNumber, parts: note(cs) });
  const spend: NotePart[] =
    m.spend7d === undefined ? ['Spend this week is still being read.']
    : m.spend7d === null ? ['Spend this week could not be read.']
    : m.spend7d === 0 ? ['No card has spent anything yet: every card’s cost reads ', { i: '—' }, '.']
    : [`The board spent ${fmtUsd(m.spend7d)} this week.`];
  out.push({ n: m.fn.spend, parts: spend });
  return out;
}

export function panelHeading(n: number): { kick: string; h2: string; p: string | null } {
  if (n === 0) return { kick: 'Needs you now · 0', h2: 'Nothing is waiting for a decision', p: null };
  return { kick: `Needs you now · ${n}`, h2: `${numWord(n, true)} ${n === 1 ? 'card is' : 'cards are'} waiting for a decision`, p: 'Each one says what it needs. Answer here, or open the card for the whole story.' };
}
export function panelText(s: CardSummary): string {
  if (s.kind === 'no-owner') return s.stopReason ?? '';
  if (isStopped(s.kind)) return `Stopped. ${lineOf(s)}`;
  return s.stopReason ?? 'Waiting on you.';
}
export function panelAction(s: CardSummary): CardAction {
  if (s.kind === 'no-owner') return { label: 'Move it', does: 'move' };
  if (isStopped(s.kind)) return { label: 'Read why and resume', does: 'open' };
  return needsAction(s.kind) ?? { label: 'Open', does: 'open' };
}

export function rowState(s: CardSummary): { label: string; unit: Unit; needs: boolean } {
  if (s.urgency === 'needs') return { label: 'Waiting on you', unit: 'needs', needs: true };
  if (s.urgency === 'queued') return s.held ? { label: 'Queued · blocked', unit: 'blocked', needs: false } : { label: 'Queued', unit: 'queued', needs: false };
  if (s.urgency === 'working') return { label: 'Working', unit: 'working', needs: false };
  if (s.urgency === 'done') return { label: 'Done', unit: 'done', needs: false };
  return { label: 'Closed', unit: 'off', needs: false };
}
export type RowAgent =
  | { kind: 'person'; name: string; initials: string; text: string; me: boolean }
  | { kind: 'agent'; name: string; mood: Mood }
  | { kind: 'text'; text: string };
export function rowAgent(s: CardSummary): RowAgent {
  if (s.urgency === 'done') return { kind: 'text', text: s.stageName };
  if (s.urgency === 'closed') return { kind: 'text', text: 'Closed' };
  if (s.urgency === 'queued') return { kind: 'text', text: 'Unclaimed' };
  const a = s.urgency === 'working' ? (s.delegate ?? s.lastAgent) : (s.lastAgent ?? s.delegate);
  if (a && s.kind !== 'no-owner') return { kind: 'agent', name: a.name, mood: s.urgency === 'working' ? 'working' : 'needs' };
  return { kind: 'person', name: s.owner.name, initials: s.owner.initials, text: s.owner.isMe ? 'You' : s.owner.name, me: s.owner.isMe };
}
