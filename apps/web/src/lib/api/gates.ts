/** Approval gates and questions, and deciding them. */
import { fetch, headers, noteAuth } from './client';

export interface GateOption {
  name: string;
  title: string;
  interactive?: boolean;
  /** One line saying what choosing this option does. */
  description?: string;
  /** Only a workspace owner or admin may choose it (strict "Always allow"); hidden from others. */
  requires?: 'workspace-admin';
}

/** Who decided a gate first, through which surface and when (the 409 body's fields). */
export interface GateConflict {
  decidedBy: string;
  decidedAt: string;
  via: 'matrix' | 'web' | 'api';
}

/** The 409 a gate answers when someone else decided it first — null for any other response. */
export async function parseGateConflict(res: Response): Promise<GateConflict | null> {
  if (res.status !== 409) return null;
  try {
    const e = ((await res.clone().json()) as { error?: Record<string, unknown> }).error;
    if (e?.code !== 'GATE_NOT_PENDING' || e.reason !== 'decided') return null;
    const via = e.via === 'matrix' || e.via === 'web' ? e.via : 'api';
    return { decidedBy: String(e.decidedBy ?? ''), decidedAt: String(e.decidedAt ?? ''), via };
  } catch {
    return null;
  }
}

export interface Gate {
  id: string;
  cardId: string;
  stageKey: string;
  status: string;
  options: GateOption[];
  producedBy: string;
  decision?: string | null;
  /**
   * Who decided, and what they said. Both columns were written on every resolution and appeared
   * in no read shape at all — so who approved what, and the feedback they gave with it, was
   * recorded and unreadable. Null while the gate is pending.
   */
  decidedBy?: string | null;
  comment?: string | null;
  resolvedAt?: string | null;
  /** What is being approved — the readable part of the handoff. On pending gates in the snapshot. Text only. */
  summary?: string | null;
  approvalSubject?: {
    id: string;
    digest: string;
    schema: string;
    revision: number;
    canonical: Record<string, unknown>;
  };
  delivery?: {
    mode: 'manual' | 'automatic';
    liveUrl: string | null;
    remindAt: string | null;
    readBackStatus: 'not_checked' | 'matched' | 'mismatch';
    recordedBy: string | null;
    recordedAt: string | null;
  };
}

export type GateDecision = 'approve' | 'approve_manual' | 'approve_automatic' | 'request_changes' | 'reject';

/**
 * A question an agent stopped to ask (docs/04 §4). The card waits in `input-required` while the
 * agent holds its lease; answering it here is what lets the agent carry on.
 */
export interface Elicitation {
  id: string;
  cardId: string;
  runId: string;
  stageKey: string;
  agentId: string;
  question: string;
  signal: string | null;
  options: GateOption[];
  status: 'pending' | 'answered' | 'cancelled';
  answer: { option: string | null; text: string | null; answeredBy: string; answeredAt: string } | null;
  createdAt: string;
  /** A strict decision's structured detail: what is being approved (readable approvals). */
  detail?: ApprovalDetail;
}

export interface ApprovalDetail {
  version: 1;
  summary: string;
  reason: string | null;
  files: { path: string; change: 'create' | 'edit' | 'delete'; bytes: number | null; preview: string | null }[];
  digest: string;
}

/** Resolve an approval gate. The resolver identity is the signed-in user (set by the server). */
export function resolveGate(
  boardId: string,
  gateId: string,
  decision: GateDecision,
  comment?: string,
  approvalSubject?: Pick<NonNullable<Gate['approvalSubject']>, 'id' | 'digest'>,
): Promise<Response> {
  return fetch(`/v1/boards/${boardId}/gates/${gateId}/resolve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      decision,
      comment,
      approvalSubjectId: approvalSubject?.id,
      approvalSubjectDigest: approvalSubject?.digest,
    }),
  }).then(noteAuth);
}

/** Change delivery mode or record a manually published URL; approved bytes stay unchanged. */
export function updateApprovalDelivery(
  boardId: string,
  gateId: string,
  update: { mode: 'manual' | 'automatic' } | { liveUrl: string } | { remindAt: string },
): Promise<Response> {
  return fetch(`/v1/boards/${boardId}/gates/${gateId}/delivery`, {
    method: 'POST',
    headers,
    body: JSON.stringify(update),
  }).then(noteAuth);
}

/**
 * Answer an agent's question. The answerer is the signed-in user (set by the server), which is also
 * how the board refuses an agent answering its own question.
 */
export function answerElicitation(
  boardId: string,
  elicitationId: string,
  answer: { option?: string; text?: string },
): Promise<Response> {
  return fetch(`/v1/boards/${boardId}/elicitations/${elicitationId}/answer`, {
    method: 'POST',
    headers,
    body: JSON.stringify(answer),
  });
}
