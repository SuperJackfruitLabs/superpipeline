import type { GateDecision } from '@superpipeline/contract';
import { approvalSubjectKind } from '../approval-subject-kinds';
import { newId } from '../ids';
import type { BoardContext } from './context';
import type { GateOption } from './gate-option';
import type { CardView, Result, Row } from './model';
import { handoffSummary, isApproveDecision, record } from './rules';
import type { GatePendingBody, GateView, PreparedApprovalSubject } from './views';

/**
 * Approval gates: opening one, a person deciding it, the delivery it carries, and its push body.
 */

/** What gates needs from the rest of the board. */
export type GatesDeps = Pick<
  BoardContext,
  | 'advanceCard'
  | 'approvalSubjectView'
  | 'cancelElicitationsForCard'
  | 'ctx'
  | 'emit'
  | 'getCard'
  | 'getCardHandoffJson'
  | 'getCardRow'
  | 'getMeta'
  | 'invalidateApprovalSubject'
  | 'mustGetCard'
  | 'notify'
  | 'notifyWorkAvailable'
  | 'now'
  | 'parkForHuman'
  | 'parseHandoff'
  | 'reportRun'
  | 'runJudgedByGate'
  | 'scheduleReclaim'
  | 'setNeedsHuman'
  | 'sql'
  | 'stages'
>;

const READ_BACK_TIMEOUT_MS = 5_000;

async function readBackStatus(url: URL, schema: string, approvedDigest: string): Promise<'not_checked' | 'matched' | 'mismatch'> {
  const kind = approvalSubjectKind(schema);
  if (!kind?.canReadBack(url)) return 'not_checked';
  try {
    // A redirect is not followed: the host check above is the only thing standing between a
    // person-supplied URL and a server-side fetch, and an open redirect on an allowed host
    // would walk straight past it. A slow host is given up on, not waited out.
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(READ_BACK_TIMEOUT_MS),
      headers: { Accept: 'application/json, text/html;q=0.9' },
    });
    if (!response.ok) return 'not_checked';
    const liveDigest = await kind.readBackDigest(response);
    if (liveDigest === null) return 'not_checked';
    return liveDigest === approvedDigest ? 'matched' : 'mismatch';
  } catch {
    return 'not_checked';
  }
}

/** The decisions a human can take at an approval gate (docs/08 §6). */
const DEFAULT_GATE_OPTIONS: GateOption[] = [
  { name: 'approve', title: 'Approve' },
  { name: 'request_changes', title: 'Request changes', interactive: true },
  { name: 'reject', title: 'Reject' },
];

/** Delivery is chosen by the human; both choices approve the same immutable digest. */
const APPROVAL_SUBJECT_GATE_OPTIONS: GateOption[] = [
  { name: 'approve_manual', title: "Approve — I'll post it myself" },
  { name: 'approve_automatic', title: 'Approve — post automatically' },
  { name: 'request_changes', title: 'Request changes', interactive: true },
  { name: 'reject', title: 'Reject' },
];

/** Resolve a pending approval gate (docs/08 §6). Enforces separation of duties. */
export async function resolveGate(deps: GatesDeps, input: {
  gateId: string;
  decision: GateDecision;
  decidedBy: string;
  comment?: string;
  approvalSubjectId?: string;
  approvalSubjectDigest?: string;
  via?: 'matrix' | 'web' | 'api';
}): Promise<Result<CardView>> {
  const gate = deps.sql.exec(`SELECT * FROM gates WHERE id = ?`, input.gateId).toArray()[0];
  if (!gate) return { ok: false, code: 'GATE_NOT_FOUND', message: `gate not found: ${input.gateId}` };
  if ((gate.status as string) !== 'pending') {
    // Same code and status as ever, so a client that matches GATE_NOT_PENDING keeps working; the
    // flat `reason` and the decider fields are additive and tell a decided gate from a cancelled one.
    if ((gate.status as string) === 'resolved') {
      return {
        ok: false,
        code: 'GATE_NOT_PENDING',
        message: 'gate is already resolved',
        detail: {
          reason: 'decided',
          decidedBy: gate.decided_by ?? '',
          decidedAt: gate.resolved_at ?? '',
          via: gate.decided_via ?? 'api',
        },
      };
    }
    return { ok: false, code: 'GATE_NOT_PENDING', message: 'gate is already resolved', detail: { reason: 'cancelled' } };
  }
  if (input.decidedBy === (gate.produced_by as string)) {
    return { ok: false, code: 'SEPARATION_OF_DUTIES', message: 'the producer cannot resolve their own gate' };
  }

  const boundSubjectId = (gate.approval_subject_id as string | null) ?? null;
  if (boundSubjectId) {
    const deciders = JSON.parse((gate.approval_decider_ids_json as string | null) ?? '[]') as string[];
    if (input.decidedBy.startsWith('agt_') || !deciders.includes(input.decidedBy)) {
      return {
        ok: false,
        code: 'APPROVAL_DECIDER_NOT_ALLOWED',
        message: 'this principal is not an authorized human decider for the approval subject',
      };
    }
    if (
      input.approvalSubjectId !== boundSubjectId ||
      input.approvalSubjectDigest !== (gate.approval_subject_digest as string)
    ) {
      return {
        ok: false,
        code: 'APPROVAL_SUBJECT_MISMATCH',
        message: 'the rendered approval subject id and digest no longer match this gate',
      };
    }
    const subject = deps.sql.exec(`SELECT status, digest FROM approval_subjects WHERE id = ?`, boundSubjectId).toArray()[0];
    if (
      !subject ||
      subject.status !== 'active' ||
      subject.digest !== gate.approval_subject_digest ||
      deps.getCardRow(gate.card_id as string)?.active_approval_subject_id !== boundSubjectId
    ) {
      return { ok: false, code: 'APPROVAL_SUBJECT_MISMATCH', message: 'the approval subject is no longer active' };
    }
    const options: unknown = JSON.parse((gate.options_json as string | null) ?? '[]');
    if (
      !Array.isArray(options) ||
      !options.some(
        (option) => option !== null && typeof option === 'object' && 'name' in option && option.name === input.decision,
      )
    ) {
      return {
        ok: false,
        code: 'GATE_DECISION_NOT_ALLOWED',
        message: `decision "${input.decision}" is not one of this gate's options`,
      };
    }
  }

  const cardId = gate.card_id as string;
  const now = deps.now();
  deps.sql.exec(
    `UPDATE gates SET status = 'resolved', decision = ?, comment = ?, decided_by = ?, resolved_at = ?, decided_via = ? WHERE id = ?`,
    input.decision,
    input.comment ?? null,
    input.decidedBy,
    now,
    input.via ?? 'api',
    input.gateId,
  );
  if (boundSubjectId && (input.decision === 'approve_manual' || input.decision === 'approve_automatic')) {
    deps.sql.exec(
      `INSERT INTO approval_delivery_events
         (id, gate_id, subject_id, event, from_mode, to_mode, actor, live_url, created_at)
       VALUES (?, ?, ?, 'approved', NULL, ?, ?, NULL, ?)`,
      newId('ade'),
      input.gateId,
      boundSubjectId,
      input.decision === 'approve_manual' ? 'manual' : 'automatic',
      input.decidedBy,
      now,
    );
  }
  if (input.decision === 'approve_manual' && boundSubjectId) {
    // A manual approval remains on its human stage: publisher claims are impossible by routing,
    // while verifyApprovalSubject independently fences a corrupted or stale claim.
    deps.parkForHuman(cardId, { reason: 'review', detail: 'approved for manual delivery' });
  } else if (isApproveDecision(input.decision)) {
    // The approver becomes the producer of any chained gate (keeps separation-of-duties intact).
    // An approval produces no new work, so a chained gate judges the same run's work.
    deps.advanceCard(cardId, gate.stage_key as string, input.decidedBy, deps.getCardHandoffJson(cardId), (gate.run_id as string | null) ?? null);
  } else if (input.decision === 'request_changes') {
    if (boundSubjectId) deps.invalidateApprovalSubject(cardId, 'gate.request_changes', input.decidedBy);
    // Keep the agent's prior handoff and add the reviewer's feedback so rework has full context.
    const prior = deps.parseHandoff(deps.getCardHandoffJson(cardId));
    const merged =
      prior && typeof prior === 'object' && !Array.isArray(prior)
        ? { ...prior, feedback: input.comment ?? null }
        : { feedback: input.comment ?? null };
    deps.sql.exec(
      `UPDATE cards SET current_stage_key = ?, state = 'submitted', delegate_agent_id = NULL,
       current_run_id = NULL, failure_count = 0, auto_returns = 0, handoff_json = ?, updated_at = ? WHERE id = ?`,
      gate.return_stage_key,
      JSON.stringify(merged),
      now,
      cardId,
    );
    deps.emit('card.changes_requested', { cardId, gateId: input.gateId, to: gate.return_stage_key });
    deps.notifyWorkAvailable(cardId); // back on a claimable stage for rework
  } else {
    if (boundSubjectId) deps.invalidateApprovalSubject(cardId, 'gate.reject', input.decidedBy);
    deps.sql.exec(
      `UPDATE cards SET state = 'rejected', delegate_agent_id = NULL, current_run_id = NULL, updated_at = ? WHERE id = ?`,
      now,
      cardId,
    );
    deps.emit('card.rejected', { cardId, gateId: input.gateId });
  }
  deps.emit('gate.resolved', { gateId: input.gateId, cardId, decision: input.decision, decidedBy: input.decidedBy });
  // After advanceCard: an approval into another human gate stage chains a gate on the same run.
  const judged = deps.runJudgedByGate(gate);
  if (judged) deps.reportRun(judged);
  await deps.scheduleReclaim();
  return { ok: true, value: deps.mustGetCard(cardId) };
}

/** Change delivery mechanics without changing the approved immutable bytes. */
export async function updateApprovalDelivery(deps: GatesDeps, input: {
  gateId: string;
  actor: string;
  mode?: 'manual' | 'automatic';
  liveUrl?: string;
  remindAt?: string;
}): Promise<Result<CardView & { delivery: NonNullable<GateView['delivery']> }>> {
  const gate = deps.sql.exec(`SELECT * FROM gates WHERE id = ?`, input.gateId).toArray()[0];
  if (!gate) return { ok: false, code: 'GATE_NOT_FOUND', message: `gate not found: ${input.gateId}` };
  const subjectId = (gate.approval_subject_id as string | null) ?? null;
  const decision = gate.decision as string | null;
  if (gate.status !== 'resolved' || !subjectId || (decision !== 'approve_manual' && decision !== 'approve_automatic')) {
    return { ok: false, code: 'APPROVAL_DELIVERY_NOT_AVAILABLE', message: 'this gate has no changeable delivery approval' };
  }
  const deciders = JSON.parse((gate.approval_decider_ids_json as string | null) ?? '[]') as string[];
  if (input.actor.startsWith('agt_') || !deciders.includes(input.actor)) {
    return { ok: false, code: 'APPROVAL_DECIDER_NOT_ALLOWED', message: 'this principal cannot change approval delivery' };
  }
  const cardId = gate.card_id as string;
  const cardRow = deps.getCardRow(cardId);
  const currentMode = decision === 'approve_manual' ? 'manual' : 'automatic';
  if (input.mode !== undefined && input.mode !== currentMode) {
    const delivered = deps.sql
      .exec(
        `SELECT id FROM runs
          WHERE card_id = ? AND status = 'ended' AND outcome = 'completed' AND started_at >= ?
          LIMIT 1`,
        cardId,
        gate.resolved_at,
      )
      .toArray()[0];
    if (delivered) {
      return { ok: false, code: 'APPROVAL_DELIVERY_DELIVERED', message: 'delivery mode cannot change after the publisher run completed' };
    }
  }
  const subject = deps.sql.exec(`SELECT status, schema, digest FROM approval_subjects WHERE id = ?`, subjectId).toArray()[0];
  if (!cardRow || cardRow.active_approval_subject_id !== subjectId || subject?.status !== 'active') {
    return { ok: false, code: 'APPROVAL_SUBJECT_MISMATCH', message: 'the approved subject is no longer active' };
  }
  const changes = [input.mode, input.liveUrl, input.remindAt].filter((value) => value !== undefined);
  if (changes.length !== 1) {
    return { ok: false, code: 'INVALID_APPROVAL_DELIVERY', message: 'provide exactly one of mode, liveUrl or remindAt' };
  }

  const now = deps.now();
  if (input.remindAt !== undefined) {
    if (decision !== 'approve_manual' || gate.live_post_url) {
      return { ok: false, code: 'APPROVAL_DELIVERY_NOT_MANUAL', message: 'a reminder is scheduled only for unpublished manual delivery' };
    }
    const remindMs = Date.parse(input.remindAt);
    if (!Number.isFinite(remindMs)) {
      return { ok: false, code: 'INVALID_APPROVAL_DELIVERY', message: 'remindAt must be an ISO timestamp' };
    }
    // Stored as UTC ISO with milliseconds, the same shape as the sweep's `now`: the sweep
    // compares the two as strings, which only orders them correctly in one shared form.
    const remindAt = new Date(remindMs).toISOString();
    deps.ctx.storage.transactionSync(() => {
      deps.sql.exec(
        `UPDATE gates SET live_post_remind_at = ?, live_post_reminder_notified_at = NULL WHERE id = ?`,
        remindAt,
        input.gateId,
      );
      deps.sql.exec(
        `INSERT INTO approval_delivery_events
           (id, gate_id, subject_id, event, from_mode, to_mode, actor, live_url, created_at)
         VALUES (?, ?, ?, 'reminder_scheduled', 'manual', 'manual', ?, NULL, ?)`,
        newId('ade'),
        input.gateId,
        subjectId,
        input.actor,
        now,
      );
    });
  } else if (input.liveUrl !== undefined) {
    if (decision !== 'approve_manual') {
      return { ok: false, code: 'APPROVAL_DELIVERY_NOT_MANUAL', message: 'a live URL is recorded only for manual delivery' };
    }
    let parsed: URL;
    try {
      parsed = new URL(input.liveUrl);
    } catch {
      return { ok: false, code: 'INVALID_LIVE_URL', message: 'live URL must be an absolute https URL' };
    }
    if (parsed.protocol !== 'https:') {
      return { ok: false, code: 'INVALID_LIVE_URL', message: 'live URL must be an absolute https URL' };
    }
    if (typeof subject.schema !== 'string' || typeof subject.digest !== 'string') {
      return { ok: false, code: 'APPROVAL_SUBJECT_MISMATCH', message: 'the approved subject cannot be read back' };
    }
    const readBack = await readBackStatus(parsed, subject.schema, subject.digest);
    // The read-back is an outbound fetch, and a Durable Object takes other requests while one
    // is in flight. Everything checked above is checked again, inside the write: a mode switch,
    // a spec edit or a second live URL in that window must not be overwritten by this one.
    const stillCurrent = deps.ctx.storage.transactionSync(() => {
      const nowGate = deps.sql.exec(`SELECT decision, live_post_url FROM gates WHERE id = ?`, input.gateId).toArray()[0];
      const nowSubject = deps.sql.exec(`SELECT status, digest FROM approval_subjects WHERE id = ?`, subjectId).toArray()[0];
      const nowCard = deps.getCardRow(cardId);
      if (
        nowGate?.decision !== 'approve_manual' ||
        nowGate.live_post_url ||
        nowSubject?.status !== 'active' ||
        nowSubject.digest !== subject.digest ||
        nowCard?.active_approval_subject_id !== subjectId
      ) {
        return false;
      }
      deps.sql.exec(
        `UPDATE gates SET live_post_url = ?, live_post_url_recorded_by = ?, live_post_url_recorded_at = ?,
                          live_post_readback_status = ? WHERE id = ?`,
        parsed.toString(),
        input.actor,
        now,
        readBack,
        input.gateId,
      );
      deps.sql.exec(
        `INSERT INTO approval_delivery_events
           (id, gate_id, subject_id, event, from_mode, to_mode, actor, live_url, created_at)
         VALUES (?, ?, ?, 'live_url_recorded', 'manual', 'manual', ?, ?, ?)`,
        newId('ade'),
        input.gateId,
        subjectId,
        input.actor,
        parsed.toString(),
        now,
      );
      return true;
    });
    if (!stillCurrent) {
      return { ok: false, code: 'APPROVAL_SUBJECT_MISMATCH', message: 'the approval changed while the live post was being read back; record the URL again' };
    }
  } else {
    const nextMode = input.mode!;
    if (nextMode !== currentMode) {
      if (currentMode === 'automatic' && (cardRow.current_run_id || cardRow.state === 'working')) {
        return { ok: false, code: 'APPROVAL_DELIVERY_STARTED', message: 'automatic delivery has already been claimed' };
      }
      if (currentMode === 'manual' && gate.live_post_url) {
        return { ok: false, code: 'APPROVAL_DELIVERY_STARTED', message: 'manual delivery already has a recorded live URL' };
      }
      deps.ctx.storage.transactionSync(() => {
        if (currentMode === 'automatic') {
          deps.sql.exec(
            `UPDATE cards SET current_stage_key = ?, state = 'input-required', delegate_agent_id = NULL,
                              current_run_id = NULL, needs_human_json = ?, updated_at = ? WHERE id = ?`,
            gate.stage_key,
            JSON.stringify({ reason: 'review', detail: 'approved for manual delivery' }),
            now,
            cardId,
          );
        } else {
          deps.setNeedsHuman(cardId, null);
          deps.advanceCard(cardId, gate.stage_key as string, input.actor, deps.getCardHandoffJson(cardId), (gate.run_id as string | null) ?? null);
        }
        deps.sql.exec(`UPDATE gates SET decision = ? WHERE id = ?`, nextMode === 'manual' ? 'approve_manual' : 'approve_automatic', input.gateId);
        deps.sql.exec(
          `INSERT INTO approval_delivery_events
             (id, gate_id, subject_id, event, from_mode, to_mode, actor, live_url, created_at)
           VALUES (?, ?, ?, 'mode_switched', ?, ?, ?, NULL, ?)`,
          newId('ade'),
          input.gateId,
          subjectId,
          currentMode,
          nextMode,
          input.actor,
          now,
        );
      });
    }
  }

  const view = rowToGate(deps, getGateRow(deps, input.gateId)!);
  return { ok: true, value: { ...deps.mustGetCard(cardId), delivery: view.delivery! } };
}

/** Record a provider-verified automatic delivery without granting delivery authority. */
export function recordAutomaticDelivery(deps: GatesDeps, input: {
  gateId: string;
  subjectId: string;
  expectedDigest: string;
  actor: string;
  liveUrl: string;
}): Result<{ deliveryMode: 'automatic'; gateId: string; subjectId: string; digest: string; liveUrl: string }> {
  const gate = deps.sql.exec(`SELECT * FROM gates WHERE id = ?`, input.gateId).toArray()[0];
  const subject = deps.sql.exec(`SELECT * FROM approval_subjects WHERE id = ?`, input.subjectId).toArray()[0];
  const subjectView = deps.approvalSubjectView(input.subjectId);
  const requestDigest = record(record(subjectView?.canonical)?.outboundRequest)?.digest;
  if (
    !gate || gate.status !== 'resolved' || gate.decision !== 'approve_automatic' ||
    gate.approval_subject_id !== input.subjectId || gate.approval_subject_digest !== subjectView?.digest ||
    !subject || subject.status !== 'active' || subject.digest !== subjectView?.digest || requestDigest !== input.expectedDigest
  ) {
    return { ok: false, code: 'APPROVAL_SUBJECT_NOT_VERIFIED', message: 'automatic delivery approval and digest were not confirmed' };
  }
  let parsed: URL;
  try {
    parsed = new URL(input.liveUrl);
  } catch {
    return { ok: false, code: 'INVALID_LIVE_URL', message: 'live URL must be an absolute https URL' };
  }
  if (parsed.protocol !== 'https:') {
    return { ok: false, code: 'INVALID_LIVE_URL', message: 'live URL must be an absolute https URL' };
  }
  const liveUrl = parsed.toString();
  const now = deps.now();
  deps.ctx.storage.transactionSync(() => {
    deps.sql.exec(
      `UPDATE gates SET live_post_url = ?, live_post_url_recorded_by = ?, live_post_url_recorded_at = ?,
                        live_post_readback_status = 'matched' WHERE id = ?`,
      liveUrl, input.actor, now, input.gateId,
    );
    deps.sql.exec(
      `INSERT INTO approval_delivery_events
         (id, gate_id, subject_id, event, from_mode, to_mode, actor, live_url, created_at)
       VALUES (?, ?, ?, 'live_url_recorded', 'automatic', 'automatic', ?, ?, ?)`,
      newId('ade'), input.gateId, input.subjectId, input.actor, liveUrl, now,
    );
  });
  return { ok: true, value: { deliveryMode: 'automatic', gateId: input.gateId, subjectId: input.subjectId, digest: input.expectedDigest, liveUrl } };
}

export function createGate(deps: GatesDeps, cardId: string, stageKey: string, returnStageKey: string, producedBy: string, runId: string | null, approvalSubject: PreparedApprovalSubject | null = null): string {
  const id = newId('gate');
  const now = deps.now();
  const stage = deps.stages().find((candidate) => candidate.key === stageKey);
  deps.ctx.storage.transactionSync(() => {
    if (approvalSubject) {
      deps.sql.exec(
        `INSERT INTO approval_subjects
           (id, card_id, gate_stage_key, schema, revision, canonical_bytes, digest, status,
            producer_run_id, produced_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
        approvalSubject.id,
        cardId,
        stageKey,
        approvalSubject.schema,
        approvalSubject.revision,
        approvalSubject.canonicalBytes,
        approvalSubject.digest,
        approvalSubject.producerRunId,
        approvalSubject.producedBy,
        approvalSubject.createdAt,
      );
    }
    deps.sql.exec(
      `INSERT INTO gates
         (id, card_id, stage_key, return_stage_key, status, produced_by, options_json, created_at, run_id,
          approval_subject_id, approval_subject_digest, approval_decider_ids_json)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)`,
      id,
      cardId,
      stageKey,
      returnStageKey,
      producedBy,
      JSON.stringify(approvalSubject ? APPROVAL_SUBJECT_GATE_OPTIONS : DEFAULT_GATE_OPTIONS),
      now,
      runId,
      approvalSubject?.id ?? null,
      approvalSubject?.digest ?? null,
      approvalSubject ? JSON.stringify(stage?.approvalDeciderPrincipalIds ?? []) : null,
    );
    if (approvalSubject) {
      deps.sql.exec(`UPDATE cards SET active_approval_subject_id = ? WHERE id = ?`, approvalSubject.id, cardId);
    }
  });
  deps.emit('gate.opened', { gateId: id, cardId, stageKey });
  deps.notify('gate', cardId, `Review needed at ${stageKey}`);
  notifyGatePending(deps, id);
  return id;
}

/**
 * End everything on a card that is waiting on a person: its pending gates and its pending
 * questions. Returns how many were ended.
 *
 * Shared by the two ways a card stops being worked in place - a manual move and an archive - so
 * they cannot disagree about what "the review is over" means. Runs whose wait this ends (judged
 * by a pending gate, or asking a pending question) change reported state, so they are collected
 * BEFORE the cancels change what they read as and reported AFTER, in the same synchronous span.
 *
 * It does not touch the card row: the move re-queues the card and the archive keeps it where it
 * is, and each says so itself.
 */
export function cancelPendingReviews(deps: GatesDeps, cardId: string, now: string): number {
  const waitingRuns = new Set<string>();
  const gates = deps.sql.exec(`SELECT * FROM gates WHERE card_id = ? AND status = 'pending'`, cardId).toArray();
  for (const g of gates) {
    const judged = deps.runJudgedByGate(g);
    if (judged) waitingRuns.add(judged);
  }
  const questions = deps.sql.exec(`SELECT DISTINCT run_id FROM elicitations WHERE card_id = ? AND status = 'pending'`, cardId).toArray();
  for (const e of questions) waitingRuns.add(e.run_id as string);
  deps.sql.exec(`UPDATE gates SET status = 'cancelled', resolved_at = ? WHERE card_id = ? AND status = 'pending'`, now, cardId);
  deps.cancelElicitationsForCard(cardId);
  for (const r of waitingRuns) deps.reportRun(r);
  return gates.length + questions.length;
}

/**
 * What archiving does to a card's waiting on a person. Archiving takes a card out of the working
 * set, so whatever it was waiting on a person for ends with it - the same cancel a manual move
 * performs. Without this the gate stayed pending: in Needs you, in `supi gates`, pushed to the
 * bridges, for a card nobody can see.
 *
 * A card left in input-required with nothing pending would be restored as a silent wedge. So it
 * says why, in the card's own state: restoring never reopens the review (a cancelled gate stays
 * cancelled) - the person resumes it to an earlier stage or moves it, both of which exist.
 * Returns how many gates and questions were ended.
 */
export function endReviewsOfArchivedCard(deps: GatesDeps, cardId: string): number {
  const ended = cancelPendingReviews(deps, cardId, deps.now());
  if (ended > 0 && deps.getCardRow(cardId)?.state === 'input-required') {
    deps.setNeedsHuman(cardId, {
      reason: 'blocked',
      detail: 'its pending review or question was cancelled when the card was archived',
    });
  }
  return ended;
}

export function pendingGates(deps: GatesDeps): GateView[] {
  return deps.sql
    .exec(`SELECT * FROM gates WHERE status = 'pending' AND card_id NOT IN (SELECT id FROM cards WHERE archived_at IS NOT NULL) ORDER BY created_at ASC`)
    .toArray()
    .map((r) => rowToGate(deps, r as Row));
}

/**
 * Every gate on a card, decided ones included.
 *
 * `pendingGates` above answers "what is waiting on a human right now" and is what the board
 * snapshot carries. This answers "what was decided on this card, by whom, and with what
 * comment" — a question `gates.decided_by` and `gates.comment` could always have answered and
 * no read shape ever asked.
 */
export function gatesForCard(deps: GatesDeps, cardId: string): GateView[] {
  return deps.sql
    .exec(`SELECT * FROM gates WHERE card_id = ? ORDER BY created_at ASC`, cardId)
    .toArray()
    .map((r) => rowToGate(deps, r as Row));
}

/** One gate row as a `GateView`. Shared, so one gate and a card's gates cannot disagree. */
function rowToGate(deps: GatesDeps, r: Row): GateView {
  const subjectId = (r.approval_subject_id as string | null) ?? null;
  const approvalSubject = subjectId ? deps.approvalSubjectView(subjectId) : null;
  const decision = (r.decision as string | null) ?? null;
  const delivery =
    decision === 'approve_manual' || decision === 'approve_automatic'
      ? {
          mode: decision === 'approve_manual' ? ('manual' as const) : ('automatic' as const),
          liveUrl: (r.live_post_url as string | null) ?? null,
          remindAt: typeof r.live_post_remind_at === 'string' ? r.live_post_remind_at : null,
          readBackStatus: ((r.live_post_readback_status as 'not_checked' | 'matched' | 'mismatch' | null) ?? 'not_checked'),
          recordedBy: (r.live_post_url_recorded_by as string | null) ?? null,
          recordedAt: (r.live_post_url_recorded_at as string | null) ?? null,
        }
      : null;
  return {
    id: r.id as string,
    cardId: r.card_id as string,
    stageKey: r.stage_key as string,
    status: r.status as 'pending' | 'resolved',
    decision,
    options: JSON.parse(r.options_json as string) as GateOption[],
    producedBy: r.produced_by as string,
    createdAt: r.created_at as string,
    decidedBy: (r.decided_by as string | null) ?? null,
    comment: (r.comment as string | null) ?? null,
    resolvedAt: (r.resolved_at as string | null) ?? null,
    ...(approvalSubject
      ? { approvalSubject }
      : { summary: handoffSummary(deps.getCardHandoffJson(r.card_id as string)) }),
    ...(delivery ? { delivery } : {}),
  };
}

/** A card's session replay: its durable activity waterfall + the handoff carried into it (docs/07 §4). */
/**
 * One gate, including how it was decided.
 *
 * Gates were readable two ways and neither served the caller that needed this. `gates/pending`
 * answers only what is still waiting; the board snapshot is a human route. So a hub that had
 * posted a gate into a chat room had no way to learn it had since been decided on the web, or
 * what the decision was — and that room went on offering Approve and Reject for a decision
 * already made, with no expiry (agentpod: the sweep that settles those).
 */
export async function getGate(deps: GatesDeps, gateId: string): Promise<Result<GateView>> {
  const row = getGateRow(deps, gateId);
  if (!row) return { ok: false, code: 'GATE_NOT_FOUND', message: `gate not found: ${gateId}` };
  return { ok: true, value: rowToGate(deps, row) };
}

/** The gate row, or null. */
function getGateRow(deps: GatesDeps, gateId: string): Row | null {
  return (deps.sql.exec(`SELECT * FROM gates WHERE id = ?`, gateId).toArray()[0]) ?? null;
}

/**
 * The body a gate travels in, built once from the gate's own row.
 *
 * It carries what a projection needs to render a question without a second
 * round trip: the card's title, the stage, who produced the work, and the
 * options. `producedBy` is included because it is the subject of the
 * separation-of-duties check at resolution.
 *
 * Read from the row rather than from `DEFAULT_GATE_OPTIONS` so that a gate
 * keeps the options it opened with. They are the same today; a gate whose
 * wording changed under it after the fact would be a question answered
 * against a different set than the one it was asked with.
 *
 * `null` when the card is gone — a gate whose card was deleted has nothing
 * to ask about.
 */
function gatePendingBody(deps: GatesDeps, gate: Row): GatePendingBody | null {
  const cardId = gate.card_id as string;
  const card = deps.getCard(cardId);
  if (!card) return null;
  const boardId = deps.getMeta('boardId');
  const subjectId = (gate.approval_subject_id as string | null) ?? null;
  const subject = subjectId ? deps.approvalSubjectView(subjectId) : null;
  const approvalSubject = subject
    ? { id: subject.id, digest: subject.digest, schema: subject.schema, revision: subject.revision }
    : null;
  return {
    event: 'gate.pending',
    boardId,
    // `?? ''` rather than omitted: see `GatePendingBody.boardName`.
    boardName: deps.getMeta('name') ?? '',
    cardId,
    gateId: gate.id as string,
    stageKey: gate.stage_key as string,
    returnStageKey: gate.return_stage_key as string,
    cardTitle: card.title,
    producedBy: gate.produced_by as string,
    // What the reviewer is being asked to approve.
    //
    // Without it a gate asks someone to approve work they cannot see, and
    // the only way to read it is to leave for the board. That was the state
    // for a day (supermessage#37) because every test asserted the gate's
    // SHAPE rather than whether a human could act on one.
    handoffSummary: approvalSubject ? null : handoffSummary(deps.getCardHandoffJson(cardId)),
    ...(approvalSubject
      ? {
          approvalSubject,
          reviewUrl: `/b/${encodeURIComponent(boardId!)}/c/${encodeURIComponent(cardId)}`,
        }
      : {}),
    // `id`/`label`, not `name`/`title`: the wire names are pinned by
    // agentpod fixtures/ecosystem-identity/matrix_gate_events.json, which
    // three repos validate against. The board's own vocabulary stops here.
    options: (JSON.parse(gate.options_json as string) as GateOption[]).map((o) => ({
      id: o.name,
      label: o.title,
    })),
    ts: gate.created_at as string,
  };
}

/**
 * Queue `gate.pending` deliveries for a gate that just opened (docs/05 §4).
 *
 * **Fan-out is by subscription only** — deliberately unlike
 * `notifyWorkAvailable`, and this is the one thing about this method worth
 * reading twice. `work.available` is addressed to whoever could *claim* the
 * stage, so it matches on capability. A gate is addressed to the card's
 * **owner**, a human. Copying the capability match would send approval
 * requests to whichever agents happen to advertise the review stage's
 * capability — and, because a review stage is human-owned, to nobody at all.
 */
function notifyGatePending(deps: GatesDeps, gateId: string): void {
  const gate = getGateRow(deps, gateId);
  if (!gate) return;
  const payload = gatePendingBody(deps, gate);
  if (!payload) return;
  const body = JSON.stringify(payload);
  const ts = deps.now();
  for (const cfg of deps.sql.exec(`SELECT * FROM push_configs`).toArray()) {
    const events = JSON.parse(cfg.events_json as string) as string[];
    if (!events.includes('gate.pending')) continue;
    deps.sql.exec(
      `INSERT INTO push_deliveries (config_id, url, body, status, attempts, created_at) VALUES (?, ?, ?, 'pending', 0, ?)`,
      cfg.id,
      cfg.url,
      body,
      ts,
    );
  }
}

/**
 * Every gate still waiting on a human, in the body a push carries.
 *
 * The floor beneath push. superpipeline retries a delivery five times and then
 * dead-letters it, at which point the gate is silent: the card is blocked on
 * an approval nobody was told about, and neither side is looking. This is
 * what lets the hub ask independently rather than wait to be told.
 *
 * Deliberately not the board snapshot, which carries the same gates and is a
 * human route. See `test/gate-sweep.test.ts` for why that distinction is the
 * reason this method exists.
 */
export async function pendingGateDeliveries(deps: GatesDeps): Promise<GatePendingBody[]> {
  return deps.sql
    .exec(`SELECT * FROM gates WHERE status = 'pending' AND card_id NOT IN (SELECT id FROM cards WHERE archived_at IS NOT NULL) ORDER BY created_at ASC`)
    .toArray()
    .map((r) => gatePendingBody(deps, r as Row))
    .filter((b): b is GatePendingBody => b !== null);
}
