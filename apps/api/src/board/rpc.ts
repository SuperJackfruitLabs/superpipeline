import type { GateDecision, TaskState } from '@superpipeline/contract';
import type { JsonValue } from '../json';
import type { PushSender } from '../push/deliver';
import type { ReferenceInput } from '../references/input';
import type { LinkKind } from './links';
import type { AgentActivityInput, BoardEvent, BoardInit, CardView, ClaimResult, CompleteVerbInput, DecisionTimeout, EstimateView, LinkInput, LinkView, NotificationView, ProfileInput, ProfileView, PushConfigInput, PushDeliveryView, Result, RunReportDrainResult, RunReportOutboxRow, RunVerbInput, ScheduleView, StageDef, StageEditor, StagePatch, StaleCardView, StaleSettings, UsageSummary } from './model';
import type { FixtureBoard } from './fixture-types';
import type { StrictDecision } from './strict-decision';
import type { ActivityView, ApprovalRequestView, ApprovalSubjectVerification, AttentionPendingBody, AttemptView, BoardSnapshot, CommentView, DeliveryPendingBody, ElicitationPendingBody, ElicitationView, EvidenceReferenceInput, GatePendingBody, GateView, ReferenceView, RunContext, RunEvidence, RunEvidenceV1 } from './views';

/**
 * The Board Durable Object as its callers see it.
 */

/** The Board DO's RPC surface as the Worker calls it — hand-typed to avoid deep RPC type instantiation. */
export interface BoardStub {
  /** How many live cards the board holds and how many of them need a person now. */
  summaryCounts(): Promise<{ cardCount: number; needsYouCount: number }>;
  /** Cards each agent holds on this board right now, and of those how many it works now. */
  agentLoad(): Promise<Record<string, { claimed: number; working: number }>>;
  /** Dev only (FIXTURE_IMPORT): replace this board's rows with a fixture. src/dev/fixture.ts. */
  importFixture(board: FixtureBoard): Promise<
    { ok: true; cards: number } | { ok: false; code: 'FIXTURE_IMPORT_DISABLED' | 'UNKNOWN_COLUMN'; detail?: string }
  >;
  drainRunReports(): Promise<RunReportDrainResult>;
  enqueueAllRunReports(): Promise<Result<{ enqueued: number; pending: number; dead: number }>>;
  init(board: BoardInit): Promise<BoardSnapshot>;
  createCard(input: {
    /** What the queuer was permitted to dispatch, as granted at this moment. */
    queuedGrant?: string[] | null;
    /** Whose grant `queuedGrant` is. */
    queuedGrantOwner?: string | null;
    /** The principal who dispatched it, when that is not the owner (the agent case). */
    queuedBy?: string | null;
    /** The agent that queued it, if an agent did. */
    queuedByAgentId?: string | null;
    title: string;
    ownerUserId: string;
    spec?: JsonValue;
    priority?: number;
    dueAt?: string;
    projectId?: string | null;
    stageKey?: string;
    labels?: string[];
  }): Promise<Result<CardView>>;
  /** Split a card into a sub-task: a claimable card of its own, linked back with a `parent` edge. */
  createChildCard(
    parentCardId: string,
    input: { title: string; ownerUserId: string; spec?: JsonValue; priority?: number },
  ): Promise<Result<CardView>>;
  /**
   * Split a card into several children at once, one per (non-blank) line — the agent-facing
   * decomposition tool (Task 15, spec §3.4). `actorUserId` becomes each child's `ownerUserId`.
   *
   * `agentId`, when supplied, must be the agent whose run currently holds `cardId`
   * (`CardView.delegateAgentId`) or the call refuses `NOT_RUN_OWNER` — "the card you are working
   * on" enforced, not just described. Omitted (`undefined`/`null`) for the human/REST path, which
   * has no run to check against.
   */
  splitCard(cardId: string, titles: string[], actorUserId: string, agentId?: string | null): Promise<Result<{ children: CardView[] }>>;
  moveCard(
    cardId: string,
    toStageKey: string,
    actorUserId?: string,
    /** What the mover was permitted to dispatch, recorded with the card. */
    queuedGrant?: string[] | null,
    /**
     * The AGENT doing the moving, when one is. A move re-queues the card, so the pair
     * `queued_by`/`queued_by_agent_id` must move together here exactly as on a create — otherwise a
     * card an agent re-queued reads as the operator's, or one a HUMAN re-queued keeps crediting the
     * agent that queued it first.
     */
    queuedByAgentId?: string | null,
    /** Whose grant `queuedGrant` is. */
    queuedGrantOwner?: string | null,
  ): Promise<Result<CardView>>;
  /** One card, in the same projection the board snapshot carries. */
  getCardView(cardId: string): Promise<Result<CardView>>;
  updateCard(
    cardId: string,
    patch: {
      title?: string;
      spec?: JsonValue;
      priority?: number;
      ownerUserId?: string;
      labels?: string[];
      dueAt?: string | null;
      archivedAt?: string | null;
      /** Cross-board project/milestone membership (Task 19). `null` clears it. */
      projectId?: string | null;
      milestoneId?: string | null;
      /** A precondition: the card's `updatedAt` as last read; a mismatch refuses `CARD_CHANGED`. */
      expectedUpdatedAt?: string | null;
    },
  ): Promise<Result<CardView>>;
  deleteCard(cardId: string): Promise<Result<{ ok: true }>>;
  setName(name: string): Promise<Result<{ ok: true }>>;
  setStages(stages: StageDef[], editor: StageEditor): Promise<Result<{ stages: StageDef[] }>>;
  updateStage(stageKey: string, patch: StagePatch, editor: StageEditor): Promise<Result<{ stage: StageDef }>>;
  destroy(): Promise<{ ok: true }>;
  getState(): Promise<BoardSnapshot>;
  getEvents(limit?: number): Promise<BoardEvent[]>;
  // Agent contract (docs/04 §3)
  claim(input: { agentId: string; capabilities: string[]; maxConcurrency?: number; profileKey?: string; principalId?: string | null }): Promise<ClaimResult>;
  setProfile(input: ProfileInput): Promise<Result<{ key: string }>>;
  getProfiles(): Promise<ProfileView[]>;
  heartbeat(input: RunVerbInput): Promise<Result<{ acknowledged: true }>>;
  postActivity(input: AgentActivityInput): Promise<Result<{ accepted: true; cardState: TaskState; elicitationId?: string; strictDecision?: StrictDecision }>>;
  complete(input: CompleteVerbInput): Promise<Result<CardView>>;
  block(input: RunVerbInput & { reason: string; summary?: string }): Promise<Result<CardView>>;
  fail(input: RunVerbInput & { reason: string }): Promise<Result<CardView>>;
  release(input: RunVerbInput & { reason?: string }): Promise<Result<CardView>>;
  submitForReview(input: RunVerbInput & { output?: JsonValue }): Promise<Result<CardView>>;
  addReference(input: ReferenceInput): Promise<Result<ReferenceView>>;
  addRunReference(input: RunVerbInput & { reference: ReferenceInput }): Promise<Result<ReferenceView>>;
  /** Dependencies and sub-task containment (spec §3.4) — one table, told apart by `kind`. */
  addLink(input: LinkInput): Promise<Result<LinkView>>;
  removeLink(fromCardId: string, toCardId: string, kind: LinkKind): Promise<Result<{ ok: true }>>;
  listLinks(cardId: string): Promise<LinkView[]>;
  setBudget(input: { boardUsdCap?: number | null; cardUsdCap?: number | null }): Promise<Result<{ ok: true }>>;
  getUsage(opts?: { window?: string }): Promise<UsageSummary>;
  /**
   * This board's slice of one project's rollup (Task 19) — the one fan-out in this design.
   * `computeRollup` (`db/projects.ts`) calls this on every board a tenant has and sums the
   * results; it is never consulted by the claim path, the advance path, or any refusal.
   * `{ ok: false }` when the board has no `boardId` meta, i.e. its DO was never initialized — see
   * the implementation's own comment for why that is a `Result` rather than a thrown exception.
   * `computeRollup` turns either that or a genuinely thrown error into `partial: true` plus an
   * unanswered-board count, never a confident wrong total.
   */
  projectSummary(projectId: string): Promise<Result<{ total: number; done: number; overdue: number; costUsd: number }>>;
  getAttempts(cardId: string): Promise<AttemptView[]>;
  getRunContext(input: { runId: string; agentId?: string | null }): Promise<Result<RunContext>>;
  /** A card's comments, oldest first, deleted ones as tombstones. */
  listComments(cardId: string): Promise<Result<CommentView[]>>;
  /**
   * Post a comment. An `agent` author must hold a live (`working`) run on the card, or the call
   * refuses `NO_RUN_ON_CARD`: an agent talks on the card it is working, and nowhere else.
   */
  addComment(input: { cardId: string; author: CommentView['author']; body: string }): Promise<Result<CommentView>>;
  /** Return a card waiting on a person to its stage (or an earlier one) with a comment — see the method. */
  resumeCard(input: {
    cardId: string;
    comment: string;
    toStageKey?: string;
    actor: { id: string; name: string | null };
    queuedGrant?: string[] | null;
    queuedGrantOwner?: string | null;
    expectedWaitId?: string;
  }): Promise<Result<{ card: CardView; comment: CommentView }>>;
  /** Archive a card as a person, optionally only while it is still in the wait named. See the method. */
  archiveCard(input: {
    cardId: string;
    actor: { id: string; name: string | null };
    expectedWaitId?: string;
    comment?: string;
  }): Promise<Result<{ card: CardView; comment: CommentView | null }>>;
  /** Tombstone a comment. Only its human author may; an agent's comment is never deleted. */
  deleteComment(input: { cardId: string; commentId: string; userId: string }): Promise<Result<CommentView>>;
  /** The comments on the card a run holds, for that run's agent (the MCP list tool). */
  listRunComments(input: { runId: string; agentId: string | null }): Promise<Result<CommentView[]>>;
  /** Post as the agent holding `runId`, on that run's card (the MCP post tool). */
  addRunComment(input: { runId: string; agentId: string; agentName: string | null; body: string }): Promise<Result<CommentView>>;
  verifyApprovalSubject(input: {
    runId: string;
    leaseEpoch: number;
    agentId?: string | null;
    expectedSchema: string;
    expectedSubjectId: string;
    expectedDigest: string;
    expectedAccount: JsonValue;
  }): Promise<Result<ApprovalSubjectVerification>>;
  confirmApprovalSubject(input: { subjectId: string; expectedDigest: string }): Promise<Result<{
    approved: boolean;
    deliveryMode: string;
    subjectId: string;
    digest: string;
    gateId: string;
  }>>;

  /** A run as evidence for superwitness (contract C4). `NOT_INITIALIZED` means no such board here. */
  getRunEvidence(runId: string): Promise<Result<RunEvidence>>;
  getRunEvidenceV1(runId: string): Promise<Result<RunEvidenceV1>>;
  attachEvidenceReference(input: EvidenceReferenceInput): Promise<Result<ReferenceView>>;
  countReadyForCapabilities(agentId: string, capabilities: string[]): Promise<number>;
  /** One gate, including how it was decided. See `getGate`. */
  getGate(gateId: string): Promise<Result<GateView>>;
  getCardActivities(cardId: string): Promise<{ activities: ActivityView[]; handoff: JsonValue | null; gates: GateView[] }>;
  getEvents(limit?: number): Promise<BoardEvent[]>;
  estimateCardCost(cardId: string): Promise<Result<EstimateView>>;
  getNotifications(opts?: { unreadOnly?: boolean; userId?: string }): Promise<NotificationView[]>;
  markNotificationRead(seq: number): Promise<Result<{ ok: true }>>;
  registerPushConfig(input: PushConfigInput): Promise<Result<{ configId: string }>>;
  getPushDeliveries(opts?: { status?: string }): Promise<PushDeliveryView[]>;
  pendingGateDeliveries(): Promise<GatePendingBody[]>;
  /** `approvalRequests: true` adds broker approval requests: for a person or the decision carrier only. */
  pendingElicitationDeliveries(opts?: { approvalRequests?: boolean }): Promise<ElicitationPendingBody[]>;
  /** Cards waiting on a person for a reason chat carries, in the `attention.pending` body. */
  pendingAttention(): Promise<AttentionPendingBody[]>;
  /** A broker's approval request (charter: waiting cards and broker approvals reach chat §3). */
  createApprovalRequest(input: { requestedBy: string; body: unknown }): Promise<Result<{ created: boolean; approvalRequest: ApprovalRequestView }>>;
  getApprovalRequest(approvalRequestId: string): Promise<Result<ApprovalRequestView>>;
  answerApprovalRequest(input: {
    approvalRequestId: string;
    decider: { id: string; principalId: string; label: string };
    answererRole?: 'owner' | 'admin' | 'member' | 'viewer' | null;
    option?: string;
    subject?: { id: string; digest: string };
  }): Promise<Result<{ approvalRequest: ApprovalRequestView }>>;
  /** Manual deliveries still owed their live link, in the `delivery.pending` body. */
  pendingDeliveryFollowUps(): Promise<DeliveryPendingBody[]>;
  dispatchPushDeliveries(sender?: PushSender, opts?: { timeoutMs?: number }): Promise<{ sent: number; failed: number }>;
  getRunReportOutbox(): Promise<RunReportOutboxRow[]>;
  sweepBoard(nowIso: string): Promise<{ overdueNotified: number; schedulesFired: number; staleNotified: number; gatesExpired: number; deliveriesExpired: number; decisionsReminded: number; decisionsEscalated: number }>;
  /** Cards waiting past the threshold — the board's own unless `afterHours` is given. See `StaleCardView`. */
  staleCards(input: { nowIso: string; afterHours?: number; attention?: boolean }): Promise<StaleCardView[]>;
  setStaleSettings(input: { enabled?: boolean; afterHours?: number }): Promise<Result<StaleSettings>>;
  setDecisionTimeout(value: unknown): Promise<Result<{ decisionTimeout: DecisionTimeout | null }>>;
  createSchedule(input: {
    title: string;
    rule: string;
    timezone: string;
    overlap: 'skip' | 'allow';
    createdBy: string;
    spec?: JsonValue;
    priority?: number;
    labels?: string[];
    stageKey?: string | null;
    enabled?: boolean;
    /** What the creator was permitted to dispatch, captured at the moment of the act. */
    queuedGrant?: string[] | null;
  }): Promise<Result<ScheduleView>>;
  updateSchedule(
    id: string,
    patch: {
      title?: string;
      rule?: string;
      timezone?: string;
      overlap?: 'skip' | 'allow';
      spec?: JsonValue;
      priority?: number;
      labels?: string[];
      stageKey?: string | null;
      enabled?: boolean;
    },
  ): Promise<Result<ScheduleView>>;
  deleteSchedule(id: string): Promise<Result<{ id: string }>>;
  listSchedules(): Promise<ScheduleView[]>;
  setGithubSecret(secret: string): Promise<Result<{ configured: true }>>;
  setForgeSecret(secret: string): Promise<Result<{ configured: true }>>;
  handleForgeWebhook(input: {
    rawBody: string;
    signature: string | null;
    deliveryId: string | null;
    event: string;
  }): Promise<Result<{ deduped: boolean; matched: number; modeled: boolean }>>;
  setGithubConfig(input: { secret?: string; issueTrigger?: boolean; triggerGrant?: string[] | null }): Promise<Result<{ ok: true }>>;
  createCardFromTrigger(input: {
    title: string;
    ownerUserId: string;
    spec?: JsonValue;
    queuedGrant?: string[] | null;
    source?: { url: string; provider?: string; sourceType?: string; externalId?: string; title?: string; metadata?: JsonValue };
  }): Promise<Result<{ card: CardView; reference: ReferenceView | null; referenceError?: string }>>;
  handleGithubWebhook(input: {
    rawBody: string;
    signature: string | null;
    deliveryId: string | null;
    event: string;
  }): Promise<Result<{ deduped: boolean; matched: number; modeled: boolean }>>;
  resolveGate(input: {
    gateId: string;
    decision: GateDecision;
    decidedBy: string;
    comment?: string;
    approvalSubjectId?: string;
    approvalSubjectDigest?: string;
    /** The surface the decision came through; recorded so a later conflict can say where. */
    via?: 'matrix' | 'web' | 'api';
  }): Promise<Result<CardView>>;
  updateApprovalDelivery(input: {
    gateId: string;
    actor: string;
    mode?: 'manual' | 'automatic';
    liveUrl?: string;
    remindAt?: string;
  }): Promise<Result<CardView & { delivery: NonNullable<GateView['delivery']> }>>;
  recordAutomaticDelivery(input: {
    gateId: string;
    subjectId: string;
    expectedDigest: string;
    actor: string;
    liveUrl: string;
  }): Promise<Result<{ deliveryMode: 'automatic'; gateId: string; subjectId: string; digest: string; liveUrl: string }>>;
  answerElicitation(input: {
    elicitationId: string;
    answeredBy: string;
    answererRole?: 'owner' | 'admin' | 'member' | 'viewer' | null;
    option?: string;
    text?: string;
    subject?: { id: string; digest: string };
  }): Promise<Result<{ card: CardView; elicitation: ElicitationView }>>;
  fetch(request: Request): Promise<Response>;
}
