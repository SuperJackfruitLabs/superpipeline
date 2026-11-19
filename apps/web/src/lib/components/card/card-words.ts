// apps/web/src/lib/components/card/card-words.ts
/** The card's words, one set for every vibe and surface (the vibe never changes wording). Pure. */
import type { Attempt, Card, GateConflict, Stage } from '$lib/api';
import { ageWords } from '$lib/age';
import { dayMonth, dayMonthLong, clockHM } from '$lib/when';
import type { LeadKind } from './card-lead';
import { attemptWord } from './state-words';

export const usd = (n: number): string => `$${n.toFixed(2)}`;
const s = (n: number) => (n === 1 ? '' : 's');

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length === 0 ? '' : words.length === 1 ? words[0].charAt(0).toUpperCase() : `${words[0].charAt(0)}${words.at(-1)!.charAt(0)}`.toUpperCase();
}

export function unclaimedChip(i: { delegateName: string | null; lastAgentName: string | null; attemptCount: number }): string {
  if (i.delegateName) return `${i.delegateName} · working it`;
  return i.lastAgentName ? `Unclaimed · ${i.lastAgentName} ran attempt ${i.attemptCount}` : 'Unclaimed';
}

export interface FactInput { card: Pick<Card, 'priority' | 'dueAt' | 'attemptCount'>; stageName: string; ageHours: number | null; labelNames: string[]; projectName: string | null; tz?: string }
/** The fact line under the title; the page adds Project (pass `projectName`). */
export function factItems(i: FactInput): Array<{ term: string; value: string }> {
  const out = [
    { term: 'Priority', value: i.card.priority > 0 ? `P${i.card.priority}` : 'none' },
    { term: 'Due', value: i.card.dueAt ? dayMonth(i.card.dueAt, i.tz) : 'none' },
    { term: 'Labels', value: i.labelNames.length ? i.labelNames.join(', ') : 'none' },
  ];
  if (i.ageHours !== null) out.push({ term: `In ${i.stageName} for`, value: ageWords(i.ageHours) });
  if (i.card.attemptCount > 1) out.push({ term: 'Attempt', value: String(i.card.attemptCount) });
  if (i.projectName) out.push({ term: 'Project', value: i.projectName });
  return out;
}

export const planProgress = (done: number, n: number): string => `${done} / ${n} steps · ${Math.round((100 * done) / n)}%`;
export const projectLine = (project: string, milestone: string | null): string => `${project} · ${milestone ?? 'no milestone'}`;

export const subtasksLine = (open: number, n: number): string => `${open} open of ${n}`;
export function relatedLine(phase: 'loading' | 'ok' | 'unavailable' | 'absent', n: number): string {
  if (phase === 'unavailable') return 'Related prior work could not be loaded from Superlibrary.';
  if (phase === 'loading') return 'Looking for related prior work…';
  return n ? `${n} related piece${s(n)} of prior work in Superlibrary.` : 'No related prior work found in Superlibrary.';
}

/** D-8: the carried handoff in one line, or what stands in for it before the first stage output. */
export function handoffLine(i: { handoff: Record<string, unknown> | null; stageIndex: number; stages: Pick<Stage, 'name'>[]; queuedByName: string; createdAt: string | undefined; tz?: string }): string {
  const prev = i.stages[i.stageIndex - 1]?.name ?? null;
  if (i.handoff && Object.keys(i.handoff).length) {
    const first = typeof i.handoff.summary === 'string' ? i.handoff.summary : Object.values(i.handoff).find((v): v is string => typeof v === 'string') ?? '';
    return `Handoff from ${prev ?? 'the last stage'}: “${first}”`;
  }
  const when = i.createdAt ? ` on ${dayMonth(i.createdAt, i.tz)}` : '';
  if (!prev) return `Queued by ${i.queuedByName}${when} with the brief above.`;
  return `From ${prev}: queued by ${i.queuedByName}${when} with the brief above. No earlier stage output.`;
}
export const attemptsLine = (attempts: Attempt[], name: (agentId: string) => string): string =>
  `Attempts: ${attempts.map((a, i) => `${i + 1} · ${name(a.agentId)} · ${usd(a.costUsd)} · ${attemptWord(a)}`).join('; ')}`;

export const noteHint = (len: number): string => `Needed before you send. ${len} / 8000`;
export const emptyNoteError = (agent: string): string => `Add a note for ${agent || 'the agent'} first.`;
/** §8.2-6: never names a card's specifics. */
export const RESUME_PLACEHOLDER = 'For example: what you checked, and what the agent should look at next.';

const VIA: Readonly<Record<GateConflict['via'], string>> = { matrix: 'Matrix', web: 'the web app', api: 'the API' };
/** API-1: who already decided, where, and when. The bold "Not recorded." is drawn by the layout. */
export const gateConflictSentence = (c: GateConflict, deciderName: string, tz?: string): string =>
  `This gate was already decided from ${VIA[c.via]} by ${deciderName} at ${clockHM(c.decidedAt, tz)}.`;

// ---- the one composition (composition contract §7 "Card"): the same words in every vibe ----

/** A card's state in a word, for filters and lists: `submitted` → "Queued", never the raw value. */
export const STATE_WORD: Readonly<Record<string, string>> = { working: 'Working', completed: 'Done', submitted: 'Queued', queued: 'Queued', rejected: 'Rejected', failed: 'Failed', 'input-required': 'Waiting on you' };

const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
/** "one document", "3 documents" */
export const countWords = (n: number, one: string, many = `${one}s`): string => `${COUNT_WORDS[n] ?? n} ${n === 1 ? one : many}`;

/** What the state sentence is built from: the card model, read, never asked. */
export interface StateSentenceInput {
  kind: LeadKind;
  archivedAt: string | null;
  stage: string;
  ageHours: number | null;
  /** Who did the last thing: the delegate, the asker, the producer, else the last run's agent; '' for nobody. */
  agent: string;
  attempt: number;
  /** Documents the last attempt produced. */
  produced: number;
  /** The card's own short reason for stopping (`needsHuman.summary`), when it has one. */
  reason: string | null;
  /** Where it goes after this stage, for "Approving moves the card to …". */
  nextStage: string | null;
  /** When it reached its state (done: when it was shipped). */
  since: string | null;
  /** Resume is the right answer (the server would take it). */
  resumable: boolean;
  tz?: string;
}

/**
 * The card's one sentence (rule 1): where it is, for how long, what is wanted, who did what last, and
 * the verb that answers it (`needsWord`: Review, Answer, Resume or Restore; null when nothing waits on you).
 */
export function stateSentence(i: StateSentenceInput): { text: string; needsWord: string | null } {
  const age = i.ageHours === null ? null : ageWords(i.ageHours);
  const forAge = age ? ` for ${age}` : '';
  const agent = i.agent || 'An agent';
  const madeIt = i.produced > 0 ? ` and produced ${countWords(i.produced, 'document')}` : '';
  if (i.archivedAt) {
    return { text: `Archived on ${dayMonthLong(i.archivedAt, i.tz)}. Agents cannot claim it and it is off the board. Restore it to bring it back to ${i.stage}.`, needsWord: 'Restore' };
  }
  switch (i.kind) {
    case 'review':
      return { text: `Waiting for your review in ${i.stage}${forAge}. ${agent} finished attempt ${i.attempt}${madeIt}.`, needsWord: 'Review' };
    case 'question':
      return { text: `Waiting for your answer in ${i.stage}${forAge}. ${agent} asked a question and holds the card until you reply.`, needsWord: 'Answer' };
    case 'stopped': case 'failed': case 'budget': {
      const how = i.kind === 'failed' ? 'failed' : i.kind === 'budget' ? 'stopped at the spending cap' : 'stopped';
      const why = i.reason ? `: ${i.reason.replace(/\.$/, '')}.` : '.';
      const next = i.resumable ? ' It will read your note before it tries again.' : '';
      return { text: `${agent} ${how} in ${i.stage} after attempt ${i.attempt}${why}${next}`, needsWord: i.resumable ? 'Resume' : null };
    }
    case 'working':
      return { text: `${agent} is working on it in ${i.stage}${forAge}. Nothing to do yet.`, needsWord: null };
    case 'done': {
      const on = i.since ? ` on ${dayMonthLong(i.since, i.tz)}` : '';
      const below = i.produced > 0 ? ` What it produced is below.` : '';
      return { text: `${i.agent ? `Shipped by ${i.agent}` : 'Shipped'}${on}. Nothing to do.${below}`, needsWord: null };
    }
    default:
      return { text: `Waiting in ${i.stage}${forAge}. Nobody has picked it up.`, needsWord: null };
  }
}

/** The decision panel's sentence: what is asked, when it finished, what approving does. */
export function gateAsk(i: { agent: string; attempt: number; ageHours: number | null; produced: number; nextStage: string | null }): { lead: string; rest: string } {
  const lead = `${i.agent || 'An agent'} asks you to approve attempt ${i.attempt}.`;
  const when = i.ageHours === null ? 'It finished' : i.ageHours < 1 ? 'It finished under an hour ago' : `It finished ${ageWords(i.ageHours)} ago`;
  const made = i.produced > 0 ? ` and produced ${countWords(i.produced, 'document')}` : '';
  const moves = i.nextStage ? ` Approving moves the card to ${i.nextStage}.` : '';
  return { lead, rest: `${when}${made}.${moves}` };
}

/** What each decision does, when the gate does not say. */
export function gateChoiceWords(role: 'approve' | 'changes' | 'reject', name: string, prevStage: string | null): string {
  if (name === 'approve_manual') return 'You post the approved text yourself.';
  if (name === 'approve_automatic') return 'The board posts the approved text for you.';
  if (role === 'approve') return 'The work is done; move the card on.';
  if (role === 'changes') return `Send it back${prevStage ? ` to ${prevStage}` : ''} with a note the agent will read.`;
  return 'Stop the card here.';
}
export const GATE_NOTE_LABEL = 'Note to the agent (optional)';
export const GATE_NOTE_NEEDED = 'Say what needs to change';
export const GATE_NOTE_ERROR = 'Request changes needs a note: the agent reads it on its next attempt.';
/** "What you are signing" meta: the hash and how many fields it seals. */
export const signingMeta = (digest: string, fields: number): string => `${digest.includes(':') ? digest.slice(0, digest.indexOf(':')) : 'digest'} · ${countWords(fields, 'field')}`;

/** The question panel's lead: who asks, or who needs a sign-in. */
export const questionLead = (agent: string, auth: boolean): string => `${agent || 'The agent'} ${auth ? 'needs you to sign in:' : 'asks:'}`;
export const QUESTION_FREE_LABEL = 'Or answer in your own words';
export const QUESTION_ONLY_LABEL = 'Your answer';

/** The resume panel's lead, in the card's own words when it has them. */
export const resumeLead = (agent: string, stage: string, attempt: number): string => `${agent || 'The agent'} stopped in ${stage} after attempt ${attempt}.`;
export const RESUME_NOTE_LABEL = 'Note for the next attempt';

export interface CardFact { term: string; value: string }
/** Facts in words (rule 5): names, never ids; "none" where nothing is set. Project, sub-tasks, cost, links and references have rows of their own. */
export function cardFacts(i: { owner: string; priority: number; labels: string[]; dueAt: string | null; attempts: number; askedBy: string; tz?: string }): CardFact[] {
  const out: CardFact[] = [
    { term: 'Owner', value: i.owner || 'nobody' },
    { term: 'Priority', value: i.priority > 0 ? `P${i.priority}` : 'none' },
    { term: 'Labels', value: i.labels.length ? i.labels.join(', ') : 'none' },
    { term: 'Due', value: i.dueAt ? dayMonthLong(i.dueAt, i.tz) : 'none' },
    { term: 'Attempt', value: i.attempts > 0 ? String(i.attempts) : 'none yet' },
  ];
  if (i.askedBy) out.push({ term: 'Asked by', value: i.askedBy });
  return out;
}
/** A label the catalogue no longer has is said as such, never by its id. */
export const labelName = (l: { id: string; name: string }): string => (l.name && l.name !== l.id ? l.name : 'a removed label');
export const costFact = (cost: number, estimate: number | null): string => `${usd(cost)}${estimate ? ` of ${usd(estimate)} estimated` : ''}`;
export const linksFact = (n: number): string => (n ? countWords(n, 'link') : 'none');

/** "What attempt 5 produced", or what it must produce before the first attempt. */
export const producedTitle = (attempt: number): string => (attempt > 0 ? `What attempt ${attempt} produced` : 'What it must produce');
export function producedMeta(documents: number, criteria: number): string {
  return [documents ? countWords(documents, 'document') : null, criteria ? countWords(criteria, 'criterion', 'criteria') : null].filter(Boolean).join(' · ');
}
/** "AC-01" */
export const criterionKey = (i: number): string => `AC-${String(i + 1).padStart(2, '0')}`;

/** "Conversation and history" meta: how many entries, and when the last was. */
export function historyMeta(entries: number, lastAt: string | null, now: number): string {
  const n = entries === 1 ? '1 entry' : `${entries} entries`;
  if (!lastAt) return n;
  const h = Math.max(0, (now - Date.parse(lastAt)) / 3_600_000);
  return `${n} · last ${h < 1 ? 'under an hour' : ageWords(h)} ago`;
}
export const RAW_META = 'JSON';
/** The crumb above the title: board · stage · card 4605. */
export const cardCrumb = (board: string, stage: string, shortId: string): string => `${board} · ${stage} · card ${shortId}`;
/** The track's line under the current stage: who has it, and for how long. */
export const trackWho = (needsYou: boolean, agent: string, ageHours: number | null): string =>
  [needsYou ? 'you' : agent || null, ageHours === null ? null : ageShortWords(ageHours)].filter(Boolean).join(' · ');
const ageShortWords = (h: number): string => (h < 1 ? 'under 1 h' : h < 48 ? `${Math.floor(h)} h` : `${Math.floor(h / 24)} d`);
/** The state block while the card's log is on its way (rule 11). */
export const LOADING_CARD = 'Loading the card…';
export const FAILED_CARD = { title: 'Could not load the card.', body: 'The service did not answer. Nothing was lost.' } as const;
