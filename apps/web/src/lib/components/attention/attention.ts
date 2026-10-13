/**
 * Every card waiting on a person, as one kind of row: what is wrong, in the card's own words, what
 * the person must do, and which actions the row offers.
 *
 * Two sources produce the same rows — one board's snapshot (`itemsFromBoard`, the Operate panel) and
 * the workspace feed (`itemsFromStale`, `GET /v1/stale?attention=1`) — so a card reads the same way
 * wherever it is seen.
 *
 * A review row never offers Approve. Deciding from a list is deciding without seeing what was
 * produced; the row says what is being approved and opens the card, where the decision sits next to
 * the work.
 */
import type { AgentSummary, BoardSnapshot, Card, NeedsHuman, StaleCard, Stage } from '$lib/api';
import { displayAgent } from '$lib/names';
import { needsYou } from '@superpipeline/contract';

export type AttentionKind =
  | 'review'
  | 'question'
  | 'blocked'
  | 'repeated-failure'
  | 'refused'
  | 'sub-tasks'
  | 'no-owner'
  | 'failed'
  | 'budget';

/**
 * - `resume`: a comment box, then the resume route.
 * - `move`: a stage picker (board panel only — the workspace row opens the card instead).
 * - `review` / `answer` / `log` / `open`: open the card, where the decision, the question or the log is.
 * - `staff`: the capabilities page.
 */
export type AttentionAction = 'resume' | 'move' | 'review' | 'answer' | 'log' | 'open' | 'staff';

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  boardId: string;
  boardName: string | null;
  cardId: string;
  title: string;
  stageKey: string;
  /** The stage as the board names it ("Failing test"), for sentences. */
  stageName: string;
  /** The stage's `order` on its board. Absent on workspace rows, which span boards. */
  stageOrder?: number;
  /** Runs the card has had. Absent on workspace rows. */
  attemptCount?: number;
  /** One line: what has happened. */
  headline: string;
  /** The card's, the agent's or the reviewer's own words, when there are any. Text, never HTML. */
  detail: string | null;
  /** What the person must do, plainly. */
  instruction: string;
  actions: AttentionAction[];
  /** How long the card has been sitting there, in hours, when known. */
  ageHours: number | null;
}

/** The chip text for each kind. */
export const KIND_LABEL: Record<AttentionKind, string> = {
  review: 'review',
  question: 'asked',
  blocked: 'blocked',
  'repeated-failure': 'failing',
  refused: 'refused',
  'sub-tasks': 'waiting',
  'no-owner': 'unowned',
  failed: 'failed',
  budget: 'budget',
};

type Base = Omit<AttentionItem, 'kind' | 'headline' | 'detail' | 'instruction' | 'actions' | 'id'>;

/** A stage no agent claims, with no approval gate, that is not the last stage (arriving there completes a card). */
export function isOwnerlessStage(stages: Stage[], key: string): boolean {
  const stage = stages.find((s) => s.key === key);
  if (!stage) return false;
  if (stages[stages.length - 1]?.key === key) return false;
  const claimable = stage.ownerKind === 'capability' || stage.ownerKind === 'agent';
  return !claimable && stage.gate !== 'approval';
}

function forNeeds(base: Base, reason: NeedsHuman['reason'] | 'sub-tasks', detail: string | null, failureCount: number | undefined): AttentionItem {
  const id = `${reason}:${base.boardId}:${base.cardId}`;
  switch (reason) {
    case 'repeated-failure':
      return {
        ...base, id, kind: 'repeated-failure', detail,
        headline: `failed ${failureCount ?? 'several'} times in a row — the board stopped retrying`,
        instruction: 'Read the log, fix what keeps failing, then resume it with a note saying what changed.',
        actions: ['resume', 'open', 'log'],
      };
    case 'not-authorised':
      return {
        ...base, id, kind: 'refused', detail,
        headline: 'not dispatched — nobody with permission asked for it, or no agent can claim it',
        instruction: 'Staff an agent that may take this work, or have someone allowed to dispatch it queue it again.',
        actions: ['staff'],
      };
    case 'sub-tasks':
      return {
        ...base, id, kind: 'sub-tasks', detail,
        headline: 'waiting on its sub-tasks',
        instruction: 'Finish or remove its open sub-tasks; it moves on by itself when the last one closes.',
        actions: ['open'],
      };
    case 'question':
      return {
        ...base, id, kind: 'question', detail,
        headline: 'the agent asked a question',
        instruction: 'Answer it on the card; the agent carries on with your answer.',
        actions: ['answer'],
      };
    case 'review':
      return {
        ...base, id, kind: 'review', detail,
        headline: `${base.stageKey} · waiting for your review`,
        instruction: 'Open it, read what was produced, then approve it or request changes.',
        actions: ['review'],
      };
    default:
      return {
        ...base, id, kind: 'blocked', detail,
        headline: 'stopped and is waiting on you',
        instruction: 'Read why it stopped, fix that, then resume it with a note the agent will read.',
        actions: ['resume', 'open', 'log'],
      };
  }
}

function ownerless(base: Base, workspace: boolean): AttentionItem {
  return {
    ...base,
    id: `no-owner:${base.boardId}:${base.cardId}`,
    kind: 'no-owner',
    headline: `nothing claims the ${base.stageName} stage`,
    detail: null,
    instruction: 'No agent works this stage and no review is asked for here, so it will sit forever. Move it to a stage someone works.',
    // The workspace list only opens the card (SP-Workspace-Other: Unowned rows draw Open alone).
    actions: workspace ? ['open'] : ['move', 'open', 'staff'],
  };
}

/** The rows for one board, from its snapshot. `nowMs` is a parameter so the threshold is testable. */
export function itemsFromBoard(board: BoardSnapshot, agents: AgentSummary[], nowMs: number = Date.now()): AttentionItem[] {
  const out: AttentionItem[] = [];
  const boardId = board.boardId ?? '';
  const stale = board.stale ?? { enabled: true, afterHours: 24 };
  // Which cards appear is decided by the contract's one rule, the same one the API's board-list
  // counts use; what each row SAYS is decided below.
  const ctx = {
    stages: board.stages,
    pendingGateCardIds: new Set(board.gates.filter((g) => g.status === 'pending').map((g) => g.cardId)),
    pendingQuestionCardIds: new Set(board.elicitations.filter((e) => e.status === 'pending').map((e) => e.cardId)),
    staleAfterHours: stale.afterHours,
    staleEnabled: stale.enabled,
    nowMs,
  };
  for (const c of board.cards) {
    if (!needsYou(c, ctx)) continue;
    const since = c.stateSince ? Date.parse(c.stateSince) : Number.NaN;
    const ageHours = Number.isNaN(since) ? null : Math.max(0, (nowMs - since) / 3600_000);
    const stage = board.stages.find((s) => s.key === c.currentStageKey);
    const base: Base = {
      boardId, boardName: board.name, cardId: c.id, title: c.title, stageKey: c.currentStageKey,
      stageName: stage?.name ?? c.currentStageKey, stageOrder: stage?.order ?? Number.MAX_SAFE_INTEGER,
      attemptCount: c.attemptCount, ageHours,
    };
    const gate = board.gates.find((g) => g.cardId === c.id && g.status === 'pending');
    const ask = board.elicitations.find((e) => e.cardId === c.id && e.status === 'pending');
    if (gate) {
      out.push({ ...forNeeds(base, 'review', gate.summary ?? null, undefined), headline: `${gate.stageKey} · waiting for your review` });
    } else if (ask) {
      out.push({ ...forNeeds(base, 'question', ask.question || null, undefined), headline: `${displayAgent(ask.agentId, agents)} asked a question` });
    } else if (c.state === 'failed') {
      out.push({ ...base, id: `failed:${boardId}:${c.id}`, kind: 'failed', headline: 'the run failed', detail: null, instruction: 'Open the card to see why it failed.', actions: ['open'] });
    } else if (c.state === 'input-required') {
      out.push(fromCard(base, c));
    } else if (c.overBudget) {
      out.push({ ...base, id: `budget:${boardId}:${c.id}`, kind: 'budget', headline: 'over its budget cap', detail: null, instruction: 'Raise the cap or stop the work.', actions: ['open'] });
    } else if (
      c.state === 'submitted' &&
      stale.enabled &&
      ageHours !== null &&
      ageHours >= stale.afterHours &&
      isOwnerlessStage(board.stages, c.currentStageKey)
    ) {
      out.push(ownerless(base, false));
    }
  }
  return out;
}

function fromCard(base: Base, c: Card): AttentionItem {
  const needs = c.needsHuman;
  if (c.openChildCount > 0 && !needs) return forNeeds(base, 'sub-tasks', null, undefined);
  // A question whose elicitation is gone (its run ended) has nothing left to answer: it is a stop.
  const reason = needs?.reason === 'question' || needs?.reason === 'review' ? 'blocked' : needs?.reason ?? 'blocked';
  return forNeeds(base, reason, needs?.detail ?? null, needs?.failureCount);
}

/**
 * The rows for the workspace list, from `GET /v1/stale?attention=1`. The age is the viewer's: measured
 * from `since` on this clock (the server's `ageHours` is its own clock's), falling back to it.
 * A stopped card offers Resume and Open here; its log is one click further, on the card (SP-Workspace-Other).
 */
export function itemsFromStale(cards: StaleCard[], nowMs: number = Date.now()): AttentionItem[] {
  return cards.map((s) => {
    const since = s.since ? Date.parse(s.since) : Number.NaN;
    const ageHours = Number.isNaN(since) ? s.ageHours : Math.max(0, (nowMs - since) / 3600_000);
    const base: Base = { boardId: s.boardId, boardName: s.boardName, cardId: s.cardId, title: s.title, stageKey: s.stageKey, stageName: s.stageName, ageHours };
    if (s.why.kind === 'no-owner') return ownerless(base, true);
    const detail = s.why.reason === 'review' ? s.summary : (s.why.detail ?? null);
    const item = forNeeds(base, s.why.reason, detail, s.why.failureCount);
    return item.kind === 'blocked' ? { ...item, actions: item.actions.filter((a) => a !== 'log') } : item;
  });
}

/** No-owner rows go last: nobody is waiting on an answer from them, only on a move. */
const sortRank = (i: AttentionItem): number => (i.kind === 'no-owner' ? 1 : 0);

/**
 * The order a list of needs is read in. `stage`: the board's own order (Daylight, Paper, Studio).
 * `urgency`: the card that has burned the most runs first (Quiet's "Most urgent first").
 * Ties: the card waiting longest, then the title. Returns a new array.
 */
export function sortAttention(items: AttentionItem[], mode: 'stage' | 'urgency'): AttentionItem[] {
  return [...items].sort(
    (a, b) =>
      sortRank(a) - sortRank(b) ||
      (mode === 'stage' ? (a.stageOrder ?? 0) - (b.stageOrder ?? 0) : (b.attemptCount ?? 0) - (a.attemptCount ?? 0)) ||
      (b.ageHours ?? -1) - (a.ageHours ?? -1) ||
      a.title.localeCompare(b.title),
  );
}
