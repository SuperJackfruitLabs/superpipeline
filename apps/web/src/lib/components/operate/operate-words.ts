// apps/web/src/lib/components/operate/operate-words.ts
/**
 * Every sentence Operate prints, per vibe, as pure functions of the board (spec Operate §3.2).
 * Times on the page are UTC (a card's notices are stamped by the server); the Studio op line and
 * the shell's "synced" are the reader's local clock.
 */
import { greeting, type Phase, type Vibe } from '@superjackfruit/vibekit';
import type { AgentSummary, Notification, Stage } from '$lib/api';
import type { AttentionItem, AttentionKind } from '$lib/components/attention/attention';
import { stageOwner } from '$lib/components/board/stage-owner';
import { dueLong, dueShort } from '$lib/components/board/board-words';
import { PAPER_PHASE } from '$lib/components/shell/shell-words';
import { ageShort, ageWords } from '$lib/age';
import { numWord } from '$lib/words';
import type { NeedRow } from './layouts/types';

export const RESUME_HINT = 'Fix what it says, then resume it with a note it will read.';
export const RESUME_LABEL = 'What changed, or what should the agent do differently? It reads this.';
export const CAP_ERROR = 'Enter an amount in dollars, like 25 or 25.50.';
export const QUIET_REFUSAL = 'Not done: ';
export const CUT = 140;

export const usd = (n: number): string => `$${n.toFixed(2)}`;
const cardsWord = (n: number): string => `${n} ${n === 1 ? 'card' : 'cards'}`;

export function cut140(text: string): string {
  return text.length > CUT ? `${text.slice(0, CUT).trimEnd()}…` : text;
}

/** Operate signals a card's attempts from three on (OP-G13); the List signals from two. */
export const attemptsSignalOperate = (n: number): boolean => n >= 3;

const KIND_WORD: Record<AttentionKind, string> = {
  review: 'Review', question: 'Asked', blocked: 'Stopped', 'repeated-failure': 'Stopped', refused: 'Refused',
  'sub-tasks': 'Waiting on sub-tasks', 'no-owner': 'No owner', failed: 'Failed', budget: 'Over budget',
};
export const kindWord = (k: AttentionKind): string => KIND_WORD[k];

/** The hint under a stopped card; any other kind says its own instruction (OP-G7). */
export function stopHint(item: AttentionItem): string {
  return item.kind === 'blocked' || item.kind === 'repeated-failure' ? RESUME_HINT : item.instruction;
}

/** "a day", "two days" … "ten days", then digits. Under a day it counts hours (gap G-T2). */
export function dayWords(h: number): string {
  const d = Math.floor(h / 24);
  if (d === 0) return `${h} ${h === 1 ? 'hour' : 'hours'}`;
  if (d === 1) return 'a day';
  return d <= 10 ? `${numWord(d)} days` : `${d} days`;
}

/** A notice's UTC time, HH:MM. */
export const when = (n: Notification): string => n.createdAt.slice(11, 16);

const STALE = /^Stuck (\d+)h in (.+?): /;

/**
 * A stale notice, retold. Whether it reads "stopped" or "unclaimed" follows the card's attention
 * kind, never the notice's wording (O-9). Null for any other notice, or one that does not parse:
 * the caller prints the body verbatim.
 */
export function staleLine(n: Notification, vibe: Vibe, needKind: AttentionKind | null): string | null {
  if (n.kind !== 'stale') return null;
  const m = STALE.exec(n.body);
  if (!m) return null;
  const h = Number(m[1]);
  const stage = m[2]!;
  const unclaimed = needKind === 'no-owner';
  switch (vibe) {
    case 'daylight':
      return unclaimed ? `Still unclaimed after ${dayWords(h)} in ${stage}.` : `Still stopped ${dayWords(h)} later in ${stage}.`;
    case 'paper':
      return unclaimed ? ` — still unclaimed after ${dayWords(h)} in ${stage}. ` : ` — still stopped ${dayWords(h)} later in ${stage}. `;
    case 'studio':
      return unclaimed ? `Still unclaimed ${h}h in ${stage}. ` : `Still stopped ${h}h later in ${stage}. `;
    case 'quiet':
      return unclaimed ? `${when(n)} UTC: still unclaimed after ${dayWords(h)} in ${stage}.` : `${when(n)} UTC: still stopped ${dayWords(h)} later in ${stage}.`;
  }
}

/** Quiet's one line per notice: time, what happened, and where the reason is. */
export function quietLine(n: Notification, needKind: AttentionKind | null, hasNeed: boolean): string {
  const line = staleLine(n, 'quiet', needKind);
  if (line === null) return `${when(n)} UTC: ${n.body}`;
  return hasNeed ? `${line} The reason is under Needs your decision.` : line;
}

/** Studio's kind cell: "Stale". */
export const kindCell = (n: Notification): string => n.kind.charAt(0).toUpperCase() + n.kind.slice(1);

/** Who works a stage: "code, 2 agents" (`full`) or "2 agents" (`agents`). */
export function stageOwnerText(stage: Stage, agents: AgentSummary[], form: 'full' | 'agents'): string {
  const o = stageOwner(stage, agents);
  if (o.kind !== 'capability') return o.label;
  const who = o.declaredBy.length === 1 ? o.declaredBy[0]! : `${o.declaredBy.length} agents`;
  return form === 'full' ? `${o.label}, ${who}` : who;
}

export function moveOptionLabel(vibe: Vibe, stage: Stage, agents: AgentSummary[]): string {
  if (vibe === 'quiet') return `${stage.name} (${stageOwnerText(stage, agents, 'agents')})`;
  if (vibe === 'paper') return `${stage.name} · ${stageOwnerText(stage, agents, 'agents')}`;
  return `${stage.name} · ${stageOwnerText(stage, agents, 'full')}`;
}

/** The Resume-at options: every stage in order, the current one "(where it stopped)". */
export function resumeOptions(stages: Stage[], currentKey: string): Array<{ key: string; label: string }> {
  return [...stages].sort((a, b) => a.order - b.order).map((s) => ({ key: s.key, label: s.key === currentKey ? `${s.name} (where it stopped)` : s.name }));
}

export interface NeedCounts { s: number; o: number; other: number }
export function needCounts(rows: NeedRow[]): NeedCounts {
  const s = rows.filter((r) => r.item.kind === 'blocked' || r.item.kind === 'repeated-failure' || r.item.kind === 'failed').length;
  const o = rows.filter((r) => r.item.kind === 'no-owner').length;
  return { s, o, other: rows.length - s - o };
}

// ---- Daylight ----
export const greetingLabel = (phase: Phase): string => greeting(phase, 'daylight').replace(/\.$/, '');

export function daylightGreeting(phase: Phase, firstName: string, n: number): string {
  const tail = n === 0 ? 'Nothing needs you.' : n === 1 ? '1 card wants you.' : `${n} cards want you.`;
  return `${firstName ? `${greetingLabel(phase)}, ${firstName}` : greetingLabel(phase)}. ${tail}`;
}

export function summarySentenceDaylight(c: NeedCounts, r: number): string {
  const parts: string[] = [];
  if (c.s) parts.push(`${numWord(c.s, true)} agent${c.s === 1 ? '' : 's'} stopped and ${c.s === 1 ? 'is' : 'are'} waiting on you`);
  if (c.o) parts.push(`${numWord(c.o, parts.length === 0)} card${c.o === 1 ? ' has' : 's have'} nobody to pick ${c.o === 1 ? 'it' : 'them'} up`);
  if (c.other) parts.push(`${numWord(c.other, parts.length === 0)} more need${c.other === 1 ? 's' : ''} you`);
  const run = r === 0 ? 'Nothing is running.' : `${numWord(r, true)} ${r === 1 ? 'agent is' : 'agents are'} working.`;
  return parts.length ? `${parts.join(', and ')}. ${run}` : run;
}

export function daylightMeta(row: NeedRow): string {
  const age = ageWords(row.item.ageHours ?? 0);
  if (row.item.kind === 'no-owner') {
    return `in ${row.stage.name} · ${age}${row.overdue && row.card.dueAt ? `, overdue since ${dueShort(row.card.dueAt)}` : ''}`;
  }
  return `${kindWord(row.item.kind).toLowerCase()} in ${row.stage.name} · ${age} ago · attempt ${row.card.attemptCount}`;
}

export const daylightCap = (cap: number | null): string => (cap === null ? 'No cap set' : `of ${usd(cap)} cap`);

// ---- Paper ----
export function longDate(nowMs: number, timeZone?: string): string {
  return new Date(nowMs).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone });
}

export function paperMastLine(nowMs: number, phase: Phase, n: number, r: number, timeZone?: string): string {
  const wait = n === 0 ? 'Nothing waits for you' : `${numWord(n, true)} letter${n === 1 ? ' waits' : 's wait'} for you`;
  const work = r === 0 ? 'no one is at work.' : `${numWord(r)} ${r === 1 ? 'agent is' : 'agents are'} at work.`;
  return `${longDate(nowMs, timeZone)}, ${PAPER_PHASE[phase]}. ${wait}; ${work}`;
}

export const paperMastEnd = (boardName: string, cardCount: number): string => `${boardName} · ${cardsWord(cardCount)}`;
export const letters = (n: number): string => `${n} letter${n === 1 ? '' : 's'}`;

export function paperMeta(row: NeedRow): string[] {
  const age = ageWords(row.item.ageHours ?? 0);
  if (row.item.kind === 'no-owner') {
    const due = row.card.dueAt ? `· due ${dueShort(row.card.dueAt)}${row.overdue ? ', overdue' : ''}` : null;
    return ['No owner', `· ${row.stage.name}`, `· ${age}`, ...(due ? [due] : [])];
  }
  return [kindWord(row.item.kind), `· ${row.stage.name}`, `· ${age} ago`, `· attempt ${row.card.attemptCount}`];
}

export const paperCap = (cap: number | null): string => (cap === null ? 'No cap set.' : `Capped at ${usd(cap)}.`);

// ---- Studio ----
export function localHM(ms: number, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(ms);
}

/** The op line: the reader's local time (O-7), the phase word, and a reminder that rows are UTC. */
export function studioOpLine(nowMs: number, phase: Phase, timeZone?: string): string {
  return `${localHM(nowMs, timeZone)} · ${greeting(phase, 'studio').toLowerCase()} · times UTC`;
}

export function studioHeroTitle(n: number, r: number): { sr: string; text: string } {
  if (n === 0) return { sr: '', text: 'Nothing on this board needs you' };
  const head = n === 1 ? 'card on this board needs you' : 'cards on this board need you';
  return { sr: `${n} `, text: head + (r === 0 ? ', and nothing is running' : `, and ${r} ${r === 1 ? 'is' : 'are'} running`) };
}

export function summarySentenceStudio(c: NeedCounts, r: number, spend7d: number): string {
  const parts: string[] = [];
  if (c.s) parts.push(`${numWord(c.s, true)} stopped and ${c.s === 1 ? 'is' : 'are'} waiting to be resumed`);
  if (c.o) parts.push(`${numWord(c.o, parts.length === 0)} sit${c.o === 1 ? 's' : ''} in a stage no agent works and need${c.o === 1 ? 's' : ''} moving`);
  if (c.other) parts.push(`${numWord(c.other, parts.length === 0)} more need${c.other === 1 ? 's' : ''} you`);
  const work = r === 0 ? 'No agent is working anything' : `${numWord(r, true)} ${r === 1 ? 'agent is' : 'agents are'} working`;
  const spent = spend7d === 0 ? ', and nothing has been spent this week.' : `, and ${usd(spend7d)} has been spent this week.`;
  return `${parts.length ? `${parts.join('; ')}. ` : ''}${work}${spent}`;
}

export function studioSub(row: NeedRow): string {
  if (row.item.kind === 'no-owner' && row.card.dueAt) return `${row.stage.name} · due ${row.card.dueAt}${row.overdue ? ', overdue' : ''}`;
  return row.stage.name;
}

export const studioAge = (row: NeedRow): string => (row.item.ageHours === null ? '—' : ageShort(row.item.ageHours, false));

export function studioCapFigure(cap: number | null): { value: string; label: string; zero: boolean } {
  return cap === null ? { value: '—', label: 'Budget cap · none set', zero: true } : { value: usd(cap), label: 'Budget cap', zero: false };
}

// ---- Quiet ----
export function quietLede(boardName: string, n: number, r: number): string {
  const needs = n === 0 ? 'Nothing needs you.' : `${n} card${n === 1 ? ' needs' : 's need'} you.`;
  const work = r === 0 ? ' No agent is working.' : ` ${r} ${r === 1 ? 'agent is' : 'agents are'} working.`;
  return `${boardName}. ${needs}${work} Times are in UTC. `;
}

export function quietMeta(row: NeedRow): string {
  const age = ageWords(row.item.ageHours ?? 0);
  if (row.item.kind === 'no-owner') {
    const due = row.card.dueAt ? ` · due ${dueLong(row.card.dueAt)}${row.overdue ? ', overdue' : ''}` : '';
    return `No owner in ${row.stage.name} · ${age}${due} · `;
  }
  const n = row.card.attemptCount;
  return `${kindWord(row.item.kind)} in ${row.stage.name} · ${age} · ${n} attempt${n === 1 ? '' : 's'} · `;
}

/** Everything after the money figure in "$0.00. No budget cap is set. No agent has spent anything." */
export function quietSpend(cap: number | null, top: Array<{ name: string; costUsd: number }>): string {
  const capText = cap === null ? ' No budget cap is set.' : ` The budget cap is ${usd(cap)}.`;
  const spent = top.length === 0 ? ' No agent has spent anything.' : ` ${top[0]!.name} spent the most.`;
  return `.${capText}${spent}`;
}
