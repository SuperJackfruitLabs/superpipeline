import type { BoardContext } from './context';
import { deciderError, gateVariants } from './gate-choice';
import { type DeciderRole, gateQuorum } from './gate-quorum';
import type { CardView, Result, Row } from './model';
import { queueSubscribedPush } from './push';
import { COMMENT_MAX_BYTES, record } from './rules';
import type { DecisionPulledBackBody, DecisionReleasedBody, GateReleaseEnvelope, GateView } from './views';

/**
 * An approval may wait for its release time (charter: decisions/2026-11-09-an-approval-may-wait-
 * for-its-release-time.md). The release time is the later of the subject's own not-before time and
 * the approval's time plus the stage's `holdFor`, fixed when the gate resolves. Until then the gate
 * is resolved but the approval has not acted: the card stays on the gate's stage, no executor may
 * verify it, and anyone who may decide the gate (or an owner or admin) may pull it back. The board's
 * five-minute sweep releases it: the deferred action runs, or the card is blocked with the reason.
 */

export const HOLD_FOR_MIN = 5;
export const HOLD_FOR_MAX = 7 * 24 * 60;

/** Why a stage's `holdFor` is out of shape, or null. */
export function holdForError(value: unknown, label: string): string | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < HOLD_FOR_MIN || value > HOLD_FOR_MAX) {
    return `${label} must be a whole number of minutes from ${HOLD_FOR_MIN} to ${HOLD_FOR_MAX}`;
  }
  return null;
}

/** The `holdFor` a gate opened with, or null when its stage set none. */
export function gateHoldFor(gate: Row): number | null {
  const v = gate.hold_for_minutes;
  return typeof v === 'number' && holdForError(v, 'holdFor') === null ? v : null;
}

/** An ISO time in the one stored form (UTC, milliseconds), or null when it is not a time. */
function isoOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

type SubjectReader = Pick<BoardContext, 'approvalSubjectView'>;

function subjectTiming(deps: SubjectReader, subjectId: string) {
  return record(record(deps.approvalSubjectView(subjectId)?.canonical)?.timing);
}

/** A subject's not-before time, when its timing is `scheduled` with a valid time; else null. */
export function subjectNotBefore(deps: SubjectReader, subjectId: string): string | null {
  const timing = subjectTiming(deps, subjectId);
  return timing?.mode === 'scheduled' ? isoOrNull(timing.notBefore) : null;
}

/** A subject's `timing.expiresAt`, or null for none. */
function subjectExpiresAt(deps: SubjectReader, subjectId: string): string | null {
  return isoOrNull(subjectTiming(deps, subjectId)?.expiresAt);
}

/** The release time of an approval given at `approvedAt` (decision 1): the later of the two. */
export function releaseTimeFor(approvedAt: string, holdForMinutes: number | null, notBefore: string | null): string {
  const approvedMs = Date.parse(approvedAt);
  const held = holdForMinutes === null ? approvedMs : approvedMs + holdForMinutes * 60_000;
  const notBeforeMs = notBefore === null ? Number.NEGATIVE_INFINITY : Date.parse(notBefore);
  return new Date(Math.max(held, notBeforeMs)).toISOString();
}

/**
 * Judge an approval's release time before anything is recorded (decision 5). Returns the release
 * time when the approval must wait, null when it acts at once, or the refusal when it could never
 * act because its subject expires first.
 */
export function judgeReleaseTime(
  deps: SubjectReader,
  gate: Row,
  boundSubjectId: string | null,
  approvedAt: string,
): Result<string | null> {
  const holdFor = gateHoldFor(gate);
  const notBefore = boundSubjectId ? subjectNotBefore(deps, boundSubjectId) : null;
  if (holdFor === null && notBefore === null) return { ok: true, value: null };
  const releaseAt = releaseTimeFor(approvedAt, holdFor, notBefore);
  const expiresAt = boundSubjectId ? subjectExpiresAt(deps, boundSubjectId) : null;
  if (expiresAt !== null && Date.parse(releaseAt) > Date.parse(expiresAt)) {
    return {
      ok: false,
      code: 'APPROVAL_RELEASE_AFTER_EXPIRY',
      message: 'this approval could not act before its subject expires: its release time is after the expiry',
      detail: { releaseAt, expiresAt },
    };
  }
  return { ok: true, value: Date.parse(releaseAt) > Date.parse(approvedAt) ? releaseAt : null };
}

/** An approval recorded with a release time that has not acted yet: held, or pulled back. */
export function approvalNotActed(gate: Row): boolean {
  return typeof gate.release_at === 'string' && gate.released_at === null;
}

/** Held: waiting for its release time, not pulled back. */
export function approvalHeld(gate: Row): boolean {
  return approvalNotActed(gate) && gate.pulled_back_at === null;
}

/** The SQL twin of `approvalNotActed`, for a query over `gates`. */
export const NOT_ACTED_SQL = `(release_at IS NOT NULL AND released_at IS NULL)`;

/** The refusal an executor gets for an approval that has not been released (decision 3). */
export function heldError(gate: Row): Extract<Result<never>, { ok: false }> | null {
  if (!approvalNotActed(gate)) return null;
  return { ok: false, code: 'APPROVAL_HELD', message: 'this approval is held until its release time', detail: { releaseAt: gate.release_at } };
}

/**
 * A gate's `release` field (decision 7): present only when its snapshot has `holdFor` or a subject
 * it binds (any variant, on a variant gate) has a scheduled not-before time.
 */
export function releaseField(deps: SubjectReader & Pick<BoardContext, 'sql'>, gate: Row): { release?: GateReleaseEnvelope } {
  const holdFor = gateHoldFor(gate);
  const subjectIds =
    typeof gate.approval_subject_id === 'string' ? [gate.approval_subject_id] : gateVariants(deps.sql, gate).map((v) => v.subjectId);
  // The earliest of the variants' times: the card says when it could go out at the soonest.
  const times = subjectIds.map((id) => subjectNotBefore(deps, id)).filter((t): t is string => t !== null).toSorted();
  const notBefore = times[0];
  if (holdFor === null && notBefore === undefined) return {};
  return { release: { ...(holdFor !== null ? { holdForMinutes: holdFor } : {}), ...(notBefore !== undefined ? { notBefore } : {}) } };
}

/** A resolved gate's hold receipts: `heldUntil` while held, `releasedAt`, `pulledBack`. */
export function holdFields(gate: Row): Pick<GateView, 'heldUntil' | 'releasedAt' | 'pulledBack'> {
  return {
    ...(approvalHeld(gate) && typeof gate.release_at === 'string' ? { heldUntil: gate.release_at } : {}),
    ...(typeof gate.released_at === 'string' ? { releasedAt: gate.released_at } : {}),
    ...(typeof gate.pulled_back_at === 'string' && typeof gate.pulled_back_by === 'string'
      ? { pulledBack: { by: gate.pulled_back_by, at: gate.pulled_back_at, comment: typeof gate.pulled_back_comment === 'string' ? gate.pulled_back_comment : '' } }
      : {}),
  };
}

/** What a card held for its release time says it is waiting for. */
export function heldDetail(releaseAt: string): string {
  return `approved; held until ${releaseAt}, then it goes ahead unless pulled back`;
}

/** What release needs from the rest of the board. */
export type GateReleaseDeps = Pick<
  BoardContext,
  | 'actOnApproval'
  | 'approvalSubjectView'
  | 'emit'
  | 'getCardRow'
  | 'getMeta'
  | 'mustGetCard'
  | 'notify'
  | 'now'
  | 'scheduleReclaim'
  | 'sendBackForChanges'
  | 'setNeedsHuman'
  | 'sql'
  | 'subjectExpired'
>;

/** Why a held approval may not act at its release time, or null when it may (decision 5). */
function releaseBlockedReason(deps: GateReleaseDeps, gate: Row, nowIso: string): string | null {
  const cardId = typeof gate.card_id === 'string' ? gate.card_id : '';
  const card = deps.getCardRow(cardId);
  if (!card || card.archived_at) return 'the card was archived before the release time';
  if (card.current_stage_key !== gate.stage_key || card.state !== 'input-required') return 'the card left the review before the release time';
  const subjectId = typeof gate.approval_subject_id === 'string' ? gate.approval_subject_id : null;
  if (subjectId === null) return null;
  const subject = deps.sql.exec(`SELECT status, digest FROM approval_subjects WHERE id = ?`, subjectId).toArray()[0];
  if (card.active_approval_subject_id !== subjectId || subject?.status !== 'active' || subject.digest !== gate.approval_subject_digest) {
    return 'the approved subject changed before the release time';
  }
  if (deps.subjectExpired(subjectId, nowIso)) return 'the approved subject expired before the release time';
  return null;
}

/**
 * The sweep's job (decision 6): every held approval whose release time has come acts exactly as an
 * approval acts today, or, when it may no longer, its card is blocked with the reason. Either way
 * `released_at` is set, so it is never retried, and `decision.released` is pushed. Returns how many
 * acted or were blocked.
 */
export async function releaseHeldApprovals(deps: GateReleaseDeps, nowIso: string): Promise<number> {
  const due = deps.sql
    .exec(`SELECT * FROM gates WHERE release_at IS NOT NULL AND release_at <= ? AND released_at IS NULL AND pulled_back_at IS NULL ORDER BY release_at ASC`, nowIso)
    .toArray();
  let released = 0;
  for (const gate of due) {
    if (typeof gate.id !== 'string' || typeof gate.card_id !== 'string' || typeof gate.release_at !== 'string') continue;
    // Each gate on its own: one that cannot be released must not keep the rest held.
    try {
      const reason = releaseBlockedReason(deps, gate, nowIso);
      // Claimed by one statement before anything acts, and no await until the push is queued: the
      // object takes no other request in between, and a failure after the claim costs this one
      // release rather than repeating it every sweep. (Not a transaction: advancing may open a
      // chained gate, which writes in a transaction of its own.)
      const marked = deps.sql.exec(`UPDATE gates SET released_at = ? WHERE id = ? AND released_at IS NULL AND pulled_back_at IS NULL`, nowIso, gate.id);
      const claimed = marked.rowsWritten > 0;
      if (claimed && reason === null) {
        deps.setNeedsHuman(gate.card_id, null);
        deps.actOnApproval(gate.id);
      } else if (claimed && deps.getCardRow(gate.card_id)?.state === 'input-required') {
        deps.setNeedsHuman(gate.card_id, { reason: 'blocked', detail: `the approval did not go ahead: ${reason ?? ''}` });
      }
      if (!claimed) continue;
      const body: DecisionReleasedBody = {
        event: 'decision.released',
        boardId: deps.getMeta('boardId'),
        cardId: gate.card_id,
        gateId: gate.id,
        decision: typeof gate.decision === 'string' ? gate.decision : '',
        releaseAt: gate.release_at,
        releasedAt: nowIso,
        outcome: reason === null ? 'released' : 'blocked',
        ...(reason !== null ? { reason } : {}),
      };
      queueSubscribedPush(deps, body);
      deps.emit('decision.released', { gateId: gate.id, cardId: gate.card_id, outcome: body.outcome, ...(reason !== null ? { reason } : {}) });
      if (reason !== null) deps.notify('approval-release-blocked', gate.card_id, `A held approval did not go ahead: ${reason}.`);
      released += 1;
    } catch (err) {
      deps.emit('decision.release_failed', { gateId: gate.id, reason: String(err) });
    }
  }
  if (released > 0) await deps.scheduleReclaim();
  return released;
}

/**
 * Who may pull a held approval back (decision 4, "whose role decides"): an owner or admin by the
 * role in the verified token, or anyone who may decide the gate. Never an agent, never its producer.
 */
function pullBackDeciderError(gate: Row, by: string, role: DeciderRole): Extract<Result<never>, { ok: false }> | null {
  const refused = { ok: false as const, code: 'APPROVAL_DECIDER_NOT_ALLOWED' as const, message: 'this principal may not pull back this approval' };
  if (by.startsWith('agt_')) return refused;
  if (by === gate.produced_by) return { ok: false, code: 'SEPARATION_OF_DUTIES', message: 'the producer cannot pull back an approval of their own work' };
  if (role === 'owner' || role === 'admin') return null;
  const quorum = gateQuorum(gate);
  if (quorum?.from === 'admins') return refused;
  if (quorum?.deciders && quorum.deciders.length > 0 && !quorum.deciders.includes(by)) return refused;
  if (typeof gate.approval_decider_ids_json === 'string' && deciderError(gate, by)) return refused;
  return null;
}

/**
 * Pull a held approval back (decision 4): request changes in its effect. The card returns to the
 * gate's return stage with the comment as feedback, the subject is invalidated, and the next
 * submission opens a new gate. The gate keeps its decision and records who pulled it back.
 */
export async function pullBackApproval(
  deps: GateReleaseDeps,
  input: { gateId: string; by: string; comment: string; role?: DeciderRole },
): Promise<Result<CardView>> {
  const gate = deps.sql.exec(`SELECT * FROM gates WHERE id = ?`, input.gateId).toArray()[0];
  if (!gate || typeof gate.card_id !== 'string') return { ok: false, code: 'GATE_NOT_FOUND', message: `gate not found: ${input.gateId}` };
  const comment = typeof input.comment === 'string' ? input.comment.trim() : '';
  if (comment === '') return { ok: false, code: 'INVALID_COMMENT', message: 'pulling back an approval needs a comment saying why' };
  const bytes = new TextEncoder().encode(comment).length;
  if (bytes > COMMENT_MAX_BYTES) return { ok: false, code: 'INVALID_COMMENT', message: `a comment is at most ${COMMENT_MAX_BYTES} bytes; this one is ${bytes}` };
  if (typeof gate.release_at !== 'string') return { ok: false, code: 'GATE_NOT_HELD', message: 'this gate has no held approval to pull back' };
  if (typeof gate.released_at === 'string') return { ok: false, code: 'APPROVAL_RELEASED', message: 'this approval was already released; it can no longer be pulled back', detail: { releasedAt: gate.released_at } };
  if (typeof gate.pulled_back_at === 'string') return { ok: false, code: 'GATE_NOT_HELD', message: 'this approval was already pulled back' };
  const refused = pullBackDeciderError(gate, input.by, input.role ?? null);
  if (refused) return refused;
  const cardId = gate.card_id;
  // A card moved or archived during the hold is no longer this approval's to send back: its
  // release would be blocked for the same reason, and pulling it back would yank it from where it
  // was put.
  const card = deps.getCardRow(cardId);
  if (!card || card.archived_at || card.current_stage_key !== gate.stage_key || card.state !== 'input-required') {
    return { ok: false, code: 'GATE_NOT_HELD', message: 'the card left the review during the hold; this approval will not go ahead' };
  }
  const now = deps.now();
  // One statement claims it, and nothing awaits before the card is sent back: no release or second
  // pull-back can come between the claim and its effect.
  const marked = deps.sql.exec(
    `UPDATE gates SET pulled_back_at = ?, pulled_back_by = ?, pulled_back_comment = ? WHERE id = ? AND released_at IS NULL AND pulled_back_at IS NULL`,
    now,
    input.by,
    comment,
    input.gateId,
  );
  const pulled = marked.rowsWritten > 0;
  if (pulled) {
    deps.setNeedsHuman(cardId, null);
    deps.sendBackForChanges(input.gateId, input.by, comment, 'gate.pulled_back', now);
  }
  if (!pulled) return { ok: false, code: 'APPROVAL_RELEASED', message: 'this approval was released while it was being pulled back' };
  const body: DecisionPulledBackBody = {
    event: 'decision.pulled_back',
    boardId: deps.getMeta('boardId'),
    cardId,
    gateId: input.gateId,
    pulledBackBy: input.by,
    at: now,
    comment,
  };
  queueSubscribedPush(deps, body);
  deps.emit('decision.pulled_back', { gateId: input.gateId, cardId, by: input.by });
  await deps.scheduleReclaim();
  return { ok: true, value: deps.mustGetCard(cardId) };
}
