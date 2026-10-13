// apps/web/src/lib/components/card/paper-words.ts
/** Paper's words for a card (screens/card.parts/20-paper.md): a letter, enclosures, the record. */
import type { Activity, Attempt } from '$lib/api';
import type { Phase } from '@superjackfruit/vibekit';
import { ageWords } from '$lib/age';
import { clockHM, dayMonthLong, weekdayDayMonth } from '$lib/when';
import type { LeadKind } from './card-lead';
import { attemptWord, STOP_SENTENCE, eventVerb } from './state-words';
import { usd } from './card-words';

export const PAPER_LIGHT: Readonly<Record<Phase, string>> = {
  dawn: 'at first light', morning: 'in the morning light', noon: 'in full daylight', golden: 'in the golden hour', dusk: 'at dusk', night: 'after dark',
};
export function paperDateline(now: Date, phase: Phase, tz?: string): string {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' });
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
  return `${p.weekday} ${p.day} ${p.month} · ${PAPER_LIGHT[phase]}`;
}
const ROMAN: Array<[number, string]> = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
export function roman(n: number): string {
  let out = '';
  for (const [v, s] of ROMAN) while (n >= v) { out += s; n -= v; }
  return out;
}
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
export const numberWord = (n: number): string => WORDS[n] ?? String(n);
export const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? name;
const s = (n: number) => (n === 1 ? '' : 's');

export const reTitle = (title: string, gatePending: boolean): string => `Re: ${gatePending ? 'approval. ' : ''}${title}`;
export function paperKicker(needsYou: boolean, archivedAt: string | null, ageHours: number | null, surface: 'drawer' | 'page', tz?: string): string | null {
  if (archivedAt) return `Archived on ${dayMonthLong(archivedAt, tz)}`;
  if (!needsYou) return null;
  return surface === 'page' && ageHours !== null ? `A letter that needs your reply · ${ageWords(ageHours)}` : 'A letter that needs a reply';
}
const ENCLOSED = 'The brief, the record and the correspondence are enclosed below.';
export function paperDeck(kind: LeadKind, agent: string, stage: string, attempts: number): string {
  switch (kind) {
    case 'stopped': case 'failed': case 'budget':
      return `${agent} stopped in ${stage} after ${numberWord(attempts)} attempt${s(attempts)} and has written to you. ${ENCLOSED}`;
    case 'review': return `${agent} finished ${stage} and asks for your review. ${ENCLOSED}`;
    case 'question': return `${agent} has a question in ${stage}. ${ENCLOSED}`;
    case 'working': return `${agent} is working on ${stage}. ${ENCLOSED}`;
    case 'done': return `This card is done. ${ENCLOSED}`;
    default: return `Nobody holds this card yet. ${ENCLOSED}`;
  }
}
export const paperReplySub = (n: number): string => `I stopped after ${numberWord(n)} attempt${s(n)}. Send me back with what changed.`;
export const paperByline = (stage: string, attempt: number, delegated: boolean): string =>
  ` · agent for ${stage}, ran attempt ${attempt}${delegated ? '' : ' · Unclaimed now'}`;
export const paperRole = (role: string | null, attempt: number): string => `${role ?? 'agent'}, attempt ${attempt}`;
export function paperProvenance(q: string, byAgent: boolean, covers: boolean | null, handoff: string, surface: 'drawer' | 'page'): string {
  const who = surface === 'page'
    ? `${byAgent ? 'an agent' : 'a person'}${covers ? ' allowed to dispatch the one working it' : ''}`
    : `(${byAgent ? 'an agent' : 'a person'}${covers ? ', allowed to dispatch the one working it' : ''})`;
  return `Asked by ${q}${surface === 'page' ? ', ' : ' '}${who}. ${handoff}`;
}
export const paperAttempt = (events: number, errors: number, word: string, endedHM: string | null): string =>
  `${events} events, ${errors ? `${errors} error${s(errors)}` : 'no errors'} · ${word}${endedHM ? ` at ${endedHM}` : ''}`;
export const paperLogRow = (a: Pick<Activity, 'signal' | 'action' | 'type' | 'body'>): string =>
  a.signal === 'stop' ? `Stopped. ${STOP_SENTENCE}` : `${eventVerb(a)} ${a.body ?? ''}`.trim();
export const paperLogTime = (ts: string, last: boolean, tz?: string): string => (last ? `${clockHM(ts, tz)} · ${weekdayDayMonth(ts, tz)}` : clockHM(ts, tz));
export function paperLinked(c: { links: number; children: number; openChildren: number; refs: number; related: number }): string {
  return [
    c.links ? `${c.links} related card${s(c.links)}` : 'no related cards',
    `${c.children ? `${c.children} sub-task${s(c.children)}` : 'no sub-tasks'} (${c.openChildren} open of ${c.children})`,
    `${c.refs} reference${s(c.refs)}`,
    c.related ? `${c.related} related prior work` : 'no related prior work',
  ].join(' · ');
}
export const paperCostLine = (estimate: number | null, attempts: Attempt[]): string =>
  [estimate ? `Estimate ${usd(estimate)}` : 'No estimate yet', ...attempts.map((a, i) => `attempt ${i + 1}, ${usd(a.costUsd)}`)].join(' · ');
export { attemptWord };

// ---- the drawer and the card-states gallery (SP-Card-Paper, SP-Card-States-Paper) ----

/** Local calendar parts, so a letter can be dated "Thursday 8 October, 19:41" or "Today, 12:48". */
function parts(iso: string, tz?: string): { weekdayLong: string; weekdayShort: string; day: string; monthLong: string; monthShort: string; hh: string; mm: string } {
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', ...o });
  const d = new Date(iso);
  const g = (o: Intl.DateTimeFormatOptions, t: Intl.DateTimeFormatPartTypes) => f(o).formatToParts(d).find((p) => p.type === t)!.value;
  return {
    weekdayLong: g({ weekday: 'long' }, 'weekday'), weekdayShort: g({ weekday: 'short' }, 'weekday'), day: g({ day: 'numeric' }, 'day'),
    monthLong: g({ month: 'long' }, 'month'), monthShort: g({ month: 'short' }, 'month'),
    hh: g({ hour: '2-digit', minute: '2-digit' }, 'hour'), mm: g({ hour: '2-digit', minute: '2-digit' }, 'minute'),
  };
}
const ymd = (iso: string, tz?: string): string => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(iso));
const plural1 = (n: number): string => (n === 1 ? '' : 's');

export const paperBack = (boardName: string, phase: Phase): string => `${boardName} · ${PAPER_LIGHT[phase]}`;
export function paperWhen(iso: string, now: string, tz?: string): string {
  const d = parts(iso, tz);
  return ymd(iso, tz) === ymd(now, tz) ? `Today, ${d.hh}:${d.mm}` : `${d.weekdayLong} ${d.day} ${d.monthLong}, ${d.hh}:${d.mm}`;
}
const STATE_WORD: Readonly<Record<string, string>> = { working: 'Working', completed: 'Done', submitted: 'Queued', queued: 'Queued', rejected: 'Rejected', failed: 'Failed', 'input-required': 'Waiting on you' };
export function paperStateWord(o: { archived: boolean; needsYou: boolean; state: string; ageHours: number | null }): string {
  if (o.archived) return 'Archived';
  if (o.needsYou) return `Waiting on you · ${ageWords(o.ageHours ?? 0)}`;
  return STATE_WORD[o.state] ?? 'Queued';
}
export const signatureLine = (role: string | null, attempt: number, when: string | null): string => {
  const r = `${role ?? 'agent'}, attempt ${attempt}`;
  return when ? `${r} · ${when}` : r;
};
export const resumeOptionLabel = (t: { n: number; name: string; current: boolean }): string => `${t.n} · ${t.name}${t.current ? ' (this stage)' : ''}`;

export function paperBriefSummary(o: { criteria: number; rows: number; planSteps: number; project: boolean }): string {
  return [
    o.criteria > 0 ? `${o.criteria} thing${plural1(o.criteria)} to prove` : 'nothing to prove',
    `${o.rows} detail${plural1(o.rows)}`,
    ...(o.planSteps > 0 ? ['plan'] : []),
    o.project ? 'project' : 'no project',
  ].join(' · ');
}
export const paperHappenedSummary = (o: { runs: number; decisions: number; costUsd: number }): string =>
  `${o.runs > 0 ? `${o.runs} run${plural1(o.runs)}` : 'no runs'} · ${o.decisions > 0 ? `${o.decisions} decision${plural1(o.decisions)}` : 'no decisions'} · ${usd(o.costUsd)}`;
export const paperWaitingSummary = (o: { links: number; subtasks: number; open: number }): string =>
  `${o.links > 0 ? `${o.links} link${plural1(o.links)}` : 'no links'} · ${o.subtasks > 0 ? `${o.open} of ${o.subtasks} sub-tasks open` : 'no sub-tasks'}`;
export const paperAttachedSummary = (o: { refs: number; related: number; delivery: boolean }): string =>
  `${o.refs > 0 ? `${o.refs} reference${plural1(o.refs)}` : 'no references'} · ${o.related > 0 ? `${o.related} related prior work` : 'no related prior work'} · ${o.delivery ? 'delivery' : 'no delivery'}`;
export const paperCorrespondenceSummary = (n: number): string => (n === 0 ? 'No letters yet' : `${n} letter${plural1(n)}`);

export function paperDrawerProvenance(o: { queuedByName: string; byAgent: boolean; covers: boolean | null; handoff: string }): string {
  // An agent the board does not list is already "an agent"; saying it twice reads badly.
  const nameIsKind = o.byAgent && o.queuedByName === 'an agent';
  const kind = nameIsKind ? '' : o.byAgent ? 'an agent' : 'a person';
  const dispatch = o.covers ? 'allowed to dispatch the one working it' : '';
  const aside = [kind, dispatch].filter(Boolean).join(', ');
  return `Asked by ${o.queuedByName}${aside ? ` (${aside})` : ''}. ${o.handoff}`;
}

/** "Attempt 2 · error-eric · 14 events · stopped at 19:41 Thu 8 Oct"; only the newest run says when it ended. */
export function paperAttemptLine(o: { n: number; agent: string; events: number; word: string; endedAt: string | null; newest: boolean }, tz?: string): { head: string; rest: string } {
  let at = '';
  if (o.newest && o.endedAt) {
    const d = parts(o.endedAt, tz);
    at = ` at ${d.hh}:${d.mm} ${d.weekdayShort} ${d.day} ${d.monthShort}`;
  }
  return { head: `Attempt ${o.n}`, rest: ` · ${o.agent} · ${o.events} events · ${o.word}${at}` };
}

export const paperCellLine = (o: { board: string; i: number; n: number; stage: string; kind: 'review' | 'question' }): string =>
  `${o.board} · Stage ${o.i + 1} of ${o.n}, ${o.stage} · ${o.kind === 'review' ? 'Awaiting your review' : 'A question'}`;
export const paperArchivedLine = (o: { board: string; i: number; n: number; stage: string; owner: string }): string =>
  `${o.board} · Was at stage ${o.i + 1} of ${o.n}, ${o.stage} · Owner ${o.owner}`;
export const paperRestoreNote = (stage: string): string => `Back to the board at ${stage}.`;
export const paperDoneLine = (o: { board: string; stage: string; priority: number; owner: string }): string =>
  `${o.board} · Stage ${o.stage} · Priority P${o.priority} · Owner ${o.owner}`;
export const paperDoneStatus = (stateSince: string, attempts: number, now: string, tz?: string): string =>
  `${paperWhen(stateSince, now, tz)} · after ${attempts} attempt${plural1(attempts)}`;
export const digestPaper = (digest: string): string => `${digest.slice(0, 15)}…`;

/** Radio hints when an option has no description of its own. */
export const PAPER_HINT = { approve: 'Move the card on as it is.', changes: 'Needs a note; it threads into the next attempt.', reject: 'Stop here.' } as const;
export const PAPER_CAPTIONS = { gate: 'With nothing picked: “Pick a decision first.”', question: 'With no answer: “Type an answer first.”' } as const;
export const PAPER_LABELS = ['A · Approval gate', 'B · Agent question', 'C · Archived', 'D · Done', 'E · Decision error', 'F · Loading'] as const;
export const PAPER_KICKER_DRAWER = 'A letter that needs a reply';
