// apps/web/src/lib/components/card/state-words.ts
/** One word, or one short sentence, for where a card stands. Never the raw state value. */
import type { StageTrackStatus } from '@superjackfruit/vibekit';
import type { Activity, Attempt, Card, Stage } from '$lib/api';
import { ageWords } from '$lib/age';
import type { CardLead, LeadKind } from './card-lead';

export type StripKind = LeadKind | 'archived';
export const STRIP_WORD: Readonly<Record<StripKind, string>> = {
  stopped: 'stopped', failed: 'stopped', budget: 'stopped', review: 'awaiting review', question: 'question pending',
  working: 'working', done: 'done', idle: 'queued', archived: 'archived',
};
export const stripKind = (lead: Pick<CardLead, 'kind'>, archived: boolean): StripKind => (archived ? 'archived' : lead.kind);
/** vibekit StageTrack `status` for the card page track. Failed and over-budget cards say "stopped", as the product always has. */
const TRACK_STATUS: Readonly<Record<StripKind, StageTrackStatus>> = {
  stopped: 'stopped', failed: 'stopped', budget: 'stopped', review: 'review', question: 'question',
  working: 'working', done: 'done', idle: 'queued', archived: 'archived',
};
export const trackStatus = (kind: StripKind): StageTrackStatus => TRACK_STATUS[kind];

/** The stage strip's accessible name (D-5). */
export function stripAria(i: number, n: number, name: string, kind: StripKind, form: 'drawer' | 'cell' | 'phone'): string {
  if (kind === 'archived') return `${form === 'drawer' ? 'Stages: stopped' : 'Stopped'} at stage ${i + 1} of ${n}, ${name}, archived`;
  const word = STRIP_WORD[kind] + (form === 'phone' && STRIP_WORD[kind] === 'stopped' ? ' here' : '');
  return `${form === 'drawer' ? 'Stages: stage' : 'Stage'} ${i + 1} of ${n}, ${name}, ${word}`;
}

export function stateWord(card: Pick<Card, 'state' | 'archivedAt'>, lead: Pick<CardLead, 'kind' | 'needsYou'>): string {
  if (card.archivedAt) return 'Archived';
  if (lead.kind === 'failed') return 'Failed';
  if (lead.needsYou) return 'Waiting on you';
  if (card.state === 'working') return 'Working';
  if (card.state === 'completed') return 'Done';
  if (card.state === 'rejected') return 'Rejected';
  return 'Queued';
}

/** The state pill: "Waiting on you · 2 days" on desktop, the word alone on phones. */
export function waitingWord(card: Pick<Card, 'state' | 'archivedAt'>, lead: Pick<CardLead, 'kind' | 'needsYou'>, ageHours: number | null, form: 'desktop' | 'phone'): string {
  const word = stateWord(card, lead);
  return word === 'Waiting on you' && form === 'desktop' && ageHours !== null ? `${word} · ${ageWords(ageHours)}` : word;
}

/** Signal only for "needs you"; archived is never signal (§8.2-3). */
export function pillTone(card: Pick<Card, 'state' | 'archivedAt'>, lead: Pick<CardLead, 'needsYou'>): 'needs' | 'working' | 'done' | 'off' {
  if (card.archivedAt) return 'off';
  if (lead.needsYou) return 'needs';
  if (card.state === 'working') return 'working';
  if (card.state === 'completed') return 'done';
  return 'off';
}

const STOP_VERB: Readonly<Record<LeadKind, string>> = {
  stopped: 'Stopped', failed: 'Stopped', budget: 'Stopped', review: 'Waiting for review', question: 'Asked a question',
  working: 'Working', done: 'Finished', idle: 'Queued',
};
/** "Stopped in stage 2 of 7. Next: Failing test." (G-8). */
export function stopLine(lead: Pick<CardLead, 'kind'>, i: number, stages: Pick<Stage, 'name'>[]): string {
  const next = stages[i + 1];
  return `${STOP_VERB[lead.kind]} in stage ${i + 1} of ${stages.length}.${next ? ` Next: ${next.name}.` : ''}`;
}

/** How a run ended, lower case. "Sent back" is derived: completed, but the board refused the completion. */
export function attemptWord(a: Pick<Attempt, 'outcome' | 'completion'>): string {
  if (a.outcome === 'blocked') return 'stopped';
  if (a.outcome === 'sent_back' || (a.outcome === 'completed' && a.completion?.ok === false)) return 'sent back';
  if (a.outcome === 'completed') return 'done';
  if (a.outcome === 'failed') return 'failed';
  return a.outcome ?? 'working';
}

const TYPE_WORD: Readonly<Record<string, string>> = { action: 'Did', response: 'Said', thought: 'Thought', prompt: 'You said', elicitation: 'Asked', error: 'Error' };
/** The bold word in front of an event (G-5, §7.5). */
export const eventVerb = (a: Pick<Activity, 'signal' | 'action' | 'type'>): string =>
  a.signal === 'stop' ? 'Stopped' : (a.action ?? TYPE_WORD[a.type] ?? a.type);

/** The stop row repeats nothing: the reason is already at the top of the card (P-26). */
export const STOP_SENTENCE = 'Blocked. Waiting on you; the reason is shown at the top of this card.';
export const eventSentence = (a: Pick<Activity, 'signal' | 'body'>): string => (a.signal === 'stop' ? STOP_SENTENCE : (a.body ?? ''));
