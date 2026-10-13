// apps/web/src/lib/components/card/quiet-words.ts
/** Quiet's words for a card (screens/card.parts/40-quiet.md): whole sentences, no glyphs. */
import type { Activity, Attempt } from '$lib/api';
import { ageWords } from '$lib/age';
import { clockHM, dayMonthLong } from '$lib/when';
import type { LeadKind } from './card-lead';
import { attemptWord, eventVerb, STOP_SENTENCE } from './state-words';
import { usd } from './card-words';

export function whenLong(iso: string, tz?: string): string {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.weekday} ${p.day} ${p.month} at ${clockHM(iso, tz)}`;
}
const VERB: Partial<Record<LeadKind, string>> = { failed: 'failed', budget: 'stopped at the budget' };
export const quietWho = (kind: LeadKind, agent: string, at: string, tz?: string): string => `${agent} ${VERB[kind] ?? 'stopped'} on ${whenLong(at, tz)} and wrote:`;

export function quietPageMeta(i: { state: string; ageHours: number | null; i: number; n: number; stage: string; attempt: number; priority: number; due: string | null; labels: string[] }): string {
  const state = i.state === 'Waiting on you' && i.ageHours !== null ? `Waiting on you for ${ageWords(i.ageHours)}` : i.state;
  return [
    state, `Stage ${i.i + 1} of ${i.n}: ${i.stage}`, ...(i.attempt > 1 ? [`Attempt ${i.attempt}`] : []),
    i.priority > 0 ? `Priority P${i.priority}` : 'No priority', i.due ? `Due ${i.due}` : 'No due date', i.labels.length ? `Labels: ${i.labels.join(', ')}` : 'No labels',
  ].join(' · ');
}
export const quietAgentPage = (last: string, attempt: number, stage: string, delegate: string | null): string =>
  delegate ? `${delegate} is working it.` : `None holding it. ${last} ran attempt ${attempt} of ${stage}.`;
export const quietAskedBy = (q: string, byAgent: boolean, covers: boolean | null): string =>
  `${q}${byAgent ? ', an agent' : ''}${covers ? ' allowed to dispatch the one working it' : ''}`;
export const quietHistoryHead = (n: number, stage: string, agent: string): string => `Attempt ${n}, ${stage}, ${agent}`;
export function quietHistoryLine(word: string, endedAt: string | null, events: number, errors: number, tz?: string): string {
  const w = word.charAt(0).toUpperCase() + word.slice(1);
  const when = endedAt ? ` at ${clockHM(endedAt, tz)} on ${dayMonthLong(endedAt, tz)}` : '';
  return `${w}${when}. ${events} events, ${errors ? `${errors} error${errors === 1 ? '' : 's'}` : 'no errors'}.`;
}
export const quietRow = (a: Pick<Activity, 'ts' | 'signal' | 'action' | 'type' | 'body'>, tz?: string): string =>
  a.signal === 'stop' ? `${clockHM(a.ts, tz)} Stopped: ${STOP_SENTENCE}` : `${clockHM(a.ts, tz)} ${eventVerb(a)} ${a.body ?? ''}`.trim();
export const quietAttempts = (attempts: Attempt[], name: (id: string) => string): string =>
  attempts.map((a, i) => `${i + 1}: ${name(a.agentId)}, ${usd(a.costUsd)}, ${attemptWord(a)}.`).join(' ');
export const quietCost = (cost: number, estimate: number | null): string => `${usd(cost)}, ${estimate ? `estimate ${usd(estimate)}` : 'no estimate yet'}`;
export const quietSubtasks = (open: number, n: number): string => (n === 0 ? `None (${open} open of ${n}).` : `${n} sub-task${n === 1 ? '' : 's'} (${open} open of ${n}).`);
export const quietResumeOption = (n: number, name: string, current: boolean): string => `Stage ${n}: ${name}${current ? ' (this stage)' : ''}`;

// ---- the drawer and the card-states gallery (SP-Card-Quiet, SP-Card-States-Quiet) ----
export function quietDrawerMeta(i: { i: number; n: number; stage: string; delegate: string | null; last: string; attempt: number; state: string; needsYou: boolean; ageHours: number | null }): string {
  const agent = i.delegate ? `Agent: ${i.delegate}` : i.last ? `Agent: none holding it (${i.last} ran attempt ${i.attempt})` : 'Agent: none holding it';
  const state = i.needsYou && i.ageHours !== null ? `Waiting on you for ${ageWords(i.ageHours)}` : i.state;
  return [`Stage ${i.i + 1} of ${i.n}: ${i.stage}`, agent, state].join(' · ');
}
export const quietCellMeta = (o: { board: string; i: number; n: number; stage: string; agent: string; tail: string }): string =>
  `${o.board} · Stage ${o.i + 1} of ${o.n}: ${o.stage} · Agent: ${o.agent} · ${o.tail}`;
export const quietArchivedMeta = (o: { board: string; i: number; n: number; stage: string }): string => `${o.board} · Was at stage ${o.i + 1} of ${o.n}: ${o.stage} · Last agent: `;
export const quietDoneNotice = (when: string, attempts: number): string => `On ${when}, after ${attempts} attempt${attempts === 1 ? '' : 's'}.`;
export const QUIET_CAPTIONS = { gate: 'If nothing is picked: “Pick a decision first.”', question: 'If empty: “Type an answer first.”' } as const;
export const quietCount = (n: number, max: number): string => `${n} of ${max} characters`;
export const quietRestore = (stage: string): string => `Returns it to ${stage}.`;
