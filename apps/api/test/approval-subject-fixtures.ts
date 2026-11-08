import { env } from 'cloudflare:test';
import type { GateDecision } from '@superpipeline/contract';
import type { BoardDO, BoardInit } from '../src/board/board-do';
import type { JsonValue } from '../src/json';

/** Shared approval-subject fixtures. All values are generic; no live account or board data belongs here. */
export const DECIDER = 'usr_fixture_decider';
export const OTHER_HUMAN = 'usr_fixture_other';
export const PRODUCER = 'agt_fixture_writer';
export const PUBLISHER = 'agt_fixture_publisher';
export const ACCOUNT = { platform: 'x', userId: 'acct_fixture_1', username: 'fixture_account' };

export const STAGES = [
  { key: 'draft', name: 'Draft', order: 0, ownerKind: 'capability', owner: 'writing' },
  {
    key: 'approve',
    name: 'Approve exact payload',
    order: 1,
    ownerKind: 'human',
    gate: 'approval',
    approvalSubjectSchema: 'social-publish/v1',
    approvalDeciderPrincipalIds: [DECIDER],
  },
  { key: 'publish', name: 'Publish', order: 2, ownerKind: 'capability', owner: 'x-publish' },
  { key: 'recorded', name: 'Recorded', order: 3, ownerKind: 'human' },
] as BoardInit['stages'];

export function payload(expiresAt = '2030-01-02T03:04:05Z') {
  return {
    channel: 'x',
    account: ACCOUNT,
    items: [
      {
        index: 0,
        text: 'Exact fixture text — spacing and Unicode stay unchanged.\nSecond line.',
        media: [
          {
            objectRef: 'immutable://fixture/media-1',
            sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            mime: 'image/png',
            size: 12345,
            altText: 'A generic fixture image',
            rightsRef: 'evidence://fixture/rights-1',
          },
        ],
        replyToPostId: null,
        quotePostId: null,
      },
    ],
    timing: { mode: 'immediate', notBefore: null, expiresAt },
    evidenceRefs: ['https://example.invalid/evidence/fixture-1'],
    policy: {
      allowThread: true,
      duplicatePolicyId: 'fixture-duplicate-policy',
      floodPolicyId: 'fixture-flood-policy',
    },
  };
}

export type SubjectRow = {
  id: string;
  digest: string;
  status: string;
  canonical_bytes: ArrayBuffer | ArrayBufferView | string;
};

export type GateRow = {
  id: string;
  status: string;
  approval_subject_id: string;
  approval_subject_digest: string;
};

export function utf8(value: SubjectRow['canonical_bytes']): string {
  if (typeof value === 'string') return value;
  if (value instanceof ArrayBuffer) return new TextDecoder().decode(value);
  return new TextDecoder().decode(value);
}

export function base64(value: SubjectRow['canonical_bytes']): string {
  const bytes =
    typeof value === 'string'
      ? new TextEncoder().encode(value)
      : value instanceof ArrayBuffer
        ? new Uint8Array(value)
        : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function openBoundGate(
  board: BoardDO,
  state: DurableObjectState,
  suffix: string,
  options: {
    stages?: BoardInit['stages'];
    projectId?: string | null;
    publicationPayload?: unknown;
    boardId?: string;
    tenantId?: string;
  } = {},
) {
  await board.init({
    id: options.boardId ?? `brd_fixture_${suffix}`,
    tenantId: options.tenantId ?? 'tnt_fixture',
    name: 'Fixture board',
    stages: options.stages ?? STAGES,
  });
  return addBoundCard(board, state, options);
}

/** A further card at the bound gate on a board openBoundGate already set up. */
export async function addBoundCard(
  board: BoardDO,
  state: DurableObjectState,
  options: { projectId?: string | null; publicationPayload?: unknown } = {},
) {
  const made = await board.createCard({
    title: 'Sanitized approval fixture',
    ownerUserId: 'usr_fixture_owner',
    projectId: options.projectId === undefined ? 'prj_fixture' : options.projectId ?? undefined,
  });
  if (!made.ok) throw new Error(made.message);
  const claim = await board.claim({ agentId: PRODUCER, capabilities: ['writing'] });
  if (!claim.claimed) throw new Error('fixture draft was not claimable');
  const completed = await board.complete({
    runId: claim.runId,
    leaseEpoch: claim.leaseEpoch,
    handoff: { publicationPayload: options.publicationPayload ?? payload() } as never,
  });
  if (!completed.ok) throw new Error(completed.message);
  const subject = state.storage.sql.exec('SELECT * FROM approval_subjects WHERE card_id = ?', made.value.id).one() as SubjectRow;
  const gate = state.storage.sql.exec('SELECT * FROM gates WHERE card_id = ?', made.value.id).one() as GateRow;
  return { cardId: made.value.id, producerRunId: claim.runId, subject, gate };
}

/** A choice of variants for a handoff (charter 2026-11-09): each with an id, a label and a payload. */
export function variants(texts: string[] = ['First draft.', 'Second draft.'], expiresAt?: string[]) {
  return texts.map((text, i) => {
    const p = payload(expiresAt?.[i]);
    const [item] = p.items;
    return { id: `v${i + 1}`, label: `Variant ${i + 1}`, publicationPayload: { ...p, items: [{ ...item, text }] } };
  });
}

/** A stored string column, or '' when it is not one. */
const text = (v: SqlStorageValue | undefined): string => (typeof v === 'string' ? v : '');

/** A card at the bound gate with a choice of variants, on a board openBoundGate (or init) set up. */
export async function addVariantCard(board: BoardDO, state: DurableObjectState, handoff: JsonValue = { variants: variants() }) {
  const made = await board.createCard({ title: 'Variant approval fixture', ownerUserId: 'usr_fixture_owner', projectId: 'prj_fixture' });
  if (!made.ok) throw new Error(made.message);
  const claim = await board.claim({ agentId: PRODUCER, capabilities: ['writing'] });
  if (!claim.claimed) throw new Error('fixture draft was not claimable');
  const completed = await board.complete({ runId: claim.runId, leaseEpoch: claim.leaseEpoch, handoff });
  const subjects = state.storage.sql
    .exec('SELECT id, digest, status, revision FROM approval_subjects WHERE card_id = ? ORDER BY revision', made.value.id)
    .toArray()
    .map((r) => ({ id: text(r.id), digest: text(r.digest), status: text(r.status), revision: Number(r.revision) }));
  const row = state.storage.sql.exec('SELECT id, status, approval_subject_id, approval_subject_digest FROM gates WHERE card_id = ?', made.value.id).toArray()[0];
  const gate = row ? { id: text(row.id), status: text(row.status), approval_subject_id: row.approval_subject_id, approval_subject_digest: row.approval_subject_digest } : undefined;
  return { cardId: made.value.id, runId: claim.runId, leaseEpoch: claim.leaseEpoch, completed, subjects, gate };
}

export function boundDecision(gate: GateRow, subject: SubjectRow, decidedBy = DECIDER, decision: GateDecision = 'approve_automatic') {
  return {
    gateId: gate.id,
    decision,
    decidedBy,
    approvalSubjectId: subject.id,
    approvalSubjectDigest: subject.digest,
  };
}

export function auth(tenantId: string, extra: Record<string, string> = {}): Record<string, string> {
  return { 'X-Tenant-Id': tenantId, 'Content-Type': 'application/json', ...extra };
}

export const boardStub = (name: string): DurableObjectStub<BoardDO> => env.BOARD_DO.get(env.BOARD_DO.idFromName(name)) as unknown as DurableObjectStub<BoardDO>;
