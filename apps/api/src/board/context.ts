import type { Env } from '../env';
import type { JsonValue } from '../json';
import type { ReferenceInput } from '../references/input';
import type { ServiceTokenCache } from '../superwitness/client';
import type { AgentActivityInput, BoardUsage, CardNeedsHuman, CardView, DecisionDeadline, DecisionKind, LinkInput, LinkView, Result, Row, RunAuth, RunReportDrainResult, StageDef, StaleSettings } from './model';
import type { ApprovalSubjectView, BoardSnapshot, CommentView, ElicitationView, GateView, PreparedApproval, ReferenceView, RunEvidence } from './views';

/**
 * The board as its modules see it: storage, environment, clock, and the operations one module
 * calls on another. Each module takes a `Pick` of this naming only what it uses; the Durable
 * Object builds the one value (`wiring.ts`).
 */
export interface BoardContext {
  readonly sql: SqlStorage;
  readonly ctx: DurableObjectState;
  readonly env: Env;
  /** The run reporter's hub token, in memory only (ruling R14). */
  readonly reporterToken: ServiceTokenCache;
  /** One drain at a time: the alarm and the cron backstop can both ask. */
  reportDrain: Promise<RunReportDrainResult> | null;
  addComment(input: { cardId: string; author: CommentView['author']; body: string }): Promise<Result<CommentView>>;
  addLink(input: LinkInput): Promise<Result<LinkView>>;
  addReference(input: ReferenceInput): Promise<Result<ReferenceView>>;
  advanceCard(cardId: string, fromStageKey: string, producedBy: string, handoffJson: string | null, runId: string | null, approvalSubject?: PreparedApproval | null): void;
  allCards(): CardView[];
  allReferences(): ReferenceView[];
  approvalSubjectView(id: string): ApprovalSubjectView | null;
  authorizeRun(input: { runId: string; leaseEpoch: number; agentId?: string | null }): RunAuth;
  backfillArchivedReviews(): { cancelled: number };
  backfillDueDates(): Promise<{ migrated: number }>;
  backfillLabelNames(): Promise<{ migrated: number }>;
  backfillTerminalStageCards(): Promise<{ completed: number }>;
  blockersOf(cardId: string): Array<{ cardId: string; title: string }>;
  boardOverBudget(): boolean;
  boardUsage(): BoardUsage;
  budgetCap(key: 'budgetBoardUsdCap' | 'budgetCardUsdCap'): number | null;
  cancelElicitationsForCard(cardId: string): void;
  cancelElicitationsForRun(runId: string): void;
  cancelPendingReviews(cardId: string, now: string): number;
  cardCost(cardId: string): number;
  childrenCost(cardId: string): number;
  claimableWhere(placeholders: string): string;
  commentsForRunContext(cardId: string): { comments: CommentView[]; commentsOmitted: number };
  completesOnArrival(stage: StageDef): boolean;
  countInStage(stageKey: string): number;
  createCard(input: {
      /** What the queuer was permitted to dispatch, as granted at this moment. */
      queuedGrant?: string[] | null;
      /** Whose grant `queuedGrant` is; recorded as `CardView.queuedGrantOwner`. */
      queuedGrantOwner?: string | null;
      /**
       * The principal who dispatched this card, when it is not the owner.
       *
       * Defaults to `ownerUserId`, which is what it has always been: a person creating a card is
       * both answerable for it and the authority behind it. An agent-queued card is the case where
       * the two come apart — the human owns it, the agent's principal authorised it — and the
       * control pair checks THIS value at claim time, so conflating them would check the wrong one.
       */
      queuedBy?: string | null;
      /** The agent that queued it, if an agent did. See `CardView.queuedByAgentId`. */
      queuedByAgentId?: string | null;
      title: string;
      ownerUserId: string;
      spec?: JsonValue;
      priority?: number;
      /**
       * Set at creation rather than requiring create-then-patch: a second round trip means a
       * failure between the two silently drops the due date. Validated at the route (same rule as
       * `PATCH /cards/:id`'s `dueAt`), so this DO trusts a bare `YYYY-MM-DD` string.
       */
      dueAt?: string;
      /**
       * NOT part of the public `createCard` surface (`BoardStub`'s own `createCard` doesn't carry
       * it) — `createChildCard` is the one internal caller, passing the parent's `projectId` along
       * (see that method's comment). A generic `POST /cards` taking `projectId` directly is Task
       * 21's, parked deliberately rather than added here.
       */
      projectId?: string | null;
      /** The stage to start in; the first stage when absent. Must be one of the board's stage keys. */
      stageKey?: string;
      /** Label ids to attach at creation. The route has already checked they are the workspace's. */
      labels?: string[];
    }): Promise<Result<CardView>>;
  createCardFromTrigger(input: {
      title: string;
      ownerUserId: string;
      spec?: JsonValue;
      /**
       * The authority the caller carried, when there was a caller. A live human on
       * `POST /v1/boards/:id/triggers` has one; a GitHub webhook does not, and
       * falls back to the board's standing grant below.
       */
      queuedGrant?: string[] | null;
      source?: { url: string; provider?: string; sourceType?: string; externalId?: string; title?: string; metadata?: JsonValue };
    }): Promise<Result<{ card: CardView; reference: ReferenceView | null; referenceError?: string }>>;
  createChildCard(parentCardId: string, input: { title: string; ownerUserId: string; spec?: JsonValue; priority?: number }): Promise<Result<CardView>>;
  /** A waiting decision's deadlines as a body's `deadline` field (decision-timeouts.ts). */
  decisionDeadline(kind: DecisionKind, decisionId: string): { deadline?: DecisionDeadline };
  createGate(cardId: string, stageKey: string, returnStageKey: string, producedBy: string, runId: string | null, approvalSubject?: PreparedApproval | null): string;
  denyForeignRun(run: Row, agentId: string | null | undefined): { ok: false; code: 'NOT_RUN_OWNER'; message: string } | null;
  elicitationsForRun(runId: string): ElicitationView[];
  emit(type: string, payload: Record<string, unknown>): void;
  endLapsedDeliveries(nowIso: string): number;
  endAttempt(cardId: string, event: string, reason: string | null, runId?: string): void;
  endReviewsOfArchivedCard(cardId: string): number;
  expireGate(gateId: string): boolean;
  expireLapsedGates(nowIso: string): number;
  sweepDecisionTimeouts(nowIso: string): { reminded: number; escalated: number };
  fireDueSchedules(nowIso: string): Promise<{ fired: string[]; skipped: string[] }>;
  gatesForCard(cardId: string): GateView[];
  getCard(id: string): CardView | null;
  getCardHandoffJson(cardId: string): string | null;
  getCardRow(id: string): Row | null;
  getMeta(k: string): string | null;
  getRunEvidence(runId: string): Promise<Result<RunEvidence>>;
  getRunRow(runId: string): Row | null;
  invalidateApprovalSubject(cardId: string, reason: string, invalidatedBy: string | null): void;
  isAgentClaimable(stage: StageDef): boolean;
  isHeldBack(cardId: string): boolean;
  listComments(cardId: string): Promise<Result<CommentView[]>>;
  moveCard(cardId: string, toStageKey: string, actorUserId?: string, queuedGrant?: string[] | null, queuedByAgentId?: string | null, queuedGrantOwner?: string | null): Promise<Result<CardView>>;
  mustGetCard(id: string): CardView;
  mustGetReference(id: string): ReferenceView;
  notify(kind: string, cardId: string, body: string): void;
  notifyDependents(cardId: string): void;
  notifyWorkAvailable(cardId: string): void;
  now(): string;
  nowMs(): number;
  openChildCount(cardId: string): number;
  openChildren(cardId: string): { id: string; title: string }[];
  openElicitation(input: AgentActivityInput, run: Row, cardId: string, now: string): string;
  parentIdOf(cardId: string): string | null;
  parkForHuman(cardId: string, needs: CardNeedsHuman, releaseRun?: boolean): void;
  parseHandoff(raw: string | null): JsonValue | null;
  pendingElicitations(): ElicitationView[];
  pendingGates(): GateView[];
  prepareApprovalSubject(card: CardView, stage: StageDef, handoff: JsonValue | undefined, runId: string, producedBy: string): Promise<Result<PreparedApproval>>;
  reportRun(runId: string): void;
  resolveCard(cardId: string, handoffJson: string | null, stageKey?: string): void;
  resumeParentAdvanceIfFree(parentId: string): void;
  reworkOrPark(cardId: string, stageKey: string, runId: string, reason: string, refusedHandoff: JsonValue | undefined): void;
  rowToCard(row: Row, pre?: {
        costUsd: number;
        attemptCount: number;
        lastAgentId: string | null;
        parentCardId: string | null;
        openChildCount: number;
        childrenCost: number;
        blockedBy: Array<{ cardId: string; title: string }>;
      }): CardView;
  rowToReference(row: Row): ReferenceView;
  runJudgedByGate(gate: Row): string | null;
  scheduleReclaim(): Promise<void>;
  setMeta(k: string, v: string): void;
  setNeedsHuman(cardId: string, needs: CardNeedsHuman | null): void;
  /** Whether a subject's binding has expired (`timing.expiresAt`), by `nowIso` or now. */
  subjectExpired(subjectId: string, nowIso?: string): boolean;
  /** Record a decision that just started waiting, its clock starting now; returns its `deadline` field. */
  startDecisionWait(wait: { kind: DecisionKind; decisionId: string; cardId: string; stageKey: string }): { deadline?: DecisionDeadline };
  snapshot(): BoardSnapshot;
  stages(): StageDef[];
  staleSettings(): StaleSettings;
  triggerGrant(): string[] | null;
  unresolvedBlockerCount(cardId: string): number;
  updateCard(cardId: string, patch: {
        title?: string;
        spec?: JsonValue;
        priority?: number;
        ownerUserId?: string;
        labels?: string[];
        dueAt?: string | null;
        archivedAt?: string | null;
        projectId?: string | null;
        milestoneId?: string | null;
        /**
         * A precondition, not a field: the card's `updatedAt` as the caller last read it. When
         * present and the card has moved on since, nothing is written and `CARD_CHANGED` comes back.
         * A read-modify-write (`supi edit-card --merge-spec`) sends it so it cannot overwrite an edit
         * it never saw. Absent, the patch applies as it always has.
         */
        expectedUpdatedAt?: string | null;
      }): Promise<Result<CardView>>;
  writeComment(cardId: string, author: CommentView['author'], body: string): CommentView;
}

/** The arguments of a board operation after the board it runs on. */
export type OpArgs<F> = F extends (b: never, ...args: infer A) => unknown ? A : never;
