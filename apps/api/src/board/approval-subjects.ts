import { type GateDecision, stageCapabilitiesMet } from '@superpipeline/contract';
import { approvalSubjectKind, nonEmptyString, type ApprovalSubjectKind } from '../approval-subject-kinds';
import { newId } from '../ids';
import type { JsonValue } from '../json';
import type { BoardContext } from './context';
import type { CardView, Result, StageDef } from './model';
import { isApproveDecision, record, VARIANT_ID_MAX, VARIANT_LABEL_MAX, VARIANTS_MAX } from './rules';
import type { ApprovalSubjectVerification, ApprovalSubjectView, PreparedApproval, PreparedApprovalSubject, PreparedVariant } from './views';

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

function base64Bytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bigEndianSize(value: number, bytes: 4 | 8): Uint8Array {
  const out = new Uint8Array(bytes);
  const view = new DataView(out.buffer);
  if (bytes === 4) view.setUint32(0, value);
  else view.setBigUint64(0, BigInt(value));
  return out;
}

/** Must match stk approval.GatedRequest.Digest: labelled, length-prefixed complete request bytes. */
async function completeRequestDigest(value: unknown): Promise<string> {
  const request = record(value);
  if (!request || !nonEmptyString(request.method) || !nonEmptyString(request.url) || typeof request.bodyBase64 !== 'string' || !Array.isArray(request.mediaSha256)) {
    throw new TypeError('publicationPayload.outboundRequest must contain method, url, bodyBase64, and ordered mediaSha256');
  }
  const mediaSha256: string[] = [];
  for (const digest of request.mediaSha256) {
    if (typeof digest !== 'string' || !/^[0-9a-f]{64}$/.test(digest)) {
      throw new TypeError('publicationPayload.outboundRequest must contain method, url, bodyBase64, and ordered mediaSha256');
    }
    mediaSha256.push(digest);
  }
  try {
    const parsed = new URL(request.url);
    if (!parsed.protocol || !parsed.hostname) throw new TypeError();
  } catch {
    throw new TypeError('publicationPayload.outboundRequest.url must be absolute');
  }
  const chunks: Uint8Array[] = [];
  const add = (label: string, bytes: Uint8Array) => {
    const labelBytes = new TextEncoder().encode(label);
    chunks.push(bigEndianSize(labelBytes.length, 8), labelBytes, bigEndianSize(bytes.length, 8), bytes);
  };
  add('method', new TextEncoder().encode(request.method));
  add('url', new TextEncoder().encode(request.url));
  add('body', base64Bytes(request.bodyBase64));
  chunks.push(bigEndianSize(mediaSha256.length, 8));
  mediaSha256.forEach((digest, index) => {
    const pairs = digest.match(/../g);
    if (!pairs) throw new TypeError('publicationPayload.outboundRequest.mediaSha256 is invalid');
    add(`media:${index}`, Uint8Array.from(pairs, (byte) => Number.parseInt(byte, 16)));
  });
  const bytes = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return `sha256:${[...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
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

/** Confirm the durable automatic-delivery decision to an authenticated publisher service. */
export function confirmApprovalSubject(deps: ApprovalSubjectsDeps, input: {
  subjectId: string;
  expectedDigest: string;
}): Result<{
  approved: boolean;
  deliveryMode: string;
  subjectId: string;
  digest: string;
  gateId: string;
  expiresAt: string;
  gateStatus: string;
}> {
  const subjectRow = deps.sql.exec(`SELECT * FROM approval_subjects WHERE id = ?`, input.subjectId).toArray()[0];
  const gate = deps.sql
    .exec(`SELECT * FROM gates WHERE approval_subject_id = ? ORDER BY rowid DESC LIMIT 1`, input.subjectId)
    .toArray()[0];
  const subject = approvalSubjectView(deps, input.subjectId);
  const canonical = record(subject?.canonical);
  const timing = canonical?.timing;
  const expiresAt = record(timing)?.expiresAt;
  const confirmedExpiresAt = nonEmptyString(expiresAt) ? expiresAt : '';
  const outboundRequest = record(canonical?.outboundRequest);
  const requestDigest = outboundRequest?.digest;
  if (!subjectRow || !subject || !gate || !nonEmptyString(gate.id) || !nonEmptyString(requestDigest)) {
    return { ok: false, code: 'APPROVAL_SUBJECT_NOT_VERIFIED', message: 'automatic delivery approval was not confirmed' };
  }
  const approved =
    subjectRow.status === 'active' &&
    gate.status === 'resolved' &&
    gate.decision === 'approve_automatic' &&
    gate.approval_subject_digest === subject.digest &&
    input.expectedDigest === requestDigest &&
    nonEmptyString(expiresAt) &&
    Date.parse(expiresAt) > deps.nowMs();
  return {
    ok: true,
    value: {
      approved,
      deliveryMode: gate.decision === 'approve_automatic' ? 'automatic' : gate.decision === 'approve_manual' ? 'manual' : 'none',
      subjectId: subject.id,
      digest: requestDigest,
      gateId: gate.id,
      expiresAt: confirmedExpiresAt,
      gateStatus: typeof gate.status === 'string' ? gate.status : '',
    },
  };
}

/**
 * Retire the active subject without deleting its immutable audit row, and cancel the pending gate
 * bound to it. A variant gate whose choice is not yet made has no subject of its own (charter
 * 2026-11-09): every still-active variant of such a gate on the card is retired with it, and the
 * gate, when still pending, is cancelled, so a changed card can approve none of them.
 */
export function invalidateApprovalSubject(deps: ApprovalSubjectsDeps, cardId: string, reason: string, invalidatedBy: string | null): void {
  const cardRow = deps.getCardRow(cardId);
  const subjectId = (cardRow?.active_approval_subject_id as string | null | undefined) ?? null;
  const unchosen = deps.sql
    .exec(
      `SELECT v.gate_id, v.subject_id FROM gate_variants v
         JOIN gates g ON g.id = v.gate_id JOIN approval_subjects s ON s.id = v.subject_id
        WHERE g.card_id = ? AND g.approval_subject_id IS NULL AND s.status = 'active'`,
      cardId,
    )
    .toArray();
  if (!subjectId && unchosen.length === 0) return;
  const now = deps.now();
  const retire = (id: SqlStorageValue) =>
    deps.sql.exec(
      `UPDATE approval_subjects
          SET status = 'invalidated', invalidated_at = ?, invalidated_by = ?, invalidation_reason = ?
        WHERE id = ? AND status = 'active'`,
      now,
      invalidatedBy,
      reason,
      id,
    );
  if (subjectId) {
    retire(subjectId);
    deps.sql.exec(
      `UPDATE gates SET status = 'cancelled', resolved_at = ?
        WHERE approval_subject_id = ? AND status = 'pending'`,
      now,
      subjectId,
    );
    deps.sql.exec(`UPDATE cards SET active_approval_subject_id = NULL WHERE id = ?`, cardId);
  }
  for (const row of unchosen) {
    retire(row.subject_id);
    deps.sql.exec(`UPDATE gates SET status = 'cancelled', resolved_at = ? WHERE id = ? AND status = 'pending'`, now, row.gate_id);
  }

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

/** What a completion is refused with when its subject cannot be frozen. */
function invalidSubject(message: string): { ok: false; code: 'INVALID_APPROVAL_SUBJECT'; message: string } {
  return { ok: false, code: 'INVALID_APPROVAL_SUBJECT', message };
}

/** A variant id or label: a string of 1 to `max` characters with no control characters. */
function boundedName(value: unknown, max: number): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > max || value.trim().length === 0) return false;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return false;
  }
  return true;
}

/**
 * Freeze what a completion hands an approval gate: one subject from the kind's payload, or,
 * when the handoff carries `variants` (charter 2026-11-09, decision 1), one subject per variant.
 * Each variant carries the fields its kind reads from a handoff, is validated exactly as a single
 * payload is, and gets its own revision (sequential, in order) and digest.
 */
export async function prepareApprovalSubject(deps: ApprovalSubjectsDeps, card: CardView, stage: StageDef, handoff: JsonValue | undefined, runId: string, producedBy: string): Promise<Result<PreparedApproval>> {
  const invalid = invalidSubject;
  const kind = approvalSubjectKind(stage.approvalSubjectSchema);
  if (!kind) {
    return invalid(`unsupported approval subject schema: ${stage.approvalSubjectSchema ?? ''}`);
  }
  if (!stage.approvalDeciderPrincipalIds?.length || stage.approvalDeciderPrincipalIds.some((id) => !nonEmptyString(id))) {
    return invalid(`stage "${stage.key}" needs at least one approval decider principal`);
  }
  const projectId = card.projectId;
  if (projectId === null) return invalid('approval subject card needs a project');
  if (handoff === null || typeof handoff !== 'object' || Array.isArray(handoff)) {
    return invalid('approval subject handoff must be an object');
  }
  const prior = deps.sql
    .exec(
      `SELECT COALESCE(MAX(revision), 0) AS revision FROM approval_subjects WHERE card_id = ? AND schema = ?`,
      card.id,
      kind.schema,
    )
    .one();
  const base = Number(prior.revision) + 1;
  const freeze = (payload: unknown, revision: number) =>
    freezeSubject(deps, kind, card.id, projectId, payload, revision, runId, producedBy);

  if (handoff.variants === undefined) {
    return freeze(kind.payload(handoff), base);
  }
  const variants = handoff.variants;
  if (kind.payload(handoff) !== undefined) return invalid('a handoff carries either variants or a single payload, not both');
  if (!Array.isArray(variants) || variants.length === 0 || variants.length > VARIANTS_MAX) {
    return invalid(`variants must be an array of 1 to ${VARIANTS_MAX}`);
  }
  const seen = new Set<string>();
  const prepared: PreparedVariant[] = [];
  for (let position = 0; position < variants.length; position += 1) {
    const variant = variants[position];
    if (variant === null || typeof variant !== 'object' || Array.isArray(variant)) return invalid(`variants[${position}] must be an object`);
    const { id, label } = variant;
    if (!boundedName(id, VARIANT_ID_MAX)) return invalid(`variants[${position}].id must be 1 to ${VARIANT_ID_MAX} characters`);
    if (seen.has(id)) return invalid(`variants[${position}].id "${id}" is not unique`);
    seen.add(id);
    if (!boundedName(label, VARIANT_LABEL_MAX)) return invalid(`variants[${position}].label must be 1 to ${VARIANT_LABEL_MAX} characters`);
    const subject = await freeze(kind.payload(variant), base + position);
    if (!subject.ok) return invalid(`variants[${position}]: ${subject.message}`);
    prepared.push({ variantId: id, label, subject: subject.value });
  }
  return { ok: true, value: { variants: prepared } };
}

/** One payload, validated by its kind and frozen as canonical bytes with its digest. */
async function freezeSubject(deps: ApprovalSubjectsDeps, kind: ApprovalSubjectKind, cardId: string, projectId: string, payload: unknown, revision: number, runId: string, producedBy: string): Promise<Result<PreparedApprovalSubject>> {
  const invalid = invalidSubject;
  const payloadError = kind.validationError(payload);
  if (payloadError) return invalid(payloadError);
  const outboundRequest = record(record(payload)?.outboundRequest);
  let requestDigest: string | null = null;
  if (outboundRequest) {
    try {
      requestDigest = await completeRequestDigest(outboundRequest);
    } catch (error) {
      return invalid(error instanceof Error ? error.message : 'publicationPayload.outboundRequest is invalid');
    }
    if (outboundRequest.digest !== undefined && outboundRequest.digest !== requestDigest) {
      return invalid('publicationPayload.outboundRequest.digest does not match its exact request bytes');
    }
  }
  let canonical: string;
  try {
    canonical = canonicalJson({
      ...(payload as Record<string, JsonValue>),
      ...(outboundRequest && requestDigest ? { outboundRequest: { ...outboundRequest, digest: requestDigest } } : {}),
      schema: kind.schema,
      cardId,
      projectId,
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
