// apps/web/src/lib/components/operate/layouts/types.ts
import type { Phase } from '@superjackfruit/vibekit';
import type { AgentSummary, Card, Notification, Stage } from '$lib/api';
import type { CapsUi, OperateUi } from '../operate-ui.svelte';
import type { AttentionAction, AttentionItem } from '$lib/components/attention/attention';

/** One card waiting on a person, with what every vibe needs to draw it. */
export interface NeedRow {
  item: AttentionItem;
  card: Card;
  stage: Stage;
  /** 1-based position of the stage on the board: Studio's chip colour `c{n}`. */
  stageIndex: number;
  /** The card's board's stages in order: where it can resume or move to (the Inbox spans boards). */
  stages: Stage[];
  /** The card's board: every ask shows it as a chip next to the agent. */
  boardId: string;
  boardName: string;
  /** The agent that last worked it (`delegateAgentId ?? lastAgentId`); null for an unclaimed card. */
  agentName: string | null;
  iconUrl: string | null;
  actions: AttentionAction[];
  overdue: boolean;
}

/** One card's notifications: the newest is shown, the rest sit behind "Earlier reminders". */
export interface ActivityGroup {
  cardId: string;
  title: string;
  boardId: string;
  boardName: string;
  agentName: string | null;
  iconUrl: string | null;
  latest: Notification;
  earlier: Notification[];
  /** The card's Needs row, when it has one: the group then offers Resume or Move and links to it. */
  need: NeedRow | null;
}

export interface RunningRow { cardId: string; title: string; boardId: string; boardName: string; stageName: string; agentName: string | null; iconUrl: string | null; costUsd: number }

export interface SpendView {
  /** Spend over the last 7 days, from `GET /v1/boards/:id/usage?window=7d` (OP-G8). */
  total: number;
  cap: number | null;
  cardCap: number | null;
  overBudget: boolean;
  /** Spend as a share of the board cap, 0–100; null without a cap. */
  pct: number | null;
  /** Up to five agents, most spent first. */
  top: Array<{ name: string; costUsd: number }>;
}

/** What a cap save says back: field errors, a refusal, or null when it saved. */
export type CapResult = { board: string | null; card: string | null; refused: string | null } | null;

export interface OperateModel {
  /** The chosen board's id, or '' on all boards. */
  readonly boardId: string;
  /** The chosen board's name, or 'All boards'. */
  readonly boardName: string;
  /** One board chosen (caps and Spend details need one); false on all boards. */
  readonly scoped: boolean;
  /** How many boards the page reads. */
  readonly boardCount: number;
  /** Non-archived cards on the board. */
  readonly cardCount: number;
  /** The board's stages in order. */
  readonly stages: Stage[];
  readonly agents: AgentSummary[];
  /** Needs rows in stage order (Daylight, Paper, Studio). */
  readonly needs: NeedRow[];
  /** Needs rows in urgency order (Quiet). */
  readonly needsUrgent: NeedRow[];
  readonly running: RunningRow[];
  readonly spend: SpendView;
  readonly usageError: string | null;
  readonly unread: number;
  /** Show read notifications too. */
  showRead: boolean;
  readonly groups: ActivityGroup[];
  readonly phase: Phase;
  readonly nowMs: number;
  readonly firstName: string;
  cardHref(cardId: string, boardId?: string): string;
  /** Resolves to the refusal to show, or null when it worked. */
  resume(row: NeedRow, comment: string, toStageKey: string): Promise<string | null>;
  move(row: NeedRow, toStageKey: string): Promise<string | null>;
  markRead(seq: number, boardId?: string): Promise<void>;
  setCaps(board: string, card: string): Promise<CapResult>;
  open(cardId: string, boardId?: string): void;
  openLog(cardId: string, boardId?: string): void;
}

/**
 * `ui` and `caps` are what the reader is in the middle of (an open resume form, an expanded quote).
 * OperateView owns them so a layout that is mounted again (the shell swapping frames) keeps them;
 * a layout rendered on its own makes its own.
 */
export interface OperateLayoutProps { model: OperateModel; ui?: OperateUi; caps?: CapsUi }
