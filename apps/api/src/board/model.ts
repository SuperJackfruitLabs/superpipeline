import type { CompletionRequirement, StageOutcome, TaskState } from '@superpipeline/contract';
import type { JsonValue } from '../json';
import type { RunReportDraft } from '../superwitness/report';
import type { LinkKind } from './links';
import type { StrictDecision } from './strict-decision';

/**
 * The board's core shapes: stages, cards, runs, verbs and their results.
 */

/** A pipeline stage (board column). `ownerKind`/`owner` drive agent claim routing (docs/01, docs/04). */
/**
 * The longest a stage's standing rule may be, matching `Stage.instructions` in
 * `@superpipeline/contract`. A rule is a few lines an agent reads every time; past this it is
 * a document, and a document belongs in a card reference where it can be read once.
 */
/**
 * A change to ONE stage. Absent means "leave it"; `null` on `instructions` means "remove it".
 *
 * `key` and `order` are deliberately not patchable. A key is the stage's identity — every card
 * refers to it — and reordering one stage is a statement about all of them, so both remain
 * whole-pipeline work where their consequences are visible.
 */
/** Who counts toward a quorum: the stage's deciders (the default), or the workspace's owners and admins. */
export type QuorumFrom = 'deciders' | 'admins';

/**
 * A stage's quorum as a client may write it (charter 2026-11-09, more than one approver): `from`
 * defaults to `deciders`. Judged and stored by gate-quorum.ts.
 */
export interface QuorumInput {
  required: number;
  from?: QuorumFrom;
}

export interface StagePatch {
  name?: string;
  owner?: string;
  ownerKind?: 'capability' | 'agent' | 'human';
  requires?: { all?: string[]; any?: string[] } | null;
  gate?: 'none' | 'approval';
  wipLimit?: number | null;
  instructions?: string | null;
  /** `null` removes it. */
  summary?: string | null;
  completion?: CompletionRequirement | null;
  /** `null` removes it — the stage stops judging. */
  returnStage?: string | null;
  /** `null` removes it: the stage falls back to the board's default, or none. */
  timeout?: DecisionTimeout | null;
  /** `null` removes it: a gate here passes on one approval again. */
  quorum?: QuorumInput | null;
  /** `null` removes it: an approval here acts at once again. */
  holdFor?: number | null;
}

/**
 * How long a decision waits on a stage before it is reminded about, then escalated (charter:
 * unanswered decisions remind, then escalate, decision 1). Whole minutes, each optional, escalate
 * later than remind, at most 30 days (`timeoutError` in decision-timeouts.ts).
 */
export interface DecisionTimeout {
  remindAfterMinutes?: number;
  escalateAfterMinutes?: number;
}

/** What a timed wait is: a gate, a question, a manual delivery or a waiting card. */
export type DecisionKind = 'gate' | 'question' | 'delivery' | 'attention';

/** When a waiting decision is reminded about and escalated (ISO), as the pushes and reads carry it. */
export interface DecisionDeadline {
  remindAt?: string;
  escalateAt?: string;
}

/**
 * Who is changing the stages, as far as decision policy goes (charter: unanswered decisions remind,
 * then escalate, decision 6). Required on every stage write, so a caller that forgets it fails to
 * compile rather than skipping the check:
 * - `person`: the route judged the caller by the Accounts workspace role (`isWorkspaceAdmin`);
 * - `internal`: a trusted caller acting for nobody (a test, a migration), which says why.
 */
export type StageEditor =
  | { kind: 'person'; mayChangeDecisionPolicy: boolean }
  | { kind: 'internal'; mayChangeDecisionPolicy: true; reason: string };

/** The editor a trusted internal caller passes, naming why it may change decision policy. */
export function internalStageEditor(reason: string): StageEditor {
  return { kind: 'internal', mayChangeDecisionPolicy: true, reason };
}

export interface StageDef {
  key: string;
  name: string;
  order: number;
  ownerKind?: 'capability' | 'agent' | 'human';
  owner?: string; // a capability tag (ownerKind=capability) or an agentId (ownerKind=agent)
  /**
   * A multi-capability requirement for a capability lane: `all` every member, `any` at least one.
   * Wins over `owner` when present. A sibling field rather than a union on `owner` because
   * SQLite's `json_each` raises on a scalar, so widening `owner` would break `boardCount` on
   * every stage that already exists (see `StageRequirement` in @superpipeline/contract).
   */
  requires?: { all?: string[]; any?: string[] };
  gate?: 'none' | 'approval';
  /** Opts this human gate into immutable, digest-bound approval subjects. */
  approvalSubjectSchema?: string;
  /** Human principals allowed to decide a bound approval subject. */
  approvalDeciderPrincipalIds?: string[];
  wipLimit?: number;
  /**
   * What a run must produce here before the board believes it finished
   * (`evaluateCompletion` in @superpipeline/contract). Absent means "anything", which is how
   * every stage behaved before this existed.
   */
  completion?: CompletionRequirement;
  /**
   * Where a run's `outcome: 'changes-needed'` sends the card — an earlier stage's key
   * (`returnStageError` in @superpipeline/contract). Declaring it makes this a judging stage: a
   * completion here must say `pass` or `changes-needed`, and silence is refused. Absent, the stage
   * behaves exactly as it did before outcomes existed.
   */
  returnStage?: string;
  /**
   * The stage's standing rule, handed to the agent in its prompt. A stage's, never a card's:
   * it governs every card that reaches the stage and every agent that can claim it.
   *
   * It reached agents before this line existed, because `setStages` stores whatever it is
   * given and `stages()` parses it straight back. Declared so that stays true on purpose.
   */
  instructions?: string;
  /** One line saying what happens in this stage, printed on an empty board. Optional. */
  summary?: string;
  /** Stage routing strategy (docs/05 §7): `pipeline` (sequential handoff, default) vs `manager`. */
  routing?: 'pipeline' | 'manager';
  /** When a decision waiting here is reminded about and escalated. Absent: the board's default, or none. */
  timeout?: DecisionTimeout;
  /** How many approvals a gate here needs, and from whom (`quorumError` in gate-quorum.ts). Absent: one. */
  quorum?: QuorumInput;
  /**
   * Minutes an approval here waits before it acts (charter 2026-11-09, an approval may wait for
   * its release time): a whole number from 5 to 10080 (`holdForError` in gate-release.ts). Absent: none.
   */
  holdFor?: number;
}

/** A reusable agent configuration bundle (docs/05 §7). */
export interface ProfileInput {
  key: string;
  name?: string;
  harness?: string;
  model?: string;
  permissionPolicy?: string;
  autonomyLevel?: string;
  capabilities?: string[];
}

export interface ProfileView {
  key: string;
  name: string | null;
  harness: string | null;
  model: string | null;
  permissionPolicy: string | null;
  autonomyLevel: string | null;
  capabilities: string[];
}

export interface BoardInit {
  id: string;
  tenantId: string;
  name: string;
  stages: StageDef[];
  /** The board's introduction: what it does and what to type into the compose box. */
  intro?: { lede: string; composeHint: string };
}

/**
 * Why a card is waiting on a person.
 *
 * `reason` is the discriminator and the only field a reader must handle; the rest are
 * there so the board can say something useful instead of "needs you".
 */
export interface CardNeedsHuman {
  /**
   * Every way a card comes to rest on a person.
   *
   * Five places write `state = 'input-required'` and each one knows why; the first cut
   * of this carried two of them, so a card blocked by its own agent went on reporting
   * the question that block had just cancelled. A card that stops without a reason is
   * one somebody has to reverse engineer from the activity log.
   */
  reason: 'question' | 'repeated-failure' | 'blocked' | 'review' | 'not-authorised';
  /** The question, when there is one to answer. */
  elicitationId?: string;
  /** The run's own words for why it failed. Never summarised. */
  detail?: string;
  /** How many attempts have failed, when the breaker tripped. */
  failureCount?: number;
  /** The agent's one-line version of `detail`, written by the agent when it stops. Never generated here. */
  summary?: string;
}

export interface CardView {
  id: string;
  title: string;
  spec: JsonValue;
  ownerUserId: string;
  /**
   * The principal who last deliberately queued this card — its creator, or
   * whoever moved it into a dispatchable stage. Not the same as `ownerUserId`,
   * and null on a card created before this was recorded.
   *
   * This is what the control pair reads to ask "who may dispatch which agent"
   * at claim time; without it a claim has no principal to check.
   */
  queuedBy: string | null;
  /**
   * The AGENT that queued this card, when one did — superpipeline's own `agt_…`, not a principal.
   *
   * `queuedBy` cannot answer this. It holds one id, a `prn_…` from a plane whose directory lives
   * in another product, and nothing about the string says whether a person or a coordinator wrote
   * it. Null means a human queued it, which is every card that existed before this column.
   *
   * It is stored rather than derived because the derivation would be a join nobody owns: the
   * agent row can be deleted, renamed or unmapped, and the card still has to be able to say who
   * asked for it. An audit trail that forgets is one that credits the operator with work they
   * never requested.
   */
  queuedByAgentId: string | null;
  /** What the queuer was permitted to dispatch, as granted when they queued it. */
  queuedGrant: string[] | null;
  /** Applied label ids; the catalogue lives in D1 (`src/db/labels.ts`). */
  labels: string[];
  /**
   * Cross-board project/milestone membership (D1 catalogue, migration 0013; Task 19). Either may
   * point at a project/milestone this tenant has since deleted — `DELETE /v1/projects/:id` deletes
   * unconditionally, and this DO has no way to be told. That is a normal state, not an error: an
   * unresolved id is treated exactly like an unknown label id, dropped from display and never a
   * refusal here or in the rollup.
   */
  projectId: string | null;
  milestoneId: string | null;
  /** ISO date (no time), or null. */
  dueAt: string | null;
  /**
   * Why this card is waiting on a person, when it is. Absent whenever it is not —
   * so a reader that does nothing with it behaves exactly as it does today.
   */
  needsHuman?: CardNeedsHuman;
  archivedAt: string | null;
  currentStageKey: string;
  state: TaskState;
  delegateAgentId: string | null;
  /** The agent of this card's most recent run, whatever its status; null with no runs. */
  lastAgentId: string | null;
  /** Whose dispatch grant the queuer acted on, recorded when it was queued; null when not recorded. */
  queuedGrantOwner: string | null;
  /** When the card entered its current stage (state changes inside a stage do not move it). */
  stageSince: string;
  /**
   * The run currently holding this card, or null when nobody is working it.
   *
   * On the row since runs existed and never projected. Exposed so a caller that must attribute
   * something to "the run working this card" — an agent attaching evidence mid-run — can do it
   * without being handed a run id it could have made up.
   */
  currentRunId: string | null;
  priority: number;
  contextId: string;
  createdAt: string;
  updatedAt: string | null;
  /** When the card last changed state or stage — how long it has sat where it is. */
  stateSince: string;
  /** Summed agent usage on this card (docs/07 §6); `overBudget` if it exceeds the per-card cap. */
  costUsd: number;
  overBudget: boolean;
  /** Number of runs (attempts) against this card (docs/07 §5). */
  attemptCount: number;
  /**
   * This card's `parent` edge (`card_links`, this card as `to_card_id`), or null if it has none.
   * Task 14.
   */
  parentCardId: string | null;
  /**
   * How many of this card's direct children (the `parent` edge, this card as `from_card_id`) are
   * still unresolved — the same rule `blockedWhere`/`openChildCount` enforce at claim time, surfaced
   * here so a reader (Task 17's UI) can say "waiting on N sub-tasks" without re-deriving it. Task 14.
   */
  openChildCount: number;
  /**
   * `costUsd` plus one level of children's summed cost. Deliberately NOT folded into `costUsd`
   * itself: `costUsd` feeds `overBudget`, the per-card budget gate, and must keep meaning "what
   * this card itself spent". Task 14.
   */
  costUsdRollup: number;
  /**
   * Is this card held back by an unresolved same-board `blocks` edge — the enforced kind?
   *
   * Derived from the SAME `blockedWhere()` fragment the claim query uses (`unresolvedBlockerExists`,
   * Task 17), never from a second expression that means the same thing today. A badge computed
   * independently is a badge that will eventually disagree with the claim query, and the
   * disagreement is invisible: the UI says "Blocked" while `claim_card` hands the card out, or the
   * reverse. This plan has already had one claim/discovery divergence from exactly that cause.
   *
   * An array rather than a boolean because the tooltip has to name the blocker ("Blocked by
   * *Title*"), and a count alone would send the drawer back for another round trip.
   *
   * Only the `blocks` half of `blockedWhere()` — an open child (the `parent` half) is a different
   * fact with a different badge, already carried as `openChildCount`. Cross-board advisory edges
   * (Task 16) are never in here either: they block nothing, and this field name is exactly how a
   * client would end up rendering the enforced badge for an advisory edge.
   */
  blockedBy: Array<{ cardId: string; title: string }>;
}

export type Row = Record<string, SqlStorageValue>;

/** The outcome of the run-verb gate: the run row, or the refusal to hand back (assignable to `Result`). */
export type RunAuth = { ok: true; run: Row } | { ok: false; code: 'NOT_RUN_OWNER' | 'STALE_LEASE'; message: string };

/**
 * Every run verb carries the authenticated agent alongside the lease (docs/04 §1). `agentId` is
 * the principal the edge resolved from the token — never a value the client asserts.
 */
export interface RunVerbInput {
  runId: string;
  leaseEpoch: number;
  agentId?: string | null;
}

/**
 * `complete`, with the kind of finish it is (`StageOutcome` in @superpipeline/contract).
 *
 * Every field past `handoff` is optional and absent on every caller that predates outcomes, which
 * then behaves exactly as before — except on a stage that declares a `returnStage`, where silence
 * is no longer read as a pass.
 */
export interface CompleteVerbInput extends RunVerbInput {
  handoff?: JsonValue;
  outcome?: StageOutcome;
  findings?: string;
  question?: string;
  url?: string;
  options?: JsonValue;
}

/** Typed agent activity (docs/04 §4). `prompt` is human-authored and not posted by agents. */
export type AgentActivityType = 'thought' | 'action' | 'response' | 'elicitation' | 'error';

/** Per-activity token/cost usage reported by an agent (docs/05 §1). */
export interface UsageInput {
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}

export interface AgentActivityInput extends RunVerbInput {
  strictDecision?: StrictDecision;
  type: AgentActivityType;
  ephemeral?: boolean;
  body?: string;
  action?: string;
  parameter?: JsonValue;
  result?: JsonValue;
  signal?: string;
  usage?: UsageInput;
}

/**
 * Business outcomes are returned as values (not thrown). Throwing across the Durable Object RPC
 * boundary surfaces as an unhandled rejection in the runtime (docs/03, docs/08).
 */
export type BoardErrorCode =
  | 'NOT_INITIALIZED'
  | 'WORKSPACE_ADMIN_REQUIRED'
  | 'UNKNOWN_STAGE'
  | 'WIP_LIMIT'
  | 'CARD_NOT_FOUND'
  | 'RUN_NOT_FOUND'
  | 'NOT_RUN_OWNER'
  | 'STALE_LEASE'
  | 'GATE_NOT_FOUND'
  | 'GATE_NOT_PENDING'
  | 'GATE_DECISION_NOT_ALLOWED'
  | 'INVALID_APPROVAL_SUBJECT'
  | 'APPROVAL_DECIDER_NOT_ALLOWED'
  | 'APPROVAL_SUBJECT_MISMATCH'
  | 'APPROVAL_SUBJECT_NOT_VERIFIED'
  | 'APPROVAL_SUBJECT_EXPIRED'
  | 'APPROVAL_DELIVERY_NOT_AVAILABLE'
  | 'APPROVAL_DELIVERY_NOT_MANUAL'
  | 'APPROVAL_DELIVERY_STARTED'
  | 'APPROVAL_DELIVERY_DELIVERED'
  | 'INVALID_APPROVAL_DELIVERY'
  | 'INVALID_LIVE_URL'
  | 'ELICITATION_NOT_FOUND'
  | 'ELICITATION_NOT_PENDING'
  | 'INVALID_ANSWER'
  /** An elicitation's option said a meaning or scope outside the vocabulary, or a subject came without meanings. */
  | 'INVALID_ELICITATION'
  | 'INVALID_STRICT_DECISION'
  | 'DECISION_CONFLICT'
  | 'DECISION_EXPIRED'
  /** The same person approved a quorum gate twice (charter 2026-11-09, more than one approver, decision 3). */
  | 'QUORUM_ALREADY_APPROVED'
  /** An approval is recorded but its release time has not come (charter 2026-11-09, release time, decision 3). */
  | 'APPROVAL_HELD'
  /** A held approval was released, so it can no longer be pulled back (decision 4). */
  | 'APPROVAL_RELEASED'
  /** Pull back named a gate whose approval was never held (decision 4). */
  | 'GATE_NOT_HELD'
  /** The release time would fall after the subject's own expiry: nothing is recorded (decision 5). */
  | 'APPROVAL_RELEASE_AFTER_EXPIRY'
  | 'CARD_NOT_WAITING'
  /** A chat answer named a wait the card is no longer in (charter: waiting cards reach chat §2). */
  | 'WAIT_CHANGED'
  /** A broker approval request's create body is malformed, or its subject already expired. */
  | 'INVALID_APPROVAL_REQUEST'
  /** A broker reused its `requestId` for a different subject or question. */
  | 'REQUEST_ID_CONFLICT'
  | 'APPROVAL_REQUEST_NOT_FOUND'
  | 'SEPARATION_OF_DUTIES'
  | 'INVALID_URL'
  | 'UNKNOWN_EVENT'
  | 'INVALID_SIGNATURE'
  | 'NOT_CONFIGURED'
  | 'INVALID_DELIVERY'
  | 'INVALID_USAGE'
  | 'INVALID_STAGES'
  | 'STAGE_NOT_EMPTY'
  | 'BUDGET_EXCEEDED'
  | 'INVALID_RULE'
  | 'INVALID_TIMEZONE'
  | 'SCHEDULE_NOT_FOUND'
  | 'INVALID_SCHEDULE'
  | 'NO_SUCH_CARD'
  | 'LINK_WOULD_CYCLE'
  | 'ALREADY_HAS_PARENT'
  | 'CARD_BLOCKED'
  | 'TOO_MANY_CHILDREN'
  | 'NOTHING_TO_SPLIT'
  | 'INVALID_COMMENT'
  /** `complete` named an outcome without what it needs (`outcomeInputError`), or no outcome at all. */
  | 'INVALID_OUTCOME'
  | 'COMMENT_NOT_FOUND'
  | 'NOT_COMMENT_AUTHOR'
  | 'NO_RUN_ON_CARD'
  | 'CARD_CHANGED'
  | 'INVALID_RESUME'
  | 'QUESTION_PENDING'
  | 'GATE_PENDING'
  | 'INVALID_STALE_SETTINGS'
  /** A stage's or the board's decision timeout is out of shape (`timeoutError`). */
  | 'INVALID_TIMEOUT';

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; code: BoardErrorCode; message: string; detail?: Record<string, unknown> };

/** The outcome of an agent claim — either work to do, or nothing available (docs/04 §3). */
export type ClaimResult =
  | {
      claimed: true;
      runId: string;
      leaseEpoch: number;
      card: CardView;
      stage: StageDef;
      handoff: JsonValue | null;
      /**
       * Why the LAST attempt at this stage died, when there was one.
       *
       * The agent about to repeat the work was the only party not told. The human got a
       * notification, the event stream got an event, the dead run kept a label — and the retry
       * started from a card indistinguishable from the one the first attempt saw. An agent that
       * knows "the browser could not start last time" can do something different; one that does not
       * walks into the same wall until the circuit breaker parks the card.
       *
       * Scoped to THIS stage. A failure at `audit` tells an agent claiming `audit` something; handed
       * to one claiming `measure` it would read as "your work has already failed once" about work
       * that has not started. Null when the last run here succeeded, or when there was none.
       */
      lastFailure: { reason: string; agentId: string; stageKey: string; endedAt: string } | null;
    }
  | { claimed: false };

/** Per-board stale-card settings. Defaults: on, 24 hours. */
export interface StaleSettings {
  enabled: boolean;
  afterHours: number;
}

/**
 * A card that is waiting and will go on waiting unless somebody acts.
 *
 * `why` is one of: waiting on a person (`needs-human`, with the card's own reason, or one derived
 * for the two parks that predate `needsHuman` — a review gate opened on entry, and a parent held
 * back by open sub-tasks), or sitting in a stage nothing will ever take it from (`no-owner`: not
 * agent-claimable, no approval gate, and not the last stage — which resolves a card on arrival).
 */
export interface StaleCardView {
  boardId: string;
  boardName: string;
  cardId: string;
  title: string;
  ownerUserId: string;
  stageKey: string;
  stageName: string;
  state: TaskState;
  why:
    | { kind: 'needs-human'; reason: CardNeedsHuman['reason'] | 'sub-tasks'; detail?: string; failureCount?: number; elicitationId?: string; gateId?: string }
    | { kind: 'no-owner' };
  /** The readable part of the card's handoff (`handoffSummary`) — what a reviewer is asked to approve. Plain text, never HTML. */
  summary: string | null;
  /** When the card stopped where it is (ISO). */
  since: string;
  ageHours: number;
  /** What a person should do next, in words, with the command when there is one. */
  next: string;
}

/** Board-level cost rollup + budget state (docs/07 §6). */
export interface BoardUsage {
  totalCostUsd: number;
  estimatedCostUsd: number;
  budgetUsd: number | null;
  cardUsdCap: number | null;
  overBudget: boolean;
}

export interface UsageSummary {
  totalCostUsd: number;
  estimatedCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  /** Activities we metered but couldn't price (estimated, $0) — so unpriced spend isn't invisible. */
  unpricedRecords: number;
  byModel: Array<{ model: string; costUsd: number; inputTokens: number; outputTokens: number }>;
  byAgent: Array<{ agentId: string; costUsd: number }>;
  byCard: Array<{ cardId: string; costUsd: number }>;
  /** The last seven UTC days, oldest first, zero-filled — whatever window the other totals use. */
  byDay: Array<{ day: string; costUsd: number }>;
}

export interface BoardEvent {
  seq: number;
  type: string;
  payload: JsonValue;
  ts: string;
}

/** A pre-run cost estimate for a card's current stage, from historical runs (docs/07 §6). */
export interface EstimateView {
  stageKey: string;
  estimatedUsd: number | null;
  sampleSize: number;
}

/** A registered push subscription (A2A PushNotificationConfig, docs/05 §4). */
export interface PushConfigInput {
  agentId: string;
  url: string;
  token: string;
  capabilities?: string[];
  events?: string[];
}

export interface PushDeliveryView {
  id: number;
  configId: string;
  url: string;
  body: string;
  status: string;
  attempts: number;
}

/** An in-app notification for a notify-worthy status transition (docs/07 §7). */
export interface NotificationView {
  seq: number;
  kind: string;
  cardId: string;
  userId: string | null;
  body: string;
  read: boolean;
  createdAt: string;
}

/** A recurring card, and the cadence that fires it (spec §3.7). */
export interface ScheduleView {
  id: string;
  enabled: boolean;
  title: string;
  spec: JsonValue;
  priority: number;
  labels: string[];
  stageKey: string | null;
  rule: string;
  timezone: string;
  overlap: 'skip' | 'allow';
  nextFireAt: string;
  lastFiredAt: string | null;
  lastCardId: string | null;
  skipCount: number;
  /**
   * The human who declared this schedule, and — via `createCardFromTrigger`'s `ownerUserId` —
   * the owner every card it mints inherits. Exposed so a client can show whose cards a schedule
   * will create; before this it was validated hard at creation but invisible everywhere after.
   */
  createdBy: string | null;
}

/** A stored edge (spec §3.4) — `LinkRow` plus the provenance columns the DO adds. */
export interface LinkView {
  fromCardId: string;
  toCardId: string;
  kind: LinkKind;
  createdAt: string;
  createdBy: string | null;
}

export interface LinkInput {
  fromCardId: string;
  toCardId: string;
  kind: LinkKind;
  createdBy?: string | null;
}

/** One superwitness outbox row (superwitness app spec §3.5), as `getRunReportOutbox` returns it. */
export interface RunReportOutboxRow {
  runId: string;
  gen: number;
  status: 'pending' | 'dead';
  attempts: number;
  nextAttemptAt: number;
  lastError: string | null;
  reportedAt: string;
  draft: RunReportDraft;
}

export interface RunReportDrainResult {
  sent: number;
  retried: number;
  parked: number;
}
