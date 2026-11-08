import { newId } from '../ids';
import type { BoardContext } from './context';
import { allVariantsExpired, gateVariants } from './gate-choice';
import { EXPIRED_DECISION, record } from './rules';

/**
 * An expired approval subject closes its gate (charter: decisions/2026-11-08-unanswered-decisions-
 * remind-then-escalate.md, decision 7): the gate is closed as `expired`, and a manual delivery
 * still owed when its subject expires ends visibly on the card.
 */

/** What expiry needs from the rest of the board. */
export type GateExpiryDeps = Pick<
  BoardContext,
  'approvalSubjectView' | 'ctx' | 'emit' | 'getCardRow' | 'invalidateApprovalSubject' | 'notify' | 'now' | 'reportRun' | 'runJudgedByGate' | 'setNeedsHuman' | 'sql'
>;


/** What a card whose approval expired says it is waiting for. */
const EXPIRED_GATE_DETAIL = 'its approval expired before anyone decided; resume it to an earlier stage to produce it again, or move it';

/** When a subject's binding stops being valid (`timing.expiresAt` of its payload), or null for never. */
function subjectExpiresAt(deps: GateExpiryDeps, subjectId: string): string | null {
  const view = deps.approvalSubjectView(subjectId);
  const timing = record(record(view?.canonical)?.timing);
  return typeof timing?.expiresAt === 'string' ? timing.expiresAt : null;
}

export function subjectExpired(deps: GateExpiryDeps, subjectId: string, nowIso: string = deps.now()): boolean {
  const expiresAt = subjectExpiresAt(deps, subjectId);
  return expiresAt !== null && Date.parse(expiresAt) <= Date.parse(nowIso);
}

/**
 * Close a pending subject-bound gate whose subject expired (charter decision 7). It is recorded
 * as `status: 'resolved', decision: 'expired'` with no decider, so every reader that settles a
 * decided gate — the hub's sweep reads `GET gates/:id` and settles only a resolved gate with a
 * decision — settles this one too, and it leaves `gates/pending`. The subject is invalidated (its
 * bytes can no longer be approved), the card stays where it is and says why, and the card's gate
 * history keeps the outcome. Returns whether this call closed it.
 */
export function expireGate(deps: GateExpiryDeps, gateId: string): boolean {
  const gate = deps.sql.exec(`SELECT * FROM gates WHERE id = ?`, gateId).toArray()[0];
  if (gate?.status !== 'pending' || typeof gate.card_id !== 'string') return false;
  const cardId = gate.card_id;
  const stageKey = typeof gate.stage_key === 'string' ? gate.stage_key : '';
  const subjectId = typeof gate.approval_subject_id === 'string' ? gate.approval_subject_id : null;
  // A pending variant gate has no subject of its own; its variants are retired with the gate.
  const choosing = subjectId === null && gateVariants(deps.sql, gate).length > 0;
  const judged = deps.runJudgedByGate(gate);
  const now = deps.now();
  const closed = deps.ctx.storage.transactionSync(() => {
    const marked = deps.sql.exec(
      `UPDATE gates SET status = 'resolved', decision = ?, decided_by = NULL, resolved_at = ? WHERE id = ? AND status = 'pending'`,
      EXPIRED_DECISION,
      now,
      gateId,
    );
    if (marked.rowsWritten === 0) return false;
    if (choosing || (subjectId && deps.getCardRow(cardId)?.active_approval_subject_id === subjectId)) {
      deps.invalidateApprovalSubject(cardId, 'gate.expired', null);
    }
    if (deps.getCardRow(cardId)?.state === 'input-required') {
      deps.setNeedsHuman(cardId, { reason: 'blocked', detail: EXPIRED_GATE_DETAIL });
    }
    return true;
  });
  if (!closed) return false;
  deps.emit('gate.resolved', { gateId, cardId, decision: EXPIRED_DECISION, decidedBy: null });
  deps.notify('gate', cardId, `The approval at ${stageKey} expired before anyone decided: ${EXPIRED_GATE_DETAIL}.`);
  if (judged) deps.reportRun(judged);
  return true;
}

/**
 * Close every pending subject-bound gate whose subject has expired, and every pending variant gate
 * all of whose variants have (charter 2026-11-09: a variant past its expiry cannot be chosen, and
 * the choice lapses with the last one). The sweep's job; returns how many.
 */
export function expireLapsedGates(deps: GateExpiryDeps, nowIso: string): number {
  let closed = 0;
  const rows = deps.sql
    .exec(`SELECT id, approval_subject_id, approval_decider_ids_json FROM gates WHERE status = 'pending' AND (approval_subject_id IS NOT NULL OR approval_decider_ids_json IS NOT NULL)`)
    .toArray();
  for (const row of rows) {
    if (typeof row.id !== 'string') continue;
    // Each gate on its own: one that cannot be closed must not keep the rest open.
    try {
      const lapsed =
        typeof row.approval_subject_id === 'string'
          ? subjectExpired(deps, row.approval_subject_id, nowIso)
          : allVariantsExpired({ subjectExpired: (id, at) => subjectExpired(deps, id, at) }, gateVariants(deps.sql, row), nowIso);
      if (lapsed && expireGate(deps, row.id)) closed += 1;
    } catch (err) {
      deps.emit('gate.expiry_failed', { gateId: row.id, reason: String(err) });
    }
  }
  return closed;
}

/**
 * End, visibly, every manual delivery whose approval expired before its live link was recorded.
 *
 * `delivery.pending` stops being owed at the subject's expiry (`deliveryPendingBody`), and until
 * this the follow-up just dropped out of the list. Now the card records it once: an `expired`
 * delivery event on the gate, a notice to the card's owner, and the card's own wait says so. The
 * approval stays as it was — a person who posted before the expiry may still record the link.
 * Returns how many were ended.
 */
export function endLapsedDeliveries(deps: GateExpiryDeps, nowIso: string): number {
  let ended = 0;
  const rows = deps.sql
    .exec(
      `SELECT id, card_id, approval_subject_id FROM gates
        WHERE status = 'resolved' AND decision = 'approve_manual' AND live_post_url IS NULL AND approval_subject_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM approval_delivery_events e WHERE e.gate_id = gates.id AND e.event = 'expired')`,
    )
    .toArray();
  for (const row of rows) {
    if (typeof row.id !== 'string' || typeof row.card_id !== 'string' || typeof row.approval_subject_id !== 'string') continue;
    try {
      const cardId = row.card_id;
      const cardRow = deps.getCardRow(cardId);
      if (!cardRow || cardRow.archived_at || cardRow.active_approval_subject_id !== row.approval_subject_id) continue;
      if (!subjectExpired(deps, row.approval_subject_id, nowIso)) continue;
      const now = deps.now();
      deps.ctx.storage.transactionSync(() => {
        deps.sql.exec(
          `INSERT INTO approval_delivery_events
             (id, gate_id, subject_id, event, from_mode, to_mode, actor, live_url, created_at)
           VALUES (?, ?, ?, 'expired', 'manual', 'manual', 'system', NULL, ?)`,
          newId('ade'),
          row.id,
          row.approval_subject_id,
          now,
        );
        if (cardRow.state === 'input-required') {
          deps.setNeedsHuman(cardId, { reason: 'blocked', detail: EXPIRED_DELIVERY_DETAIL });
        }
      });
      deps.emit('delivery.expired', { gateId: row.id, cardId: row.card_id });
      deps.notify('approval-delivery-expired', row.card_id, `Manual delivery expired: ${EXPIRED_DELIVERY_DETAIL}.`);
      ended += 1;
    } catch (err) {
      deps.emit('delivery.expiry_failed', { gateId: row.id, reason: String(err) });
    }
  }
  return ended;
}

const EXPIRED_DELIVERY_DETAIL = 'the approval expired before a live link was recorded; record the link if it was posted in time, or resume it to produce it again';
