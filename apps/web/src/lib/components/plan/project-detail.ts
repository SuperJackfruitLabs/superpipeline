/**
 * The project page's derived facts, as pure functions over a project's milestones and its cards
 * across boards (nav v2, track N2). No `.svelte` import, so Vitest reads it without rendering.
 *
 * Health has two sources and the page shows both: the DECLARED one is a person's judgement
 * (`projects.health`, migration 0013) and is never computed; the COMPUTED one is this module's
 * reading of milestones and cards, and is allowed to disagree with it.
 */
import type { AgentSummary, Card, Milestone, ProjectHealth } from '$lib/api';
import { ageWords } from '$lib/age';
import { displayAgent } from '$lib/names';
import { plural } from '$lib/words';

/** One of the project's cards, with the board it lives on. */
export interface ProjectCard {
  card: Card;
  boardId: string;
  boardName: string;
  stageName: string;
}

export type MilestoneStatus = 'reached' | 'open' | 'overdue';

export const isDone = (c: Card): boolean => c.state === 'completed';
/** Done, canceled or rejected: nothing more will happen to it. */
const isClosed = (c: Card): boolean => c.state === 'completed' || c.state === 'canceled' || c.state === 'rejected';

/** The local calendar day, `YYYY-MM-DD`, for comparing with a milestone's or project's date. */
export function todayIso(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/**
 * Reached: it has cards and every one is done. Overdue: its date has passed and it is not reached
 * (a past milestone with no cards is overdue too: nothing reached it). Otherwise open.
 */
export function milestoneStatus(m: Milestone, cards: readonly ProjectCard[], today: string): MilestoneStatus {
  const mine = cards.filter((c) => c.card.milestoneId === m.id && !c.card.archivedAt);
  if (mine.length > 0 && mine.every((c) => isDone(c.card))) return 'reached';
  if (m.targetDate && m.targetDate.slice(0, 10) < today) return 'overdue';
  return 'open';
}

export interface ComputedHealth { health: ProjectHealth; reason: string }

/**
 * Off track: the project's target date has passed with cards open, or two or more milestones are
 * overdue. At risk: one milestone is overdue. Otherwise on track.
 */
export function computedHealth(
  project: { targetDate: string | null },
  milestones: readonly Milestone[],
  cards: readonly ProjectCard[],
  today: string,
): ComputedHealth {
  const open = cards.filter((c) => !c.card.archivedAt && !isClosed(c.card)).length;
  if (project.targetDate && project.targetDate.slice(0, 10) < today && open > 0) {
    return { health: 'off-track', reason: `target date passed with ${plural(open, 'card', 'cards')} open` };
  }
  const overdue = milestones.filter((m) => milestoneStatus(m, cards, today) === 'overdue').length;
  if (overdue >= 2) return { health: 'off-track', reason: `${plural(overdue, 'milestone', 'milestones')} overdue` };
  if (overdue === 1) return { health: 'at-risk', reason: '1 milestone overdue' };
  return { health: 'on-track', reason: 'nothing overdue' };
}

export interface Blocker {
  kind: 'waiting' | 'blocked';
  cardId: string;
  boardId: string;
  boardName: string;
  title: string;
  /** Who or what it waits on: "you", or the blocking card's title. */
  on: string;
  /** The agent's own words, for a card waiting on a person. */
  detail: string | null;
  /** The agent on it, by name. */
  agent: string | null;
  age: string;
}

const hoursSince = (iso: string | undefined, nowMs: number): number => (iso ? Math.max(0, (nowMs - Date.parse(iso)) / 3_600_000) : 0);

/** Cards stopped waiting on a person, then cards blocked by another card; done cards are never blockers. */
export function blockersOf(cards: readonly ProjectCard[], agents: AgentSummary[], nowMs: number): Blocker[] {
  const live = cards.filter((c) => !c.card.archivedAt && !isClosed(c.card));
  const base = (c: ProjectCard) => ({ cardId: c.card.id, boardId: c.boardId, boardName: c.boardName, title: c.card.title });
  const waiting = live.filter((c) => c.card.needsHuman).map((c): Blocker => ({
    kind: 'waiting', ...base(c), on: 'you',
    detail: c.card.needsHuman?.summary ?? c.card.needsHuman?.detail ?? null,
    agent: displayAgent(c.card.lastAgentId, agents) || null,
    age: ageWords(hoursSince(c.card.stateSince ?? c.card.stageSince, nowMs)),
  }));
  const blocked = live.filter((c) => !c.card.needsHuman && c.card.blockedBy.length > 0).map((c): Blocker => ({
    kind: 'blocked', ...base(c), on: c.card.blockedBy.map((b) => b.title).join(', '), detail: null,
    agent: displayAgent(c.card.lastAgentId, agents) || null,
    age: ageWords(hoursSince(c.card.stageSince, nowMs)),
  }));
  return [...waiting, ...blocked];
}

/** A card's status in the project's card list. */
export function cardStatus(c: Card): string {
  if (isDone(c)) return 'Done';
  if (c.state === 'canceled' || c.state === 'rejected') return 'Closed';
  if (c.needsHuman) return 'Waiting on you';
  if (c.blockedBy.length > 0) return 'Blocked';
  if (c.state === 'working') return 'Working';
  return 'Queued';
}

export interface BoardGroup {
  boardId: string;
  boardName: string;
  total: number;
  done: number;
  costUsd: number;
  stages: Array<{ stage: string; cards: ProjectCard[] }>;
}

/** Cards by board (in first-seen order), then by stage within a board. */
export function cardsByBoard(cards: readonly ProjectCard[]): BoardGroup[] {
  const boards = new Map<string, BoardGroup>();
  for (const c of cards) {
    let b = boards.get(c.boardId);
    if (!b) boards.set(c.boardId, (b = { boardId: c.boardId, boardName: c.boardName, total: 0, done: 0, costUsd: 0, stages: [] }));
    b.total += 1;
    if (isDone(c.card)) b.done += 1;
    b.costUsd += c.card.costUsd;
    let s = b.stages.find((x) => x.stage === c.stageName);
    if (!s) b.stages.push((s = { stage: c.stageName, cards: [] }));
    s.cards.push(c);
  }
  return [...boards.values()];
}

/** The agents whose runs touched these cards, by name, with how many cards each. */
export function agentsOn(cards: readonly ProjectCard[], agents: AgentSummary[]): Array<{ name: string; cards: number }> {
  const counts = new Map<string, number>();
  for (const c of cards) {
    const id = c.card.lastAgentId ?? c.card.delegateAgentId ?? null;
    if (!id) continue;
    const name = displayAgent(id, agents);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts].map(([name, n]) => ({ name, cards: n }));
}

/** What the cards on each board have spent, largest first. */
export function spendByBoard(cards: readonly ProjectCard[]): Array<{ boardId: string; boardName: string; costUsd: number }> {
  return cardsByBoard(cards).map((b) => ({ boardId: b.boardId, boardName: b.boardName, costUsd: b.costUsd })).sort((a, b) => b.costUsd - a.costUsd);
}

export const fmtUsd = (n: number): string => `$${n.toFixed(2)}`;
