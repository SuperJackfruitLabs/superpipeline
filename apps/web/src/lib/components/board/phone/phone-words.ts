// apps/web/src/lib/components/board/phone/phone-words.ts
/**
 * Words, orders and lines for the four phone boards (shell-and-board §3.4, §3.6, §4.5 phone rows).
 * Pure. Phones pass agent text through sentenceCase (C-06); desktop prints it verbatim.
 */
import { greetNamed } from '$lib/greet';
import type { Mood, Phase } from '@superjackfruit/vibekit';
import type { AttentionKind } from '$lib/components/attention/attention';
import type { CardSummary, Urgency } from '$lib/components/board/card-summary';
import { dueLong, dueShort } from '$lib/components/board/board-words';
import { openLabel } from '$lib/components/board/open-label';
import { refLabel } from '$lib/components/board/ref-chip';
import { firstSentence, joinAnd, numWord, plural, remainder, sentenceCase } from '$lib/words';

type OrderRow = { urgency: Urgency; kind: AttentionKind | null; ageHours: number | null };
export interface FaceRef { id: string; name: string; mood: Mood }

/** The kinds where an agent has stopped and a person must resume it. */
export const STOPPED_KINDS: ReadonlySet<AttentionKind> = new Set<AttentionKind>(['blocked', 'repeated-failure', 'failed', 'budget', 'refused']);
export const isStopped = (s: Pick<OrderRow, 'urgency' | 'kind'>): boolean => s.urgency === 'needs' && !!s.kind && STOPPED_KINDS.has(s.kind);
export const usd = (n: number): string => `$${n.toFixed(2)}`;
const capFirst = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const saidOf = (s: CardSummary): string => s.card.needsHuman?.detail ?? s.attention?.detail ?? '';
const blockedCount = (s: CardSummary): number => s.card.blockedBy.length;
const queuer = (s: CardSummary): FaceRef | null => (s.queuedBy ? { id: s.queuedBy.agent?.id ?? s.queuedBy.name, name: s.queuedBy.name, mood: 'resting' } : null);
const agentFace = (s: CardSummary, mood: Mood): FaceRef | null => (s.lastAgent ? { id: s.lastAgent.id, name: s.lastAgent.name, mood } : null);
/** An agent that no longer exists reads "an agent" (ruling). */
const agentName = (s: CardSummary): string => s.lastAgent?.name ?? 'an agent';
const attemptTail = (s: CardSummary): string => (s.attemptCount > 1 ? ` · attempt ${s.attemptCount}` : '');

/**
 * The phone "wants" order: stopped cards by how long they have waited (longest first), then cards in a
 * stage nobody works, then every other kind of need; then everything else in the desktop order.
 */
export function wantsOrder<T extends OrderRow>(ordered: readonly T[]): T[] {
  const rank = (s: T) => (s.kind && STOPPED_KINDS.has(s.kind) ? 0 : s.kind === 'no-owner' ? 1 : 2);
  const age = (s: T) => s.ageHours ?? -1;
  const needs = ordered
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.urgency === 'needs')
    .sort((a, b) => rank(a.s) - rank(b.s) || age(b.s) - age(a.s) || a.i - b.i)
    .map(({ s }) => s);
  return [...needs, ...ordered.filter((s) => s.urgency !== 'needs')];
}

export interface NeedsCounts { needs: number; stopped: number; noOwner: number; questions: number; reviews: number }
export function needsCounts(rows: readonly Pick<OrderRow, 'urgency' | 'kind'>[]): NeedsCounts {
  const n = rows.filter((r) => r.urgency === 'needs');
  return {
    needs: n.length,
    stopped: n.filter(isStopped).length,
    noOwner: n.filter((r) => r.kind === 'no-owner').length,
    questions: n.filter((r) => r.kind === 'question').length,
    reviews: n.filter((r) => r.kind === 'review').length,
  };
}

export function phoneHello(phase: Phase, firstName: string): string {
  return greetNamed(phase, firstName);
}

export function phoneHelloP(c: NeedsCounts): { strong: string; rest: string } {
  if (c.needs === 0) return { strong: 'Nothing needs you.', rest: '' };
  const parts: string[] = [];
  if (c.stopped) parts.push(`${numWord(c.stopped)} ${c.stopped === 1 ? 'agent' : 'agents'} stopped`);
  if (c.noOwner) parts.push(`${numWord(c.noOwner)} ${c.noOwner === 1 ? 'card waits' : 'cards wait'} in a person's stage`);
  if (c.questions) parts.push(`${numWord(c.questions)} asked a question`);
  if (c.reviews) parts.push(`${numWord(c.reviews)} ${c.reviews === 1 ? 'waits' : 'wait'} for your review`);
  return { strong: `${c.needs} ${c.needs === 1 ? 'card wants' : 'cards want'} you.`, rest: parts.length ? `${capFirst(joinAnd(parts))}.` : '' };
}

export const wantsIntro = (stages: number): string => `From ${numWord(stages)} ${stages === 1 ? 'stage' : 'stages'}, most urgent first.`;
/** The title button's name: the same sentence every board's title says (Enter, M and Alt+arrows all work on a keyboard). */
export const phoneTitleLabel = (s: Pick<CardSummary, 'title' | 'stageName'>): string => openLabel(s);

// ── Daylight ────────────────────────────────────────────────────────────────────────────────────
export function pdStageLine(s: CardSummary): string {
  if (s.urgency === 'needs') {
    return s.kind === 'no-owner'
      ? `${s.stageName} · a person's stage · ${s.ageShort}`
      : `${s.stageName} · stage ${s.stageIndex + 1} of ${s.stageCount} · ${s.ageShort}`;
  }
  if (s.urgency === 'done') return `Done · ${s.ageShort} ago · ${plural(s.attemptCount, 'attempt', 'attempts')}`;
  if (s.urgency === 'closed') return `Closed · ${s.ageShort} ago`;
  if (s.urgency === 'working') return `Working · ${s.ageShort}`;
  return `Queued · ${s.ageShort}`;
}
export function actionWord(s: Pick<OrderRow, 'urgency' | 'kind'>): 'Resume' | 'Answer' | 'Review' | 'Open' {
  if (isStopped(s)) return 'Resume';
  if (s.kind === 'question') return 'Answer';
  if (s.kind === 'review') return 'Review';
  return 'Open';
}
export const personStageText = (stage: string): string => `${stage} is a person's stage. Waiting for you to pick it up or move it on.`;
export function pdDue(s: Pick<CardSummary, 'dueAt' | 'overdue'>): { text: string; overdue: boolean } | null {
  if (!s.dueAt) return null;
  return { text: s.overdue ? `Due ${dueShort(s.dueAt)}, overdue` : `Due ${dueShort(s.dueAt)}`, overdue: s.overdue };
}
export function laneNote(needsHere: number, queuedHere: number): string | null {
  if (needsHere === 0) return null;
  if (queuedHere === 0) return `${plural(needsHere, 'card', 'cards')}, waiting on you above.`;
  return `${needsHere} ${needsHere === 1 ? 'card is' : 'cards are'} waiting on you above. ${queuedHere} ${queuedHere === 1 ? 'is' : 'are'} queued here.`;
}
export const blockedChip = (n: number): { text: string; title: string } => ({ text: `${n} blocked`, title: `${plural(n, 'card', 'cards')} ${n === 1 ? 'waits' : 'wait'} on other cards` });
export function blockedByChip(titles: string[]): { text: string; title: string } {
  const n = titles.length;
  return { text: `Blocked by ${plural(n, 'card', 'cards')}`, title: n === 1 ? `Waits on ${titles[0]}` : `Waits on ${n} cards: ${titles.join('; ')}` };
}

// ── Paper ───────────────────────────────────────────────────────────────────────────────────────
export const paperWaitingHeading = (n: number): string => (n ? `Waiting on you · ${plural(n, 'letter', 'letters')}` : 'Waiting on you');
export function paperSig(s: CardSummary): { face: FaceRef | null; em: string; rest: string } {
  if (s.kind === 'no-owner') return { face: queuer(s), em: s.queuedBy ? `asked by ${s.queuedBy.name}` : 'With you', rest: ` · ${s.stageName} · ${s.agoWords}` };
  return { face: agentFace(s, 'needs'), em: agentName(s), rest: ` · ${s.stageName} · ${s.agoWords}${attemptTail(s)}` };
}
export function paperQuote(s: CardSummary): string {
  if (s.kind === 'no-owner') return `“Waiting to be picked up.” ${s.stageName} is a person's stage.`;
  return `“${sentenceCase(saidOf(s))}”`;
}
export type Fact = { text: string; cls?: 'ref' | 'od'; title?: string };
const labelFacts = (s: CardSummary): Fact[] => [
  ...s.labels.map((l) => ({ text: l.name })),
  ...(s.moreLabels > 0 ? [{ text: `+${s.moreLabels}`, title: plural(s.moreLabels, 'more label', 'more labels') }] : []),
];
export function paperFacts(s: CardSummary): Fact[] {
  const out: Fact[] = [];
  if (s.priority > 0) out.push({ text: `P${s.priority}` });
  if (s.kind === 'no-owner') {
    out.push(...labelFacts(s));
    if (s.dueAt) out.push(s.overdue ? { text: `Due ${dueShort(s.dueAt)} · overdue`, cls: 'od' } : { text: `Due ${dueShort(s.dueAt)}` });
    return out;
  }
  if (s.queuedBy) out.push({ text: `asked by ${s.queuedBy.name}` });
  out.push({ text: usd(s.cost) });
  if (s.firstRef) out.push({ text: refLabel(s.firstRef), cls: 'ref' });
  return out;
}
export function paperEntryBy(s: CardSummary): { em: string | null; rest: string } {
  if (s.urgency === 'done') return { em: null, rest: `Done ${s.agoWords} · after ${plural(s.attemptCount, 'attempt', 'attempts')}` };
  if (s.urgency === 'closed') return { em: null, rest: `Closed ${s.agoWords}` };
  if (s.urgency === 'working') return { em: agentName(s), rest: ` · ${s.stageName} · ${s.ageLong}` };
  return { em: 'Not picked up yet', rest: ` · ${s.stageName} · ${s.ageLong}` };
}
export function paperEntryFacts(s: CardSummary): string[] {
  const out: string[] = [];
  if (s.priority > 0) out.push(`P${s.priority}`);
  if (s.urgency === 'done' || s.urgency === 'closed' || s.urgency === 'working') return [...out, usd(s.cost)];
  if (s.held) out.push(`Blocked by ${plural(blockedCount(s), 'card', 'cards')}`);
  if (s.queuedBy) out.push(`asked by ${s.queuedBy.name}`);
  return out;
}
export const pipelineRest = (st: { count: number; blocked: number }, owner: string): string =>
  ` · ${st.count === 0 ? 'empty' : st.count}${st.blocked ? ` · ${st.blocked} blocked` : ''} · ${owner}`;

// ── Studio ──────────────────────────────────────────────────────────────────────────────────────
const NEEDS_WORD: Partial<Record<AttentionKind, string>> = { question: 'question', review: 'review', 'sub-tasks': 'waiting' };
export const rowIndex = (i: number): string => String(i + 1).padStart(2, '0');
export function studioRowLabel(s: CardSummary): { text: string; needs: boolean } {
  if (s.urgency === 'needs') {
    if (s.kind === 'no-owner') return { text: 'Needs you · your stage', needs: true };
    return { text: `Needs you · ${isStopped(s) ? 'stopped' : (s.kind && NEEDS_WORD[s.kind]) ?? 'waiting'}`, needs: true };
  }
  if (s.urgency === 'queued') return { text: s.held ? `Queued · blocked by ${blockedCount(s)}` : 'Queued', needs: false };
  return { text: s.urgency === 'working' ? 'Working' : s.urgency === 'done' ? 'Done' : 'Closed', needs: false };
}
export function studioNext(s: CardSummary): { text: string; q: boolean } {
  if (s.urgency === 'needs') {
    if (s.kind === 'no-owner') return { text: `Pick it up or move it on.${s.overdue && s.dueAt ? ` Overdue since ${dueShort(s.dueAt)}.` : ''}`, q: false };
    return { text: s.summaryLine ?? firstSentence(sentenceCase(saidOf(s))), q: false };
  }
  if (s.urgency === 'queued') {
    const n = blockedCount(s);
    return { text: `auto · ${s.held ? `waits on ${plural(n, 'card', 'cards')} · ` : ''}not picked up yet · ${usd(s.cost)}`, q: true };
  }
  if (s.urgency === 'done') return { text: `${s.attemptCount} ${s.attemptCount === 1 ? 'try' : 'tries'} · ${usd(s.cost)}`, q: true };
  if (s.urgency === 'working') return { text: `${agentName(s)} · working · ${usd(s.cost)}`, q: true };
  return { text: `closed · ${usd(s.cost)}`, q: true };
}
export type StudioFact = { text: string; p?: boolean; title?: string };
export function studioFacts(s: CardSummary): StudioFact[] {
  const out: StudioFact[] = s.priority > 0 ? [{ text: `P${s.priority}`, p: true }] : [];
  if (s.urgency === 'done' || s.urgency === 'closed') return out;
  if (s.firstRef) out.push({ text: refLabel(s.firstRef) });
  out.push(...labelFacts(s).map(({ text, title }) => (title ? { text, title } : { text })));
  if (s.queuedBy) out.push({ text: `asked by ${s.queuedBy.name}` });
  return out;
}
export const studioDue = (s: Pick<CardSummary, 'dueAt' | 'overdue'>): { text: string; sig: boolean } =>
  s.dueAt ? { text: s.overdue ? `${dueShort(s.dueAt)}, overdue` : dueShort(s.dueAt), sig: s.overdue } : { text: '—', sig: false };
export function phoneLede(c: { stopped: number; noOwner: number; daysOverdue: number; queuedBlocked: number; done: number }): string {
  const one: string[] = [];
  if (c.stopped) one.push(`${numWord(c.stopped)} stopped and ${c.stopped === 1 ? 'needs' : 'need'} resuming`);
  if (c.noOwner) one.push(`${numWord(c.noOwner)} ${c.noOwner === 1 ? 'sits' : 'sit'} in your own stage${c.daysOverdue > 0 ? ` and ${c.noOwner === 1 ? 'is' : 'are'} ${numWord(c.daysOverdue)} ${c.daysOverdue === 1 ? 'day' : 'days'} overdue` : ''}`);
  const two: string[] = [];
  if (c.queuedBlocked) two.push(`${numWord(c.queuedBlocked)} ${c.queuedBlocked === 1 ? 'is' : 'are'} queued behind a blocker`);
  if (c.done) two.push(`${numWord(c.done)} ${c.done === 1 ? 'has' : 'have'} shipped`);
  const sentences = [one, two].filter((p) => p.length).map((p) => `${capFirst(p.join('; '))}.`);
  return sentences.length ? sentences.join(' ') : 'Nothing needs you.';
}
/** spend: null or undefined (not read, or not yet) draws a dash, never $0.00. */
export function studioFigs(c: { spend: number | null | undefined; overBudget: number; overdue: number; stages: number; blocked: number }) {
  return [
    { value: c.spend === null || c.spend === undefined ? '—' : usd(c.spend), label: 'Spend · 7 days', z: !c.spend, sig: false },
    { value: String(c.overBudget), label: 'Over budget', z: c.overBudget === 0, sig: c.overBudget > 0 },
    { value: String(c.overdue), label: 'Overdue', z: c.overdue === 0, sig: c.overdue > 0 },
    { value: String(c.stages), small: 'stages', label: `${c.blocked} blocked`, z: false, sig: false },
  ] as Array<{ value: string; small?: string; label: string; z: boolean; sig: boolean }>;
}
export const smAria = (i: number, name: string, count: number): string => `Stage ${i}, ${name}: ${plural(count, 'card', 'cards')}`;
export function studioStageO(st: { count: number; blocked: number; gate: boolean }, owner: string): { gate: boolean; text: string } {
  const empty = st.count === 0 ? ' · empty' : '';
  if (st.gate) return { gate: true, text: ` ${owner.replace(/^gate · /, '')}${empty}` };
  return { gate: false, text: `${[st.blocked ? `${st.blocked} blocked` : '', owner].filter(Boolean).join(' · ')}${empty}` };
}
export const stagesSummaryRight = (blocked: number, open: boolean): string => `${blocked ? `${blocked} blocked · ` : ''}${open ? 'hide' : 'show'}`;

// ── Quiet ───────────────────────────────────────────────────────────────────────────────────────
export const quietPhoneHeader = (all: number, needs: number): string => `Superpipeline · ${plural(all, 'card', 'cards')}${needs ? ` · ${needs} need your decision` : ''}`;
export function quietMeta(s: CardSummary): { face: FaceRef | null; text: string } {
  if (s.urgency === 'needs') {
    if (s.kind === 'no-owner') return { face: queuer(s), text: `${s.queuedBy ? `asked by ${s.queuedBy.name}` : 'With you'} · ${s.stageName} · ${s.ageLong}` };
    return { face: agentFace(s, 'needs'), text: `${agentName(s)} · ${s.stageName} · ${s.ageLong}${attemptTail(s)}` };
  }
  if (s.urgency === 'done') return { face: null, text: `Completed ${s.agoWords} · ${s.stageName} · ${plural(s.attemptCount, 'attempt', 'attempts')}` };
  if (s.urgency === 'closed') return { face: null, text: `Closed ${s.agoWords} · ${s.stageName}` };
  if (s.urgency === 'working') return { face: agentFace(s, 'working'), text: `${agentName(s)} · ${s.stageName} · working for ${s.ageLong}` };
  return { face: null, text: `Not picked up yet · ${s.stageName} · ${s.ageLong}` };
}
export function quietReason(s: CardSummary): { lead: string; more: string | null } | null {
  if (s.urgency !== 'needs') return null;
  if (s.kind === 'no-owner') return { lead: `Not started. ${s.stageName} is a person's stage.`, more: null };
  const said = sentenceCase(saidOf(s));
  return { lead: `${isStopped(s) ? 'Stopped' : 'Waiting'}. ${firstSentence(said)}`, more: remainder(said) };
}
export function quietFacts(s: CardSummary): Array<{ text: string; od?: boolean }> {
  const parts: string[] = [];
  let due: { text: string; od: boolean } | null = null;
  if (s.urgency === 'needs') {
    parts.push(s.priority > 0 ? `Priority ${s.priority}` : 'No priority');
    if (s.kind === 'no-owner') {
      if (s.labels.length) parts.push(`labels: ${s.labels.map((l) => l.name).join(', ')}${s.moreLabels ? `, and ${s.moreLabels} more` : ''}`);
      if (s.dueAt) due = { text: `Due ${dueLong(s.dueAt)}${s.overdue ? ', overdue' : ''}`, od: s.overdue };
    } else {
      if (s.queuedBy) parts.push(`asked by ${s.queuedBy.name}`);
      parts.push(usd(s.cost));
      if (s.firstRef) parts.push(refLabel(s.firstRef));
    }
  } else if (s.urgency === 'queued') {
    if (s.priority > 0) parts.push(`Priority ${s.priority}`);
    if (s.held) parts.push(`blocked by ${plural(blockedCount(s), 'card', 'cards')}`);
    if (s.queuedBy) parts.push(`asked by ${s.queuedBy.name}`);
  } else {
    if (s.priority > 0) parts.push(`Priority ${s.priority}`);
    parts.push(usd(s.cost));
  }
  const head = capFirst(parts.join(' · '));
  if (!due) return [{ text: head }];
  return [{ text: head ? `${head} · ` : '' }, due];
}
/** Stopped cards are decided; a question is answered and a review reviewed (those two are buttons, they open the card); the rest open. */
export function quietAction(s: Pick<OrderRow, 'urgency' | 'kind'>): 'Decide' | 'Answer' | 'Review' | 'Open' {
  if (isStopped(s)) return 'Decide';
  if (s.kind === 'question') return 'Answer';
  if (s.kind === 'review') return 'Review';
  return 'Open';
}
export const quietCount = (st: { count: number; blocked: number }): string => (st.count === 0 ? 'empty' : st.blocked ? `${st.count}, ${st.blocked} blocked` : String(st.count));
