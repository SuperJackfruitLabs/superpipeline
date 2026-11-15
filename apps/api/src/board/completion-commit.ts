import {
  type CompletionRequirement,
  evaluateCompletion,
  returnStageError,
  routeOutcome,
} from '@superpipeline/contract';
import type { JsonValue } from '../json';
import type { BoardContext } from './context';
import type { CardView, CompleteVerbInput, Row, StageDef } from './model';
import { CIRCUIT_BREAKER_LIMIT } from './rules';
import type { PreparedApproval } from './views';

export type CompletionCommitDeps = Pick<
  BoardContext,
  | 'sql'
  | 'ctx'
  | 'now'
  | 'cancelElicitationsForRun'
  | 'getCardRow'
  | 'reworkOrPark'
  | 'emit'
  | 'reportRun'
  | 'writeComment'
  | 'parkForHuman'
  | 'notify'
  | 'advanceCard'
  | 'notifyWorkAvailable'
>;
const MAX_AUTOMATIC_RETURNS = CIRCUIT_BREAKER_LIMIT;

/** Synchronous mutation span shared by ordinary completion and reviewed settlement.
 * Callers authorize/prepare first. outerTransaction means the caller already owns
 * the SQL transaction; ordinary calls retain their original approval-only boundary.
 * Alarm arming and the final post-await card read remain with the caller.
 */
export function commitCompletion(
  deps: CompletionCommitDeps,
  input: CompleteVerbInput,
  run: Row,
  card: CardView,
  stages: StageDef[],
  approvalSubject: PreparedApproval | null,
  outerTransaction = false,
): undefined {
  const cardId = run.card_id;
  if (typeof cardId !== 'string') throw new Error('invalid completion run card');
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
        .exec(
          `SELECT provider, source_type AS sourceType
             FROM card_references
            WHERE card_id = ? AND (run_id = ? OR added_by = 'user')`,
          cardId,
          input.runId,
        )
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
    return undefined;
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
        repeated
          ? { reason: 'repeated-failure', failureCount: returnsSoFar + 1, detail }
          : { reason: 'blocked', detail },
      );
      deps.emit('card.blocked', { cardId, reason: detail, ...(repeated ? { brokeCircuit: true } : {}) });
      deps.notify(repeated ? 'failed' : 'blocked', cardId, detail);
    }
    deps.reportRun(input.runId);
    return undefined;
  }

  if (approvalSubject && !outerTransaction) {
    deps.ctx.storage.transactionSync(() => {
      endRun();
      if (approvalCompletionRecord) recordRunCompletion(deps, input.runId, approvalCompletionRecord);
      deps.advanceCard(cardId, card.currentStageKey, run.agent_id as string, handoffJson, input.runId, approvalSubject);
    });
  } else {
    if (approvalSubject) {
      endRun();
      if (approvalCompletionRecord) recordRunCompletion(deps, input.runId, approvalCompletionRecord);
    }
    deps.advanceCard(cardId, card.currentStageKey, run.agent_id as string, handoffJson, input.runId, approvalSubject);
  }
  // After advanceCard: a human gate it opened judges this run, so the run reports `waiting`.
  deps.reportRun(input.runId);
  return undefined;
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
export function returnCard(
  deps: Pick<CompletionCommitDeps, 'emit' | 'notify' | 'notifyWorkAvailable' | 'now' | 'sql'>,
  cardId: string,
  fromStageKey: string,
  toStageKey: string,
  runId: string,
  findings: string,
  judgeHandoff: JsonValue | undefined,
  returns: number,
): void {
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

/** The verdict, on the run, so the trace and the receipt can read it rather than infer it. */
function recordRunCompletion(deps: CompletionCommitDeps, runId: string, verdict: Record<string, unknown>): void {
  deps.sql.exec(`UPDATE runs SET completion = ? WHERE id = ?`, JSON.stringify(verdict), runId);
}
