// apps/web/src/lib/components/board/board-words.ts
/**
 * The boards' own words, as pure functions of the model. Every string here is printed verbatim by a
 * reference artboard; the unit tests hold the exact strings.
 */
import { greeting, type Mood, type Phase } from '@superjackfruit/vibekit';
import type { AttentionKind } from '$lib/components/attention/attention';
import type { BoardSnapshot, Stage } from '$lib/api';
import { numWord, plural } from '$lib/words';
import type { BoardModel, BoardStage } from './board-model';
import { refLabel } from './ref-chip';
import type { CardSummary, StageSummary } from './card-summary';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;
const parts = (d: string) => d.slice(0, 10).split('-').map(Number) as [number, number, number];
/** '2026-10-06' → '6 Oct'. A due date is a calendar day, never shifted by a time zone. */
export const dueShort = (d: string): string => `${parts(d)[2]} ${MONTHS[parts(d)[1] - 1]!.slice(0, 3)}`;
/** '2026-10-06' → '6 October'. */
export const dueLong = (d: string): string => `${parts(d)[2]} ${MONTHS[parts(d)[1] - 1]}`;
/** Whole days from the due day to today (the same UTC "today" `overdue()` uses). */
export function daysOverdue(due: string, nowMs: number): number {
  const today = Date.parse(new Date(nowMs).toISOString().slice(0, 10));
  return Math.max(0, Math.round((today - Date.parse(due.slice(0, 10))) / 86_400_000));
}
/** "Rakesh Gangwar" → "RG". */
export function personInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
}

// ── Daylight ────────────────────────────────────────────────────────────────────────────────────
export function greetingLine(phase: Phase, firstName: string, needs: number): string {
  const hello = greeting(phase, 'daylight').replace(/[.?]$/, '');
  const tail = needs === 0 ? 'Nothing needs you.' : `${needs} ${needs === 1 ? 'card wants' : 'cards want'} you.`;
  return `${firstName ? `${hello}, ${firstName}` : hello}. ${tail}`;
}

/** What the agent says in the peek bubble, after its name. */
export const KIND_SAYS: Partial<Record<AttentionKind, string>> = {
  blocked: 'I’ve stopped and need you',
  'repeated-failure': 'I keep failing and need you',
  question: 'I have a question',
  review: 'please review my work',
  'no-owner': 'nobody works this stage',
};
export const isStopped = (k: AttentionKind | null): boolean => k === 'blocked' || k === 'repeated-failure';
export const peekEyebrow = (s: CardSummary): string => `Peek · ${s.stageName} · ${s.ageShort} in this stage`;
export const moreLabelsTitle = (n: number): string => `${n} more ${n === 1 ? 'label' : 'labels'}`;

export type TileWho =
  | { kind: 'person'; name: string; initials: string; text: string; note: string }
  | { kind: 'agent'; name: string; mood: Mood; note: string }
  | { kind: 'plain'; text: string }
  | { kind: 'done'; text: string };

/** The `.dl-who` line of a tile (SB §3.3). */
export function tileWho(s: CardSummary): TileWho {
  if (s.urgency === 'done') return { kind: 'done', text: s.stageName };
  if (s.urgency === 'closed') return { kind: 'plain', text: 'Closed' };
  if (s.urgency === 'queued') return { kind: 'plain', text: s.held ? 'Unclaimed · starts when unblocked' : 'Unclaimed · waiting to be picked up' };
  if (s.urgency === 'working') {
    const a = s.delegate ?? s.lastAgent;
    return a ? { kind: 'agent', name: a.name, mood: 'working', note: '· working' } : { kind: 'plain', text: 'Working' };
  }
  const a = s.lastAgent ?? s.delegate;
  if (s.kind === 'no-owner' || !a) {
    return { kind: 'person', name: s.owner.name, initials: s.owner.initials, text: s.owner.isMe ? 'With you' : `With ${s.owner.name}`, note: s.kind === 'no-owner' ? '· no agent works this stage' : '· needs you' };
  }
  return { kind: 'agent', name: a.name, mood: 'needs', note: '· needs you' };
}

export interface CardAction { label: string; does: 'move' | 'open' }
/** The one thing a needs card asks of you. Resume, Answer and Review open the card. */
export function needsAction(kind: AttentionKind | null): CardAction | null {
  if (kind === null) return null;
  if (kind === 'no-owner') return { label: 'Move to another stage', does: 'move' };
  if (isStopped(kind)) return { label: 'Resume', does: 'open' };
  if (kind === 'question') return { label: 'Answer', does: 'open' };
  if (kind === 'review') return { label: 'Review', does: 'open' };
  return { label: 'Open', does: 'open' };
}
export const tileAction = (s: CardSummary): CardAction | null => (s.urgency === 'needs' ? needsAction(s.kind) : null);

/** `.dl-board` columns: an empty collapsed stage is 60px; the fullest lane (when more than one card) is 1.15fr. */
export function dlCols(stages: Array<Pick<StageSummary, 'key' | 'count'>>, expanded: Record<string, boolean>): string {
  const max = Math.max(0, ...stages.map((s) => s.count));
  return stages
    .map((s) => (s.count === 0 && !expanded[s.key] ? '60px' : max > 1 && s.count === max ? 'minmax(0, 1.15fr)' : 'minmax(0, 1fr)'))
    .join(' ');
}
export const stripLabel = (s: StageSummary): string => `${s.name}, no cards. ${s.ownerLong}${s.gate ? ', approval gate' : ''}. Expand stage`;
/** The vertical owner word on a strip; null when the single declaring agent's face stands in for it. */
export function stripOwner(s: StageSummary): string | null {
  if (s.owner.kind === 'human') return 'a person';
  if (s.owner.kind === 'agent') return s.owner.label;
  if (s.declaredBy.length === 1) return null;
  return s.declaredBy.length === 0 ? 'nobody' : plural(s.declaredBy.length, 'agent', 'agents');
}

// ── Paper ───────────────────────────────────────────────────────────────────────────────────────
export interface PaperKicker { text: string; live: boolean; none: string | null }
/** Column 1's kicker: the only signal-coloured heading on the page, and only while something waits. */
export const paperKicker = (needs: number): PaperKicker =>
  needs === 0 ? { text: 'Waiting on you', live: false, none: 'Nothing waits on you.' } : { text: `Waiting on you · ${plural(needs, 'letter', 'letters')}`, live: true, none: null };
/** Any other column kicker: "Coming up · 2", or the bare label and a line saying it is empty. */
export const paperSection = (label: string, n: number, none: string): { text: string; none: string | null } =>
  n === 0 ? { text: label, none } : { text: `${label} · ${n}`, none: null };
/** What a lead story quotes: the agent's words verbatim, or the instruction for an unowned stage. */
export const paperQuote = (s: CardSummary): string | null => (s.urgency === 'needs' ? s.stopReason : null);

export type PaperBy =
  | { mark: 'person'; name: string; initials: string; em: string; rest: string }
  | { mark: 'agent'; name: string; mood: Mood; em: string; rest: string }
  | { mark: 'check'; em: string; rest: string }
  | { mark: 'none'; em: string; rest: string };

export function paperBy(s: CardSummary, terminalName: string): PaperBy {
  if (s.urgency === 'done') return { mark: 'check', em: terminalName, rest: `· ${s.stageName}` };
  if (s.urgency === 'closed') return { mark: 'none', em: 'Closed', rest: `· ${s.stageName}` };
  if (s.urgency === 'queued') return { mark: 'none', em: 'Unclaimed', rest: `· ${s.stageName} · ${s.held ? 'starts when unblocked' : 'waiting to be picked up'}` };
  if (s.urgency === 'working') {
    const a = s.delegate ?? s.lastAgent;
    return a ? { mark: 'agent', name: a.name, mood: 'working', em: a.name, rest: `· ${s.stageName} · working` } : { mark: 'none', em: 'Working', rest: `· ${s.stageName}` };
  }
  const a = s.lastAgent ?? s.delegate;
  if (s.kind === 'no-owner' || !a) {
    return { mark: 'person', name: s.owner.name, initials: s.owner.initials, em: s.owner.isMe ? 'With you' : `With ${s.owner.name}`, rest: `· ${s.stageName} · ${s.ageShort}` };
  }
  const tries = s.attemptCount <= 1 ? 'attempt 1' : `${s.attemptCount} attempts`;
  return { mark: 'agent', name: a.name, mood: 'needs', em: a.name, rest: `· ${s.stageName} · ${s.ageShort} · ${tries}` };
}

export interface PaperFact { text: string; cls?: 'ref' | 'due'; icon?: 'blocked' }
/** `.pp-facts`, in the reference's order: priority, labels, reference, blocked, asked by, due. */
export function paperFacts(s: CardSummary): PaperFact[] {
  const out: PaperFact[] = [];
  if (s.priority > 0) out.push({ text: `P${s.priority}` });
  if (s.labelsAll > 0) {
    const names = s.labels.map((l) => l.name);
    if (s.moreLabels > 0) names.push(`+${s.moreLabels}`);
    out.push({ text: names.join(' · ') });
  }
  if (s.firstRef) out.push({ text: s.firstRef.title ?? refLabel(s.firstRef), cls: 'ref' });
  if (s.blocked) out.push({ text: 'Blocked', icon: 'blocked' });
  if (s.queuedBy) out.push({ text: `asked by ${s.queuedBy.name}` });
  if (s.dueAt) out.push(s.overdue ? { text: `Overdue · due ${dueShort(s.dueAt)}`, cls: 'due' } : { text: `Due ${dueShort(s.dueAt)}` });
  return out;
}
/** The signal-washed reply button of a lead story. */
export function paperReply(s: CardSummary): CardAction | null {
  if (s.urgency !== 'needs') return null;
  if (s.kind === 'no-owner') return { label: 'Move to a stage someone works', does: 'move' };
  return needsAction(s.kind);
}
/** One stage of the pipeline strip: its count, then blocked, the gate, and who works it. */
export function pipelineParts(st: BoardStage): { n: string; extra: string[] } {
  const extra: string[] = [];
  if (st.blocked > 0) extra.push(`${st.blocked} blocked`);
  if (st.gate) extra.push('approval gate');
  extra.push(st.ownerLong);
  return { n: st.count === 0 ? 'empty' : plural(st.count, 'card', 'cards'), extra };
}

// ── Quiet ───────────────────────────────────────────────────────────────────────────────────────
export const quietSub = (all: number, needs: number): string =>
  `Superpipeline · ${plural(all, 'card', 'cards')}${needs > 0 ? ` · ${needs} need your decision` : ''}`;
export function quietLede(m: BoardModel): string {
  const { all, needs, done } = m.counts;
  if (needs > 0) return `${needs} ${needs === 1 ? 'card needs' : 'cards need'} your decision.`;
  return all > 0 && done === all ? `Nothing needs you. All ${all} cards are done.` : 'Nothing needs you.';
}
export const QUIET_GROUPS = [
  { urgency: 'needs', label: 'Needs your decision', more: 'cards that need your decision' },
  { urgency: 'working', label: 'In progress', more: 'cards in progress' },
  { urgency: 'queued', label: 'Waiting to start', more: 'cards waiting to start' },
  { urgency: 'done', label: 'Done', more: 'done cards' },
  { urgency: 'closed', label: 'Closed', more: 'closed cards' },
] as const;
type QuietUrgency = (typeof QUIET_GROUPS)[number]['urgency'];
export type QuietBlock =
  | { kind: 'zero'; aria: string; labels: string[] }
  | { kind: 'group'; urgency: QuietUrgency; label: string; total: number; cards: CardSummary[]; shown: CardSummary[]; truncated: boolean; moreLabel: string };
/** History groups (done, closed) list the newest first and fold after five. */
const HISTORY = new Set<QuietUrgency>(['done', 'closed']);
export function quietBlocks(m: BoardModel): QuietBlock[] {
  const out: QuietBlock[] = [];
  let seenFull = false;
  let leading: string[] = [];
  for (const g of QUIET_GROUPS) {
    let cards = m.ordered.filter((s) => s.urgency === g.urgency);
    if (cards.length === 0) {
      if (seenFull) out.push({ kind: 'zero', aria: g.label, labels: [g.label] });
      else leading.push(g.label);
      continue;
    }
    if (!seenFull && leading.length) out.push({ kind: 'zero', aria: 'Empty groups', labels: leading });
    leading = [];
    seenFull = true;
    if (HISTORY.has(g.urgency)) cards = [...cards].sort((a, b) => Date.parse(b.stateSince ?? '') - Date.parse(a.stateSince ?? ''));
    const truncated = HISTORY.has(g.urgency) && cards.length > 5;
    out.push({ kind: 'group', urgency: g.urgency, label: g.label, total: cards.length, cards, shown: truncated ? cards.slice(0, 5) : cards, truncated, moreLabel: `Show all ${cards.length} ${g.more}` });
  }
  if (!seenFull && leading.length) out.push({ kind: 'zero', aria: 'Empty groups', labels: leading });
  return out;
}
const agentOf = (s: CardSummary) => (s.urgency === 'working' ? (s.delegate ?? s.lastAgent) : (s.lastAgent ?? s.delegate));
export function quietMeta(s: CardSummary): string {
  const a = agentOf(s);
  if (s.urgency === 'done') return a ? `Ran by ${a.name} · ${s.stageName} · done ${s.agoWords}` : `${s.stageName} · done ${s.agoWords}`;
  if (s.urgency === 'closed') return `Closed · ${s.stageName} · ${s.agoWords}`;
  if (s.urgency === 'queued') return `Not picked up yet · ${s.stageName}`;
  if (s.urgency === 'working') return `${a?.name ?? 'An agent'} · ${s.stageName} · working`;
  return `${s.kind !== 'no-owner' && a ? a.name : s.owner.isMe ? 'You' : s.owner.name} · ${s.stageName} · ${s.ageLong}`;
}
/** The face beside the meta line (grey in Quiet); null when nobody ran the card. */
export function quietMood(s: CardSummary): Mood | null {
  if (!agentOf(s) || s.urgency === 'queued' || (s.urgency === 'needs' && s.kind === 'no-owner')) return null;
  return s.urgency === 'done' ? 'done' : s.urgency === 'needs' ? 'needs' : s.urgency === 'working' ? 'working' : 'resting';
}
const QUIET_HEAD: Record<QuietUrgency, string> = { needs: 'Needs your decision.', working: 'In progress.', queued: 'Waiting to start.', done: 'Done.', closed: 'Closed.' };
export function quietFacts(s: CardSummary): string {
  const parts: string[] = [QUIET_HEAD[s.urgency]];
  if (s.priority > 0) parts.push(`Priority ${s.priority}.`);
  if (s.labelsAll > 0) parts.push(`Labels: ${s.labels.map((l) => l.name).join(', ')}${s.moreLabels > 0 ? ` and ${s.moreLabels} more` : ''}.`);
  if (s.blocked) parts.push('Blocked by another card.');
  if (s.firstRef) parts.push(`Reference: ${s.firstRef.title ?? s.firstRef.url}.`);
  if (s.queuedBy) parts.push(`Asked by ${s.queuedBy.name}.`);
  if (s.dueAt) parts.push(`Due ${dueLong(s.dueAt)}${s.overdue ? ', overdue' : ''}.`);
  parts.push(`${plural(s.attemptCount, 'attempt', 'attempts')}.`);
  return parts.join(' ');
}
/** The decision a needs item offers; an unowned stage needs only "Move to another stage", which every item has. */
export const quietAction = (s: CardSummary): CardAction | null => (s.urgency === 'needs' && s.kind !== 'no-owner' ? needsAction(s.kind) : null);
export function quietStageRow(st: BoardStage): { name: string; cards: string; who: string; gate: string } {
  return {
    name: st.name,
    cards: st.count === 0 ? '0 (empty)' : st.blocked > 0 ? `${st.count}, ${st.blocked} blocked` : String(st.count),
    who: st.gate ? st.ownerLong.replace(/ · approval$/, '') : st.ownerLong,
    gate: st.gate ? 'Approval gate' : '—',
  };
}

// ── Empty board ─────────────────────────────────────────────────────────────────────────────────
export const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
/** The board's lede as HTML: only `**bold**` becomes markup; the rest is the board owner's text, escaped. */
export function emptyLedeHtml(intro: BoardSnapshot['intro'], stageCount: number): string {
  if (!intro?.lede) return escapeHtml(`This board has ${numWord(stageCount)} stages.`);
  return escapeHtml(intro.lede).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}
export const emptyHint = (intro: BoardSnapshot['intro']): string => intro?.composeHint || 'Say what you want in a sentence; an agent drafts the brief.';
export type EmptyWho =
  | { kind: 'initials'; text: string; label: string; name: string }
  | { kind: 'face'; face: string; name: string }
  | { kind: 'none'; name: string };
export function emptyWho(st: StageSummary, me: { name: string; initials: string } | null): EmptyWho {
  if (st.owner.kind === 'human') {
    if (st.gate) return { kind: 'initials', text: me?.initials ?? 'P', label: me?.name ?? 'A person', name: 'you decide' };
    return { kind: 'initials', text: 'P', label: 'A person', name: 'a person' };
  }
  if (st.owner.kind === 'agent') return { kind: 'face', face: st.owner.label, name: st.owner.label };
  const d = st.declaredBy;
  if (d.length === 0) return { kind: 'none', name: 'nobody yet' };
  return { kind: 'face', face: d[0]!, name: d.length === 1 ? d[0]! : plural(d.length, 'agent', 'agents') };
}
export function emptyTags(st: StageSummary, def: Stage): Array<{ text: string; g: boolean }> {
  const out: Array<{ text: string; g: boolean }> = [];
  if (st.owner.kind === 'capability' && def.owner) out.push({ text: def.owner, g: false });
  if (st.gate) out.push({ text: 'Approval gate', g: true });
  if (st.wipLimit !== null) out.push({ text: `limit ${st.wipLimit}`, g: false });
  if (st.count === 0) out.push({ text: 'empty', g: false });
  return out;
}
