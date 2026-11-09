import { approvalSubjectKind } from '../approval-subject-kinds';
import { newId } from '../ids';
import type { BoardContext } from './context';
import { heldError } from './gate-release';
import type { Result } from './model';
import { record } from './rules';

/**
 * What an approved publication's delivery reports touch outside the gate's own decision: reading a
 * person-supplied live post back, and a publisher service reporting its own post. Split from
 * gates.ts, which keeps deciding and the delivery changes a person makes.
 */

/** What a delivery report needs from the rest of the board. */
export type GateDeliveryDeps = Pick<BoardContext, 'approvalSubjectView' | 'ctx' | 'now' | 'sql'>;

const READ_BACK_TIMEOUT_MS = 5_000;

export async function readBackStatus(url: URL, schema: string, approvedDigest: string): Promise<'not_checked' | 'matched' | 'mismatch'> {
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

/** Record a publisher-service report without claiming that SuperPipeline verified the post. */
export function recordAutomaticDelivery(deps: GateDeliveryDeps, input: {
  gateId: string;
  subjectId: string;
  expectedDigest: string;
  actor: string;
  liveUrl: string;
}): Result<{ deliveryMode: 'automatic'; gateId: string; subjectId: string; digest: string; liveUrl: string }> {

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
  return deps.ctx.storage.transactionSync(() => {
    // Re-read every authority-bearing field inside the write transaction. A
    // delivery report must not race a mode/status change or an expired subject.
    const gate = deps.sql.exec(`SELECT * FROM gates WHERE id = ?`, input.gateId).toArray()[0];
    const subject = deps.sql.exec(`SELECT * FROM approval_subjects WHERE id = ?`, input.subjectId).toArray()[0];
    const subjectView = deps.approvalSubjectView(input.subjectId);
    const canonical = record(subjectView?.canonical);
    const requestDigest = record(canonical?.outboundRequest)?.digest;
    const expiresAt = record(canonical?.timing)?.expiresAt;
    if (
      !gate || gate.status !== 'resolved' || gate.decision !== 'approve_automatic' ||
      gate.approval_subject_id !== input.subjectId || gate.approval_subject_digest !== subjectView?.digest ||
      !subject || subject.status !== 'active' || subject.digest !== subjectView?.digest || requestDigest !== input.expectedDigest ||
      typeof expiresAt !== 'string' || Date.parse(expiresAt) <= Date.parse(deps.now())
    ) {
      return { ok: false as const, code: 'APPROVAL_SUBJECT_NOT_VERIFIED', message: 'automatic delivery approval, digest, and expiry were not confirmed' };
    }
    // An approval that has not been released cannot have been delivered (release time, decision 3).
    const held = heldError(gate);
    if (held) return held;
    const existing = typeof gate.live_post_url === 'string' ? gate.live_post_url : null;
    if (existing !== null) {
      if (existing === liveUrl) {
        return { ok: true as const, value: { deliveryMode: 'automatic' as const, gateId: input.gateId, subjectId: input.subjectId, digest: input.expectedDigest, liveUrl } };
      }
      return { ok: false as const, code: 'APPROVAL_SUBJECT_NOT_VERIFIED', message: 'automatic delivery already has a different live URL' };
    }
    const now = deps.now();
    deps.sql.exec(
      `UPDATE gates SET live_post_url = ?, live_post_url_recorded_by = ?, live_post_url_recorded_at = ?,
                        live_post_readback_status = 'service_reported' WHERE id = ?`,
      liveUrl, input.actor, now, input.gateId,
    );
    deps.sql.exec(
      `INSERT INTO approval_delivery_events
         (id, gate_id, subject_id, event, from_mode, to_mode, actor, live_url, created_at)
       VALUES (?, ?, ?, 'live_url_recorded', 'automatic', 'automatic', ?, ?, ?)`,
      newId('ade'), input.gateId, input.subjectId, input.actor, liveUrl, now,
    );
    return { ok: true as const, value: { deliveryMode: 'automatic' as const, gateId: input.gateId, subjectId: input.subjectId, digest: input.expectedDigest, liveUrl } };
  });
}
