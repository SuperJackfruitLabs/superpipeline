import type { BoardContext } from './context';
import type { CardNeedsHuman, Result, Row } from './model';
import { deadlineField, startDecisionWait } from './decision-timeouts';
import { queueSubscribedPush } from './push';
import { COMMENT_MAX_BYTES } from './rules';
import type { AttentionPendingBody, AttentionReason } from './views';

/**
 * A card waiting on a person, as chat sees it (charter: decisions/2026-11-08-waiting-cards-and-
 * broker-approvals-reach-chat.md §1–2): `attention.pending`, its sweep read, and the wait id that
 * keeps a late answer from acting on a different wait.
 *
 * A question and a review already reach chat (question.v2, gate.v2), so only the other three
 * reasons a card parks are carried here.
 */

/** What attention needs from the rest of the board. */
export type AttentionDeps = Pick<BoardContext, 'getCard' | 'getCardRow' | 'getMeta' | 'now' | 'sql' | 'stages'>;

const ATTENTION_REASONS: ReadonlySet<string> = new Set<AttentionReason>(['repeated-failure', 'blocked', 'not-authorised']);

function isAttentionReason(v: unknown): v is AttentionReason {
  return typeof v === 'string' && ATTENTION_REASONS.has(v);
}

/**
 * The most characters the resume instruction may take: a comment is bounded in bytes, and one
 * character is at most three UTF-8 bytes, so a person typing up to this many is never refused.
 */
export const ATTENTION_INPUT_MAX = Math.floor(COMMENT_MAX_BYTES / 3);

type AttentionOption = AttentionPendingBody['options'][number];
const INSTRUCTION: NonNullable<AttentionOption['input']> = { kind: 'text', label: 'What should the next attempt do?', required: true, maxLength: ATTENTION_INPUT_MAX };
const CHOOSE: AttentionOption['meaning'] = 'choose';
const NO_COMMENT: AttentionOption['needsComment'] = false;

/** The parts of a card's needs-human reason chat carries, or null when it carries none. */
function needsOf(row: Row): Pick<CardNeedsHuman, 'detail' | 'failureCount' | 'summary'> & { reason: AttentionReason } | null {
  if (typeof row.needs_human_json !== 'string') return null;
  const parsed: unknown = JSON.parse(row.needs_human_json);
  if (parsed === null || typeof parsed !== 'object' || !('reason' in parsed) || !isAttentionReason(parsed.reason)) return null;
  return {
    reason: parsed.reason,
    ...('detail' in parsed && typeof parsed.detail === 'string' ? { detail: parsed.detail } : {}),
    ...('summary' in parsed && typeof parsed.summary === 'string' ? { summary: parsed.summary } : {}),
    ...('failureCount' in parsed && typeof parsed.failureCount === 'number' ? { failureCount: parsed.failureCount } : {}),
  };
}

/**
 * The wait a card is in right now, or null. A card waits while it is `input-required` with a
 * reason, and stops when it is archived: an archived card is out of the working set, so whatever
 * it was waiting on ended with it.
 */
export function currentWaitId(row: Row | null): string | null {
  if (!row || row.state !== 'input-required' || row.archived_at || typeof row.needs_human_json !== 'string') return null;
  return typeof row.needs_human_id === 'string' ? row.needs_human_id : null;
}

/**
 * Why an answer naming `expected` must not act, or null. Absent means the caller named no wait
 * (the board's own buttons), and nothing is checked.
 */
export function waitChangedError(row: Row | null, expected: string | undefined): Extract<Result<never>, { ok: false }> | null {
  if (expected === undefined) return null;
  const current = currentWaitId(row);
  if (current === expected) return null;
  return {
    ok: false,
    code: 'WAIT_CHANGED',
    message: current === null ? 'this card is no longer waiting on anybody' : 'this card is waiting on something else now',
  };
}

/**
 * The body a waiting card travels in, built once from the card's own row, or null when the card is
 * not in a wait chat carries (no wait, a question or review, or archived).
 */
function attentionPendingBody(deps: AttentionDeps, row: Row): AttentionPendingBody | null {
  const body = attentionBody(deps, row);
  return body ? { ...body, ...deadlineField(deps, 'attention', body.waitId) } : null;
}

/** The body without its deadline, which the push takes from the wait it just recorded. */
function attentionBody(deps: AttentionDeps, row: Row): AttentionPendingBody | null {
  const waitId = currentWaitId(row);
  const needs = needsOf(row);
  if (!waitId || !needs) return null;
  const card = typeof row.id === 'string' ? deps.getCard(row.id) : null;
  if (!card) return null;
  const stages = deps.stages();
  const at = stages.findIndex((s) => s.key === card.currentStageKey);
  const earlierStages = (at === -1 ? [] : stages.slice(0, at)).map((s) => ({ key: s.key, name: s.name }));
  return {
    event: 'attention.pending',
    boardId: deps.getMeta('boardId'),
    boardName: deps.getMeta('name') ?? '',
    cardId: card.id,
    cardTitle: card.title,
    stageKey: card.currentStageKey,
    stageName: at === -1 ? card.currentStageKey : (stages[at]?.name ?? card.currentStageKey),
    waitId,
    reason: needs.reason,
    detail: needs.detail ?? null,
    summary: needs.summary ?? null,
    failureCount: needs.failureCount ?? null,
    earlierStages,
    options: [
      { id: 'resume_here', label: 'Resume here', meaning: 'approve', needsComment: false, input: INSTRUCTION },
      ...earlierStages.map((s) => ({ id: `resume_at:${s.key}`, label: `Resume at ${s.name}`, meaning: CHOOSE, needsComment: NO_COMMENT, input: INSTRUCTION })),
      { id: 'archive', label: 'Archive', meaning: 'reject', needsComment: false },
    ],
    ts: [row.state_since, row.updated_at, row.created_at].find((t): t is string => typeof t === 'string') ?? '',
  };
}

/**
 * Queue `attention.pending` for a card that has just parked, when its wait is one chat carries.
 * Called by the two writers that park a card with a reason, after the write; the wait id the
 * trigger gave that write is the one the body names.
 */
export function notifyAttentionPending(deps: AttentionDeps, cardId: string): void {
  const row = deps.getCardRow(cardId);
  if (!row) return;
  const waiting = attentionBody(deps, row);
  if (!waiting) return;
  // A new wait id is a new wait, with its own deadlines, which the push carries.
  const deadline = startDecisionWait(deps, { kind: 'attention', decisionId: waiting.waitId, cardId: waiting.cardId, stageKey: waiting.stageKey, since: waiting.ts || deps.now() });
  const { ts, ...rest } = waiting;
  const payload: AttentionPendingBody = { ...rest, ...deadline, ts };
  queueSubscribedPush(deps, payload);
}

/**
 * Every card waiting on a person for a reason chat carries, in the body a push carries.
 *
 * The floor beneath push, as `pendingGateDeliveries` is for gates. **Absence** is the outcome: a
 * card the hub posted that is no longer listed (or is listed under a different `waitId`) has
 * stopped waiting on that wait, however it ended — resumed, archived, moved, or answered on the
 * board — and the hub closes what it posted.
 */
export async function pendingAttention(deps: AttentionDeps): Promise<AttentionPendingBody[]> {
  return deps.sql
    .exec(`SELECT * FROM cards WHERE state = 'input-required' AND needs_human_json IS NOT NULL AND archived_at IS NULL ORDER BY state_since ASC, created_at ASC, rowid ASC`)
    .toArray()
    .map((r) => attentionPendingBody(deps, r))
    .filter((b): b is AttentionPendingBody => b !== null);
}
