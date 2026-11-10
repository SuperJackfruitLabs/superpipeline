import type { TaskState } from '@superpipeline/contract';
import type { JsonValue } from '../json';
import { notifyAttentionPending, waitChangedError } from './attention';
import type { BoardContext } from './context';
import type { CardNeedsHuman, CardView, Result, StageDef } from './model';
import { CIRCUIT_BREAKER_LIMIT, COMMENT_MAX_BYTES } from './rules';
import type { CommentView, PreparedApproval } from './views';

/**
 * How a card moves: a person moving or resuming it, the board advancing it after a run or a gate,
 * resolving it at a terminal stage, and parking it for a person.
 */

/** What moves needs from the rest of the board. */
export type MovesDeps = Pick<
  BoardContext,
  | 'addComment'
  | 'awaitChecks'
  | 'decisionDeadline'
  | 'startDecisionWait'
  | 'cancelPendingReviews'
  | 'countInStage'
  | 'createGate'
  | 'emit'
  | 'getCard'
  | 'getCardHandoffJson'
  | 'getCardRow'
  | 'getMeta'
  | 'invalidateApprovalSubject'
  | 'isAgentClaimable'
  | 'mustGetCard'
  | 'notify'
  | 'notifyDependents'
  | 'notifyWorkAvailable'
  | 'now'
  | 'openChildCount'
  | 'openChildren'
  | 'parentIdOf'
  | 'parseHandoff'
  | 'reportRun'
  | 'scheduleReclaim'
  | 'sql'
  | 'stages'
  | 'unresolvedBlockerCount'
>;

/** Human move (docs/03). Enforces stage existence and the target stage's WIP limit. */
export async function moveCard(deps: MovesDeps, cardId: string, toStageKey: string, actorUserId?: string, queuedGrant?: string[] | null, queuedByAgentId?: string | null, queuedGrantOwner?: string | null): Promise<Result<CardView>> {
  if (!deps.getMeta('boardId')) {
    return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  }
  const card = deps.getCard(cardId);
  if (!card) return { ok: false, code: 'CARD_NOT_FOUND', message: `card not found: ${cardId}` };
  const target = deps.stages().find((s) => s.key === toStageKey);
  if (!target) return { ok: false, code: 'UNKNOWN_STAGE', message: `unknown stage: ${toStageKey}` };
  if (target.key === card.currentStageKey) return { ok: true, value: card };
  if (target.wipLimit !== undefined && deps.countInStage(target.key) >= target.wipLimit) {
    return {
      ok: false,
      code: 'WIP_LIMIT',
      message: `WIP limit reached for stage "${target.key}" (limit ${target.wipLimit})`,
    };
  }
  // Advancing IS a refusal, unlike claim's exclusion: this is an explicit act by a named caller,
  // not a selection from a set (see the header note on Task 13). Only an OPEN CHILD refuses it —
  // a parent whose sub-tasks are unfinished is not something anyone should be able to mark done.
  // An unresolved `blocks` edge deliberately does NOT refuse this: Principle 3 says a human owns
  // the card and is accountable, and can see the blocker badge, so a human move through a blocker
  // is allowed through (and recorded, below) rather than refused — the one place Linear's
  // advisory model is right.
  const openChildren = deps.openChildCount(cardId);
  if (openChildren > 0) {
    return {
      ok: false,
      code: 'CARD_BLOCKED',
      // Direction-agnostic wording: this refusal applies to ANY move, forward or backward (e.g.
      // pulling a parent back to an earlier stage for rework), so it must not read as "you can't
      // finish yet" — it is simply a fact about the card, regardless of which way it is moving.
      message: `card has ${openChildren} open sub-task${openChildren === 1 ? '' : 's'}`,
    };
  }
  // An AGENT mover (the route passes its id) never gets a card past a gate. Deciding a gate is
  // refused to every agent token, and the cancel and completion below would decide one for it.
  if (queuedByAgentId) {
    const refused = agentMoveRefusal(deps, card, target);
    if (refused) return refused;
  }
  const unresolvedBlockers = deps.unresolvedBlockerCount(cardId);
  const now = deps.now();
  deps.invalidateApprovalSubject(cardId, 'card.route_changed', actorUserId ?? null);
  // A manual move overrides any in-flight review: cancel pending gates and return the card to a
  // clean, claimable state. Without this, dragging a card off a human gate strands it in
  // input-required with an orphaned pending gate that no agent can claim and no human can resolve.
  deps.cancelPendingReviews(cardId, now);
  // The person moving it IS the human attention the card was waiting for; carrying
  // the request across the move would ask for something already given.
  setNeedsHuman(deps, cardId, null);
  // A move by a person re-queues the card, so the mover becomes the queuer —
  // they are the one dispatching it now, which is not necessarily the person
  // who created it. Without an actor (an internal move) the previous queuer
  // stands: COALESCE leaves it alone rather than blanking it.
  /**
   * Moving a card to a last stage nobody can act on finishes it — which is what a person means
   * when they drag a card to `done`. Same rule as the agent path (`completesOnArrival`), because
   * the question it answers is about the STAGE, not about who put the card there.
   *
   * After the gate-cancel and blocker checks above, so a move that would have been refused still
   * is: an unresolved blocker or an open child stops this exactly as before.
   */
  if (completesOnArrival(deps, target)) {
    resolveCard(deps, cardId, deps.getCardHandoffJson(cardId), target.key);
    const resolved = deps.mustGetCard(cardId);
    deps.emit('card.moved', { cardId, from: card.currentStageKey, to: target.key });
    await deps.scheduleReclaim();
    return { ok: true, value: resolved };
  }
  deps.sql.exec(
    `UPDATE cards SET current_stage_key = ?, state = 'submitted', delegate_agent_id = NULL, current_run_id = NULL,
            failure_count = 0, auto_returns = 0, updated_at = ?, queued_by = COALESCE(?, queued_by),
            -- Moves WITH the pair, never apart. A human re-queueing an agent-queued card
            -- becomes its queuer, and leaving the agent id standing would make the card read
            -- "queued by <some agent>" about a dispatch the operator personally authorised.
            -- An internal move (no actor) dispatches nothing new, so both values stand. An AGENT
            -- mover sets it to ITSELF, for the same reason it sets queued_by: whoever re-queued
            -- the card is who the record has to name.
            queued_by_agent_id = CASE WHEN ? IS NULL THEN queued_by_agent_id ELSE ? END,
            queued_grant = CASE WHEN ? IS NULL THEN queued_grant ELSE ? END,
            queued_grant_owner = CASE WHEN ? IS NULL THEN queued_grant_owner ELSE ? END WHERE id = ?`,
    target.key,
    now,
    actorUserId ?? null,
    actorUserId ?? null,
    queuedByAgentId ?? null,
    // Same COALESCE reasoning as the queuer: an internal move leaves the
    // recorded authority standing rather than blanking it.
    queuedGrant === undefined || queuedGrant === null ? null : JSON.stringify(queuedGrant),
    queuedGrant === undefined || queuedGrant === null ? null : JSON.stringify(queuedGrant),
    // Paired with the grant: written only when the grant is, so the two never describe different people.
    queuedGrant === undefined || queuedGrant === null ? null : JSON.stringify(queuedGrant),
    queuedGrantOwner ?? null,
    cardId,
  );
  const updated = deps.mustGetCard(cardId);
  deps.emit('card.moved', {
    cardId,
    from: card.currentStageKey,
    to: target.key,
    by: actorUserId ?? null,
  });
  // The override is made VISIBLE, not silently allowed (Principle 3: a human is accountable for
  // moving a card past a blocker they can see on the badge, and the record is how that
  // accountability stays legible after the fact).
  if (unresolvedBlockers > 0) {
    deps.notify(
      'moved-while-blocked',
      cardId,
      `moved to "${target.name}" past ${unresolvedBlockers} unresolved blocker${unresolvedBlockers === 1 ? '' : 's'}${actorUserId ? ` by ${actorUserId}` : ''}`,
    );
  }
  await deps.scheduleReclaim();
  return { ok: true, value: updated };
}

/** An agent move refused for a gate: 409, and the message says a person resolves it. */
function refuseAgentMove(message: string): Result<never> {
  return { ok: false, code: 'GATE_PENDING', message };
}

/** Does a card in this stage have something a person or a check must decide before it leaves? */
function stageHasGate(stage: StageDef): boolean {
  return (
    stage.gate === 'approval' ||
    stage.gate === 'checks' ||
    (stage.checks?.length ?? 0) > 0 ||
    stage.quorum !== undefined ||
    stage.approvalSubjectSchema !== undefined
  );
}

/**
 * Why an agent may not make this move, or null when it may.
 *
 * A person's move overrides a review (the cancel in `moveCard`); an agent's must not, because an
 * agent can never decide a gate (`gates/:id/resolve` is refused on every scope). So an agent move is
 * refused when it would:
 *  - end a review or checks the card is waiting on — in either direction, since a cancelled review
 *    decides nothing whichever way the card goes;
 *  - leave a gated stage forward, or skip past one;
 *  - complete the card by arriving in a last stage nobody works (`completesOnArrival`).
 *
 * Arriving IN a gated stage is not refused: the card waits there for a person. A move backward
 * that ends nothing is not refused either: every gate between the two stages stands in the card's
 * way again on its way forward, so rework cannot skip one.
 */
function agentMoveRefusal(deps: MovesDeps, card: CardView, target: StageDef): Result<never> | null {
  const stages = deps.stages();
  const from = stages.findIndex((s) => s.key === card.currentStageKey);
  const to = stages.findIndex((s) => s.key === target.key);
  const here = stages[from]?.name ?? card.currentStageKey;
  if (deps.sql.exec(`SELECT 1 FROM gates WHERE card_id = ? AND status = 'pending' LIMIT 1`, card.id).toArray().length > 0) {
    return refuseAgentMove(`this card is waiting on a review in "${here}"; a person must resolve the gate before it moves`);
  }
  if (deps.sql.exec(`SELECT 1 FROM card_check_arrivals WHERE card_id = ? AND status = 'open' LIMIT 1`, card.id).toArray().length > 0) {
    return refuseAgentMove(`this card's checks in "${here}" are still deciding it; a person must resolve the gate before it moves`);
  }
  if (from !== -1 && to > from) {
    const gated = stages.slice(from, to).find(stageHasGate);
    if (gated) {
      return refuseAgentMove(`moving this card to "${target.name}" would get it past the gate on "${gated.name}"; a person must resolve the gate, or move the card themselves`);
    }
  }
  if (completesOnArrival(deps, target)) {
    return refuseAgentMove(`moving this card to "${target.name}" would complete it; an agent cannot finish a card by moving it, a person must`);
  }
  return null;
}

/**
 * Resume a card that is waiting on a person: the human half of a block.
 *
 * Returns the card to its current stage — or a named EARLIER one — as `submitted`, with the
 * person's comment kept twice: on the card's thread, where people read it, and as
 * `handoff.feedback`, which the next claim and the run context carry to the agent (the path a
 * reviewer's request-changes uses). `needsHuman` is cleared, and the stage starts over: the
 * breaker count goes to zero and the automatic completion rework is owed again.
 *
 * Refused where a more specific answer exists, rather than letting resume paper over it:
 *  - an open question (`QUESTION_PENDING`) is answered through its own form, so the agent gets
 *    the answer it asked for instead of a card that silently restarted under it;
 *  - a pending review (`GATE_PENDING`) is decided — request-changes IS the resume for a review,
 *    and resuming around it would leave a gate deciding nothing;
 *  - a later stage (`INVALID_RESUME`) is a move, not a resume.
 *
 * Resuming re-queues the card, so the person resuming becomes its queuer, exactly as a move does.
 */
export async function resumeCard(deps: MovesDeps, input: {
  cardId: string;
  comment: string;
  toStageKey?: string;
  actor: { id: string; name: string | null };
  queuedGrant?: string[] | null;
  queuedGrantOwner?: string | null;
  /** The wait the person answered (`attention.pending`'s `waitId`); a different or ended wait refuses. */
  expectedWaitId?: string;
}): Promise<Result<{ card: CardView; comment: CommentView }>> {
  if (!deps.getMeta('boardId')) return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  const card = deps.getCard(input.cardId);
  if (!card) return { ok: false, code: 'CARD_NOT_FOUND', message: `card not found: ${input.cardId}` };
  // Before anything else: a late tap must never act on a different wait (charter §2).
  const changed = waitChangedError(deps.getCardRow(card.id), input.expectedWaitId);
  if (changed) return changed;
  if (typeof input.comment !== 'string' || input.comment.trim() === '') {
    return { ok: false, code: 'INVALID_COMMENT', message: 'resuming a card needs a comment saying what changed' };
  }
  const bytes = new TextEncoder().encode(input.comment).length;
  if (bytes > COMMENT_MAX_BYTES) {
    return { ok: false, code: 'INVALID_COMMENT', message: `a comment is at most ${COMMENT_MAX_BYTES} bytes; this one is ${bytes}` };
  }
  if (card.state !== 'input-required') {
    return { ok: false, code: 'CARD_NOT_WAITING', message: `a card in "${card.state}" is not waiting on anybody` };
  }
  const boardId = deps.getMeta('boardId');
  const question = deps.sql
    .exec(`SELECT id FROM elicitations WHERE card_id = ? AND status = 'pending' LIMIT 1`, card.id)
    .toArray()[0];
  if (question) {
    return {
      ok: false,
      code: 'QUESTION_PENDING',
      message: `this card's agent asked a question — answer it instead (POST /v1/boards/${boardId}/elicitations/${question.id as string}/answer, or the card in the web app)`,
    };
  }
  if (deps.sql.exec(`SELECT 1 FROM gates WHERE card_id = ? AND status = 'pending' LIMIT 1`, card.id).toArray().length > 0) {
    return {
      ok: false,
      code: 'GATE_PENDING',
      message: `this card is waiting on a review — decide it instead: supi approve, or supi request-changes ${boardId} <gateId> --comment "…" to send it back`,
    };
  }
  const openChildren = deps.openChildCount(card.id);
  if (openChildren > 0) {
    return { ok: false, code: 'CARD_BLOCKED', message: `card has ${openChildren} open sub-task${openChildren === 1 ? '' : 's'}` };
  }
  const stages = deps.stages();
  const currentIdx = stages.findIndex((s) => s.key === card.currentStageKey);
  const targetKey = input.toStageKey ?? card.currentStageKey;
  const targetIdx = stages.findIndex((s) => s.key === targetKey);
  if (targetIdx === -1) return { ok: false, code: 'UNKNOWN_STAGE', message: `unknown stage: ${targetKey}` };
  if (currentIdx !== -1 && targetIdx > currentIdx) {
    return { ok: false, code: 'INVALID_RESUME', message: `"${targetKey}" is after "${card.currentStageKey}" — resume returns a card to its stage or an earlier one; move it to go forward` };
  }

  const now = deps.now();
  const prior = deps.parseHandoff(deps.getCardHandoffJson(card.id));
  const merged =
    prior && typeof prior === 'object' && !Array.isArray(prior) ? { ...prior, feedback: input.comment } : { feedback: input.comment };
  const grant = input.queuedGrant === undefined || input.queuedGrant === null ? null : JSON.stringify(input.queuedGrant);
  deps.sql.exec(
    `UPDATE cards SET current_stage_key = ?, state = 'submitted', delegate_agent_id = NULL, current_run_id = NULL,
            failure_count = 0, needs_human_json = NULL, completion_rework_json = NULL, pending_advance_json = NULL,
            auto_returns = 0, handoff_json = ?, updated_at = ?, queued_by = ?, queued_by_agent_id = NULL,
            queued_grant = CASE WHEN ? IS NULL THEN queued_grant ELSE ? END,
            queued_grant_owner = CASE WHEN ? IS NULL THEN queued_grant_owner ELSE ? END
      WHERE id = ?`,
    targetKey,
    JSON.stringify(merged),
    now,
    input.actor.id,
    grant,
    grant,
    grant,
    input.queuedGrantOwner ?? null,
    card.id,
  );
  const comment = await deps.addComment({ cardId: card.id, author: { kind: 'human', ...input.actor }, body: input.comment });
  if (!comment.ok) return comment;
  deps.emit('card.resumed', { cardId: card.id, from: card.currentStageKey, to: targetKey, by: input.actor.id, commentId: comment.value.id });
  deps.notifyWorkAvailable(card.id);
  await deps.scheduleReclaim();
  return { ok: true, value: { card: deps.mustGetCard(card.id), comment: comment.value } };
}

/**
 * Advance a card to the next stage — opening an approval gate on entry to a human review stage.
 *
 * Called after a run's side effects are already committed (`complete()`'s SQL has run,
 * `resolveGate()`'s approval is recorded), so this method is `void`: by the time it runs there is
 * nothing left to refuse *into*. What it CAN still refuse is the advance itself.
 *
 * A card with open children (the `parent` edge) cannot advance — on the LAST stage this would
 * otherwise write `state = 'completed'` outright, resolving the card while its subtree is still
 * open: anything this card blocks would unblock, and a parent with half-finished children would
 * read as "done" (Task 14 step 3, promoted by Task 13's review — Task 13 guarded `moveCard`, the
 * human path, but left this one, the agent path, open). The fix is a DEFERRED advance, not a
 * refusal: `complete()`/`resolveGate()` must still succeed — the run has ended, the lease has to
 * release — so what is withheld is only the transition, recorded in `pending_advance_json` and
 * replayed by `resumeDeferredParentAdvance` once the last child resolves. Parking in
 * `submitted`/current-stage was rejected: that would make the card claimable again and hand an
 * agent work already done. Refusing from `complete()` was rejected too: the run would stay open,
 * the lease would heartbeat out, and the card would be reclaimed — the retry hot-loop this phase
 * exists to prevent. So: park `input-required`, in the CURRENT stage (not re-queued into it, and
 * not advanced) — the one non-claimable state available without adding one to the A2A-aligned
 * `TaskState`. It is not literally true here ("a human must act"); `openChildCount > 0` is what a
 * reader (Task 17's UI) uses to tell this park apart from a real review gate.
 */
export function advanceCard(deps: MovesDeps, cardId: string, fromStageKey: string, producedBy: string, handoffJson: string | null, runId: string | null, approvalSubject: PreparedApproval | null = null): void {
  const openChildren = deps.openChildCount(cardId);
  if (openChildren > 0) {
    deps.sql.exec(
      `UPDATE cards SET state = 'input-required', delegate_agent_id = NULL, current_run_id = NULL,
              pending_advance_json = ?, updated_at = ? WHERE id = ?`,
      JSON.stringify({ fromStageKey, producedBy, handoffJson, runId }),
      deps.now(),
      cardId,
    );
    deps.emit('card.advance_deferred', { cardId, openChildren });
    // A human has no other way to learn this happened: unlike `moveCard`'s `CARD_BLOCKED`
    // refusal (Task 13), nothing here rejects anything the owner did, so there is no error to
    // see. Some open children never resolve on their own (`openChildren`'s own comment) and the
    // recovery is an existing verb, not automatic — so name them, not just the count, or the
    // owner has a parked card and nothing explaining why.
    deps.notify(
      'advance-deferred',
      cardId,
      `waiting on ${openChildren} sub-task${openChildren === 1 ? '' : 's'}: ` +
        deps.openChildren(cardId)
          .map((c) => `${c.title} (${c.id})`)
          .join(', '),
    );
    return;
  }
  const stages = deps.stages();
  const idx = stages.findIndex((s) => s.key === fromStageKey);
  if (idx === -1) return; // unknown stage — never silently advance to stage[0]
  const next = stages[idx + 1];
  const now = deps.now();
  if (!next) {
    resolveCard(deps, cardId, handoffJson);
    return;
  }
  // Arriving at a last stage nobody can act on IS finishing — see `completesOnArrival`. Checked
  // before the gate branch because a stage cannot be both.
  if (completesOnArrival(deps, next)) {
    deps.emit('card.advanced', { cardId, from: fromStageKey, to: next.key });
    resolveCard(deps, cardId, handoffJson, next.key);
    return;
  }
  const gated = next.gate === 'approval' && !deps.isAgentClaimable(next);
  // A stage decided by its checks alone waits on them like a gate, with no person asked (charter
  // 2026-11-09, a gate may be decided by checks, decision 2). An approval stage with checks waits
  // through `createGate`, which records them first.
  const decidedByChecks = next.gate === 'checks' && (next.checks?.length ?? 0) > 0;
  deps.sql.exec(
    `UPDATE cards SET current_stage_key = ?, state = ?, delegate_agent_id = NULL, current_run_id = NULL, failure_count = 0, handoff_json = ?, updated_at = ? WHERE id = ?`,
    next.key,
    gated || decidedByChecks ? 'input-required' : 'submitted',
    handoffJson,
    now,
    cardId,
  );
  deps.emit('card.advanced', { cardId, from: fromStageKey, to: next.key });
  if (gated) deps.createGate(cardId, next.key, fromStageKey, producedBy, runId, approvalSubject);
  else if (decidedByChecks) deps.awaitChecks(cardId, next.key, fromStageKey, producedBy, runId);
  else deps.notifyWorkAvailable(cardId);
}

/**
 * `childId` just reached `completed` (the resolution rule — `RESOLVED_SQL` — which today only
 * `completed` reaches; see the note on `resolveGate`'s sibling branch in `advanceCard`). If it has
 * a parent, that parent may now be free of open children — hand off to `resumeParentAdvanceIfFree`
 * to check and, if so, replay the deferred advance.
 */
function resumeDeferredParentAdvance(deps: MovesDeps, childId: string): void {
  const parentId = deps.parentIdOf(childId);
  if (parentId) resumeParentAdvanceIfFree(deps, parentId);
}

/**
 * `parentId` may have just lost its last open child — not only by that child reaching
 * `completed` (`resumeDeferredParentAdvance`, above), but also by the `parent` edge itself being
 * removed: `deleteCard` deletes a child outright, and `removeLink` can un-parent one without
 * touching the card. `openChildCount` is a live join over `card_links`, so it cannot tell a
 * resolved child from a vanished one — which means neither can a park that depends on it. Without
 * this second call site, deleting or un-parenting the LAST open child of a parked parent would
 * silently strand it: `pending_advance_json` would sit there forever with nothing left to ever
 * recheck it.
 *
 * `openChildCount` is RE-CHECKED here, not decremented — so a parent with several children stays
 * parked through every resolution/removal but the last, and fires exactly once. Clearing
 * `pending_advance_json` before calling `advanceCard` (rather than after) means a parent that
 * turns out to have open children again by the time the replay runs — not reachable via either
 * caller today, but defensive against a future one — cannot re-defer onto a stale record.
 *
 * That clear-before-call ordering has a cost: `advanceCard`'s `idx === -1` guard (stored
 * `fromStageKey` not found in the board's current stage list) returns silently, and by then the
 * record is already gone — so if that guard were ever hit here, the parent would be stranded with
 * nothing left to recheck. Not reachable today — `setStages` refuses to remove a stage holding any
 * card, `countInStage` counts every state so a parked card still holds its stage, and nothing ever
 * moves a parked card's `current_stage_key` — but that safety rests on those three facts staying
 * true elsewhere in this file, not on anything local to this method.
 */
export function resumeParentAdvanceIfFree(deps: MovesDeps, parentId: string): void {
  const row = deps.sql.exec(`SELECT pending_advance_json FROM cards WHERE id = ?`, parentId).toArray()[0];
  const pendingJson = (row?.pending_advance_json as string | null | undefined) ?? null;
  if (!pendingJson) return;
  if (deps.openChildCount(parentId) > 0) return; // another child is still open
  const pending = JSON.parse(pendingJson) as { fromStageKey: string; producedBy: string; handoffJson: string | null; runId?: string | null };
  deps.sql.exec(`UPDATE cards SET pending_advance_json = NULL WHERE id = ?`, parentId);
  advanceCard(deps, parentId, pending.fromStageKey, pending.producedBy, pending.handoffJson, pending.runId ?? null);
  // The replay may open a gate judging the parent's run, which was reported `succeeded` when the
  // advance was deferred — report it again (R5: same synchronous span). Callers arm the drain.
  if (pending.runId) deps.reportRun(pending.runId);
}

/**
 * Resolve a card: the ONE place `state = 'completed'` is written.
 *
 * Extracted because the comment that used to live inline asked for exactly this — "any FUTURE
 * path that writes `state = 'completed'` or `'canceled'` to a card needs this same call" — and
 * there are now three such paths (a run ending on the last stage, an agent advancing into a
 * terminal stage nobody can act on, and a human moving a card there). Three copies of the
 * bookkeeping is three chances to forget `notifyDependents`, which is how a blocked card stays
 * blocked after the thing blocking it finished.
 *
 * `stageKey` is passed when the card is being moved into its final stage at the same moment it
 * resolves, so the row never exists in an in-between state a reader could observe.
 */
export function resolveCard(deps: MovesDeps, cardId: string, handoffJson: string | null, stageKey?: string): void {
  const now = deps.now();
  if (stageKey === undefined) {
    deps.sql.exec(
      `UPDATE cards SET state = 'completed', delegate_agent_id = NULL, current_run_id = NULL, failure_count = 0, handoff_json = ?, updated_at = ? WHERE id = ?`,
      handoffJson,
      now,
      cardId,
    );
  } else {
    deps.sql.exec(
      `UPDATE cards SET current_stage_key = ?, state = 'completed', delegate_agent_id = NULL, current_run_id = NULL, failure_count = 0, handoff_json = ?, updated_at = ? WHERE id = ?`,
      stageKey,
      handoffJson,
      now,
      cardId,
    );
  }
  deps.emit('card.completed', { cardId });
  // This card just became genuinely resolved (Task 13's rule: `completed`/`canceled` only) —
  // anything it held back may now be claimable. `notifyWorkAvailable` alone only ever fires for
  // the card that just changed, never for its dependents, so without this fan-out a
  // push-subscribed agent waiting on a blocked card never hears it unblocked.
  deps.notifyDependents(cardId);
  // This card may itself be the last open child of a parent parked by a deferred advance.
  resumeDeferredParentAdvance(deps, cardId);
}

/**
 * Is this the last stage, and can anybody act on it?
 *
 * A terminal stage that is human-owned and declares no approval gate is a stage from which a card
 * can never leave. No agent may claim it (`isAgentClaimable` is false for `human`), no gate will
 * ever be created to ask anyone (`advanceCard` only creates one for `gate: 'approval'`), and no
 * route writes card state. Cards reached it and read `submitted` forever — and ALL FOUR shipped
 * templates end in exactly that shape (`shipped`, `published`, `closed`, `ready`), so every board
 * made from one was born unable to express completion.
 *
 * So arriving there IS finishing, and the card is resolved on arrival.
 *
 * Narrow on purpose. The two stages this deliberately excludes are excluded because something can
 * still act, and completing on arrival would destroy that act without a trace:
 *
 *   - a CAPABILITY-owned last stage still has its run to do. Completing on arrival would mean the
 *     final publish or deploy never happens while the board says it did.
 *   - a GATED last stage still has its review. That approval is where a person confirms the work;
 *     deleting it silently is worse than the stall this fixes.
 */
export function completesOnArrival(deps: MovesDeps, stage: StageDef): boolean {
  const stages = deps.stages();
  if (stages[stages.length - 1]?.key !== stage.key) return false;
  // A stage decided by its checks still has them to run, as a gated one has its review.
  return !deps.isAgentClaimable(stage) && stage.gate !== 'approval' && stage.gate !== 'checks';
}

/**
 * Record, or clear, why a card is waiting on a person.
 *
 * One writer so the field cannot drift out of step with the state that implies it.
 * Clearing is the common case and happens wherever a card stops waiting — answered,
 * moved, claimed — because a stale "needs you" is worse than none: it sends somebody
 * to a card that wants nothing.
 */
export function setNeedsHuman(deps: MovesDeps, cardId: string, needs: CardNeedsHuman | null): void {
  deps.sql.exec(
    `UPDATE cards SET needs_human_json = ? WHERE id = ?`,
    needs ? JSON.stringify(needs) : null,
    cardId,
  );
  // A wait chat carries reaches the board's room (charter: waiting cards reach chat §1). Clearing,
  // or a question or review, queues nothing.
  notifyAttentionPending(deps, cardId);
}

/**
 * Bring a card to rest on a person, saying why in the same write.
 *
 * The state and the reason are set together so they cannot drift: a card parked
 * without a reason is the bug this exists to prevent, and leaving the two as separate
 * statements is how that happened the first time.
 *
 * `releaseRun` for the cases where the run is over (blocked, submitted, refused) and
 * false where the card is parked with its run still named — the control-pair refusal,
 * which stops a dispatch rather than ending one.
 */
export function parkForHuman(deps: MovesDeps, cardId: string, needs: CardNeedsHuman, releaseRun = true): void {
  deps.sql.exec(
    releaseRun
      ? `UPDATE cards SET state = 'input-required', needs_human_json = ?, delegate_agent_id = NULL,
           current_run_id = NULL, updated_at = ? WHERE id = ?`
      : `UPDATE cards SET state = 'input-required', needs_human_json = ?, updated_at = ? WHERE id = ?`,
    JSON.stringify(needs),
    deps.now(),
    cardId,
  );
  notifyAttentionPending(deps, cardId);
}

/**
 * A run's handoff failed its stage's completion requirement: rework once, then park.
 *
 * The first refusal on a visit to a stage sends the card straight back to `submitted` on the same
 * stage, with feedback naming exactly what was missing — written into the handoff the next claim
 * and the run context carry, which is the path a reviewer's "request changes" already uses. The
 * board's input to the stage is kept, so the rework still has its brief.
 *
 * Three things bound it, so it cannot loop:
 *  - one rework per visit (`completion_rework_json`): a second refusal parks the card `blocked`,
 *    naming both refusals, because by then the agent has been told once and a third try is
 *    budget spent re-asserting the same thing — the reason D1 refused to retry at all;
 *  - the rework is an attempt (`failure_count`), so the circuit breaker still counts it: a refusal
 *    after a crash, or a crash after a rework, trips the breaker exactly as two crashes would;
 *  - only a person resets either — `resumeCard`, or a reviewer's request-changes, which moves
 *    the card through a review stage and so starts a new visit.
 */
export function reworkOrPark(deps: MovesDeps, cardId: string, stageKey: string, runId: string, reason: string, refusedHandoff: JsonValue | undefined): void {
  const row = deps.getCardRow(cardId);
  if (!row) return;
  const spent = row.completion_rework_json
    ? (JSON.parse(row.completion_rework_json as string) as { stageKey: string; reason: string; runId: string })
    : null;
  const failures = Number(row.failure_count) + 1;
  deps.sql.exec(`UPDATE cards SET failure_count = ? WHERE id = ?`, failures, cardId);

  if (spent && spent.stageKey === stageKey) {
    const detail = `this stage was not finished twice — first: ${spent.reason}; then, after one automatic rework: ${reason}`;
    parkForHuman(deps, cardId, { reason: 'blocked', detail });
    deps.emit('card.blocked', { cardId, reason: detail });
    deps.notify('blocked', cardId, detail);
    return;
  }
  if (failures >= CIRCUIT_BREAKER_LIMIT) {
    const detail = `this stage was not finished: ${reason}`;
    parkForHuman(deps, cardId, { reason: 'repeated-failure', failureCount: failures, detail });
    deps.emit('card.blocked', { cardId, reason: detail, failures, brokeCircuit: true });
    deps.notify('failed', cardId, detail);
    return;
  }

  const prior = deps.parseHandoff((row.handoff_json as string | null) ?? null);
  const feedback = `Your handoff was refused: ${reason}. Finish this stage again and include what is missing.`;
  const carried = { feedback, refusedHandoff: refusedHandoff ?? null };
  const merged = prior && typeof prior === 'object' && !Array.isArray(prior) ? { ...prior, ...carried } : carried;
  deps.sql.exec(
    `UPDATE cards SET state = 'submitted', delegate_agent_id = NULL, current_run_id = NULL, needs_human_json = NULL,
            handoff_json = ?, completion_rework_json = ?, updated_at = ? WHERE id = ?`,
    JSON.stringify(merged),
    JSON.stringify({ stageKey, reason, runId }),
    deps.now(),
    cardId,
  );
  deps.emit('card.rework_requested', { cardId, stageKey, runId, reason, failures });
  deps.notify('rework', cardId, `Sent back for one automatic rework: ${reason}`);
  deps.notifyWorkAvailable(cardId);
}

/** End the current attempt on a card: bump failures and either re-queue or trip the breaker. */
export function endAttempt(deps: MovesDeps, cardId: string, event: string, reason: string | null, runId?: string): void {
  const cardRow = deps.getCardRow(cardId);
  if (!cardRow) return;
  const failures = Number(cardRow.failure_count) + 1;
  const state: TaskState = failures >= CIRCUIT_BREAKER_LIMIT ? 'input-required' : 'submitted';
  const now = deps.now();
  deps.sql.exec(
    `UPDATE cards SET state = ?, delegate_agent_id = NULL, current_run_id = NULL, failure_count = ?, updated_at = ? WHERE id = ?`,
    state,
    failures,
    now,
    cardId,
  );
  // The breaker is the only thing here that makes a card wait on a person. Below it
  // the card is simply queued again, and any earlier reason — a question this run
  // asked and never got answered — is no longer the thing to look at.
  setNeedsHuman(deps, 
    cardId,
    state === 'input-required'
      ? { reason: 'repeated-failure', failureCount: failures, ...(reason ? { detail: reason } : {}) }
      : null,
  );
  deps.emit(event, { cardId, runId: runId ?? null, reason, failures, brokeCircuit: state === 'input-required' });
  // Central re-queue point (fail + reclaim): a card returned to the queue is claimable again.
  deps.notifyWorkAvailable(cardId);
}
