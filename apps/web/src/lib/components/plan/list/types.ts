// apps/web/src/lib/components/plan/list/types.ts
import type { Mood } from '@superjackfruit/vibekit';
import type { ListGroupBy } from '$lib/stores/app.svelte';
import type { CardSummary } from '$lib/components/board/card-summary';
import type { ListUi } from './list-ui.svelte';

export type ListSortKey = 'priority' | 'title' | 'state' | 'agent' | 'due' | 'cost' | 'attempts' | 'age';
export interface ListSort { key: ListSortKey; ascending: boolean }
export type ListTone = 'needs' | 'working' | 'queued' | 'done' | 'closed';

export interface ListState {
  /** "Waiting on you" | "Working" | "Queued" | "Done" | "Canceled" | "Rejected" */
  word: string;
  needsYou: boolean;
  /** Quiet's qualifier after the comma ("stopped", "no owner"); null when none. */
  sub: string | null;
  tone: ListTone;
}

export interface ListAgent { id: string; name: string; iconUrl: string | null; mood: Mood; moodWord: string }

export interface ListRow {
  s: CardSummary;
  href: string;
  state: ListState;
  /** null → the unclaimed cell. */
  agent: ListAgent | null;
  unclaimedWord: 'Unclaimed' | 'Not claimed yet';
  priorityText: string | null;
  prioritySignal: boolean;
  dueIso: string | null;
  dueHuman: string | null;
  overdue: boolean;
  dueSignal: boolean;
  costText: string | null;
  costSignal: boolean;
  attempts: number;
  attemptsSignal: boolean;
  ageText: string | null;
  askedBy: { name: string; agentId: string | null; iconUrl: string | null } | null;
  blockedCount: number;
  /** Up to three resolved label names. */
  labelNames: string[];
  /** Labels beyond those shown, unresolved ids included ("+1"). */
  moreLabels: number;
}

export interface ListGroup {
  key: string;
  label: string;
  /** Stage order for stage groups, else the group's position. */
  order: number;
  /** Stage groups only: "a person" | "testing · tester-tim" | "code · 2 agents". */
  owner: string | null;
  rows: ListRow[];
}

export type QuickFilter = 'all' | 'needs' | 'working' | 'idle' | 'done';

export interface ListLayoutProps {
  /** Transient state the page owns (a layout falls back to its own when absent, as in tests). */
  ui?: ListUi;
  boardId: string;
  boardName: string;
  stageCount: number;
  groups: ListGroup[];
  /** Stage names with no card, board order; [] unless grouped by stage. */
  emptyStages: string[];
  cardCount: number;
  needsCount: number;
  quickCounts: Record<QuickFilter, number>;
  totalCostUsd: number;
  groupBy: ListGroupBy;
  sort: ListSort;
  filtersOn: boolean;
  /** The board has at least one non-archived card at all. */
  hasCards: boolean;
  stages: Array<{ key: string; name: string }>;
  onGroupBy: (g: ListGroupBy) => void;
  /** A header click: `nextSort(app.listSort, k)`. */
  onSort: (k: ListSortKey) => void;
  /** Quiet's Sort by picker sets a whole sort. */
  onSetSort: (s: ListSort) => void;
  onMove: (cardId: string, stageKey: string) => Promise<void>;
  onOpen: (cardId: string) => void;
  onOpenMoveDialog: (cardId: string) => void;
}
