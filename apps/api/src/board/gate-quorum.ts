import type { GateDecision } from '@superpipeline/contract';
import type { Result, Row } from './model';

/**
 * A gate that needs more than one approver (charter: decisions/2026-11-09-a-gate-may-need-more-than-
 * one-approver.md). A stage's `quorum` is snapshotted onto each gate it opens, so a policy edit never
 * changes what an open gate asks for. Approvals are recorded in `gate_approvals`, one per person; the
 * approval that reaches `required` resolves the gate, and everything after it is the ordinary path.
 */

/** Who counts toward a quorum: the stage's deciders (the default), or the workspace's owners and admins. */
export type QuorumFrom = 'deciders' | 'admins';

export interface GateQuorum {
  required: number;
  from: QuorumFrom;
}

/** A quorum as a client may write it: `from` defaults to `deciders`. Stored as a `GateQuorum`. */
export interface QuorumInput {
  required: number;
  from?: QuorumFrom;
}

export const QUORUM_MIN = 2;
export const QUORUM_MAX = 5;

/** The workspace role an answer's token carried, as the route read it (`workspaceRoleFor`). */
export type DeciderRole = 'owner' | 'admin' | 'member' | 'viewer' | null;

/** One recorded approval, oldest first. */
export interface QuorumApproval {
  principalId: string;
  decision: string;
  variantId: string | null;
  at: string;
}

/**
 * Why a stage's quorum is out of shape, or null. `deciders` are the stage's named deciders: a quorum
 * of them may not ask for more approvals than there are people to give them.
 */
export function quorumError(value: unknown, label: string, deciders?: readonly string[]): string | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return `${label} must be an object`;
  const q = new Map<string, unknown>(Object.entries(value));
  const extra = [...q.keys()].filter((k) => k !== 'required' && k !== 'from');
  if (extra.length > 0) return `${label} takes required and from only, not ${extra.join(', ')}`;
  const required = q.get('required');
  if (typeof required !== 'number' || !Number.isInteger(required) || required < QUORUM_MIN || required > QUORUM_MAX) {
    return `${label}.required must be a whole number from ${QUORUM_MIN} to ${QUORUM_MAX}`;
  }
  const from = q.get('from');
  if (from !== undefined && from !== 'deciders' && from !== 'admins') return `${label}.from must be "deciders" or "admins"`;
  const named = deciders?.length ?? 0;
  if ((from ?? 'deciders') === 'deciders' && named > 0 && required > named) {
    return `${label}.required is ${required}, but the stage names only ${named} decider${named === 1 ? '' : 's'}`;
  }
  return null;
}

/** A quorum in its stored spelling: `from` always present. Call only on one `quorumError` accepts. */
export function cleanQuorum(q: object): GateQuorum {
  const required = 'required' in q && typeof q.required === 'number' ? q.required : QUORUM_MIN;
  const from: QuorumFrom = 'from' in q && q.from === 'admins' ? 'admins' : 'deciders';
  return { required, from };
}

/** The quorum a gate opened with, or null for a gate that passes on one approval. */
export function gateQuorum(gate: Row): GateQuorum | null {
  if (typeof gate.quorum_json !== 'string') return null;
  const parsed: unknown = JSON.parse(gate.quorum_json);
  return parsed !== null && typeof parsed === 'object' && quorumError(parsed, 'quorum') === null ? cleanQuorum(parsed) : null;
}

/** A gate's recorded approvals, oldest first. */
export function quorumApprovals(sql: SqlStorage, gateId: string): QuorumApproval[] {
  return sql
    .exec(`SELECT principal_id, decision, variant_id, created_at FROM gate_approvals WHERE gate_id = ? ORDER BY created_at, principal_id`, gateId)
    .toArray()
    .map((r) => ({
      principalId: text(r.principal_id),
      decision: text(r.decision),
      variantId: typeof r.variant_id === 'string' ? r.variant_id : null,
      at: text(r.created_at),
    }));
}

/** A stored string column, or '' when it is not one. */
function text(v: SqlStorageValue | undefined): string {
  return typeof v === 'string' ? v : '';
}

/** What judging one approval on a quorum gate decided. */
export interface QuorumJudgement {
  /** True when this approval reaches `required`: the gate resolves with `decision`. */
  reached: boolean;
  /**
   * The decision the gate resolves with: manual delivery unless every counted approval asked for
   * automatic (decision 6). The approver's own choice when nothing else was counted.
   */
  decision: GateDecision;
  /** How many approvals count for this one's variant, this one included. */
  count: number;
}

/**
 * Judge one approval against the gate's quorum (decisions 2, 3, 5 and 6). Refuses an agent, someone
 * who already approved, and, for `admins`, anyone whose token did not carry an owner or admin role.
 * Approvals are counted per variant; on a gate without variants `variantId` is null for all of them.
 */
export function judgeQuorumApproval(
  sql: SqlStorage,
  gateId: string,
  quorum: GateQuorum,
  input: { decidedBy: string; decision: GateDecision; deciderRole: DeciderRole; variantId: string | null },
): Result<QuorumJudgement> {
  if (input.decidedBy.startsWith('agt_')) {
    return { ok: false, code: 'APPROVAL_DECIDER_NOT_ALLOWED', message: 'an agent never counts toward a quorum' };
  }
  if (quorum.from === 'admins' && input.deciderRole !== 'owner' && input.deciderRole !== 'admin') {
    return { ok: false, code: 'APPROVAL_DECIDER_NOT_ALLOWED', message: "this gate needs approvals from the workspace's owners and admins" };
  }
  const recorded = quorumApprovals(sql, gateId);
  if (recorded.some((a) => a.principalId === input.decidedBy)) {
    return { ok: false, code: 'QUORUM_ALREADY_APPROVED', message: 'you have already approved this gate; it is waiting for other approvers' };
  }
  const counted = recorded.filter((a) => a.variantId === input.variantId);
  const count = counted.length + 1;
  const manual = input.decision === 'approve_manual' || counted.some((a) => a.decision === 'approve_manual');
  return {
    ok: true,
    value: { reached: count >= quorum.required, decision: manual ? 'approve_manual' : input.decision, count },
  };
}

/** Record one approval (decision 3). Called in the same write as the gate's resolution when it reaches the quorum. */
export function recordQuorumApproval(
  sql: SqlStorage,
  input: { gateId: string; principalId: string; decision: GateDecision; variantId: string | null; subjectId: string | null; subjectDigest: string | null; via: string; at: string },
): void {
  sql.exec(
    `INSERT INTO gate_approvals (gate_id, principal_id, decision, variant_id, subject_id, subject_digest, via, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    input.gateId,
    input.principalId,
    input.decision,
    input.variantId,
    input.subjectId,
    input.subjectDigest,
    input.via,
    input.at,
  );
}
