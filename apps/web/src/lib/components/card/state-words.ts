// apps/web/src/lib/components/card/state-words.ts
/** One word, or one short sentence, for where a card stands. Never the raw state value. */
import type { StageTrackStatus } from '@superjackfruitlabs/vibekit-ui';
import type { Activity, Attempt } from '$lib/api';
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


/** How a run ended, lower case. "Sent back" is derived: completed, but the board refused the completion. */
export function attemptWord(a: Pick<Attempt, 'outcome' | 'completion'>): string {
  if (a.outcome === 'blocked') return 'stopped';
  if (a.outcome === 'sent_back' || (a.outcome === 'completed' && a.completion?.ok === false)) return 'sent back';
  if (a.outcome === 'completed') return 'done';
  if (a.outcome === 'failed') return 'failed';
  // A person moved the card while the run was working, which ended the run: nobody's failure.
  if (a.outcome === 'moved') return 'moved by a person';
  return a.outcome ?? 'working';
}

const TYPE_WORD: Readonly<Record<string, string>> = { action: 'Did', response: 'Said', thought: 'Thought', prompt: 'You said', elicitation: 'Asked', error: 'Error' };
/** The bold word in front of an event (G-5, §7.5). */
export const eventVerb = (a: Pick<Activity, 'signal' | 'action' | 'type'>): string =>
  a.signal === 'stop' ? 'Stopped' : (a.action ?? TYPE_WORD[a.type] ?? a.type);

/** The stop row repeats nothing: the reason is already at the top of the card (P-26). */
export const STOP_SENTENCE = 'Blocked. Waiting on you; the reason is shown at the top of this card.';
export const eventSentence = (a: Pick<Activity, 'signal' | 'body'>): string => (a.signal === 'stop' ? STOP_SENTENCE : (a.body ?? ''));
