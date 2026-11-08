import { canTransition, nextState, type TaskEventType } from '@superpipeline/contract';
import { newId } from '../ids';
import { pendingApprovalRequestBodies } from './approval-requests';
import type { JsonValue } from '../json';
import type { BoardContext } from './context';
import { parseElicitationOptions } from './elicitation';
import type { GateOption } from './gate-option';
import type { AgentActivityInput, CardView, Result, Row } from './model';
import { HEARTBEAT_TIMEOUT_MS } from './rules';
import { posterSubject, posterSubjectEnvelope, PosterSubject, questionOptionMeaning, questionOptionScope, strictSubjectEnvelope, subjectAnswerError } from './question-subject';
import { ApprovalDetail, StrictDecision } from './strict-decision';
import type { ApprovalSubjectEnvelope, ElicitationPendingBody, ElicitationStatus, ElicitationView } from './views';

/**
 * An agent's questions (elicitations): asking, answering, cancelling, and their push body.
 */

/**
 * The longest typed answer a question takes, in characters. Advertised on a question with no
 * options (`freeText.maxLength`) and enforced by `answerElicitation`, so the two cannot disagree.
 */
export const ELICITATION_TEXT_MAX = 2000;

/** What questions needs from the rest of the board. */
export type ElicitationsDeps = Pick<
  BoardContext,
  | 'authorizeRun'
  | 'emit'
  | 'getCard'
  | 'getCardHandoffJson'
  | 'getMeta'
  | 'mustGetCard'
  | 'notify'
  | 'notifyWorkAvailable'
  | 'now'
  | 'nowMs'
  | 'parseHandoff'
  | 'reportRun'
  | 'scheduleReclaim'
  | 'setNeedsHuman'
  | 'sql'
>;

/**
 * Answer an agent's question (docs/04 §4) — the human half of the elicitation return path.
 *
 * Authorization has two halves and both matter. The **edge** only exposes this to a human
 * principal (a session; agent tokens reach `claims` and `runs/*` and nothing else). Here, where
 * every surface must pass, the **asking agent is refused by identity**: an elicitation an agent
 * can answer itself is decorative, and this is the same separation-of-duties rule `resolveGate`
 * already enforces for the producer of a gate.
 *
 * The card moves through the **state machine's own** transition — `human_reply` out of
 * `input-required`, `account_linked` out of `auth-required` — rather than a second, parallel
 * path: if the contract stops allowing it, this stops doing it.
 *
 * Answering a settled question is a typed conflict, never a second transition, so a double-click
 * (or a retried delivery) cannot move a card twice.
 */
export async function answerElicitation(deps: ElicitationsDeps, input: {
  elicitationId: string;
  answeredBy: string;
  /** The answerer's workspace role, from the server's own session read; never the client's. */
  answererRole?: 'owner' | 'admin' | 'member' | 'viewer' | null;
  option?: string;
  text?: string;
  /** The subject the answerer was shown (charter: strict decisions bind their subject §4). */
  subject?: { id: string; digest: string };
}): Promise<Result<{ card: CardView; elicitation: ElicitationView }>> {
  const row = deps.sql.exec(`SELECT * FROM elicitations WHERE id = ?`, input.elicitationId).toArray()[0];
  if (!row) {
    return { ok: false, code: 'ELICITATION_NOT_FOUND', message: `elicitation not found: ${input.elicitationId}` };
  }
  const elicitation = rowToElicitation(deps, row);
  if (elicitation.status !== 'pending') {
    return {
      ok: false,
      code: 'ELICITATION_NOT_PENDING',
      message: `this question is already ${elicitation.status}`,
    };
  }
  if (input.answeredBy === elicitation.agentId) {
    return { ok: false, code: 'SEPARATION_OF_DUTIES', message: 'the agent that asked cannot answer its own question' };
  }
  const card = deps.getCard(elicitation.cardId);
  if (!card) return { ok: false, code: 'CARD_NOT_FOUND', message: `card not found: ${elicitation.cardId}` };

  if (elicitation.strictDecision) {
    const saved = deps.sql.exec(`SELECT lease_epoch FROM strict_decision_requests WHERE elicitation_id = ?`, elicitation.id).one();
    const auth = deps.authorizeRun({ runId: elicitation.runId, leaseEpoch: Number(saved.lease_epoch), agentId: elicitation.agentId });
    if (!auth.ok || Number(auth.run.last_heartbeat_ms) + HEARTBEAT_TIMEOUT_MS <= deps.nowMs() || card.currentStageKey !== elicitation.stageKey) return { ok: false, code: 'STALE_LEASE', message: 'decision no longer belongs to the active run' };
    if (elicitation.strictDecision.expires_at <= deps.nowMs()) return { ok: false, code: 'DECISION_EXPIRED', message: 'decision deadline expired' };
    // One of the options this decision offered (approve-run only where it was offered).
    if (!elicitation.options.some((o) => o.name === input.option)) return { ok: false, code: 'INVALID_ANSWER', message: 'choose an exact offered option' };
  }
  const text = input.text?.trim() ?? '';
  const option = input.option?.trim() ?? '';
  if (text.length > ELICITATION_TEXT_MAX) {
    return { ok: false, code: 'INVALID_ANSWER', message: `an answer is at most ${ELICITATION_TEXT_MAX} characters` };
  }
  const chosenOption = elicitation.options.find((o) => o.name === option);
  if (chosenOption?.requires === 'workspace-admin' && input.answererRole !== 'owner' && input.answererRole !== 'admin')
    return { ok: false, code: 'WORKSPACE_ADMIN_REQUIRED', message: 'Only a workspace owner or admin can choose Always allow.' };
  if (option !== '' && !elicitation.options.some((o) => o.name === option)) {
    return { ok: false, code: 'INVALID_ANSWER', message: `"${option}" is not one of the offered options` };
  }
  if (option === '' && text === '') {
    return {
      ok: false,
      code: 'INVALID_ANSWER',
      message: elicitation.options.length > 0 ? 'pick one of the offered options' : 'an answer needs some text',
    };
  }
  // A question with a subject is answered by an option, and an approving one carries the binding
  // the person saw (charter: strict decisions bind their subject §4).
  if (elicitation.approvalSubject) {
    if (!chosenOption) return { ok: false, code: 'INVALID_ANSWER', message: 'choose one of the offered options' };
    const refused = subjectAnswerError(elicitation.approvalSubject, questionOptionMeaning(chosenOption, elicitation.strictDecision !== undefined), input.subject, deps.nowMs());
    if (refused) return { ok: false, ...refused };
  }

  // A question an agent parked the card on (`complete` with `needs-person`) has no live run to
  // carry the answer back to: the card resumes by being worked again, at the same stage.
  const asker = deps.sql.exec(`SELECT status, handoff_json FROM runs WHERE id = ?`, elicitation.runId).toArray()[0];
  if (asker && (asker.status as string) === 'ended') {
    if (card.state !== 'input-required' || card.currentStageKey !== elicitation.stageKey) {
      return { ok: false, code: 'CARD_NOT_WAITING', message: `a card in "${card.state}" is not waiting on an answer` };
    }
    return resumeParkedQuestion(deps, elicitation, card, { option, text, answeredBy: input.answeredBy }, (asker.handoff_json as string | null) ?? null);
  }

  // The card must still be waiting on this answer, and it moves by the contract's transition.
  const event: TaskEventType = card.state === 'auth-required' ? 'account_linked' : 'human_reply';
  if (!canTransition(card.state, event)) {
    return { ok: false, code: 'CARD_NOT_WAITING', message: `a card in "${card.state}" is not waiting on an answer` };
  }
  const resumed = nextState(card.state, event);

  const now = deps.now();
  deps.sql.exec(
    `UPDATE elicitations SET status = 'answered', answer_option = ?, answer_text = ?, answered_by = ?, answered_at = ? WHERE id = ?`,
    option === '' ? null : option,
    text === '' ? null : text,
    input.answeredBy,
    now,
    elicitation.id,
  );
  deps.sql.exec(`UPDATE cards SET state = ?, updated_at = ? WHERE id = ?`, resumed, now, card.id);
  // Answered: the card is not waiting on anybody any more.
  deps.setNeedsHuman(card.id, null);

  // The answer joins the card's replay as a `prompt` — the human-authored activity type, which is
  // exactly what "resumes working" means in the activity vocabulary (docs/04 §4).
  const chosen = elicitation.options.find((o) => o.name === option);
  const body = [chosen?.title ?? option, text].filter((s) => s !== '' && s !== undefined).join(' — ');
  deps.sql.exec(
    `INSERT INTO activities (run_id, card_id, type, ephemeral, body, action, detail_json, ts)
     VALUES (?, ?, 'prompt', 0, ?, NULL, ?, ?)`,
    elicitation.runId,
    card.id,
    body,
    JSON.stringify({
      parameter: { elicitationId: elicitation.id, option: option === '' ? null : option },
      result: null,
      signal: null,
    }),
    now,
  );
  deps.emit('elicitation.answered', {
    elicitationId: elicitation.id,
    cardId: card.id,
    runId: elicitation.runId,
    option: option === '' ? null : option,
    answeredBy: input.answeredBy,
  });
  deps.reportRun(elicitation.runId);
  await deps.scheduleReclaim();
  return {
    ok: true,
    value: { card: deps.mustGetCard(card.id), elicitation: mustGetElicitation(deps, elicitation.id) },
  };
}

/**
 * Answer a question an agent parked its card on, and put the card back to work.
 *
 * The asking run has ended, so the answer cannot be "collected" the way a live run collects one.
 * Instead the card returns to `submitted` on the SAME stage, and the next claim is handed:
 *  - the stage's own input, unchanged — the work continues, it does not start from nothing;
 *  - `feedback` saying what was asked and what the person answered (the key AgentPod's card
 *    prompt lifts into its own section), keeping any earlier feedback beneath it;
 *  - `resumed`: the question, the answer, and the parked run's handoff as `workSoFar`.
 *
 * No failure is counted and the stage's automatic rework is not spent: a pause is not a fault.
 */
async function resumeParkedQuestion(deps: ElicitationsDeps, elicitation: ElicitationView, card: CardView, answer: { option: string; text: string; answeredBy: string }, parkedHandoffJson: string | null): Promise<Result<{ card: CardView; elicitation: ElicitationView }>> {
  const now = deps.now();
  const option = answer.option === '' ? null : answer.option;
  const text = answer.text === '' ? null : answer.text;
  deps.sql.exec(
    `UPDATE elicitations SET status = 'answered', answer_option = ?, answer_text = ?, answered_by = ?, answered_at = ? WHERE id = ?`,
    option,
    text,
    answer.answeredBy,
    now,
    elicitation.id,
  );
  const chosen = elicitation.options.find((o) => o.name === option);
  const said = [chosen?.title ?? option ?? '', text ?? ''].filter((s) => s !== '').join(' — ');

  const prior = deps.parseHandoff(deps.getCardHandoffJson(card.id));
  const base = prior && typeof prior === 'object' && !Array.isArray(prior) ? (prior as Record<string, JsonValue>) : {};
  const earlier = typeof base.feedback === 'string' && base.feedback.trim() !== '' ? `\n\nEarlier feedback, still standing:\n${base.feedback}` : '';
  const merged = {
    ...base,
    feedback:
      `You stopped to ask a person:\n${elicitation.question}\n\nThey answered: ${said}\n\n` +
      `Continue the same work from where you left off.${earlier}`,
    resumed: {
      question: elicitation.question,
      answer: { option, text },
      answeredBy: answer.answeredBy,
      workSoFar: deps.parseHandoff(parkedHandoffJson),
    },
  };
  deps.sql.exec(
    `UPDATE cards SET state = 'submitted', delegate_agent_id = NULL, current_run_id = NULL, needs_human_json = NULL,
            handoff_json = ?, updated_at = ? WHERE id = ?`,
    JSON.stringify(merged),
    now,
    card.id,
  );
  deps.sql.exec(
    `INSERT INTO activities (run_id, card_id, type, ephemeral, body, action, detail_json, ts)
     VALUES (?, ?, 'prompt', 0, ?, NULL, ?, ?)`,
    elicitation.runId,
    card.id,
    said,
    JSON.stringify({ parameter: { elicitationId: elicitation.id, option }, result: null, signal: null }),
    now,
  );
  deps.emit('elicitation.answered', {
    elicitationId: elicitation.id,
    cardId: card.id,
    runId: elicitation.runId,
    option,
    answeredBy: answer.answeredBy,
  });
  deps.notifyWorkAvailable(card.id);
  deps.reportRun(elicitation.runId);
  await deps.scheduleReclaim();
  return { ok: true, value: { card: deps.mustGetCard(card.id), elicitation: mustGetElicitation(deps, elicitation.id) } };
}

/**
 * Persist the question an agent just asked, so a human has something to answer (docs/04 §4).
 * The card can only be waiting on one thing at a time, so a new question supersedes any earlier
 * pending one on the same card — the agent is blocked on its latest ask, and a superseded question
 * is no longer answerable rather than lingering as a prompt nobody can act on.
 */
export function openElicitation(deps: ElicitationsDeps, input: AgentActivityInput, run: Row, cardId: string, now: string): string {
  cancelElicitationsForCard(deps, cardId);
  const id = newId('elc');
  const question = input.body ?? '';
  deps.sql.exec(
    `INSERT INTO elicitations
      (id, card_id, run_id, stage_key, agent_id, question, signal, options_json, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    id,
    cardId,
    input.runId,
    run.stage_key,
    run.agent_id,
    question,
    input.signal ?? null,
    JSON.stringify(parseElicitationOptions(input.parameter)),
    now,
  );
  // A strict decision's subject is built from its offer; only a poster's own subject is kept here.
  const subject = input.strictDecision === undefined ? posterSubject(input.parameter) : null;
  if (subject) deps.sql.exec(`UPDATE elicitations SET subject_json = ? WHERE id = ?`, JSON.stringify(subject), id);
  deps.setNeedsHuman(cardId, { reason: 'question', elicitationId: id });
  deps.emit('elicitation.opened', { elicitationId: id, cardId, runId: input.runId, signal: input.signal ?? null });
  deps.notify('input', cardId, question === '' ? 'An agent is waiting on you' : question);
  // A strict decision's binding is saved after this returns, so its offer is passed from here.
  notifyElicitationPending(deps, id, input.strictDecision === undefined ? null : { binding: input.strictDecision, detail: offeredDetail(input.parameter) });
  return id;
}

/**
 * Retire questions nobody can usefully answer any more. A pending elicitation belongs to a live
 * run and a waiting card; once either is gone (the run ended or was reclaimed, the card was moved
 * away, a newer question superseded it) the prompt would otherwise sit in the board's "needs you"
 * queue forever, and answering it would transition a card that has already moved on.
 */
export function cancelElicitationsForRun(deps: ElicitationsDeps, runId: string): void {
  deps.sql.exec(
    `UPDATE elicitations SET status = 'cancelled', answered_at = ? WHERE status = 'pending' AND run_id = ?`,
    deps.now(),
    runId,
  );
}

/** As above, for every run on a card — the card itself has stopped waiting. */
export function cancelElicitationsForCard(deps: ElicitationsDeps, cardId: string): void {
  deps.sql.exec(
    `UPDATE elicitations SET status = 'cancelled', answered_at = ? WHERE status = 'pending' AND card_id = ?`,
    deps.now(),
    cardId,
  );
}

/** What a strict decision offered: its binding and, when given, its approval detail. */
interface StrictOffer {
  binding: StrictDecision;
  detail: ApprovalDetail | undefined;
}

/** The approval detail riding in an offer's `parameter`, checked when the decision was bound. */
function offeredDetail(parameter: JsonValue | undefined): ApprovalDetail | undefined {
  const offered = parameter !== null && typeof parameter === 'object' && !Array.isArray(parameter) ? parameter : null;
  const parsed = offered && 'detail' in offered ? ApprovalDetail.safeParse(offered.detail) : null;
  return parsed?.success ? parsed.data : undefined;
}

/** A JSON column's text; anything else reads as JSON `null`. */
function sqlText(v: SqlStorageValue | undefined): string {
  return typeof v === 'string' ? v : 'null';
}

/** A question's strict offer, read from where it was bound, or null for any other question. */
function strictOffer(deps: ElicitationsDeps, elicitationId: SqlStorageValue): StrictOffer | null {
  const strict = deps.sql.exec(`SELECT binding_json, payload_json FROM strict_decision_requests WHERE elicitation_id = ?`, elicitationId).toArray()[0];
  if (!strict) return null;
  const binding = StrictDecision.safeParse(JSON.parse(sqlText(strict.binding_json)));
  // Checked when it was bound; reading it as an ordinary question would skip every strict check.
  if (!binding.success) throw new Error(`invariant violation: strict decision binding for ${sqlText(elicitationId)} is malformed`);
  const payload: unknown = JSON.parse(sqlText(strict.payload_json));
  const parameter = payload !== null && typeof payload === 'object' && 'parameter' in payload ? payload.parameter : undefined;
  const offered = parameter !== null && typeof parameter === 'object' && 'detail' in parameter ? ApprovalDetail.safeParse(parameter.detail) : null;
  return { binding: binding.data, detail: offered?.success ? offered.data : undefined };
}

/** The subject a question carries: its strict offer's, or the one its poster attached. */
function questionSubject(row: Row, strict: StrictOffer | null): ApprovalSubjectEnvelope | null {
  if (strict) return strictSubjectEnvelope(strict.binding, strict.detail);
  if (typeof row.subject_json !== 'string') return null;
  const parsed = PosterSubject.safeParse(JSON.parse(row.subject_json));
  // Checked when it was posted; reading it as an unbound question would let an approval through
  // with no binding and no expiry, so a stored subject that no longer parses fails closed.
  if (!parsed.success) throw new Error(`invariant violation: poster subject for ${sqlText(row.id)} is malformed`);
  return posterSubjectEnvelope(parsed.data);
}

function rowToElicitation(deps: ElicitationsDeps, row: Row): ElicitationView {
  const answeredBy = (row.answered_by as string | null) ?? null;
  const strict = strictOffer(deps, row.id);
  const subject = questionSubject(row, strict);
  return {
    ...(strict ? { strictDecision: strict.binding } : {}),
    ...(strict?.detail ? { detail: strict.detail } : {}),
    ...(subject ? { approvalSubject: subject } : {}),
    id: row.id as string,
    cardId: row.card_id as string,
    runId: row.run_id as string,
    stageKey: row.stage_key as string,
    agentId: row.agent_id as string,
    question: row.question as string,
    signal: (row.signal as string | null) ?? null,
    options: JSON.parse(row.options_json as string) as GateOption[],
    status: row.status as ElicitationStatus,
    answer:
      row.status === 'answered' && answeredBy
        ? {
            option: (row.answer_option as string | null) ?? null,
            text: (row.answer_text as string | null) ?? null,
            answeredBy,
            answeredAt: (row.answered_at as string | null) ?? '',
          }
        : null,
    createdAt: row.created_at as string,
  };
}

function mustGetElicitation(deps: ElicitationsDeps, id: string): ElicitationView {
  const row = deps.sql.exec(`SELECT * FROM elicitations WHERE id = ?`, id).toArray()[0];
  if (!row) throw new Error(`invariant violation: elicitation ${id} missing immediately after write`);
  return rowToElicitation(deps, row);
}

/** Every question a run asked, oldest first — the agent read surface's view (docs/04 §3). */
export function elicitationsForRun(deps: ElicitationsDeps, runId: string): ElicitationView[] {
  return deps.sql
    .exec(`SELECT * FROM elicitations WHERE run_id = ? ORDER BY created_at ASC, rowid ASC`, runId)
    .toArray()
    .map((r) => rowToElicitation(deps, r));
}

/**
 * The rows of every question currently waiting on a human, board-wide, oldest first.
 *
 * One query with two readers, which is why it is rows rather than either shape: the
 * board's own `ElicitationView` for a person looking at the board, and the wire's
 * `ElicitationPendingBody` for a projection somewhere else. A second copy of this
 * `WHERE` would be a second answer to "what is still waiting", and the two would
 * diverge on the day one of them learned about a new status.
 *
 * `rowid` breaks the tie because `created_at` is a formatted timestamp and two
 * questions asked in the same tick would otherwise come back in an arbitrary order.
 */
function pendingElicitationRows(deps: ElicitationsDeps): Row[] {
  return deps.sql
    .exec(`SELECT * FROM elicitations WHERE status = 'pending' AND card_id NOT IN (SELECT id FROM cards WHERE archived_at IS NOT NULL) ORDER BY created_at ASC, rowid ASC`)
    .toArray();
}

/** Every question currently waiting on a human, board-wide — the human's view. */
export function pendingElicitations(deps: ElicitationsDeps): ElicitationView[] {
  return pendingElicitationRows(deps).map((r) => rowToElicitation(deps, r));
}

/**
 * The body a question travels in, built once from the elicitation's own row.
 *
 * Read from the row rather than from the activity that produced it, for the reason
 * `gatePendingBody` gives about gates: a question must keep the options it was ASKED
 * with. An agent that re-posted different options would otherwise change a question
 * out from under the person answering it.
 *
 * `null` when the card is gone — a question about a deleted card has nothing to ask
 * about, and is the same case the gate builder already handles.
 */
function elicitationPendingBody(deps: ElicitationsDeps, row: Row, strict: StrictOffer | null): ElicitationPendingBody | null {
  const cardId = row.card_id as string;
  const card = deps.getCard(cardId);
  if (!card) return null;
  const options = JSON.parse(row.options_json as string) as GateOption[];
  const subject = questionSubject(row, strict);
  return {
    event: 'elicitation.pending',
    boardId: deps.getMeta('boardId'),
    boardName: deps.getMeta('name') ?? '',
    cardId,
    cardTitle: card.title,
    elicitationId: row.id as string,
    runId: row.run_id as string,
    stageKey: row.stage_key as string,
    agentId: row.agent_id as string,
    question: (row.question as string) ?? '',
    // The decision envelope (charter: questions and follow-ups §2): each option says what it
    // means, as a gate's do. A question asks for no comment on an option.
    // Its scope and who may take it travel when known (charter: strict decisions bind their
    // subject §2); the board still judges both.
    options: options.map((o): ElicitationPendingBody['options'][number] => {
      const scope = questionOptionScope(o, strict !== null);
      return {
        id: o.name,
        label: o.title,
        meaning: questionOptionMeaning(o, strict !== null),
        needsComment: false,
        ...(scope ? { scope } : {}),
        ...(o.requires ? { requires: o.requires } : {}),
      };
    }),
    ...(subject ? { approvalSubject: subject } : {}),
    // Nothing to tap: the answer is typed, and the reader is told how long it may be.
    ...(options.length === 0 ? { freeText: { maxLength: ELICITATION_TEXT_MAX } } : {}),
    ts: row.created_at as string,
  };
}

/**
 * Queue `elicitation.pending` for a question that just opened.
 *
 * **Fan-out is by subscription only** — the same rule as `notifyGatePending` and for
 * the same reason, which is worth restating because the temptation is to copy
 * `notifyWorkAvailable` instead. `work.available` is addressed to whoever could
 * *claim* a stage, so it matches on capability. A question is addressed to a
 * **human**. Matching on capability would send it to whichever agents happen to
 * advertise the stage's capability, and to nobody at all when the stage is one a
 * person owns.
 */
function notifyElicitationPending(deps: ElicitationsDeps, elicitationId: string, strict: StrictOffer | null): void {
  const row = deps.sql.exec(`SELECT * FROM elicitations WHERE id = ?`, elicitationId).toArray()[0] as
    | Row
    | undefined;
  if (!row) return;
  const payload = elicitationPendingBody(deps, row, strict);
  if (!payload) return;
  const body = JSON.stringify(payload);
  const ts = deps.now();
  for (const cfg of deps.sql.exec(`SELECT * FROM push_configs`).toArray()) {
    const events = JSON.parse(cfg.events_json as string) as string[];
    if (!events.includes('elicitation.pending')) continue;
    deps.sql.exec(
      `INSERT INTO push_deliveries (config_id, url, body, status, attempts, created_at) VALUES (?, ?, ?, 'pending', 0, ?)`,
      cfg.id,
      cfg.url,
      body,
      ts,
    );
  }
}

/**
 * Every question still waiting on a human, in the body a push carries.
 *
 * The floor beneath push, exactly as `pendingGateDeliveries` is: a delivery is retried
 * five times and then dead-lettered, at which point the card is blocked on an answer
 * nobody was told about and neither side is looking. This is what lets a reader ask
 * rather than wait to be told, and it is why the per-board push-config rollout does
 * not block the feature — a board whose config predates the event is served late
 * rather than not at all.
 *
 * It carries a second meaning the gate version does not need as badly. A question is
 * superseded by the next question on the same card (`openElicitation` retires the
 * previous one), so **absence from this list** is how a reader learns that a question
 * it already showed can no longer be answered. A stale question that still looks
 * tappable is a question that will be tapped.
 */
export async function pendingElicitationDeliveries(deps: ElicitationsDeps, opts?: { approvalRequests?: boolean }): Promise<ElicitationPendingBody[]> {
  const questions = pendingElicitationRows(deps)
    .map((r) => elicitationPendingBody(deps, r, strictOffer(deps, r.id)))
    .filter((b): b is ElicitationPendingBody => b !== null);
  // A broker's approval request is a subject-bound question too, belonging to no card (charter:
  // waiting cards and broker approvals reach chat §3–4); it leaves this list once decided or expired.
  // Only for a reader allowed to see every argument it carries — a person, or the decision carrier
  // (`approval-requests:relay`) — never for every agent on the board.
  return opts?.approvalRequests === true ? [...questions, ...pendingApprovalRequestBodies(deps)] : questions;
}
