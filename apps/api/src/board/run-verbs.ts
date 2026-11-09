import { type CompletionRequirement, evaluateCompletion, outcomeInputError, returnStageError, routeOutcome, type StageOutcome, type TaskState } from '@superpipeline/contract';
import type { JsonValue } from '../json';
import { estimateCostUsd } from '../metering/pricing';
import type { BoardContext } from './context';
import { parseElicitationOptions } from './elicitation';
import { questionPostError } from './question-subject';
import type { AgentActivityInput, CardView, CompleteVerbInput, Result, Row, RunVerbInput } from './model';
import { CIRCUIT_BREAKER_LIMIT, COMMENT_MAX_BYTES, HEARTBEAT_TIMEOUT_MS } from './rules';
import { ApprovalDetail, canonicalDecisionRequest, StrictDecision } from './strict-decision';
import type { PreparedApproval } from './views';

/**
 * How a run reports and ends: activities, complete, submit for review, block, fail and release.
 */

/** What the run verbs needs from the rest of the board. */
export type RunVerbsDeps = Pick<
  BoardContext,
  | 'advanceCard'
  | 'authorizeRun'
  | 'boardOverBudget'
  | 'budgetCap'
  | 'cancelElicitationsForRun'
  | 'cardCost'
  | 'createGate'
  | 'ctx'
  | 'emit'
  | 'endAttempt'
  | 'getCard'
  | 'getCardRow'
  | 'isAgentClaimable'
  | 'mustGetCard'
  | 'notify'
  | 'notifyWorkAvailable'
  | 'now'
  | 'nowMs'
  | 'openElicitation'
  | 'parkForHuman'
  | 'prepareApprovalSubject'
  | 'reportRun'
  | 'reworkOrPark'
  | 'scheduleReclaim'
  | 'sql'
  | 'stages'
  | 'writeComment'
>;

/**
 * How many times a judging stage's `changes-needed` may send a card back on its own before the
 * next one parks it for a person. The breaker's number, on purpose: an automatic return is the
 * board retrying on the agent's behalf, and it gets the same patience a crash does.
 */
const MAX_AUTOMATIC_RETURNS = CIRCUIT_BREAKER_LIMIT;

/** The outcomes `complete` accepts (`StageOutcome`), for a caller that did not parse. */
const OUTCOMES: ReadonlySet<string> = new Set<StageOutcome>(['pass', 'changes-needed', 'needs-person']);

export async function postActivity(deps: RunVerbsDeps, input: AgentActivityInput): Promise<Result<{ accepted: true; cardState: TaskState; elicitationId?: string; strictDecision?: StrictDecision }>> {
  if (input.strictDecision !== undefined) return postStrictDecision(deps, input);
  const auth = deps.authorizeRun(input);
  if (!auth.ok) return auth;
  const run = auth.run;
  const cardId = run.card_id as string;
  // A poster's meanings, scopes and subject are checked before anything is written (charter:
  // strict decisions bind their subject §7): a refused question leaves no trace.
  if (input.type === 'elicitation') {
    const refused = questionPostError(input.parameter, parseElicitationOptions(input.parameter));
    if (refused) return { ok: false, ...refused };
  }
  if (input.usage) {
    // Validate at the DO so every wire (REST + MCP) shares the guarantee — a negative/NaN cost
    // would otherwise poison the SUMs the budget gate relies on.
    const { inputTokens, outputTokens, costUsd } = input.usage;
    const bad = [inputTokens, outputTokens, costUsd].some((n) => n !== undefined && (!Number.isFinite(n) || n < 0));
    if (bad) return { ok: false, code: 'INVALID_USAGE', message: 'usage tokens/cost must be finite and non-negative' };
    // Budget enforcement (docs/07 §6): once a cap is hit, reject further billable activities so an
    // in-flight run can't blow past the ceiling — overrun is bounded to the single crossing activity.
    const cardCap = deps.budgetCap('budgetCardUsdCap');
    if (deps.boardOverBudget() || (cardCap !== null && deps.cardCost(cardId) >= cardCap)) {
      return { ok: false, code: 'BUDGET_EXCEEDED', message: 'budget cap reached for this board/card' };
    }
  }
  const now = deps.now();
  const detail = JSON.stringify({
    parameter: input.parameter ?? null,
    result: input.result ?? null,
    signal: input.signal ?? null,
  });
  deps.sql.exec(
    `INSERT INTO activities (run_id, card_id, type, ephemeral, body, action, detail_json, ts)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    input.runId,
    cardId,
    input.type,
    input.ephemeral ? 1 : 0,
    input.body ?? null,
    input.action ?? null,
    detail,
    now,
  );
  // Metering (docs/07 §6): record token/cost usage, estimating cost when the agent doesn't report
  // it. Recorded even for ephemeral activities — an ephemeral "thinking" step still burned tokens.
  if (input.usage) {
    const u = input.usage;
    const reported = u.costUsd !== undefined;
    const cost = reported ? u.costUsd! : estimateCostUsd(u);
    deps.sql.exec(
      `INSERT INTO usage_records (run_id, card_id, agent_id, model, input_tokens, output_tokens, cost_usd, estimated, ts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      input.runId,
      cardId,
      run.agent_id,
      u.model ?? null,
      u.inputTokens ?? 0,
      u.outputTokens ?? 0,
      cost,
      reported ? 0 : 1,
      now,
    );
  }
  // An activity is also a sign of life — it keeps the lease fresh.
  deps.sql.exec(`UPDATE runs SET last_heartbeat_ms = ? WHERE id = ?`, deps.nowMs(), input.runId);
  let cardState: TaskState = 'working';
  if (input.type === 'elicitation') {
    cardState = input.signal === 'auth' ? 'auth-required' : 'input-required';
    deps.sql.exec(`UPDATE cards SET state = ?, updated_at = ? WHERE id = ?`, cardState, now, cardId);
    deps.openElicitation(input, run, cardId, now);
    deps.reportRun(input.runId);
  }
  deps.emit('activity', { runId: input.runId, cardId, activityType: input.type });
  await deps.scheduleReclaim();
  return { ok: true, value: { accepted: true, cardState } };
}

async function postStrictDecision(deps: RunVerbsDeps, input: AgentActivityInput): Promise<Result<{ accepted: true; cardState: TaskState; elicitationId?: string; strictDecision?: StrictDecision }>> {
  const parsed = StrictDecision.safeParse(input.strictDecision);
  if (!parsed.success || !input.agentId || input.type !== 'elicitation' || input.signal !== 'select' ||
    typeof input.body !== 'string' || input.body.trim() === '' || new TextEncoder().encode(input.body).length > COMMENT_MAX_BYTES ||
    input.ephemeral || input.usage || input.action || input.result !== undefined) {
    return { ok: false, code: 'INVALID_STRICT_DECISION', message: 'strict decisions require an authenticated persistent select elicitation' };
  }
  const binding = parsed.data;
  const options = parseElicitationOptions(input.parameter);
  // An optional structured approval detail rides with the options; nothing else does.
  const offered = input.parameter && typeof input.parameter === 'object' && !Array.isArray(input.parameter) ? (input.parameter as Record<string, unknown>) : {};
  const detail = 'detail' in offered ? ApprovalDetail.safeParse(offered.detail) : null;
  if (detail && !detail.success) {
    return { ok: false, code: 'INVALID_STRICT_DECISION', message: 'strict decision approval detail is malformed' };
  }
  // approve, [approve-run], [always], deny. Nothing else; "always" is marked for workspace admins.
  const names = options.map((o) => o.name).join(',');
  if (!['approve,deny', 'approve,approve-run,deny', 'approve,always,deny', 'approve,approve-run,always,deny'].includes(names) ||
      options.some((o) => (o.name === 'always') !== (o.requires === 'workspace-admin')) ||
      // Its meanings and scopes follow from the option names; an offer may not say otherwise.
      options.some((o) => o.meaning !== undefined || o.scope !== undefined) ||
    canonicalDecisionRequest(input.parameter) !== canonicalDecisionRequest(detail ? { options, detail: detail.data } : { options })) {
    return { ok: false, code: 'INVALID_STRICT_DECISION', message: 'strict decisions require exact canonical approve/deny options' };
  }
  const payload = canonicalDecisionRequest(input);
  const saved = deps.sql.exec(`SELECT * FROM strict_decision_requests WHERE request_id = ?`, binding.request_id).toArray()[0];
  if (saved) {
    if (saved.agent_id !== input.agentId) return { ok: false, code: 'NOT_RUN_OWNER', message: 'decision request belongs to another principal' };
    if (saved.payload_json !== payload) return { ok: false, code: 'DECISION_CONFLICT', message: 'decision request payload changed' };
    return { ok: true, value: JSON.parse(saved.response_json as string) };
  }
  const auth = deps.authorizeRun(input);
  if (!auth.ok) return auth;
  if (Number(auth.run.last_heartbeat_ms) + HEARTBEAT_TIMEOUT_MS <= deps.nowMs()) return { ok: false, code: 'STALE_LEASE', message: 'run heartbeat lease expired' };
  if (binding.expires_at <= deps.nowMs()) return { ok: false, code: 'DECISION_EXPIRED', message: 'decision deadline expired' };
  const cardId = auth.run.card_id as string;
  const now = deps.now();
  const value = deps.ctx.storage.transactionSync(() => {
    deps.sql.exec(`INSERT INTO activities (run_id, card_id, type, ephemeral, body, action, detail_json, ts) VALUES (?, ?, 'elicitation', 0, ?, NULL, ?, ?)`, input.runId, cardId, input.body!, JSON.stringify({ parameter: input.parameter, signal: input.signal, strictDecision: binding }), now);
    deps.sql.exec(`UPDATE cards SET state = 'input-required', updated_at = ? WHERE id = ?`, now, cardId);
    const elicitationId = deps.openElicitation(input, auth.run, cardId, now);
    const response = { accepted: true as const, cardState: 'input-required' as const, elicitationId, strictDecision: binding };
    deps.sql.exec(`INSERT INTO strict_decision_requests VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, binding.request_id, input.agentId!, input.runId, input.leaseEpoch, elicitationId, payload, JSON.stringify(response), JSON.stringify(binding));
    deps.sql.exec(`UPDATE runs SET last_heartbeat_ms = ? WHERE id = ?`, deps.nowMs(), input.runId);
    deps.reportRun(input.runId);
    deps.emit('activity', { runId: input.runId, cardId, activityType: input.type });
    return response;
  });
  await deps.scheduleReclaim();
  return { ok: true, value };
}

/**
 * Finish a turn on a card, and say what kind of finish it is (`StageOutcome`).
 *
 * `pass` (or nothing, on a stage that judges nothing) stores the handoff and advances the card —
 * what this always did. `changes-needed` sends it BACK to the stage's `returnStage` with the
 * findings, bounded by `MAX_AUTOMATIC_RETURNS`. `needs-person` parks it on a question and is
 * handled before anything here treats the run as finished: see `waitOnPerson`.
 */
export async function complete(deps: RunVerbsDeps, input: CompleteVerbInput): Promise<Result<CardView>> {
  const auth = deps.authorizeRun(input);
  if (!auth.ok) return auth;
  const run = auth.run;
  const cardId = run.card_id as string;
  // Refused BEFORE the run ends, so a malformed call is something the agent corrects on the same
  // run rather than a card the board has to reason about. The REST surface casts rather than
  // parses, so the vocabulary is checked here too.
  if (input.outcome !== undefined && !OUTCOMES.has(input.outcome)) {
    return { ok: false, code: 'INVALID_OUTCOME', message: `outcome must be one of ${[...OUTCOMES].join(', ')}` };
  }
  const outcomeError = outcomeInputError(input);
  if (outcomeError) return { ok: false, code: 'INVALID_OUTCOME', message: outcomeError };
  if (input.findings !== undefined && new TextEncoder().encode(input.findings).length > COMMENT_MAX_BYTES) {
    return { ok: false, code: 'INVALID_OUTCOME', message: `findings are at most ${COMMENT_MAX_BYTES} bytes — link anything longer` };
  }
  if (input.outcome === 'needs-person') return waitOnPerson(deps, input, run);

  const card = deps.mustGetCard(cardId);
  const stages = deps.stages();
  const stageIndex = stages.findIndex((stage) => stage.key === card.currentStageKey);
  const nextStage = stageIndex === -1 ? undefined : stages[stageIndex + 1];
  let approvalSubject: PreparedApproval | null = null;
  if (nextStage?.approvalSubjectSchema && nextStage.gate === 'approval' && !deps.isAgentClaimable(nextStage)) {
    const prepared = await deps.prepareApprovalSubject(card, nextStage, input.handoff, input.runId, run.agent_id as string);
    if (!prepared.ok) return prepared;
    approvalSubject = prepared.value;

    // SHA-256 is asynchronous. A Durable Object may admit another request while it is awaited,
    // so fence again before the first write. The winning completion ends the run synchronously;
    // every concurrent completion then observes a stale lease instead of colliding mid-transaction.
    const fenced = deps.authorizeRun(input);
    if (!fenced.ok) return fenced;
    const current = deps.getCard(cardId);
    if (!current || current.currentStageKey !== card.currentStageKey || (fenced.run.card_id as string) !== cardId) {
      return { ok: false, code: 'STALE_LEASE', message: 'the card moved while the approval subject was prepared' };
    }
  }
  const now = deps.now();
  // Computed here rather than further down, because the run's own record needs it too. Same
  // expression the card gets below; `undefined` (no handoff given) stays NULL in both.
  const handoffJson = input.handoff !== undefined ? JSON.stringify(input.handoff) : null;
  // The handoff lands on the RUN as well as the card: the card's copy is what the next claim
  // reads and is overwritten at every stage; this one is the permanent record of what this stage
  // said when it finished.
  const endRun = () => {
    deps.sql.exec(
      `UPDATE runs SET status = 'ended', outcome = 'completed', ended_at = ?, handoff_json = ? WHERE id = ?`,
      now,
      handoffJson,
      input.runId,
    );
    deps.cancelElicitationsForRun(input.runId);
  };
  // A digest-bound completion commits its run/card/subject/gate binding together below. Generic
  // completions retain their established order and behaviour.
  if (!approvalSubject) endRun();

  /**
   * Completion is earned, not announced.
   *
   * This method wrote `outcome = 'completed'` and advanced the card unconditionally, so an agent
   * calling `complete` was the sole author of the claim that its stage was done — and on the
   * Press board that claim was false twice, once over a commit sitting unpushed on a station and
   * once for a run that had explicitly refused to publish.
   *
   * A card may override its stage (D3). The override REPLACES rather than merges: a card saying
   * `{}` means "this card's stage rule does not apply here", and a merge would make that
   * impossible to say. It is recorded on the run, because routing around a check is a legitimate
   * act and a silent one is not.
   */
  const stage = stages.find((st) => st.key === card.currentStageKey);
  const cardOverride = (card.spec as { completion?: CompletionRequirement } | null | undefined)?.completion;
  const requirement = cardOverride ?? stage?.completion;
  let approvalCompletionRecord: Record<string, unknown> | null = null;

  const returnsSoFar = Number(deps.getCardRow(cardId)?.auto_returns ?? 0);
  const route = routeOutcome(
    { key: card.currentStageKey, ...(stage?.returnStage ? { returnStage: stage.returnStage } : {}) },
    input,
    { returnsSoFar, limit: MAX_AUTOMATIC_RETURNS },
  );

  const refusals: string[] = [];
  let verdict: ReturnType<typeof evaluateCompletion> | null = null;
  if (requirement) {
    verdict = evaluateCompletion(requirement, {
      handoff: input.handoff,
      references: deps.sql
        .exec(`SELECT provider, source_type AS sourceType FROM card_references WHERE card_id = ?`, cardId)
        .toArray()
        .map((r) => ({ provider: r.provider as string, sourceType: r.sourceType as string })),
    });
    if (!verdict.met) refusals.push(verdict.reason ?? 'the completion requirement was not met');
  }
  // A judging stage that said nothing has not said it passed. Same path as a missing handoff key:
  // one automatic rework naming what to add, then a person.
  if (route.kind === 'refuse') refusals.push(route.reason);

  const completionRecord =
    requirement || input.outcome !== undefined || refusals.length > 0
      ? {
      ...(verdict ?? { met: refusals.length === 0 }),
      ...(refusals.length > 0 ? { met: false, reason: refusals.join('; ') } : {}),
      ...(requirement ? { override: cardOverride !== undefined } : {}),
      ...(input.outcome !== undefined ? { outcome: input.outcome } : {}),
        }
      : null;
  if (completionRecord) {
    if (approvalSubject && refusals.length === 0 && route.kind === 'advance') {
      approvalCompletionRecord = completionRecord;
    } else {
      recordRunCompletion(deps, input.runId, completionRecord);
    }
  }

  if (refusals.length > 0) {
    if (approvalSubject) endRun();
    const why = refusals.join('; ');
    // Blocked, not failed (D1): the agent asserted something untrue. The run says so whatever
    // happens to the card next.
    deps.sql.exec(`UPDATE runs SET outcome = 'blocked' WHERE id = ?`, input.runId);
    const reason = `this stage was not finished: ${why}`;
    deps.reworkOrPark(cardId, card.currentStageKey, input.runId, why, input.handoff);
    // On the card's own replay, as an `error`: a refusal a reader has to reconstruct from
    // run outcomes is a refusal most readers will miss.
    deps.sql.exec(
      `INSERT INTO activities (run_id, card_id, type, ephemeral, body, action, detail_json, ts)
       VALUES (?, ?, 'error', 0, ?, NULL, ?, ?)`,
      input.runId,
      cardId,
      reason,
      JSON.stringify({
        parameter: requirement ?? { returnStage: stage?.returnStage ?? null },
        result: verdict ?? { met: false, reason: why },
        signal: null,
      }),
      now,
    );
    deps.reportRun(input.runId);
    await deps.scheduleReclaim();
    return { ok: true, value: deps.mustGetCard(cardId) };
  }

  if (route.kind === 'return' || route.kind === 'park') {
    if (approvalSubject) endRun();
    const findings = input.findings!.trim();
    // The findings go on the thread, where people read, as the judge's own words.
    deps.writeComment(cardId, { kind: 'agent', id: run.agent_id as string, name: null }, findings);
    // A return stage written before validation existed, or left dangling by a board created with
    // one, is a return nobody can follow: the card stops for a person rather than going nowhere.
    const broken = route.kind === 'return' && stage ? returnStageError(stage, stages) : null;
    if (route.kind === 'return' && !broken) {
      returnCard(deps, cardId, card.currentStageKey, route.to, input.runId, findings, input.handoff, returnsSoFar + 1);
    } else {
      const why = broken ?? (route.kind === 'park' ? route.reason : '');
      const detail = `${why}. Findings: ${findings}`;
      const repeated = route.kind === 'park' && route.repeated;
      deps.parkForHuman(
        cardId,
        repeated ? { reason: 'repeated-failure', failureCount: returnsSoFar + 1, detail } : { reason: 'blocked', detail },
      );
      deps.emit('card.blocked', { cardId, reason: detail, ...(repeated ? { brokeCircuit: true } : {}) });
      deps.notify(repeated ? 'failed' : 'blocked', cardId, detail);
    }
    deps.reportRun(input.runId);
    await deps.scheduleReclaim();
    return { ok: true, value: deps.mustGetCard(cardId) };
  }

  if (approvalSubject) {
    deps.ctx.storage.transactionSync(() => {
      endRun();
      if (approvalCompletionRecord) recordRunCompletion(deps, input.runId, approvalCompletionRecord);
      deps.advanceCard(cardId, card.currentStageKey, run.agent_id as string, handoffJson, input.runId, approvalSubject);
    });
  } else {
    deps.advanceCard(cardId, card.currentStageKey, run.agent_id as string, handoffJson, input.runId, null);
  }
  // After advanceCard: a human gate it opened judges this run, so the run reports `waiting`.
  deps.reportRun(input.runId);
  await deps.scheduleReclaim();
  return { ok: true, value: deps.mustGetCard(cardId) };
}

/**
 * Send a card back to an earlier stage on a judge's `changes-needed`.
 *
 * The handoff the fixer receives is the judge's own, with the findings lifted into `feedback` —
 * the key a reviewer's request-changes already uses and AgentPod's card prompt renders as its own
 * section — and kept verbatim in `findings` beside `returnedFrom`. The return is a fresh visit to
 * the target stage, so the breaker count starts over there; `auto_returns` is what bounds the loop.
 * A failing machine check returns a card through here too (machine-checks.ts), as the ruling asks.
 */
export function returnCard(deps: Pick<RunVerbsDeps, 'emit' | 'notify' | 'notifyWorkAvailable' | 'now' | 'sql'>, cardId: string, fromStageKey: string, toStageKey: string, runId: string, findings: string, judgeHandoff: JsonValue | undefined, returns: number): void {
  const carried = {
    feedback: `Sent back from "${fromStageKey}": changes are needed.\n\n${findings}`,
    findings,
    returnedFrom: fromStageKey,
  };
  const merged =
    judgeHandoff && typeof judgeHandoff === 'object' && !Array.isArray(judgeHandoff)
      ? { ...judgeHandoff, ...carried }
      : { ...carried, ...(judgeHandoff !== undefined ? { judgeHandoff } : {}) };
  deps.sql.exec(
    `UPDATE cards SET current_stage_key = ?, state = 'submitted', delegate_agent_id = NULL, current_run_id = NULL,
            failure_count = 0, needs_human_json = NULL, handoff_json = ?, auto_returns = ?, updated_at = ? WHERE id = ?`,
    toStageKey,
    JSON.stringify(merged),
    returns,
    deps.now(),
    cardId,
  );
  deps.emit('card.returned', { cardId, from: fromStageKey, to: toStageKey, runId, returns });
  deps.notify('rework', cardId, `Sent back to "${toStageKey}" from "${fromStageKey}": ${findings}`);
  deps.notifyWorkAvailable(cardId);
}

/**
 * Park a card on a person, at the agent's request: `complete` with `outcome: 'needs-person'`.
 *
 * An agent that needed a person to approve a device sign-in ended its turn with the link, and the
 * board read that as a finished handoff missing a field — refused it, reworked it, refused it
 * again and parked the card as a broken handoff. Nothing was broken; the agent had no way to say
 * "I am waiting on somebody" that ended its turn.
 *
 * This is that way, and it is the existing question, not a new kind of wait: an `elicitation`
 * row, so the question shows in Needs you, on the card, and in the board's chat room exactly as
 * a live run's question does. What differs is that the run ENDS — the harness has stopped, and a
 * lease nobody heartbeats would be reclaimed as a crash. Answering it (`answerElicitation`)
 * re-queues the same stage with the answer and this run's handoff as the work so far.
 *
 * Not a failure and not a refusal: `failure_count` and the stage's one automatic rework are both
 * untouched, and the completion requirement is not evaluated — nothing was claimed finished. The
 * run's outcome is `blocked`, the word the bridge already reads as "the agent reported for itself".
 */
async function waitOnPerson(deps: RunVerbsDeps, input: CompleteVerbInput, run: Row): Promise<Result<CardView>> {
  const cardId = run.card_id as string;
  const now = deps.now();
  const handoffJson = input.handoff !== undefined ? JSON.stringify(input.handoff) : null;
  deps.sql.exec(
    `UPDATE runs SET status = 'ended', outcome = 'blocked', ended_at = ?, handoff_json = ? WHERE id = ?`,
    now,
    handoffJson,
    input.runId,
  );
  deps.cancelElicitationsForRun(input.runId);
  const url = input.url?.trim();
  const question = url ? `${input.question!.trim()}\n\n${url}` : input.question!.trim();
  const asked: AgentActivityInput = {
    runId: input.runId,
    leaseEpoch: input.leaseEpoch,
    agentId: input.agentId,
    type: 'elicitation',
    body: question,
    parameter: input.options !== undefined ? ({ options: input.options }) : null,
  };
  // On the replay as the question it is, like a live run's.
  deps.sql.exec(
    `INSERT INTO activities (run_id, card_id, type, ephemeral, body, action, detail_json, ts)
     VALUES (?, ?, 'elicitation', 0, ?, NULL, ?, ?)`,
    input.runId,
    cardId,
    question,
    JSON.stringify({ parameter: asked.parameter ?? null, result: url ? { url } : null, signal: null }),
    now,
  );
  deps.openElicitation(asked, run, cardId, now);
  deps.sql.exec(
    `UPDATE cards SET state = 'input-required', delegate_agent_id = NULL, current_run_id = NULL, updated_at = ? WHERE id = ?`,
    now,
    cardId,
  );
  deps.emit('card.waiting_on_person', { cardId, runId: input.runId });
  deps.reportRun(input.runId);
  await deps.scheduleReclaim();
  return { ok: true, value: deps.mustGetCard(cardId) };
}

/** The verdict, on the run, so the trace and the receipt can read it rather than infer it. */
function recordRunCompletion(deps: RunVerbsDeps, runId: string, verdict: Record<string, unknown>): void {
  deps.sql.exec(`UPDATE runs SET completion = ? WHERE id = ?`, JSON.stringify(verdict), runId);
}

/** Submit a gated, agent-worked stage for human approval (docs/04, docs/08 §6). */
export async function submitForReview(deps: RunVerbsDeps, input: RunVerbInput & { output?: JsonValue }): Promise<Result<CardView>> {
  const auth = deps.authorizeRun(input);
  if (!auth.ok) return auth;
  const run = auth.run;
  const cardId = run.card_id as string;
  const now = deps.now();
  deps.sql.exec(`UPDATE runs SET status = 'ended', outcome = 'submitted', ended_at = ? WHERE id = ?`, now, input.runId);
  deps.cancelElicitationsForRun(input.runId);
  // Waiting to be looked at, which is a different thing from being stuck — and the
  // only one of the five that is a healthy, expected place for a card to rest.
  deps.parkForHuman(cardId, { reason: 'review' });
  const card = deps.mustGetCard(cardId);
  deps.sql.exec(
    `UPDATE cards SET state = 'input-required', delegate_agent_id = NULL, current_run_id = NULL, updated_at = ? WHERE id = ?`,
    now,
    cardId,
  );
  // request_changes returns to the same (worked) stage so the agent can redo it.
  // On a stage with checks this records them instead, and the gate opens once they pass (createGate).
  deps.createGate(cardId, card.currentStageKey, card.currentStageKey, run.agent_id as string, input.runId);
  deps.reportRun(input.runId);
  await deps.scheduleReclaim();
  return { ok: true, value: deps.mustGetCard(cardId) };
}

/** Escalate to a human — the card parks in input-required (docs/08 §6 — gates resolve in P3). */
export async function block(deps: RunVerbsDeps, input: RunVerbInput & { reason: string; summary?: string }): Promise<Result<CardView>> {
  const auth = deps.authorizeRun(input);
  if (!auth.ok) return auth;
  const run = auth.run;
  const cardId = run.card_id as string;
  const now = deps.now();
  deps.sql.exec(`UPDATE runs SET status = 'ended', outcome = 'blocked', ended_at = ? WHERE id = ?`, now, input.runId);
  deps.cancelElicitationsForRun(input.runId);
  // The block is the reason now, and it REPLACES any question this run asked — those
  // were just cancelled, and a card pointing at a cancelled question sends somebody
  // to something that no longer exists.
  const summary = input.summary?.trim().slice(0, 120);
  deps.parkForHuman(cardId, { reason: 'blocked', detail: input.reason, ...(summary ? { summary } : {}) });
  deps.sql.exec(
    `UPDATE cards SET state = 'input-required', delegate_agent_id = NULL, current_run_id = NULL, updated_at = ? WHERE id = ?`,
    now,
    cardId,
  );
  deps.emit('card.blocked', { cardId, reason: input.reason });
  deps.reportRun(input.runId);
  await deps.scheduleReclaim();
  return { ok: true, value: deps.mustGetCard(cardId) };
}

/** Report a failure — retryable until the circuit breaker trips (docs/08 §4). */
export async function fail(deps: RunVerbsDeps, input: RunVerbInput & { reason: string }): Promise<Result<CardView>> {
  const auth = deps.authorizeRun(input);
  if (!auth.ok) return auth;
  const run = auth.run;
  const cardId = run.card_id as string;
  // The reason, on the run. `outcome = 'crashed'` is a label; the next agent at this stage needs
  // the sentence, and `claim()` reads it from here.
  deps.sql.exec(
    `UPDATE runs SET status = 'ended', outcome = 'crashed', ended_at = ?, failure_reason = ? WHERE id = ?`,
    deps.now(),
    input.reason || null,
    input.runId,
  );
  deps.cancelElicitationsForRun(input.runId);
  deps.endAttempt(cardId, 'card.failed', input.reason);
  deps.notify('failed', cardId, input.reason || 'Run failed');
  deps.reportRun(input.runId);
  // Re-arm: the report just queued needs the alarm, and fail() never re-armed it before.
  await deps.scheduleReclaim();
  return { ok: true, value: deps.mustGetCard(cardId) };
}

/** Give the claim back without penalty — the card becomes claimable again (docs/04). */
export async function release(deps: RunVerbsDeps, input: RunVerbInput & { reason?: string }): Promise<Result<CardView>> {
  const auth = deps.authorizeRun(input);
  if (!auth.ok) return auth;
  const run = auth.run;
  const cardId = run.card_id as string;
  const now = deps.now();
  deps.sql.exec(`UPDATE runs SET status = 'ended', outcome = 'released', ended_at = ? WHERE id = ?`, now, input.runId);
  deps.cancelElicitationsForRun(input.runId);
  deps.sql.exec(
    `UPDATE cards SET state = 'submitted', delegate_agent_id = NULL, current_run_id = NULL, updated_at = ? WHERE id = ?`,
    now,
    cardId,
  );
  deps.emit('run.released', { cardId, runId: input.runId });
  deps.notifyWorkAvailable(cardId);
  deps.reportRun(input.runId);
  await deps.scheduleReclaim();
  return { ok: true, value: deps.mustGetCard(cardId) };
}
