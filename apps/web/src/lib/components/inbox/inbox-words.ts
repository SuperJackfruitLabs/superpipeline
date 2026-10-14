// apps/web/src/lib/components/inbox/inbox-words.ts
/**
 * The Inbox's sentences (approved mockups SP-Inbox-Home-*, SP-Operate-Home-Daylight), built from
 * real counts: "Good afternoon, Ira. 6 cards want you." and its subline, "Three agents stopped
 * and are waiting on you, two cards wait for your decision and one has nobody to pick it up,
 * across three boards. Nothing is running."
 */
import { numWord } from '$lib/words';

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
