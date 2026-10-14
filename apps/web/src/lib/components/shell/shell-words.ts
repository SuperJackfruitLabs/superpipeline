// apps/web/src/lib/components/shell/shell-words.ts
/**
 * Every global value a shell prints, as pure functions of plain data. `shellModel` feeds them the
 * store; the tests feed them the fixture world. Times read in the browser's zone unless a test
 * passes one (the harness runs in Asia/Kolkata, so 08:21Z prints 13:51).
 */
import { countWords, greeting, type Phase } from '@superjackfruit/vibekit';
import type { Card, User } from '$lib/api';
import { plural } from '$lib/words';

export interface StatusItem { text: string; signal?: boolean }
export interface ShellStatus { items: StatusItem[]; right: string[] }
export const STATUS_RIGHT: readonly string[] = ['⌘K commands', 'N new card'];
export const PAPER_PHASE: Record<Phase, string> = {
  dawn: 'at first light', morning: 'in the morning light', noon: 'in full daylight', golden: 'in the golden hour', dusk: 'at dusk', night: 'after dark',
};

export const TERMINAL_STATES: ReadonlySet<string> = new Set(['completed', 'canceled', 'rejected']);
export const isTerminal = (c: Pick<Card, 'state'>): boolean => TERMINAL_STATES.has(c.state);

const dayMonth = (d: Date, timeZone?: string) => new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone }).format(d);
export const hhmm = (d: Date, timeZone?: string) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(d);

/** Paper's dateline: "Sunday 11 October · in full daylight". */
export function dateline(now: Date, phase: Phase, timeZone?: string): string {
  return `${dayMonth(now, timeZone)} · ${PAPER_PHASE[phase]}`;
}

export function userNameOf(user: Pick<User, 'name' | 'login'> | null | undefined): string {
  return user?.name?.trim() || user?.login?.trim() || 'You';
}
export function initialsOf(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('') || '·';
}
export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

export function filterSummary(active: number): string {
  return active === 0 ? 'none on' : `${active} on`;
}

export function showingLine(shown: number, total: number, filtersOn: boolean): string {
  if (!filtersOn) {
    if (total === 0) return 'No cards on this board';
    return total === 1 ? 'Showing the only card' : `Showing all ${total} cards`;
  }
  return `Showing ${shown} of ${plural(total, 'card', 'cards')}`;
}

export function paperShowingLine(showing: string, needs: number, shipped: number): string {
  return [showing, needs > 0 ? `${needs} wait on you` : null, shipped > 0 ? `${shipped} shipped` : null].filter(Boolean).join(' · ');
}

export function studioSubRight(syncedAt: Date | null, phase: Phase, timeZone?: string): string | null {
  if (!syncedAt) return null;
  return `The board at ${hhmm(syncedAt, timeZone)} · ${greeting(phase, 'studio').toLowerCase()} · ${dayMonth(syncedAt, timeZone)}`;
}

/** Each vibe's rendering of the Inbox count; null when nothing needs you (no count, no colour). */
export interface OperateCount { n: string; comma: string; paren: string; needYou: string; aria: string; tip: string; quiet: string }
/** "1 needs you", "4 need you": vibekit's own words, so the status line and the nav badges agree. */
export const needYou = (n: number): string => countWords(n, true);
export function operateCount(n: number): OperateCount | null {
  if (n <= 0) return null;
  const w = needYou(n);
  return { n: String(n), comma: `, ${w}`, paren: `(${n})`, needYou: w.slice(String(n).length), aria: `Inbox, ${w}`, tip: `Inbox · ${w}`, quiet: `(${w})` };
}

export function needsPart(n: number): StatusItem | null {
  return n > 0 ? { text: needYou(n), signal: true } : null;
}

/** A Studio status line: the page's items, then "synced HH:MM"; the keys on the right. */
export function statusLine(lead: ReadonlyArray<string | StatusItem | null>, syncedAt: Date | null, opts: { right?: readonly string[]; timeZone?: string } = {}): ShellStatus {
  const items = lead.filter((x): x is string | StatusItem => x !== null).map((x) => (typeof x === 'string' ? { text: x } : x));
  if (syncedAt) items.push({ text: `synced ${hhmm(syncedAt, opts.timeZone)}` });
  return { items, right: [...(opts.right ?? STATUS_RIGHT)] };
}

export interface BoardCounts { all: number; needs: number; blocked: number; shipped: number }
/** Non-archived cards; blocked = not waiting on you, not finished, held by an open blocker. */
export function boardCounts(cards: readonly Card[], needIds: ReadonlySet<string>): BoardCounts {
  const live = cards.filter((c) => !c.archivedAt);
  return {
    all: live.length,
    needs: live.filter((c) => needIds.has(c.id)).length,
    blocked: live.filter((c) => !needIds.has(c.id) && !isTerminal(c) && c.blockedBy.length > 0).length,
    shipped: live.filter((c) => c.state === 'completed').length,
  };
}
export function boardStatus(c: BoardCounts, syncedAt: Date | null, timeZone?: string): ShellStatus {
  return statusLine([plural(c.all, 'card', 'cards'), needsPart(c.needs), c.blocked > 0 ? `${c.blocked} blocked` : null, c.shipped > 0 ? `${c.shipped} shipped` : null], syncedAt, { timeZone });
}

/** Distinct projects among the board's non-archived cards (Studio "Projects 3"). */
export function projectCountOf(cards: readonly Card[]): number {
  return new Set(cards.filter((c) => !c.archivedAt && c.projectId).map((c) => c.projectId)).size;
}
