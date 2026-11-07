import type { PreviewBlock } from '../approval-subject-kinds/kind';
import type { JsonValue } from '../json';
import type { GateOption } from './gate-option';
import type { BoardUsage, CardView, StageDef, StaleSettings } from './model';
import type { ApprovalDetail, StrictDecision } from './strict-decision';

/**
 * What the board shows about its work: gates, questions, comments, references, evidence, the snapshot.
 */

/** A canonical subject prepared before the card/gate binding transaction. */
export interface PreparedApprovalSubject {
  id: string;
  schema: string;
  revision: number;
  canonicalBytes: Uint8Array;
  digest: string;
  producerRunId: string;
  producedBy: string;
  createdAt: string;
}

/**
 * What a gate option means to a client, independent of its id (charter: gate.v2 §2). `choose` is
 * reserved for choice gates, which no stage offers yet; `optionMeaning` never returns it today.
 */
export type GateOptionMeaning = 'approve' | 'reject' | 'revise' | 'choose' | 'defer';

export interface ApprovalSubjectView {
  id: string;
  digest: string;
  schema: string;
  revision: number;
  canonical: JsonValue;
}

export interface ApprovalSubjectVerification {
  boardId: string;
  projectId: string;
  cardId: string;
  runId: string;
  stageKey: string;
  canonicalBytesBase64: string;
  expiresAt: string;
  subject: ApprovalSubjectView & { account: JsonValue };
  gate: { id: string; decision: string; decidedBy: string; resolvedAt: string };
}

/** A durable activity in a card's session-replay timeline (docs/07 §4). */
export interface ActivityView {
  seq: number;
  runId: string;
  type: string;
  ts: string;
  body: string | null;
  action: string | null;
  parameter: JsonValue | null;
  result: JsonValue | null;
  signal: string | null;
}

/**
 * The context of one run, as the agent that owns it may read it (docs/04 §3 `getCard`).
 *
 * This is the *whole* agent read surface: the card this run was claimed for, that card's stage, the
 * upstream handoff and the card's references — enough to do the work, and nothing about the rest of
 * the (tenant-shared) board.
 */
export interface RunContext {
  run: {
    runId: string;
    cardId: string;
    stageKey: string;
    leaseEpoch: number;
    status: string;
    outcome: string | null;
    startedAt: string;
    endedAt: string | null;
    /** Original run evidence, independent of later card handoffs. */
    handoff: JsonValue | null;
    completion: JsonValue | null;
  };
  card: CardView;
  /** The card's *current* stage — null if the board's stage list no longer contains it. */
  stage: StageDef | null;
  handoff: JsonValue | null;
  references: ReferenceView[];
  /**
   * The questions this run asked, oldest first, each carrying its answer once a human gives one.
   * This is how a blocked agent collects a decision: it re-reads the run it already holds, with the
   * token it already has. No human credential, and no second authorization rule.
   */
  elicitations: ElicitationView[];
  /**
   * The card's comments as of this read: the newest `RUN_CONTEXT_COMMENTS` that are not deleted,
   * oldest first, cut short further if their bodies pass `RUN_CONTEXT_COMMENT_BYTES`. Read here
   * by the agent at claim time, and again whenever it re-reads its run — which is how a remark
   * a person adds mid-run reaches it.
   */
  comments: CommentView[];
  /** How many live comments are older than the ones carried — readable in full via the comments route or MCP tool. */
  commentsOmitted: number;
}

/** A remark on a card by a person or by the agent working it. Append-only; never edited. */
export interface CommentView {
  id: string;
  cardId: string;
  author: {
    kind: 'human' | 'agent';
    /** A user id for a person, an `agt_…` for an agent. */
    id: string;
    /** The display name at the time of posting, when one was known. */
    name: string | null;
  };
  /** Markdown source as written, stored and returned as text — a reader must never interpret it as HTML. Empty once deleted. */
  body: string;
  createdAt: string;
  /** Set when the author deleted it; the row stays so the thread still shows a comment was there. */
  deletedAt: string | null;
}

/** One run of a card, surfaced for the attempts comparison view (docs/07 §5). */
export interface AttemptView {
  runId: string;
  cardId: string;
  stageKey: string;
  agentId: string;
  status: string;
  outcome: string | null;
  startedAt: string;
  endedAt: string | null;
  costUsd: number;
  model: string | null;
  profileKey: string | null;
  /** The completion verdict, when the stage asked for something. Null when it asked for nothing. */
  completion: Record<string, unknown> | null;
  /**
   * What THIS run handed on. Null when it failed, or when it completed with nothing to say.
   *
   * The card's `handoff` is one value overwritten at every stage, so it only ever shows the latest.
   * This is per-run, which is what lets a reader see the account stage by stage rather than the last
   * line of it.
   */
  handoff: JsonValue | null;
  /** Why this run died, when it did. Null for a run that completed or is still open. */
  failureReason: string | null;
}

/** A gate as evidence (contract C4): decisions in past tense, the run it judged, nothing else. */
export interface RunEvidenceGate {
  id: string;
  run_id: string | null;
  stage_key: string;
  status: 'pending' | 'resolved' | 'cancelled';
  decision: 'approved' | 'changes_requested' | 'rejected' | null;
  decided_by: string | null;
  produced_by: string;
  /** `prn_…` or null. Filled by the Worker (`index.ts` runEvidence): only it can read the catalog. */
  produced_by_principal_id: string | null;
  /** `prn_…` or null. Filled by the Worker (`index.ts` runEvidence): only it can read the catalog. */
  decided_by_principal_id: string | null;
  /** Hub token `sub` the decider is known by, set only when `decided_by_principal_id` is null. Filled by the Worker. */
  decided_by_hub_sub: string | null;
  created_at: string;
  resolved_at: string | null;
}

/** `GET /v1/boards/:id/runs/:runId/evidence` (superwitness contract C4). snake_case: it is a cross-product wire shape. */
export interface RunEvidence {
  run: {
    id: string; board_id: string; card_id: string; stage_key: string; agent_id: string;
    /** `prn_…` or null. Filled by the Worker (`index.ts` runEvidence): only it can read the catalog. */
    agent_principal_id: string | null;
    status: string; outcome: string | null; started_at: string; ended_at: string | null;
  };
  card: { id: string; title: string; stage_key: string };
  gates: RunEvidenceGate[];
  usage:
    | { status: 'reported'; input_tokens: number; output_tokens: number; cost_usd: number }
    | { status: 'unreported'; input_tokens: null; output_tokens: null; cost_usd: null };
  as_of: string;
}

/** Explicit opt-in extension. Legacy C4 is deliberately nested without new fields. */
export interface RunEvidenceV1 {
  schema_version: 'superpipeline-run-evidence/v1';
  pipeline: RunEvidence;
  provenance: {
    lease_epoch: number;
    queued_by: string | null;
    completion: { met: boolean; unchecked_count: number } | null;
    handoff_recorded: boolean;
    references_truncated: boolean;
    references: Array<Pick<ReferenceView, 'id' | 'cardId' | 'runId' | 'url' | 'provider' | 'sourceType' | 'externalId' | 'createdAt'> & { execution_export: { schema_version: 'agentpod-execution-export/v1'; export_id: string; manifest_sha256: string; verification: 'unverified' } | null }>;
  };
  usage: {
    status: 'known' | 'estimated' | 'unknown' | 'unreported' | 'partial';
    recorded_cost_usd: number | null;
    estimated_cost_usd: number | null;
    cost_provenance: 'agent-reported-not-provider-bill' | 'unknown';
  };
  /** Discovery metadata only. A consumer must authenticate to AgentPod and validate its binding. */
  executor_evidence: { external_source: 'superpipeline'; external_run_id: string; agentpod_path: string };
}

export interface EvidenceReferenceInput {
  runId: string; agentId: string; leaseEpoch: number; cardId: string; stageKey: string;
  exportId: string; manifestSha256: string; url: string;
}

/**
 * An agent's open question to a human (docs/04 §4), persisted so it can be answered.
 *
 * The agent asks by posting an `elicitation` activity — `body` is the question, `parameter` carries
 * the `options` — which parks the card in `input-required` (or `auth-required` on an `auth` signal)
 * while the agent keeps its lease. A human's answer transitions the card back to `working` through
 * the state machine's own `human_reply` / `account_linked` transition, and the asking agent collects
 * the answer from the run it already owns.
 *
 * `agentId` is who asked — and therefore who may not answer.
 */
export interface ElicitationView {
  strictDecision?: StrictDecision;
  /** What the approval is, for the person answering a strict decision. */
  detail?: ApprovalDetail;
  id: string;
  cardId: string;
  runId: string;
  stageKey: string;
  agentId: string;
  question: string;
  signal: string | null;
  options: GateOption[];
  status: ElicitationStatus;
  answer: ElicitationAnswer | null;
  createdAt: string;
}

/**
 * `pending` — waiting on a human. `answered` — a human replied and the card moved on.
 * `cancelled` — the question outlived its usefulness (the run ended, or the card was moved/superseded)
 * and can no longer be answered, so no stale prompt is left for a human to act on.
 */
export type ElicitationStatus = 'pending' | 'answered' | 'cancelled';

export interface ElicitationAnswer {
  option: string | null;
  text: string | null;
  answeredBy: string;
  answeredAt: string;
}

export interface GateView {
  id: string;
  cardId: string;
  stageKey: string;
  status: 'pending' | 'resolved';
  decision: string | null;
  options: GateOption[];
  producedBy: string;
  createdAt: string;
  /**
   * Who decided, and what they said.
   *
   * Both columns have been written on every resolution since gates existed and appeared in no
   * read shape at all — so who approved what, and the feedback they gave with it, was recorded
   * and unreadable. An approval nobody can attribute is not much of an approval.
   *
   * Null while pending, which is the ordinary state for everything this method returns.
   */
  decidedBy: string | null;
  comment: string | null;
  resolvedAt: string | null;
  /**
   * What is being approved: the readable part of the card's handoff (`handoffSummary`). On the
   * board snapshot's pending gates only, so a list can say what a decision is about without
   * deciding blind. Plain text — a reader must render it as text.
   */
  summary?: string | null;
  /** Present only for an opt-in digest-bound gate; loaded from immutable subject storage. */
  approvalSubject?: ApprovalSubjectView;
  /** Human-selected delivery state for a resolved immutable publishing approval. */
  delivery?: {
    mode: 'manual' | 'automatic';
    liveUrl: string | null;
    remindAt: string | null;
    readBackStatus: 'not_checked' | 'matched' | 'mismatch' | 'service_reported';
    recordedBy: string | null;
    recordedAt: string | null;
  };
}

/**
 * A subject as a decision envelope carries it (charter: gate.v2 §3): its identity, expiry and the
 * kind's bounded preview. The canonical payload stays behind the authenticated route.
 */
export type ApprovalSubjectEnvelope = Pick<ApprovalSubjectView, 'id' | 'digest' | 'schema' | 'revision'> & {
  expiresAt: string | null;
  preview: PreviewBlock[];
  /** False when the preview had to be cut to its bounds; no approving option may then be offered. */
  previewComplete: boolean;
};

/**
 * What an option asks the person to type when they choose it (charter: the decision envelope
 * covers questions and follow-ups §1). camelCase here, like the rest of this push body.
 */
export interface EnvelopeOptionInput {
  kind: 'text' | 'url';
  label: string;
  required: boolean;
  maxLength: number;
}

/**
 * What a `gate.pending` carries — the same object however it travels.
 *
 * Pushed when the gate opens, and read back by the hub's reconciliation sweep
 * (`charter → decisions/2026-08-30-a-gate-closes-over-chat.md` §5). Two paths
 * deliver this; exactly one builds it, because a swept gate that rendered
 * differently from a pushed one would only ever be seen on the path that had
 * already failed once.
 *
 * The field names are the wire's, not the board's: `gateId` rather than `id`,
 * `options[].id`/`label` rather than `name`/`title`. They are pinned by
 * agentpod `fixtures/ecosystem-identity/matrix_gate_events.json`, which three
 * repositories validate against, so this shape stops being ours to rename.
 */
export interface GatePendingBody {
  event: 'gate.pending';
  boardId: string | null;
  /**
   * What the board is CALLED, as opposed to what it is keyed by.
   *
   * Carried because the hub cannot find out any other way: its only route to board
   * metadata resolves a user session, which a service credential does not have — the
   * same wall that makes the hub's `humansFor` an injected dependency. Without this
   * every board's chat room was named after the product rather than the board, so a
   * person with four boards saw four rooms with one name.
   *
   * Always present, empty string when the board has no name, never absent: a reader
   * distinguishing "no name" from "a build that does not send one" would be
   * distinguishing two things that call for the same fallback.
   */
  boardName: string;
  cardId: string;
  gateId: string;
  stageKey: string;
  returnStageKey: string;
  cardTitle: string;
  producedBy: string;
  /** What the reviewer is being asked to approve; null for generic handoff-free gates. */
  handoffSummary: string | null;
  /**
   * Immutable metadata for a digest-bound gate, and what the decider must see (charter: gate.v2
   * §3). The canonical payload stays behind the authenticated route; only the kind's bounded
   * preview travels.
   */
  approvalSubject?: ApprovalSubjectEnvelope;
  /** Authenticated web route for reviewing the authoritative subject. */
  reviewUrl?: string;
  /** gate.v2 §2: each option says what it means; `delivery` only on an option that approves a subject. */
  options: Array<{ id: string; label: string; meaning: GateOptionMeaning; needsComment: boolean; delivery?: 'automatic' | 'manual' }>;
  /** When the gate opened. The gate's own clock, so a re-read is byte-identical. */
  ts: string;
}

/**
 * What an `elicitation.pending` carries — an agent is blocked on a person.
 *
 * The mirror of {@link GatePendingBody}, and deliberately so: both are "a human must
 * answer something before this card moves", both travel by push and are read back by a
 * sweep, and one builder serves both paths for the reason given above.
 *
 * It exists because nothing outside the web app could previously learn that a run had
 * stopped to ask. `openElicitation` emitted an internal event and filed an in-app
 * notification; neither leaves the board. Every permission prompt therefore meant
 * opening a browser, however the operator was carrying the question around.
 */
export interface ElicitationPendingBody {
  event: 'elicitation.pending';
  boardId: string | null;
  boardName: string;
  cardId: string;
  cardTitle: string;
  elicitationId: string;
  runId: string;
  stageKey: string;
  /**
   * The agent that is waiting — and, at the answer route, the one identity that may
   * not answer. Carried so a projection can say who is blocked rather than just that
   * something is.
   */
  agentId: string;
  /** The question. May be empty: an agent can stop on options alone. */
  question: string;
  /**
   * The options the agent offered, in the order it offered them.
   *
   * **May be empty, and the body is still sent.** An elicitation with no options cannot
   * be answered with a button, and a reader needs to know one exists in order to say
   * where it CAN be answered. Omitting the unanswerable case would make silence mean
   * both "no question" and "a question you cannot tap".
   *
   * `id`/`label`, not the board's `name`/`title`, for the same reason the gate's are.
   */
  options: Array<{ id: string; label: string; meaning: GateOptionMeaning; needsComment: false }>;
  /**
   * Only on a question with no options: it is answered by typing, and this is how long the
   * answer may be — the limit the answer route enforces.
   */
  freeText?: { maxLength: number };
  /** When the question was asked. The row's own clock, so a re-read is byte-identical. */
  ts: string;
}

/**
 * What a `delivery.pending` carries — a person approved a post for manual delivery and still owes
 * the board its live link (charter: the decision envelope covers questions and follow-ups §3).
 *
 * Pushed when the gate is resolved `approve_manual`, and read back by the hub's sweep until a
 * link is recorded, the mode is switched to automatic, or the approval expires. One builder
 * serves both, for the reason {@link GatePendingBody} gives.
 */
export interface DeliveryPendingBody {
  event: 'delivery.pending';
  boardId: string | null;
  boardName: string;
  cardId: string;
  cardTitle: string;
  gateId: string;
  stageKey: string;
  approvalSubject: ApprovalSubjectEnvelope;
  /** `switch_to_automatic` only when the preview was complete: the person saw everything it would post. */
  options: Array<{
    id: 'record_live_url' | 'switch_to_automatic';
    label: string;
    meaning: GateOptionMeaning;
    needsComment: false;
    input?: EnvelopeOptionInput;
    delivery?: 'automatic';
  }>;
  /** When the gate was resolved. The gate's own clock, so a re-read is byte-identical. */
  ts: string;
}

/** A first-class external link on a card (docs/06). Idempotent on (cardId, url). */
export interface ReferenceView {
  id: string;
  cardId: string;
  url: string;
  title: string | null;
  subtitle: string | null;
  provider: string;
  sourceType: string;
  externalId: string | null;
  metadata: JsonValue | null;
  syncState: 'synced' | 'stale' | 'error';
  lastSyncedAt: string | null;
  addedBy: 'agent' | 'user';
  /**
   * The run that attached this, when an agent did it mid-run.
   *
   * NULL for a reference a human added, and for every reference attached before this column existed.
   * `addedBy` already said 'agent' or 'user'; it never said WHICH agent or WHEN, so "what did the
   * audit stage attach" was unanswerable even though the references were all still here.
   */
  runId: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface BoardSnapshot {
  boardId: string | null;
  tenantId: string | null;
  name: string | null;
  stages: StageDef[];
  /** The introduction the board was created with, when it has one. */
  intro?: { lede: string; composeHint: string };
  cards: CardView[];
  gates: GateView[];
  /** The questions agents are currently blocked on, waiting for a human (docs/04 §4). */
  elicitations: ElicitationView[];
  references: ReferenceView[];
  usage: BoardUsage;
  github: {
    issueTrigger: boolean;
    webhookConfigured: boolean;
    /** Where to point the GitHub webhook for this board. */
    webhookUrl: string;
    /**
     * How many principals the board's standing trigger grant names, or null when
     * no grant is recorded.
     *
     * The count, never the ids: this snapshot is read by every board viewer, and
     * which agents a particular operator may dispatch is that operator's
     * business. What a viewer needs to know is whether automation on this board
     * is authorised at all — because a board wired to a repository with no grant
     * produces cards no agent can ever claim.
     */
    triggerGrantCount: number | null;
  };
  /** The board's stale-card settings: how long a card may sit before it counts, and whether the digest is on. */
  stale: StaleSettings;
}
