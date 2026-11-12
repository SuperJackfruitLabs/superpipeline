import { z } from 'zod';
import { newId } from '../ids';
import type { BoardContext } from './context';
import type { GateOptionMeaning } from './gate-option';
import type { Result, Row } from './model';
import { queueRelay, queueSubscribedPush } from './push';
import { posterSubjectEnvelope, StkCapabilitySubject, subjectAnswerError } from './question-subject';
import type { ApprovalRequestView, ElicitationPendingBody } from './views';

/**
 * A broker's approval request, hosted on the board (charter: decisions/2026-11-08-waiting-cards-
 * and-broker-approvals-reach-chat.md §3–5).
 *
 * SuperToolkit creates one when its policy says a write needs approval, with a `stk-capability/v1`
 * subject: the digest of the exact request, its expiry and a preview of everything it will do. It
 * reaches chat as a subject-bound question on `elicitation.pending` (and its pending read), and is
 * answered through the question answer route. The board judges the answer by the rules every
 * subject-bound question follows — the binding is required on approval and must match, nothing is
 * taken after expiry — and one more: **only a workspace owner or admin approves**. The broker reads
 * the decision back with its own credential, re-checks the digest and the expiry, and only then acts.
 *
 * The options are the board's, not the caller's: `allow_once` (approve, once, owner or admin) and
 * `deny` (reject, once, any member who may work the board — a denial performs nothing, and the
 * broker fails closed on it). There is no "always": that is a policy change, made in policy.
 */

/** What approval requests need from the rest of the board. */
export type ApprovalRequestsDeps = Pick<BoardContext, 'emit' | 'env' | 'getMeta' | 'now' | 'nowMs' | 'sql'>;

export const QUESTION_MAX = 1000;

const CreateBody = z.object({
  requestId: z.string().min(1).max(128),
  question: z.string().trim().min(1).max(QUESTION_MAX),
  subject: StkCapabilitySubject,
});

type RequestOption = ElicitationPendingBody['options'][number] & { id: 'allow_once' | 'deny' };

const ALLOW_ONCE: RequestOption = { id: 'allow_once', label: 'Allow once', meaning: 'approve', needsComment: false, scope: 'once', requires: 'workspace-admin' };
const DENY: RequestOption = { id: 'deny', label: 'Deny', meaning: 'reject', needsComment: false, scope: 'once' };
const OPTIONS: readonly RequestOption[] = [ALLOW_ONCE, DENY];

/** What the hub's room shows where a card's title would be: a request belongs to no card. */
const REQUEST_TITLE = 'Approval request';

/** The stored subject, already checked when it was created; a row that no longer parses fails closed. */
function storedSubject(row: Row): StkCapabilitySubject {
  const parsed = StkCapabilitySubject.safeParse(JSON.parse(typeof row.subject_json === 'string' ? row.subject_json : 'null'));
  if (!parsed.success) throw new Error(`invariant violation: approval request ${cell(row.id)} has a malformed subject`);
  return parsed.data;
}

function text(v: SqlStorageValue | undefined): string | null {
  return typeof v === 'string' ? v : null;
}

/** A column every row has (ids, text, timestamps); empty only if the schema were broken. */
function cell(v: SqlStorageValue | undefined): string {
  return typeof v === 'string' ? v : '';
}

function rowFor(deps: ApprovalRequestsDeps, id: string): Row | null {
  return deps.sql.exec(`SELECT * FROM approval_requests WHERE id = ?`, id).toArray()[0] ?? null;
}

function viewOf(deps: ApprovalRequestsDeps, row: Row): ApprovalRequestView {
  const subject = storedSubject(row);
  const decidedBy = text(row.decided_by);
  const option = text(row.decided_option);
  const expired = row.status === 'pending' && Date.parse(subject.expires_at) <= deps.nowMs();
  return {
    approvalRequestId: cell(row.id),
    requestId: cell(row.request_id),
    state: expired ? 'expired' : row.status === 'approved' ? 'approved' : row.status === 'denied' ? 'denied' : 'pending',
    option: option === 'allow_once' || option === 'deny' ? option : null,
    decidedBy: decidedBy ? { principalId: decidedBy, label: text(row.decided_by_label) ?? decidedBy } : null,
    decidedAt: text(row.decided_at),
    subject: { id: subject.id, digest: subject.digest },
    expiresAt: subject.expires_at,
  };
}

/**
 * Create a request, or return the one this principal already created under the same `requestId`.
 * A replay that names a different subject or question is refused: an idempotency key that could
 * change what was asked would let a retry approve something nobody saw.
 */
export async function createApprovalRequest(deps: ApprovalRequestsDeps, input: { requestedBy: string; body: unknown }): Promise<Result<{ created: boolean; approvalRequest: ApprovalRequestView }>> {
  if (!deps.getMeta('boardId')) return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  const parsed = CreateBody.safeParse(input.body);
  if (!parsed.success) {
    return {
      ok: false,
      code: 'INVALID_APPROVAL_REQUEST',
      message: `send { requestId (1–128), question (1–${QUESTION_MAX}), subject: a well-formed stk-capability/v1 subject }`,
    };
  }
  const { requestId, question, subject } = parsed.data;
  const existing = deps.sql.exec(`SELECT * FROM approval_requests WHERE requested_by = ? AND request_id = ?`, input.requestedBy, requestId).toArray()[0];
  if (existing) {
    if (existing.question !== question || JSON.stringify(storedSubject(existing)) !== JSON.stringify(subject)) {
      return { ok: false, code: 'REQUEST_ID_CONFLICT', message: `requestId ${requestId} was already used for a different request` };
    }
    return { ok: true, value: { created: false, approvalRequest: viewOf(deps, existing) } };
  }
  if (Date.parse(subject.expires_at) <= deps.nowMs()) {
    return { ok: false, code: 'INVALID_APPROVAL_REQUEST', message: 'the subject has already expired' };
  }
  const id = newId('apr');
  const now = deps.now();
  deps.sql.exec(
    `INSERT INTO approval_requests (id, request_id, requested_by, question, subject_json, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    id,
    requestId,
    input.requestedBy,
    question,
    JSON.stringify(subject),
    now,
  );
  deps.emit('approval_request.opened', { approvalRequestId: id, requestedBy: input.requestedBy });
  const row = rowFor(deps, id);
  if (!row) throw new Error(`invariant violation: approval request ${id} missing immediately after write`);
  const body = pendingBody(deps, row);
  // Only to the decision carrier: an agent's push config never receives a broker's arguments.
  if (body) {
    queueSubscribedPush(deps, body, { servicesOnly: true });
    queueRelay(deps, body);
  }
  return { ok: true, value: { created: true, approvalRequest: viewOf(deps, row) } };
}

export async function getApprovalRequest(deps: ApprovalRequestsDeps, approvalRequestId: string): Promise<Result<ApprovalRequestView>> {
  const row = rowFor(deps, approvalRequestId);
  if (!row) return { ok: false, code: 'APPROVAL_REQUEST_NOT_FOUND', message: `approval request not found: ${approvalRequestId}` };
  return { ok: true, value: viewOf(deps, row) };
}

/**
 * A person's answer, from the question answer route. `decider.id` is the local user, and
 * `principalId`/`label` are what the broker reads back as who decided.
 */
export async function answerApprovalRequest(deps: ApprovalRequestsDeps, input: {
  approvalRequestId: string;
  decider: { id: string; principalId: string; label: string };
  /** The answerer's workspace role, from the server's own session read; never the client's. */
  answererRole?: 'owner' | 'admin' | 'member' | 'viewer' | null;
  option?: string;
  subject?: { id: string; digest: string };
}): Promise<Result<{ approvalRequest: ApprovalRequestView }>> {
  const row = rowFor(deps, input.approvalRequestId);
  if (!row) return { ok: false, code: 'ELICITATION_NOT_FOUND', message: `approval request not found: ${input.approvalRequestId}` };
  const before = viewOf(deps, row);
  if (row.status !== 'pending') return { ok: false, code: 'ELICITATION_NOT_PENDING', message: `this approval request is already ${before.state}` };
  if (input.decider.id === row.requested_by || input.decider.principalId === row.requested_by) {
    return { ok: false, code: 'SEPARATION_OF_DUTIES', message: 'the principal that asked cannot answer its own approval request' };
  }
  const chosen = OPTIONS.find((o) => o.id === input.option?.trim());
  if (!chosen) return { ok: false, code: 'INVALID_ANSWER', message: 'choose allow_once or deny' };
  if (chosen.requires === 'workspace-admin' && input.answererRole !== 'owner' && input.answererRole !== 'admin') {
    return { ok: false, code: 'WORKSPACE_ADMIN_REQUIRED', message: 'Only a workspace owner or admin can approve a broker request.' };
  }
  const meaning: GateOptionMeaning = chosen.meaning;
  const refused = subjectAnswerError(posterSubjectEnvelope(storedSubject(row)), meaning, input.subject, deps.nowMs());
  if (refused) return { ok: false, ...refused };
  const now = deps.now();
  deps.sql.exec(
    `UPDATE approval_requests SET status = ?, decided_option = ?, decided_by = ?, decided_by_label = ?, decided_at = ? WHERE id = ? AND status = 'pending'`,
    chosen.id === 'allow_once' ? 'approved' : 'denied',
    chosen.id,
    input.decider.principalId,
    input.decider.label,
    now,
    input.approvalRequestId,
  );
  deps.emit('approval_request.decided', { approvalRequestId: input.approvalRequestId, option: chosen.id, decidedBy: input.decider.principalId });
  const after = rowFor(deps, input.approvalRequestId);
  if (!after) throw new Error(`invariant violation: approval request ${input.approvalRequestId} missing immediately after write`);
  return { ok: true, value: { approvalRequest: viewOf(deps, after) } };
}

/**
 * The request as an `elicitation.pending` body, or null once it is decided or expired: a
 * subject-bound question like any other, so the hub's carrier posts and answers it unchanged. It
 * belongs to no card, run or stage, so those are empty strings, and `agentId` is who asked.
 */
function pendingBody(deps: ApprovalRequestsDeps, row: Row): ElicitationPendingBody | null {
  if (viewOf(deps, row).state !== 'pending') return null;
  const id = cell(row.id);
  return {
    event: 'elicitation.pending',
    boardId: deps.getMeta('boardId'),
    boardName: deps.getMeta('name') ?? '',
    cardId: '',
    cardTitle: REQUEST_TITLE,
    elicitationId: id,
    runId: '',
    stageKey: '',
    agentId: cell(row.requested_by),
    question: cell(row.question),
    options: OPTIONS.map((o) => ({ ...o })),
    approvalSubject: posterSubjectEnvelope(storedSubject(row)),
    approvalRequestId: id,
    ts: cell(row.created_at),
  };
}

/** Every request still waiting on a person, oldest first, in the `elicitation.pending` body. */
export function pendingApprovalRequestBodies(deps: ApprovalRequestsDeps): ElicitationPendingBody[] {
  return deps.sql
    .exec(`SELECT * FROM approval_requests WHERE status = 'pending' ORDER BY created_at ASC, rowid ASC`)
    .toArray()
    .map((r) => pendingBody(deps, r))
    .filter((b): b is ElicitationPendingBody => b !== null);
}
