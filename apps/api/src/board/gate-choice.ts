import type { GateDecision } from '@superpipeline/contract';
import type { BoardContext } from './context';
import type { Result, Row } from './model';
import { NOT_CHOSEN_REASON } from './rules';
import type { GateOptionMeaning } from './views';

/**
 * A gate that offers a choice of variants (charter: decisions/2026-11-09-a-gate-may-offer-a-choice-
 * of-variants.md). Each variant is its own frozen subject; the choice is the binding an approval
 * carries. Choosing makes the chosen variant the gate's and the card's subject and invalidates the
 * others as not chosen, so everything after it (delivery, the publisher's verify, expiry) is the
 * single-subject path, unchanged.
 *
 * Also the decider and option checks a subject-bound gate and a variant gate share.
 */

/** One variant of a gate, as stored in `gate_variants`. */
export interface GateVariant {
  position: number;
  variantId: string;
  label: string;
  subjectId: string;
  digest: string;
}

/** What judging a decision on a variant gate needs from the board. */
export type GateChoiceDeps = Pick<BoardContext, 'expireGate' | 'sql' | 'subjectExpired'>;

/** A stored string column, or '' when it is not one. */
function text(v: SqlStorageValue | undefined): string {
  return typeof v === 'string' ? v : '';
}

/**
 * A gate's variants in order; empty for any other gate. Read only for a gate with approval
 * deciders (every subject-bound gate has them), so a plain gate runs no extra statement.
 */
export function gateVariants(sql: SqlStorage, gate: Row): GateVariant[] {
  if (typeof gate.approval_decider_ids_json !== 'string' || typeof gate.id !== 'string') return [];
  return sql
    .exec(`SELECT position, variant_id, label, subject_id, digest FROM gate_variants WHERE gate_id = ? ORDER BY position`, gate.id)
    .toArray()
    .map((r) => ({ position: Number(r.position), variantId: text(r.variant_id), label: text(r.label), subjectId: text(r.subject_id), digest: text(r.digest) }));
}

/** Refused unless `decidedBy` is a human the stage named as a decider of its subject. */
export function deciderError(gate: Row, decidedBy: string): Result<never> | null {
  const deciders = JSON.parse((gate.approval_decider_ids_json as string | null) ?? '[]') as string[];
  if (decidedBy.startsWith('agt_') || !deciders.includes(decidedBy)) {
    return { ok: false, code: 'APPROVAL_DECIDER_NOT_ALLOWED', message: 'this principal is not an authorized human decider for the approval subject' };
  }
  return null;
}

/** Refused unless `decision` is one of the options the gate opened with. */
export function optionError(gate: Row, decision: GateDecision): Result<never> | null {
  const options: unknown = JSON.parse((gate.options_json as string | null) ?? '[]');
  if (
    !Array.isArray(options) ||
    !options.some((option) => option !== null && typeof option === 'object' && 'name' in option && option.name === decision)
  ) {
    return { ok: false, code: 'GATE_DECISION_NOT_ALLOWED', message: `decision "${decision}" is not one of this gate's options` };
  }
  return null;
}

const MISMATCH = (message: string): Result<never> => ({ ok: false, code: 'APPROVAL_SUBJECT_MISMATCH', message });

/**
 * Judge a decision on a variant gate whose choice is not yet made. Returns the variant an approval
 * chooses, or null for a request for changes or a rejection, which act on the whole set.
 *
 * An approval must carry the binding of exactly one variant of this gate whose subject is still
 * active and unexpired. A binding that names no variant is refused, approving or not. A variant
 * past its expiry cannot be chosen; when every variant has expired the gate is closed as expired,
 * as a single subject's gate is.
 */
export function judgeVariantDecision(
  deps: GateChoiceDeps,
  gate: Row,
  variants: GateVariant[],
  input: { gateId: string; decision: GateDecision; decidedBy: string; approvalSubjectId?: string; approvalSubjectDigest?: string },
  meaning: GateOptionMeaning,
): Result<GateVariant | null> {
  const refused = deciderError(gate, input.decidedBy) ?? optionError(gate, input.decision);
  if (refused) return refused;
  const bound = input.approvalSubjectId !== undefined || input.approvalSubjectDigest !== undefined;
  const named = variants.find((v) => v.subjectId === input.approvalSubjectId && v.digest === input.approvalSubjectDigest);
  if (bound && !named) return MISMATCH('the binding names no variant of this gate');
  if (meaning !== 'approve') return { ok: true, value: null };
  if (!named) return MISMATCH('an approval of a choice must carry the binding of the variant chosen');
  const subject = deps.sql.exec(`SELECT status, digest FROM approval_subjects WHERE id = ?`, named.subjectId).toArray()[0];
  if (subject?.status !== 'active' || subject.digest !== named.digest) return MISMATCH('the chosen variant is no longer active');
  if (deps.subjectExpired(named.subjectId)) {
    if (variants.every((v) => deps.subjectExpired(v.subjectId))) {
      deps.expireGate(input.gateId);
      return { ok: false, code: 'DECISION_EXPIRED', message: 'every variant expired before this decision; the gate is closed as expired' };
    }
    return { ok: false, code: 'DECISION_EXPIRED', message: 'the chosen variant expired; choose another, or request changes' };
  }
  return { ok: true, value: named };
}

/**
 * Settle a choice, inside the resolving transaction: the chosen variant becomes the gate's and the
 * card's subject, and every other variant is invalidated as not chosen.
 */
export function applyVariantChoice(sql: SqlStorage, now: string, gate: { id: string; cardId: string }, chosen: GateVariant, variants: GateVariant[], decidedBy: string): void {
  sql.exec(`UPDATE gates SET approval_subject_id = ?, approval_subject_digest = ? WHERE id = ?`, chosen.subjectId, chosen.digest, gate.id);
  sql.exec(`UPDATE cards SET active_approval_subject_id = ? WHERE id = ?`, chosen.subjectId, gate.cardId);
  for (const v of variants) {
    if (v.subjectId === chosen.subjectId) continue;
    sql.exec(
      `UPDATE approval_subjects
          SET status = 'invalidated', invalidated_at = ?, invalidated_by = ?, invalidation_reason = ?
        WHERE id = ? AND status = 'active'`,
      now,
      decidedBy,
      NOT_CHOSEN_REASON,
      v.subjectId,
    );
  }
}

/** Whether every variant's subject has expired by `nowIso`: then the gate expires. */
export function allVariantsExpired(deps: Pick<BoardContext, 'subjectExpired'>, variants: GateVariant[], nowIso: string): boolean {
  return variants.length > 0 && variants.every((v) => deps.subjectExpired(v.subjectId, nowIso));
}
