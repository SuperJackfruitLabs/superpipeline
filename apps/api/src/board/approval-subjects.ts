import { type GateDecision, stageCapabilitiesMet } from '@superpipeline/contract';
import { approvalSubjectKind, nonEmptyString } from '../approval-subject-kinds';
import { newId } from '../ids';
import type { JsonValue } from '../json';
import type { BoardContext } from './context';
import type { CardView, Result, StageDef } from './model';
import { isApproveDecision, record } from './rules';
import type { ApprovalSubjectVerification, ApprovalSubjectView, PreparedApprovalSubject } from './views';

/**
 * Immutable, digest-bound approval subjects: the canonical bytes a gate approves, preparing them
 * from a run, invalidating them when the card changes, and verifying them for the publisher.
 */

/** What approval subjects needs from the rest of the board. */
export type ApprovalSubjectsDeps = Pick<
  BoardContext,
  | 'authorizeRun'
  | 'getCardRow'
  | 'getMeta'
  | 'isAgentClaimable'
  | 'now'
  | 'nowMs'
  | 'sql'
  | 'stages'
>;

/** RFC 8785/JCS serialization for JSON values (ECMAScript primitives, sorted object keys). */
function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('approval subject contains a non-I-JSON number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value)
    .toSorted()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(',')}}`;
}

function storedBytes(value: SqlStorageValue): Uint8Array {
  if (typeof value === 'string') return new TextEncoder().encode(value);
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  throw new TypeError('approval subject canonical bytes are not binary');
}

function bytesBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function verifyApprovalSubject(deps: ApprovalSubjectsDeps, input: {
  runId: string;
  leaseEpoch: number;
  agentId?: string | null;
  expectedSchema: string;
  expectedSubjectId: string;
  expectedDigest: string;
  expectedAccount: JsonValue;
}): Promise<Result<ApprovalSubjectVerification>> {
  const auth = deps.authorizeRun(input);
  if (!auth.ok) return auth;
  const boardId = deps.getMeta('boardId');
  if (!boardId) return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };

  const run = auth.run;
  const cardId = run.card_id as string;
  const cardRow = deps.getCardRow(cardId);
  const subjectId = (cardRow?.active_approval_subject_id as string | null | undefined) ?? null;
  if (!cardRow || cardRow.current_stage_key !== run.stage_key || !subjectId) {
    return { ok: false, code: 'APPROVAL_SUBJECT_NOT_VERIFIED', message: 'the run is not bound to an active approval subject' };
  }

  const subjectRow = deps.sql.exec(`SELECT * FROM approval_subjects WHERE id = ?`, subjectId).toArray()[0];
  const gate = deps.sql
    .exec(`SELECT * FROM gates WHERE approval_subject_id = ? AND card_id = ? ORDER BY rowid DESC LIMIT 1`, subjectId, cardId)
    .toArray()[0];
  const subject = approvalSubjectView(deps, subjectId);
  const stage = deps.stages().find((candidate) => candidate.key === (run.stage_key as string));
  const kind = approvalSubjectKind(subject?.schema);
  if (
    !subjectRow ||
    !subject ||
    subjectRow.status !== 'active' ||
    subjectRow.card_id !== cardId ||
    !gate ||
    gate.status !== 'resolved' ||
    !isApproveDecision(gate.decision as GateDecision) ||
    gate.decision === 'approve_manual' ||
    gate.approval_subject_digest !== subject.digest ||
    gate.stage_key !== subjectRow.gate_stage_key ||
    !gate.decided_by ||
    !gate.resolved_at ||
    !stage ||
    !kind ||
    stage.ownerKind !== 'capability' ||
    !stageCapabilitiesMet(stage, [...kind.executorCapabilities])
  ) {
    return { ok: false, code: 'APPROVAL_SUBJECT_NOT_VERIFIED', message: 'approval subject and gate binding is not valid' };
  }
  if (
    subject.schema !== input.expectedSchema ||
    input.expectedSubjectId !== subject.id ||
    input.expectedDigest !== subject.digest
  ) {
    return { ok: false, code: 'APPROVAL_SUBJECT_NOT_VERIFIED', message: 'approval subject does not match executor expectations' };
  }

  const canonical = record(subject.canonical);
  const account = canonical?.account as JsonValue | undefined;
  const timing = record(canonical?.timing);
  const projectId = (cardRow.project_id as string | null | undefined) ?? null;
  if (
    !account ||
    !timing ||
    !nonEmptyString(timing.expiresAt) ||
    !projectId ||
    canonical?.cardId !== cardId ||
    canonical.projectId !== projectId
  ) {
    return { ok: false, code: 'APPROVAL_SUBJECT_NOT_VERIFIED', message: 'approval subject lacks its card, project, account, or expiry binding' };
  }
  if (canonicalJson(input.expectedAccount) !== canonicalJson(account)) {
    return { ok: false, code: 'APPROVAL_SUBJECT_NOT_VERIFIED', message: 'approval subject account does not match executor expectations' };
  }
  if (Date.parse(timing.expiresAt) <= deps.nowMs()) {
    return { ok: false, code: 'APPROVAL_SUBJECT_EXPIRED', message: 'approval subject has expired' };
  }

  return {
    ok: true,
    value: {
      boardId,
      projectId,
      cardId,
      runId: input.runId,
      stageKey: run.stage_key as string,
      canonicalBytesBase64: bytesBase64(storedBytes(subjectRow.canonical_bytes)),
      expiresAt: timing.expiresAt,
      subject: { ...subject, account },
      gate: {
        id: gate.id as string,
        decision: gate.decision as string,
        decidedBy: gate.decided_by as string,
        resolvedAt: gate.resolved_at as string,
      },
    },
  };
}

/** Retire the active subject without deleting its immutable audit row. */
export function invalidateApprovalSubject(deps: ApprovalSubjectsDeps, cardId: string, reason: string, invalidatedBy: string | null): void {
  const cardRow = deps.getCardRow(cardId);
  const subjectId = (cardRow?.active_approval_subject_id as string | null | undefined) ?? null;
  if (!subjectId) return;
  const now = deps.now();
  deps.sql.exec(
    `UPDATE approval_subjects
        SET status = 'invalidated', invalidated_at = ?, invalidated_by = ?, invalidation_reason = ?
      WHERE id = ? AND status = 'active'`,
    now,
    invalidatedBy,
    reason,
    subjectId,
  );
  deps.sql.exec(
    `UPDATE gates SET status = 'cancelled', resolved_at = ?
      WHERE approval_subject_id = ? AND status = 'pending'`,
    now,
    subjectId,
  );
  deps.sql.exec(`UPDATE cards SET active_approval_subject_id = NULL WHERE id = ?`, cardId);

  const stage = deps.stages().find((candidate) => candidate.key === (cardRow?.current_stage_key as string));
  if (stage && deps.isAgentClaimable(stage)) {
    // A publisher may already be looking for work. Parking the card prevents a fresh claim; any
    // existing run is fenced again by verifyApprovalSubject before it may cause a side effect.
    deps.sql.exec(
      `UPDATE cards SET state = 'input-required', delegate_agent_id = NULL, current_run_id = NULL, updated_at = ? WHERE id = ?`,
      now,
      cardId,
    );
  }
}

export async function prepareApprovalSubject(deps: ApprovalSubjectsDeps, card: CardView, stage: StageDef, handoff: JsonValue | undefined, runId: string, producedBy: string): Promise<Result<PreparedApprovalSubject>> {
  const invalid = (message: string): Result<PreparedApprovalSubject> => ({
    ok: false,
    code: 'INVALID_APPROVAL_SUBJECT',
    message,
  });
  const kind = approvalSubjectKind(stage.approvalSubjectSchema);
  if (!kind) {
    return invalid(`unsupported approval subject schema: ${stage.approvalSubjectSchema ?? ''}`);
  }
  if (!stage.approvalDeciderPrincipalIds?.length || stage.approvalDeciderPrincipalIds.some((id) => !nonEmptyString(id))) {
    return invalid(`stage "${stage.key}" needs at least one approval decider principal`);
  }
  if (card.projectId === null) return invalid('approval subject card needs a project');
  if (handoff === null || typeof handoff !== 'object' || Array.isArray(handoff)) {
    return invalid('approval subject handoff must be an object');
  }
  const payload = kind.payload(handoff);
  const payloadError = kind.validationError(payload);
  if (payloadError) return invalid(payloadError);

  const prior = deps.sql
    .exec(
      `SELECT COALESCE(MAX(revision), 0) AS revision FROM approval_subjects WHERE card_id = ? AND schema = ?`,
      card.id,
      kind.schema,
    )
    .one();
  const revision = Number(prior.revision) + 1;
  let canonical: string;
  try {
    canonical = canonicalJson({
      ...(payload as Record<string, JsonValue>),
      schema: kind.schema,
      cardId: card.id,
      projectId: card.projectId,
      revision,
    });
  } catch (error) {
    return invalid((error as Error).message);
  }
  const canonicalBytes = new TextEncoder().encode(canonical);
  const hash = await crypto.subtle.digest('SHA-256', canonicalBytes);
  const digest = `sha256:${[...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  return {
    ok: true,
    value: {
      id: newId('aps'),
      schema: kind.schema,
      revision,
      canonicalBytes,
      digest,
      producerRunId: runId,
      producedBy,
      createdAt: deps.now(),
    },
  };
}

export function approvalSubjectView(deps: ApprovalSubjectsDeps, id: string): ApprovalSubjectView | null {
  const row = deps.sql.exec(`SELECT * FROM approval_subjects WHERE id = ?`, id).toArray()[0];
  if (!row) return null;
  const stored = row.canonical_bytes as string | ArrayBuffer | ArrayBufferView;
  const canonicalText =
    typeof stored === 'string'
      ? stored
      : new TextDecoder().decode(stored instanceof ArrayBuffer ? new Uint8Array(stored) : stored);
  return {
    id: row.id as string,
    digest: row.digest as string,
    schema: row.schema as string,
    revision: Number(row.revision),
    canonical: JSON.parse(canonicalText) as JsonValue,
  };
}
