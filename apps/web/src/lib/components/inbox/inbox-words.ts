// apps/web/src/lib/components/inbox/inbox-words.ts
/**
 * The Inbox's sentences (approved mockups SP-Inbox-Home-*, SP-Operate-Home-Daylight), built from
 * real counts: "Good afternoon, Ira. 6 cards want you." and its subline, "Three agents stopped
 * and are waiting on you, two cards wait for your decision and one has nobody to pick it up,
 * across three boards. Nothing is running."
 */
import type { AttentionItem, AttentionKind } from '$lib/components/attention/attention';
import { ageWords } from '$lib/age';
import { clockHM } from '$lib/when';
import { numWord, plural } from '$lib/words';

export interface InboxCounts { stopped: number; decisions: number; unclaimed: number; other: number }
type Kinded = { item: { kind: string }; boardId: string };

const STOPPED = new Set(['blocked', 'repeated-failure', 'failed']);
const DECISION = new Set(['review', 'question']);

export function inboxCounts(rows: readonly Kinded[]): InboxCounts {
  const stopped = rows.filter((r) => STOPPED.has(r.item.kind)).length;
  const decisions = rows.filter((r) => DECISION.has(r.item.kind)).length;
  const unclaimed = rows.filter((r) => r.item.kind === 'no-owner').length;
  return { stopped, decisions, unclaimed, other: rows.length - stopped - decisions - unclaimed };
}

/** How many boards the asks come from. */
export const askBoards = (rows: readonly Kinded[]): number => new Set(rows.map((r) => r.boardId)).size;

/** "6 cards want you." / "1 card wants you." / "Nothing needs you." */
export function wantYou(n: number, words = false): string {
  const k = words ? numWord(n, true) : String(n);
  return n === 0 ? 'Nothing needs you.' : n === 1 ? `${k} card wants you.` : `${k} cards want you.`;
}

/** "and" before the last part: "a, b and c". */
function list(parts: string[]): string {
  return parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
}

export function inboxSubline(c: InboxCounts, boards: number, running: number): string {
  const parts: string[] = [];
  const first = () => parts.length === 0;
  if (c.stopped) parts.push(`${numWord(c.stopped, first())} agent${c.stopped === 1 ? '' : 's'} stopped and ${c.stopped === 1 ? 'is' : 'are'} waiting on you`);
  if (c.decisions) parts.push(`${numWord(c.decisions, first())} card${c.decisions === 1 ? ' waits' : 's wait'} for your decision`);
  if (c.unclaimed) parts.push(`${numWord(c.unclaimed, first())} ${c.unclaimed === 1 ? 'has' : 'have'} nobody to pick ${c.unclaimed === 1 ? 'it' : 'them'} up`);
  if (c.other) parts.push(`${numWord(c.other, first())} more need${c.other === 1 ? 's' : ''} you`);
  const across = boards > 1 ? `, across ${numWord(boards)} boards` : '';
  const run = running === 0 ? 'Nothing is running.' : `${numWord(running, true)} ${running === 1 ? 'agent is' : 'agents are'} working.`;
  return parts.length ? `${list(parts)}${across}. ${run}` : run;
}

/** "across 3 boards" / "on 1 board"; empty when nothing needs you. */
export function acrossBoards(boards: number): string {
  return boards === 0 ? '' : boards === 1 ? 'on 1 board' : `across ${boards} boards`;
}

/** The Inbox summary while it is still counting: no number and no "nothing" words. */
export const CHECKING = 'Checking your boards…';

// ---- the Inbox's groups (contract §11.4): what each group is called and how the headline names it ----

export type InboxGroupWordsKey = 'review' | 'answer' | 'resume' | 'budget' | 'unclaimed';

/** Each group's heading and the verb on its rows. */
export const GROUP_WORDS: Record<InboxGroupWordsKey, { title: string; verb: string; one: string; many: string }> = {
  review: { title: 'Review', verb: 'Review', one: 'review', many: 'reviews' },
  answer: { title: 'Answer', verb: 'Answer', one: 'question', many: 'questions' },
  resume: { title: 'Resume a stopped agent', verb: 'Resume', one: 'stopped agent', many: 'stopped agents' },
  budget: { title: 'Over budget', verb: 'Raise the cap', one: 'card over budget', many: 'cards over budget' },
  unclaimed: { title: 'Nobody works these stages', verb: 'Move', one: 'card nobody is set up to work', many: 'cards nobody is set up to work' },
};

/** "a and b", "a, b, and c": the headline's list. */
export function seriesList(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts.at(-1)}`;
}

/** The lede under the headline: the non-empty groups in order, then what is running. */
export function groupsLede(counts: ReadonlyArray<{ key: InboxGroupWordsKey; n: number }>, running: number): string {
  const parts = counts.filter((c) => c.n > 0).map((c, i) => `${numWord(c.n, i === 0)} ${c.n === 1 ? GROUP_WORDS[c.key].one : GROUP_WORDS[c.key].many}`);
  const run = running === 0 ? 'Nothing is running.' : `${numWord(running, true)} running.`;
  return parts.length ? `${seriesList(parts)}. ${run}` : run;
}

/**
 * What each group is for, said once above its rows (rule 4). The first group on the page anchors its
 * jargon (rule 12): a gate, a stage and an attempt are each said in a sentence that says what they are.
 */
export const GROUP_EXPLANATION: Record<Exclude<InboxGroupWordsKey, 'unclaimed'>, string> = {
  review: 'Each card here reached a gate: a stage where a person approves the work before the card moves on. Open it to read what the last attempt, the agent’s latest run at the stage, produced.',
  answer: 'An agent asked a question while working its stage, the step of the board it holds, and waits for your answer before it goes on.',
  resume: 'These agents stopped and wait on you. Resume one with a note on what changed; it reads the note and picks the card up again.',
  budget: 'These cards spent past their cap, the most one card may cost. No agent picks one up again until the cap is raised.',
};

/** Why the unclaimed cards will not move, said once for the group. */
export function unclaimedExplanation(stages: readonly string[], boards: number): string {
  return `These cards sit in ${seriesList(stages)} on ${plural(boards, 'board', 'boards')}. No agent holds those stages and no review is asked for, so they will not move on their own.`;
}

// ---- the Inbox page (composition contract, Inbox) ----

/** The Needs you tab's own heading, read by a screen reader above the groups. */
export const NEEDS_HEADING = 'Needs you';
/** Nothing in scope needs you: the Needs you tab says so plainly. */
export const NEEDS_NONE = 'Nothing is waiting on you.';
/** The filters hide every card that needs you. */
export const NO_MATCH = 'No card that needs you matches these filters.';

/** The filter chips, one per group, in the groups' order. */
export const GROUP_CHIP: Record<InboxGroupWordsKey, string> = {
  review: 'Review', answer: 'Answer', resume: 'Stopped', budget: 'Over budget', unclaimed: 'Unclaimed',
};

/** What happened, per kind: who (the agent's name), the attempt count when known, the stage. */
const WHAT: Record<AttentionKind, (who: string, n: number | undefined, stage: string) => string> = {
  review: (who, n, stage) => (n ? `${who} finished attempt ${n} · ${stage}` : `${who} finished · ${stage}`),
  'sub-tasks': (_who, _n, stage) => `Waiting on its sub-tasks · ${stage}`,
  question: (who, _n, stage) => `${who} asked · ${stage}`,
  blocked: (who, _n, stage) => `${who} stopped · ${stage}`,
  'repeated-failure': (who, n, stage) => `${who} failed ${n && n > 1 ? `${numWord(n)} times` : 'again'} · ${stage}`,
  failed: (who, n, stage) => `${who} failed${n ? ` attempt ${n}` : ''} · ${stage}`,
  refused: (who, _n, stage) => `${who} was refused · ${stage}`,
  budget: (_who, _n, stage) => `Spent past its cap · ${stage}`,
  'no-owner': (_who, _n, stage) => stage,
};

/** A row's meta line after its state and board: who did what, where, and how long ago. */
export function rowMeta(item: AttentionItem, agent: string | null): string {
  const what = WHAT[item.kind](agent ?? 'An agent', item.attemptCount, item.stageName);
  return item.ageHours === null ? what : `${what} · ${ageWords(item.ageHours)}`;
}

/** The row's state word, per group. */
export const ROW_STATE: Record<InboxGroupWordsKey, { state: 'needs' | 'stopped'; label: string }> = {
  review: { state: 'needs', label: 'Needs you' },
  answer: { state: 'needs', label: 'Asked' },
  resume: { state: 'stopped', label: 'Stopped' },
  budget: { state: 'stopped', label: 'Over budget' },
  unclaimed: { state: 'needs', label: 'Unclaimed' },
};

/** The disclosure that holds an agent's own words on a row. */
export const SAID_LABEL = 'What it said';
export const RESUME_AT = 'Resume at';
export const SEND_BACK = 'Send back to work';
/** "Move all 14…": the unclaimed group's action, a menu of the stages every card in it can go to. */
export const moveAllLabel = (n: number): string => `Move all ${n}…`;
export const STAFF_LABEL = 'Staff an agent';

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
/** 1 to 99 in words ("eighteen", "forty-two"); digits from 100. */
function spelled(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 99) return String(n);
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ''}`;
}
/** Studio's headline beside its figure, the count in words: "Eighteen cards want you." */
export function studioHeadline(n: number): string {
  if (n === 0) return wantYou(0);
  const w = spelled(n);
  return `${w.charAt(0).toUpperCase()}${w.slice(1)} ${n === 1 ? 'card wants' : 'cards want'} you.`;
}

/** Studio's kicker over the figure: "Across three boards · nothing running". */
export function studioKicker(boards: number, running: number): string {
  const where = boards <= 1 ? 'On one board' : `Across ${numWord(boards)} boards`;
  const run = running === 0 ? 'nothing running' : `${numWord(running)} running`;
  return `${where} · ${run}`;
}

const usd = (n: number): string => `$${n.toFixed(2)}`;

/** The page's last line: "18 need you · 0 running · $0.00 in the last 7 days · synced 03:24", or "· paused". */
export function footerLine(
  f: { needs: number; running: number; spendUsd: number; syncedAt: string | null; paused: boolean }, timeZone?: string,
): string {
  const head = `${f.needs} need${f.needs === 1 ? 's' : ''} you · ${f.running} running · ${usd(f.spendUsd)} in the last 7 days`;
  // Paused: the Live pill counts what waits (rule 2), so the footer only says it is paused.
  if (f.paused) return `${head} · paused`;
  return f.syncedAt ? `${head} · synced ${clockHM(f.syncedAt, timeZone)}` : head;
}

/** Group paging (rule 7): the rows a group shows before "Show N more", and how many each press adds. */
export const GROUP_PAGE = 5;
export const showMore = (n: number): string => `Show ${n} more`;

// ---- Running ----
/** "coder-kai · Fix · since 14:02 · 11 min". */
export function runningMeta(r: { agentName: string | null; stageName: string; since: string | null }, nowMs: number, timeZone?: string): string {
  const who = r.agentName ?? 'An agent';
  if (!r.since) return `${who} · ${r.stageName}`;
  const mins = Math.max(0, Math.round((nowMs - Date.parse(r.since)) / 60_000));
  const long = mins < 60 ? `${mins} min` : ageWords(mins / 60);
  return `${who} · ${r.stageName} · since ${clockHM(r.since, timeZone)} · ${long}`;
}
export const RUNNING_NONE = 'No agent is working anything right now.';
export const RUNNING_NOTE = 'Agents on every board in scope appear here; the board chip says which.';

// ---- Spend ----
/** Beside the figure: the cap and the share used, on one board; caps are set per board. */
export function spendCapLine(total: number, cap: number | null, scoped: boolean): string {
  if (!scoped) return 'across every board in scope';
  if (cap === null) return 'no cap on this board';
  return `of a ${usd(cap)} cap · ${Math.round((total / cap) * 100)}%`;
}
export const spendMeta = (scope: string): string => `${scope} · last 7 days`;
export const SPEND_NONE = 'No agent has spent anything in the last 7 days.';
export const SPEND_NOTE = 'A card over its own cap shows in Needs you under Over budget.';
/** Under the five who spent most: how many more there are. */
export const spendMore = (n: number): string => `${plural(n, 'more agent', 'more agents')} spent less.`;
export const SPEND_DETAIL = 'Spend in detail';
export const SPEND_FAILED = 'Couldn’t load spend. Try again in a moment.';
export const spendCapVerb = (hasCap: boolean): string => (hasCap ? 'Change the cap' : 'Set a cap');

// ---- Activity ----
export const activityMeta = (cards: number): string => plural(cards, 'card', 'cards');
export const earlierLabel = (n: number): string => `${n} earlier`;
export const IN_NEEDS = 'In Needs you';
/** A move that never reached the server, or failed there without a reason. */
export const MOVE_FAILED = 'Couldn’t reach Superpipeline. Try again in a moment.';
/** "Move all": some moved, then one was refused or failed, and the rest were left where they are. */
export function moveAllStopped(moved: number, total: number, why: string): string {
  return `Moved ${moved} of ${total}; the rest did not move: ${why}`;
}
export const MARK_READ = 'Mark read';
export const ACTIVITY_WHICH = [{ value: 'unread', label: 'Unread only' }, { value: 'all', label: 'Show all' }];
export const activityNone = (showRead: boolean): string => (showRead ? 'Nothing has happened on these boards yet.' : 'Nothing unread.');
