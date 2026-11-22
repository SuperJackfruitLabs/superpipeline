import { parseHandoff } from './card-store';
import { CommitEffects } from './commit-effects';
import { type ClaimReason, needsYou, stageCapabilitiesMet } from '@superpipeline/contract';
import { checkpointDigest } from './checkpoint-json';
import { parseCheckpointPolicy } from './checkpoint-proposal';
import {
  CHECKPOINT_CLAIM_PROTOCOL, CHECKPOINT_CLAIM_PROTOCOL_V2, checkpointClaimDiscovery, insertPendingCheckpointClaim,
  type CheckpointClaimDiscovery,
} from './checkpoint-claims';
import { hasCheckpointPolicy } from './checkpoint-policy-admin';
import { cardRepositoriesOf, narrowCheckpointPolicy, narrowingWords, stageCardPolicy } from './checkpoint-selection';
import { grantPermitsAgent, isControlPairEnforced } from '../auth/grant-match';
import { newId } from '../ids';
import { RELAY_CONFIG_ID } from '../push/relay';
import { queueEvent, type PushTarget } from './push';
import type { JsonValue } from '../json';
import { reportingEnabled } from '../superwitness/config';
import type { BoardContext } from './context';
import { CLEAR_HOLD_SQL, isLiveHold, liveHoldWhere } from './hold';
import type { CardView, ClaimResult, Result, Row, RunAuth, RunVerbInput, StageDef } from './model';
import { inWindowWhere, placementWindowMs, placementWindowUntil } from './placement-window';
import type { WorkAvailableBody } from './views';
import { HEARTBEAT_TIMEOUT_MS, MAX_PUSH_ATTEMPTS } from './rules';

/**
 * Agents taking work: which cards a capability may claim, the lease and its heartbeat, reclaiming
 * a run that went dark and arming the alarm that does it, and the run-ownership checks every run
 * verb makes.
 */

/** What claims needs from the rest of the board. */
export type ClaimsDeps = Pick<
  BoardContext,
  | 'allCards'
  | 'boardOverBudget'
  | 'cancelElicitationsForRun'
  | 'claimableWhere'
  | 'ctx'
  | 'commitEffects'
  | 'emit'
  | 'endAttempt'
  | 'env'
  | 'getCard'
  | 'getMeta'
  | 'isHeldBack'
  | 'mustGetCard'
  | 'notify'
  | 'now'
  | 'nowMs'
  | 'parkForHuman'
  | 'pendingElicitations'
  | 'pendingGates'
  | 'reportRun'
  | 'rowToCard'
  | 'scheduleReclaim'
  | 'sql'
  | 'stages'
  | 'staleSettings'
>;

/**
 * How long after a delivery is queued the alarm drains it, doubling per attempt
 * (docs/05 §4): 5s, 10s, 20s, 40s, 80s, then dead-lettered.
 *
 * Before this existed, `dispatchPushDeliveries` was reachable only from `POST
 * …/push/dispatch` — so a queued delivery sat pending until something outside
 * the board happened to poke it. That was survivable for `work.available`,
 * which has the pull path underneath it, and is not survivable for a gate: a
 * gate that never rings is a card blocked forever on an approval nobody was
 * asked for.
 */
const PUSH_DRAIN_BASE_MS = 5_000;

/** A claim that hands out nothing, and why. */
function refused(reason: ClaimReason): ClaimResult {
  return { claimed: false, reason };
}

/**
 * Atomically hand a ready, capability-matched card to an agent, within its concurrency limit.
 *
 * `principalId` is the caller's already-resolved suite principal id (`agents.external_id`),
 * when the auth path that authenticated this request already fetched it — a `spa_` token does,
 * off the same catalog row that resolves the token (`findAgentByTokenHash`). Passing it here
 * skips the extra `SELECT` `principalIdFor` would otherwise issue on every enforced claim, which
 * matters because this is the path every agent hits repeatedly. `undefined` (not passed at all)
 * means the caller never resolved it — the dev-header auth path, which carries no DB-backed
 * identity — and this method falls back to looking it up itself, exactly as before.
 *
 * Nothing handed out is `{claimed: false, reason}`: the first reason met, from the same filter the
 * eligibility read uses (`ClaimReason`). Ordinary success retains its shape; checkpoint work returns its captured policy.
 *
 * A reservation (`hold.ts`) is checked here and nowhere earlier. A card held for another agent is
 * passed over, and `card_reserved` is the answer only when nothing else was claimable. A card held
 * for this agent comes first, ahead of any higher-priority card without a hold (charter: SuperDispatch
 * owns the scheduler, decision 3: the placement service already weighed priority when it chose).
 * With no live hold on the board both terms are constant, and the order is today's.
 *
 * On a board with a placement window (`placement-window.ts`), a card inside its window is passed
 * over too, unless it is held for this claimant, and `placement_window` is the answer when nothing
 * else was claimable. A board with no window runs exactly the query it ran before.
 */
export async function claim(deps: ClaimsDeps, input: Claimant & { profileKey?: string }): Promise<ClaimResult> {
  // Capture client capability before any await; it never grants execution authority.
  input = { ...input, capabilities: [...input.capabilities] };
  if (!deps.getMeta('boardId')) return refused('board_not_initialized');
  // Budget cap (docs/07 §6): once the board hits its USD ceiling, stop handing out new work.
  if (deps.boardOverBudget()) return refused('board_over_budget');
  // The agent-level half of the one filter (concurrency, capability): the eligibility read asks the
  // same function about one card, so the two cannot disagree about who may take what.
  const [first] = claimantRefusals(deps, input);
  if (first) return refused(first);

  const selectedStages = deps.stages();
  const claimableKeys = claimableStageKeys({ stages: () => selectedStages }, input.agentId, input.capabilities, input);
  const placeholders = claimableKeys.map(() => '?').join(', ');
  const holdMs = deps.nowMs();
  const windowMs = placementWindowMs(deps);
  // Only on a board with a window: inside it, a card goes to the agent it is held for or to no one.
  const window = windowMs > 0 ? { sql: `AND NOT (${inWindowWhere()} AND NOT ${liveHoldWhere()})`, params: [windowMs, holdMs, holdMs] } : { sql: '', params: [] };
  const row = deps.sql
    .exec(
      `SELECT * FROM cards c WHERE ${deps.claimableWhere(placeholders)}
         AND NOT (${liveHoldWhere()} AND c.reserved_for != ?)
         ${window.sql}
       ORDER BY (${liveHoldWhere()} AND c.reserved_for = ?) DESC,
         c.priority DESC, (c.due_at IS NULL), c.due_at ASC, c.created_at ASC LIMIT 1`,
      ...claimableKeys,
      holdMs,
      input.agentId,
      ...window.params,
      holdMs,
      input.agentId,
    )
    .toArray()[0];
  if (!row) {
    if (heldForOthers(deps, placeholders, claimableKeys, input.agentId, holdMs)) return refused('card_reserved');
    return refused(windowMs > 0 && inWindowCount(deps, placeholders, claimableKeys, windowMs, holdMs) > 0 ? 'placement_window' : 'no_matching_card');
  }

  if (!hasCheckpointPolicy(selectedStages.find((stage) => stage.key === row.current_stage_key)) &&
    input.checkpointProtocol !== CHECKPOINT_CLAIM_PROTOCOL)
    return claimOrdinarySelected(deps, input, row, holdMs);

  if (typeof row.id !== 'string' || typeof row.current_stage_key !== 'string') throw new Error('INVALID_CLAIM_STATE');
  const selectedCardId = row.id, selectedStageKey = row.current_stage_key;
  // Freeze every selected authorization input before either await. A changed grant
  // needs a fresh claim, not a synchronous guess about what its new issuer intended.
  const authority = () => JSON.stringify({
    tenant: deps.getMeta('tenantId'), board: deps.getMeta('boardId'), stages: deps.getMeta('stages'),
    enforced: isControlPairEnforced(deps.env),
  });
  const selectedAuthority = authority();
  const selectedRow = JSON.stringify(row);
  const selectedStage = deps.stages().find((s) => s.key === row.current_stage_key);
  if (!selectedStage) return refused('no_matching_card');
  // A stage whose cards choose narrows its allowlist by this card's choice, now and synchronously;
  // the transaction below re-reads the same card row and stages, so the narrowing it records is
  // exactly this one. A narrowing that refuses parks the card for a person below.
  const stagePolicy = stageCardPolicy(selectedStage);
  const narrowed = stagePolicy === undefined ? undefined : narrowCheckpointPolicy(stagePolicy, cardRepositoriesOf(row));
  const policy = selectedStage.checkpointPolicy !== undefined
    ? parseCheckpointPolicy(new TextEncoder().encode(JSON.stringify(selectedStage.checkpointPolicy)))
    : narrowed?.ok ? narrowed.policy : undefined;
  const denied = await grantRefused(deps, input, row);
  const policyDigest = policy === undefined ? undefined : await checkpointDigest(policy);
  const stagePolicyDigest = stagePolicy === undefined ? undefined : await checkpointDigest(stagePolicy);
  deps.commitEffects ??= new CommitEffects();
  const result = deps.commitEffects.run(deps.ctx.storage, (): ClaimResult => {
    const currentRow = deps.sql.exec('SELECT * FROM cards WHERE id=?', row.id).toArray()[0];
    if (!currentRow || JSON.stringify(currentRow) !== selectedRow || authority() !== selectedAuthority)
      return refused('no_matching_card');
    if (deps.boardOverBudget()) return refused('board_over_budget');
    const [refusal] = claimantRefusals(deps, input, selectedStageKey);
    if (refusal) return refused(refusal);
    // Re-evaluate the complete SQL eligibility predicate at the current clock:
    // reservations, stage WIP, holds, blockers and placement may have changed.
    const checkedMs = deps.nowMs();
    const checkedWindowMs = placementWindowMs(deps);
    const checkedWindow = checkedWindowMs > 0 ? {
      sql: `AND NOT (${inWindowWhere()} AND NOT ${liveHoldWhere()})`,
      params: [checkedWindowMs, checkedMs, checkedMs],
    } : { sql: '', params: [] };
    const eligible = deps.sql.exec(
      `SELECT c.id FROM cards c WHERE ${deps.claimableWhere(placeholders)}
       AND c.id=? AND NOT (${liveHoldWhere()} AND c.reserved_for != ?) ${checkedWindow.sql}`,
      ...claimableKeys, row.id, checkedMs, input.agentId, ...checkedWindow.params,
    ).toArray()[0];
    if (!eligible) return refused('no_matching_card');
    if (denied) {
      const why = row.queued_grant
        ? `the operator who queued this card may not dispatch ${input.agentId}`
        : 'this card was queued without an authorising token, so no one with permission asked for it to run';
      deps.parkForHuman(selectedCardId, { reason: 'not-authorised', detail: why }, false);
      deps.notify('control-pair', selectedCardId, `Not dispatched: ${why}`);
      deps.emit('card.blocked', { cardId: row.id, reason: why });
      return refused('grant_denied');
    }
    // No repositories to bench: the card names none and the stage has no default, or its choice
    // is no longer inside the stage's allowlist. It waits for a person, visibly, rather than being
    // skipped or benched with every repository; the person who chooses moves it back.
    if (stagePolicy !== undefined && narrowed !== undefined && !narrowed.ok) {
      const why = narrowingWords(narrowed.refusal, selectedStage.name, cardRepositoriesOf(row), stagePolicy);
      deps.parkForHuman(selectedCardId, { reason: 'blocked', detail: why }, false);
      deps.notify('blocked', selectedCardId, `Waiting for a person: ${why}`);
      deps.emit('card.blocked', { cardId: selectedCardId, reason: why });
      return refused('no_matching_card');
    }
    // The hold this claim fulfils, if any; cleared with the claim, live or dead, so it never outlives it.
    const fulfils = isLiveHold(row, checkedMs) && typeof row.reserved_decision_id === 'string' ? row.reserved_decision_id : null;
    if (row.reserved_for !== null && row.reserved_for !== undefined) deps.sql.exec(CLEAR_HOLD_SQL, row.id);
    // A claimed card is no longer waiting: its window, if any, is over. It opens again when it is next ready.
    if (row.ready_since_ms !== null && row.ready_since_ms !== undefined) deps.sql.exec(`UPDATE cards SET ready_since_ms = NULL WHERE id = ?`, row.id);
    const card = deps.rowToCard(row);
    const leaseEpoch = Number(row.claim_seq) + 1;
    const runId = newId('run');
    const now = deps.now();
    const nowMs = deps.nowMs();
    deps.sql.exec(
      `INSERT INTO runs (id, card_id, stage_key, agent_id, lease_epoch, status, outcome, last_heartbeat_ms, started_at, ended_at, profile_key, queued_by)
       VALUES (?, ?, ?, ?, ?, 'working', NULL, ?, ?, NULL, ?, ?)`,
      runId,
      card.id,
      card.currentStageKey,
      input.agentId,
      leaseEpoch,
      nowMs,
      now,
      input.profileKey ?? null,
      // Pinned onto the attempt so a run records WHOSE work it was, and stays
      // answerable after the card has moved on.
      (row.queued_by as string | null) ?? null,
    );
    deps.sql.exec(
      `UPDATE cards SET state = 'working', delegate_agent_id = ?, current_run_id = ?, claim_seq = ?, updated_at = ? WHERE id = ?`,
      input.agentId,
      runId,
      leaseEpoch,
      now,
      card.id,
    );
    // RAISE(IGNORE) and conditional writes can return without an SQL error.
    // Read back both sides before publishing ownership or the pending policy.
    const savedRun = deps.sql.exec('SELECT * FROM runs WHERE id=?', runId).toArray()[0];
    const savedCard = deps.sql.exec('SELECT * FROM cards WHERE id=?', card.id).toArray()[0];
    if (!savedRun || savedRun.card_id !== card.id || savedRun.stage_key !== card.currentStageKey ||
      savedRun.agent_id !== input.agentId || savedRun.lease_epoch !== leaseEpoch || savedRun.status !== 'working' ||
      savedRun.last_heartbeat_ms !== nowMs || savedRun.started_at !== now ||
      !savedCard || savedCard.current_run_id !== runId || savedCard.delegate_agent_id !== input.agentId ||
      savedCard.claim_seq !== leaseEpoch || savedCard.state !== 'working' || savedCard.current_stage_key !== card.currentStageKey
    ) throw new Error('INVALID_CLAIM_STATE');
    let checkpointClaim: CheckpointClaimDiscovery | undefined;
    if (policy !== undefined && policyDigest !== undefined) {
      const tenantId = deps.getMeta('tenantId'), boardId = deps.getMeta('boardId');
      if (!tenantId || !boardId) throw new Error('INVALID_CHECKPOINT_CLAIM');
      const chosen = stagePolicy !== undefined && stagePolicyDigest !== undefined && narrowed?.ok
        ? { selection: { ...narrowed.selection, stagePolicyDigest }, stagePolicy } : {};
      const saved = insertPendingCheckpointClaim(deps.sql, {
        tenantId, boardId, cardId: card.id, stageKey: card.currentStageKey,
        agentId: input.agentId, runId, leaseEpoch, policy, policyDigest, admissionState: 'pending',
        ...chosen,
      });
      checkpointClaim = checkpointClaimDiscovery(saved);
    }
    deps.reportRun(runId);
    deps.emit('card.claimed', { cardId: card.id, agentId: input.agentId, runId, ...(fulfils !== null ? { reservationDecisionId: fulfils } : {}) });

    const stage = selectedStage;
    const handoff = row.handoff_json ? (JSON.parse(row.handoff_json as string) as JsonValue) : null;
    return {
      claimed: true,
      ...(checkpointClaim ? { checkpointClaim } : {}),
      runId,
      leaseEpoch,
      card: deps.mustGetCard(card.id),
      stage,
      handoff,
      lastFailure: lastFailureAt(deps, card.id, stage.key, runId),
    };
  });
  if (result.claimed) await deps.scheduleReclaim();
  return result;
}

/** Ordinary work retains its original statement, clock and delivery order. */
async function claimOrdinarySelected(
  deps: ClaimsDeps, input: Claimant & { profileKey?: string }, row: Row, holdMs: number,
): Promise<ClaimResult> {
  if (typeof row.id !== 'string') throw new Error('INVALID_CLAIM_STATE');
  // ── The control pair, at the moment the work is handed out ──────────────
  //
  // The card records what its queuer was PERMITTED to dispatch
  // (charter decisions/2026-08-13-ecosystem-identity.md, Decision 4). The
  // human is long gone by now, which is exactly why the answer was written
  // down when it was still askable.
  //
  // A refusal is made VISIBLE rather than skipped. Silently passing over the
  // card would leave a board that looks idle while work sits on it — the
  // decision requires a denial to be reported, never dropped — so the card is
  // parked in `input-required`, which is this board's existing way of saying a
  // person has to do something. That also bounds the noise: the card leaves
  // `submitted`, so this is evaluated once and not on every poll.
  if (await grantRefused(deps, input, row)) {
    const why = row.queued_grant
      ? `the operator who queued this card may not dispatch ${input.agentId}`
      : 'this card was queued without an authorising token, so no one with permission asked for it to run';
    // Parked without releasing a run because there is no run — this stops a dispatch rather
    // than ending one. `row.id`: the candidate card is the row in hand.
    deps.parkForHuman(row.id, { reason: 'not-authorised', detail: why }, false);
    deps.notify('control-pair', row.id, `Not dispatched: ${why}`);
    deps.emit('card.blocked', { cardId: row.id, reason: why });
    return refused('grant_denied');
  }

  // The hold this claim fulfils, if any; cleared with the claim, live or dead, so it never outlives it.
  const fulfils = isLiveHold(row, holdMs) && typeof row.reserved_decision_id === 'string' ? row.reserved_decision_id : null;
  if (row.reserved_for !== null && row.reserved_for !== undefined) deps.sql.exec(CLEAR_HOLD_SQL, row.id);
  // A claimed card is no longer waiting: its window, if any, is over. It opens again when it is next ready.
  if (row.ready_since_ms !== null && row.ready_since_ms !== undefined) deps.sql.exec(`UPDATE cards SET ready_since_ms = NULL WHERE id = ?`, row.id);
  const card = deps.rowToCard(row);
  const leaseEpoch = Number(row.claim_seq) + 1;
  const runId = newId('run');
  const now = deps.now();
  const nowMs = deps.nowMs();
  deps.sql.exec(
    `INSERT INTO runs (id, card_id, stage_key, agent_id, lease_epoch, status, outcome, last_heartbeat_ms, started_at, ended_at, profile_key, queued_by)
     VALUES (?, ?, ?, ?, ?, 'working', NULL, ?, ?, NULL, ?, ?)`,
    runId,
    card.id,
    card.currentStageKey,
    input.agentId,
    leaseEpoch,
    nowMs,
    now,
    input.profileKey ?? null,
    // Pinned onto the attempt so a run records WHOSE work it was, and stays
    // answerable after the card has moved on.
    typeof row.queued_by === 'string' ? row.queued_by : null,
  );
  deps.sql.exec(
    `UPDATE cards SET state = 'working', delegate_agent_id = ?, current_run_id = ?, claim_seq = ?, updated_at = ? WHERE id = ?`,
    input.agentId,
    runId,
    leaseEpoch,
    now,
    card.id,
  );
  deps.reportRun(runId);
  deps.emit('card.claimed', { cardId: card.id, agentId: input.agentId, runId, ...(fulfils !== null ? { reservationDecisionId: fulfils } : {}) });
  await deps.scheduleReclaim();

  const stage = deps.stages().find((s) => s.key === card.currentStageKey);
  if (!stage) throw new Error('INVALID_CLAIM_STATE');
  const handoff = typeof row.handoff_json === 'string' ? parseHandoff(row.handoff_json) : null;
  return {
    claimed: true,
    runId,
    leaseEpoch,
    card: deps.mustGetCard(card.id),
    stage,
    handoff,
    lastFailure: lastFailureAt(deps, card.id, stage.key, runId),
  };
}

/** Whether a card this claimant could otherwise take is held for someone else right now. */
function heldForOthers(deps: Pick<ClaimsDeps, 'claimableWhere' | 'sql'>, placeholders: string, keys: string[], agentId: string, nowMs: number): boolean {
  return (
    Number(
      deps.sql
        .exec(`SELECT COUNT(*) AS n FROM cards c WHERE ${deps.claimableWhere(placeholders)} AND ${liveHoldWhere()} AND c.reserved_for != ?`, ...keys, nowMs, agentId)
        .one().n,
    ) > 0
  );
}

/** How many cards this claimant could otherwise take are inside their placement window, not held. */
function inWindowCount(deps: Pick<ClaimsDeps, 'claimableWhere' | 'sql'>, placeholders: string, keys: string[], windowMs: number, nowMs: number): number {
  return Number(
    deps.sql
      .exec(`SELECT COUNT(*) AS n FROM cards c WHERE ${deps.claimableWhere(placeholders)} AND ${inWindowWhere()} AND NOT ${liveHoldWhere()}`, ...keys, windowMs, nowMs, nowMs)
      .one().n,
  );
}

/**
 * Someone who might take work: an agent and its EFFECTIVE capabilities (declared plus whatever the
 * workspace's implication edges add, expanded at the Worker boundary because the edges live in the
 * catalog). `maxConcurrency` absent means one. `principalId` absent means "not looked up yet";
 * null means the agent maps to no suite principal.
 */
export interface Claimant {
  agentId: string;
  capabilities: string[];
  checkpointProtocol?: string;
  /**
   * Every checkpoint claim protocol the claimant speaks, beside `checkpointProtocol`. A stage whose
   * cards choose is offered only when this lists superpipeline.checkpoint-claim.v2.
   */
  checkpointProtocols?: string[];
  checkpointOnly?: boolean;
  maxConcurrency?: number;
  principalId?: string | null;
}

/** The stages on this board this claimant can take, by the one stage matcher. */
function claimableStageKeys(deps: Pick<ClaimsDeps, 'stages'>, agentId: string, capabilities: string[],
  protocols: Pick<Claimant, 'checkpointProtocol' | 'checkpointProtocols' | 'checkpointOnly'> = {}): string[] {
  const { checkpointProtocol, checkpointOnly } = protocols;
  if (checkpointOnly !== undefined && typeof checkpointOnly !== 'boolean') return [];
  const v1 = checkpointProtocol === CHECKPOINT_CLAIM_PROTOCOL;
  // v2 is spoken beside v1, never instead of it: a claimant that sends the list without
  // `checkpointProtocol` is refused at the route, and here never reaches a choosing stage.
  const v2 = v1 && Array.isArray(protocols.checkpointProtocols) && protocols.checkpointProtocols.includes(CHECKPOINT_CLAIM_PROTOCOL_V2);
  return deps.stages().filter((s) => stageMatches(s, agentId, capabilities) &&
    (s.checkpointPolicy === undefined || v1) &&
    (s.cardCheckpointPolicy === undefined || v2) &&
    (!checkpointOnly || hasCheckpointPolicy(s))).map((s) => s.key);
}

/**
 * THE filter, agent half: why this claimant may not take work here — any card when `stageKey` is
 * absent (a claim), or a card at `stageKey` (the eligibility read). Ordered as a claim meets them,
 * so a claim reports the first.
 *
 * The control pair is checked separately (`grantRefused`), because it needs the card's grant and,
 * on a claim, the card is only known once these have passed.
 */
export function claimantRefusals(
  deps: Pick<ClaimsDeps, 'sql' | 'stages'>,
  who: Claimant,
  stageKey?: string,
): Array<'concurrency_reached' | 'capability_mismatch'> {
  const out: Array<'concurrency_reached' | 'capability_mismatch'> = [];
  const max = who.maxConcurrency === undefined ? 1 : who.maxConcurrency;
  // RPC types do not validate runtime values. An invalid limit must never admit work, and it reads
  // as "no room", which is what it amounts to.
  const validMax = typeof max === 'number' && Number.isInteger(max) && max > 0;
  const active = validMax
    ? Number(deps.sql.exec(`SELECT COUNT(*) AS n FROM runs WHERE agent_id = ? AND status = 'working'`, who.agentId).one().n)
    : 0;
  if (!validMax || active >= max) out.push('concurrency_reached');
  const keys = claimableStageKeys(deps, who.agentId, who.capabilities, who);
  if (stageKey === undefined ? keys.length === 0 : !keys.includes(stageKey)) out.push('capability_mismatch');
  return out;
}

/**
 * THE filter, grant half: under the control pair, may whoever queued this card dispatch this
 * claimant? Only reads; parking a refused card is the claim's business.
 */
export async function grantRefused(deps: Pick<ClaimsDeps, 'env'>, who: Claimant, row: Row): Promise<boolean> {
  if (!isControlPairEnforced(deps.env)) return false;
  const grant = row.queued_grant ? (JSON.parse(row.queued_grant as string) as string[]) : null;
  const principalId = who.principalId !== undefined ? who.principalId : await principalIdFor(deps, who.agentId);
  return !grantPermitsAgent(grant, principalId);
}

/** One agent the eligibility read is asked about: a claimant, with what identifies it to a reader. */
export interface EligibilityCandidate extends Claimant {
  name: string;
  principalId: string | null;
}

/** For one card's current stage: whether each agent could claim it now, and why not. */
export interface CardEligibility {
  cardId: string;
  stageKey: string;
  /** Reasons no agent may claim the card now (board and card); empty when the card is claimable. */
  reasons: ClaimReason[];
  /**
   * When the card's placement window ends (ISO), while it is inside one; null otherwise. Not a reason:
   * the window holds the card for placement, so a reservation made inside it is claimable at once,
   * and an agent eligible here may claim the card once it ends.
   */
  placementWindowUntil: string | null;
  agents: Array<{ agentId: string; name: string; principalId: string | null; eligible: boolean; reasons: ClaimReason[] }>;
}

/**
 * The eligibility read: for this card at its current stage, every candidate with `eligible` and
 * the reasons it is not, from the claim's own filter (`claimantRefusals`, `grantRefused`) plus the
 * card's own claimability (`claimableWhere`'s conditions, via `isHeldBack` for blockers), and a live
 * reservation for someone else (`card_reserved`, per agent, since the agent it is held for may still
 * claim it). Reads only: nothing is parked, reserved or claimed.
 *
 * An agent is eligible exactly when the card has no reasons and the agent has none.
 */
export async function cardEligibility(
  deps: ClaimsDeps,
  input: { cardId: string; agents: EligibilityCandidate[] },
): Promise<Result<CardEligibility>> {
  if (!deps.getMeta('boardId')) return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  const row = deps.sql.exec(`SELECT * FROM cards WHERE id = ?`, input.cardId).toArray()[0];
  if (!row) return { ok: false, code: 'CARD_NOT_FOUND', message: `card not found: ${input.cardId}` };
  const stageKey = typeof row.current_stage_key === 'string' ? row.current_stage_key : '';
  const reasons: ClaimReason[] = [];
  if (deps.boardOverBudget()) reasons.push('board_over_budget');
  if (row.state !== 'submitted' || (row.archived_at ?? null) !== null) reasons.push('card_not_ready');
  else if (deps.isHeldBack(input.cardId)) reasons.push('card_held_back');
  const stage = deps.stages().find((s) => s.key === stageKey);
  if (!stage || !isAgentClaimable(stage)) reasons.push('stage_not_agent_claimable');
  const holdMs = deps.nowMs();
  const agents: CardEligibility['agents'] = [];
  for (const who of input.agents) {
    const mine: ClaimReason[] = claimantRefusals(deps, who, stageKey);
    if (await grantRefused(deps, who, row)) mine.push('grant_denied');
    if (isLiveHold(row, holdMs) && row.reserved_for !== who.agentId) mine.push('card_reserved');
    agents.push({ agentId: who.agentId, name: who.name, principalId: who.principalId, eligible: reasons.length === 0 && mine.length === 0, reasons: mine });
  }
  return { ok: true, value: { cardId: input.cardId, stageKey, reasons, placementWindowUntil: placementWindowUntil(row, placementWindowMs(deps), holdMs), agents } };
}

/**
 * The suite principal id this local agent maps to (`agents.external_id`), or `null` if it has
 * never been linked to one. A grant enumerates principal ids
 * (charter decisions/2026-08-30-an-agent-is-a-principal.md §3/§5), not superpipeline's local
 * `agt_…` ids — no external token has ever heard of the latter — so this is the id
 * `grantPermitsAgent` actually needs to compare against.
 */
async function principalIdFor(deps: Pick<ClaimsDeps, 'env'>, agentId: string): Promise<string | null> {
  const row = await deps.env.DB.prepare(`SELECT external_id FROM agents WHERE id = ?`)
    .bind(agentId)
    .first<{ external_id: string | null }>();
  return row?.external_id ?? null;
}

/** How many cards are ready (submitted) in stages these capabilities can claim — for work discovery. */
export async function countReadyForCapabilities(deps: ClaimsDeps, agentId: string, capabilities: string[]): Promise<number> {
  if (!deps.getMeta('boardId')) return 0;
  const claimableKeys = claimableStageKeys(deps, agentId, capabilities);
  if (claimableKeys.length === 0) return 0;
  const placeholders = claimableKeys.map(() => '?').join(', ');
  return Number(
    deps.sql
      .exec(`SELECT COUNT(*) AS n FROM cards c WHERE ${deps.claimableWhere(placeholders)}`, ...claimableKeys)
      .one().n,
  );
}

export function isAgentClaimable(stage: StageDef): boolean {
  return stage.ownerKind === 'capability' || stage.ownerKind === 'agent';
}

export function stageMatches(stage: StageDef, agentId: string, capabilities: string[]): boolean {
  if (stage.ownerKind === 'agent') return stage.owner === agentId;
  // The predicate lives in the contract so the claim path, the `boardCount` diagnostic and the
  // board editor's unstaffed warning can never disagree about what a stage asks for.
  if (stage.ownerKind === 'capability') return stageCapabilitiesMet(stage, capabilities);
  return false;
}

/**
 * The most recent ENDED run at this card and stage, if it failed.
 *
 * "The last attempt" has to mean the last one, so a failure followed by a success reports nothing.
 * Reporting the older failure would have an agent working around a problem already solved.
 *
 * Ordered by `rowid`, not by `started_at`. `started_at` is a formatted timestamp, and two runs at
 * the same stage can carry the SAME one — a fail and an immediate reclaim do, which is precisely
 * the case this function exists for. Ordering on it then picks arbitrarily between them, and the
 * test for "does not resurrect a failure after a success" caught exactly that. `rowid` is
 * insertion order and cannot tie.
 *
 * `excludeRunId` is the run being handed out right now — it exists by the time this is called, and
 * without excluding it a reclaim could read its own row.
 */
function lastFailureAt(deps: ClaimsDeps, cardId: string, stageKey: string, excludeRunId: string): { reason: string; agentId: string; stageKey: string; endedAt: string } | null {
  const rows = deps.sql
    .exec(
      `SELECT agent_id, outcome, failure_reason, ended_at FROM runs
       WHERE card_id = ? AND stage_key = ? AND id != ? AND ended_at IS NOT NULL
       ORDER BY rowid DESC LIMIT 1`,
      cardId,
      stageKey,
      excludeRunId,
    )
    .toArray();
  const r = rows[0];
  if (!r) return null;
  // A run that ended well reports nothing — and a failed one with no recorded reason reports
  // nothing either, rather than an empty sentence that reads as information.
  const reason = (r.failure_reason as string | null) ?? null;
  if (r.outcome === 'completed' || !reason) return null;
  return {
    reason,
    agentId: r.agent_id as string,
    stageKey,
    endedAt: (r.ended_at as string) ?? '',
  };
}

export async function heartbeat(deps: ClaimsDeps, input: RunVerbInput): Promise<Result<{ acknowledged: true }>> {
  const auth = authorizeRun(deps, input);
  if (!auth.ok) return auth;
  deps.sql.exec(`UPDATE runs SET last_heartbeat_ms = ? WHERE id = ?`, deps.nowMs(), input.runId);
  await deps.scheduleReclaim();
  return { ok: true, value: { acknowledged: true } };
}

/**
 * Reclaim runs whose heartbeat lapsed by `nowMs` (Temporal-style heartbeat timeout, docs/08 §3).
 * Time is a parameter so the alarm passes `Date.now()` while tests pass a chosen instant.
 */
export function reclaimExpired(deps: ClaimsDeps, nowMs: number): number {
  const rows = deps.sql
    .exec(
      `SELECT id, card_id FROM runs WHERE status = 'working' AND (last_heartbeat_ms + ?) <= ?`,
      HEARTBEAT_TIMEOUT_MS,
      nowMs,
    )
    .toArray();
  const now = deps.now();
  for (const r of rows) {
    deps.sql.exec(`UPDATE runs SET status = 'ended', outcome = 'reclaimed', ended_at = ? WHERE id = ?`, now, r.id);
    deps.cancelElicitationsForRun(r.id as string);
    // The attempt is the card's only while the card still names this run. A run the card has
    // left (moved, re-routed, or bound to a newer run) is ended above and nothing more: charging
    // it to the card would count a failure against work it is no longer doing, and re-queue a card
    // that has moved on, even out of a finished stage.
    if (cardNamesRun(deps, r)) {
      deps.endAttempt(r.card_id as string, 'run.reclaimed', null, String(r.id)); // endAttempt re-queues + notifies work.available
      deps.notify('reclaimed', r.card_id as string, 'Agent went dark — run reclaimed');
    }
    deps.reportRun(r.id as string);
  }
  return rows.length;
}

/** Is this run (a `runs` row with its `id` and `card_id`) its card's current one? */
function cardNamesRun(deps: Pick<ClaimsDeps, 'sql'>, run: Row): boolean {
  return deps.sql.exec(`SELECT 1 FROM cards WHERE id = ? AND current_run_id = ?`, run.card_id, run.id).toArray().length > 0;
}

/**
 * Set the single alarm to whichever comes first: a run's reclaim deadline, or
 * the next push-delivery attempt.
 *
 * One alarm, two jobs, because a Durable Object has exactly one — and the
 * earlier deadline has to win or the later job silently cancels it. Reclaim
 * used to own it alone and `deleteAlarm()` on an idle board would have thrown
 * away a queued delivery's only chance to leave.
 *
 * Backoff doubles from the LEAST-tried pending row, so one delivery that has
 * failed four times cannot hold back one queued a second ago.
 */
export async function scheduleReclaim(deps: ClaimsDeps): Promise<void> {
  const min = deps.sql.exec(`SELECT MIN(last_heartbeat_ms) AS m FROM runs WHERE status = 'working'`).one().m;
  const reclaimAt = min === null || min === undefined ? null : Number(min) + HEARTBEAT_TIMEOUT_MS;

  const queued = deps.sql
    .exec(
      `SELECT MIN(attempts) AS a, COUNT(*) AS n FROM push_deliveries
       WHERE status IN ('pending', 'failed') AND attempts < ?`,
      MAX_PUSH_ATTEMPTS,
    )
    .one();
  // A `card.ready` not yet tried goes at once: it is worth something only inside the placement
  // window it announces (`ready.ts`). Everything else keeps the backoff.
  const urgent =
    Number(queued.n) > 0 &&
    Number(
      deps.sql
        .exec(`SELECT COUNT(*) AS n FROM push_deliveries WHERE config_id = ? AND status = 'pending' AND attempts = 0 AND json_extract(body, '$.event') = 'card.ready'`, RELAY_CONFIG_ID)
        .one().n,
    ) > 0;
  const drainAt =
    Number(queued.n) > 0 ? deps.nowMs() + (urgent ? 0 : PUSH_DRAIN_BASE_MS * 2 ** Number(queued.a ?? 0)) : null;

  // Third job on the one alarm: the superwitness outbox. Only while reporting is on, so rows left
  // behind when it was switched off cannot wake the board on a loop.
  const reportDue = reportingEnabled(deps.env)
    ? deps.sql.exec(`SELECT MIN(next_attempt_at) AS t FROM run_reports WHERE status = 'pending'`).one().t
    : null;
  const reportAt = reportDue === null || reportDue === undefined ? null : Math.max(Number(reportDue), deps.nowMs());

  const next = [reclaimAt, drainAt, reportAt].filter((t): t is number => t !== null).toSorted((a, b) => a - b)[0];
  if (next === undefined) {
    await deps.ctx.storage.deleteAlarm();
    return;
  }
  await deps.ctx.storage.setAlarm(next);
}

/** Cards each agent holds on this board right now (claimed) and, of those, works now (working). */
export async function agentLoad(deps: ClaimsDeps): Promise<Record<string, { claimed: number; working: number }>> {
  const out: Record<string, { claimed: number; working: number }> = {};
  for (const r of deps.sql
    .exec(
      `SELECT delegate_agent_id AS a, COUNT(*) AS n, SUM(CASE WHEN state = 'working' THEN 1 ELSE 0 END) AS w
         FROM cards WHERE delegate_agent_id IS NOT NULL AND archived_at IS NULL AND state NOT IN ('completed', 'rejected', 'canceled')
        GROUP BY delegate_agent_id`,
    )
    .toArray()) {
    out[r.a as string] = { claimed: Number(r.n), working: Number(r.w) };
  }
  return out;
}

/**
 * How many live cards this board holds and how many need a person now, by the contract's one
 * `needsYou` rule — the same one the web attention lists use, so a count and the list it opens
 * cannot disagree.
 */
export async function summaryCounts(deps: ClaimsDeps): Promise<{ cardCount: number; needsYouCount: number }> {
  if (!deps.getMeta('boardId')) return { cardCount: 0, needsYouCount: 0 };
  const stale = deps.staleSettings();
  const ctx = {
    stages: deps.stages(),
    pendingGateCardIds: new Set(deps.pendingGates().map((g) => g.cardId)),
    pendingQuestionCardIds: new Set(deps.pendingElicitations().map((e) => e.cardId)),
    staleAfterHours: stale.afterHours,
    staleEnabled: stale.enabled,
    nowMs: Date.now(),
  };
  const live = deps.allCards().filter((c) => !c.archivedAt);
  return { cardCount: live.length, needsYouCount: live.filter((c) => needsYou(c, ctx)).length };
}

/**
 * Queue `work.available` deliveries for a claimable card, only to configs that could actually claim
 * it (docs/05 §4). A config is matched by `stageMatches`, the claim path's own stage matcher, so a
 * `requires` stage (`all`/`any`) reaches every config that meets it and an agent-owned stage only
 * that agent. The config's capabilities are its EFFECTIVE set: the route expands them through the
 * workspace's implication edges when the config is registered, as a claim does at the same
 * boundary. No pings while the board is over budget (claim would refuse).
 */
export function notifyWorkAvailable(deps: ClaimsDeps, cardId: string): void {
  const ready = readyAt(deps, cardId);
  if (!ready) return;
  const { card, stage } = ready;
  // A held card is announced to the agent it is held for only: anyone else would be refused it by
  // the claim. When the hold lapses no one is pinged again (nothing sweeps); the others find the
  // card on their next claim, within their poll interval.
  const heldFor = card.reservation?.agentId ?? null;
  const boardId = deps.getMeta('boardId');
  if (!boardId) return;
  const ts = deps.now();
  const payload: WorkAvailableBody = { event: 'work.available', boardId, cardId, stageKey: stage.key, ts };
  const targets: PushTarget[] = [];
  for (const cfg of deps.sql.exec(`SELECT * FROM push_configs`).toArray()) {
    const events = JSON.parse(cfg.events_json as string) as string[];
    if (!events.includes('work.available')) continue;
    const caps = JSON.parse(cfg.capabilities_json as string) as string[];
    if (typeof cfg.agent_id !== 'string' || !stageMatches(stage, cfg.agent_id, caps)) continue;
    if (heldFor !== null && cfg.agent_id !== heldFor) continue;
    targets.push({ configId: cfg.id as string, url: cfg.url as string });
  }
  // One event, however many agents it is sent to: every row carries the same id.
  queueEvent(deps, payload, targets);
}

/**
 * The card and its stage when it is ready to be claimed by some agent now: waiting, not archived,
 * not held back, the board under budget, at a stage an agent may claim. Null otherwise. What
 * `notifyWorkAvailable` pings for and what opens a placement window.
 */
export function readyAt(deps: Pick<ClaimsDeps, 'boardOverBudget' | 'getCard' | 'isHeldBack' | 'stages'>, cardId: string): { card: CardView; stage: StageDef } | null {
  const card = deps.getCard(cardId);
  // `state`/`archivedAt` mirror `claimableWhere`'s own conditions, by hand: this is a JS
  // predicate over a `CardView`, not SQL, so it cannot call that helper directly. The blocked
  // rule (unresolved `blocks`, open `parent` child) no longer needs its own hand-copy, though —
  // it comes from the same `blockedWhere()` fragment `claimableWhere` uses, via `isHeldBack`, so
  // the two cannot drift apart the way the archived check once risked. Any FUTURE eligibility
  // condition added to `claimableWhere` still needs its equivalent added here too, or a push
  // fires for work `claim` will refuse.
  if (!card || card.state !== 'submitted' || card.archivedAt || deps.isHeldBack(cardId)) return null;
  if (deps.boardOverBudget()) return null;
  const stage = deps.stages().find((s) => s.key === card.currentStageKey);
  if (!stage || !isAgentClaimable(stage)) return null;
  return { card, stage };
}

/**
 * The work-mutation gate: the run must **belong to the calling agent** and hold a **live
 * lease**. Historical export annotations use their separate original-owner gate above.
 *
 * Identity is checked first: an agent that does not own the run learns nothing about its lease,
 * and — more importantly — a `NOT_RUN_OWNER` is never confused with the `STALE_LEASE` that tells
 * a well-behaved agent to re-claim.
 *
 * The lease is unchanged and still authoritative: fencing (epoch) and reclaim (status) refuse the
 * owning agent exactly as before. This is an additional check, not a replacement.
 */
export function authorizeRun(deps: ClaimsDeps, input: { runId: string; leaseEpoch: number; agentId?: string | null }): RunAuth {
  const row = getRunRow(deps, input.runId);
  if (row) {
    const denied = denyForeignRun(row, input.agentId);
    if (denied) return denied;
  }
  if (!row || (row.status as string) !== 'working' || Number(row.lease_epoch) !== input.leaseEpoch) {
    return { ok: false, code: 'STALE_LEASE', message: 'no active lease for this run' };
  }
  return { ok: true, run: row };
}

/**
 * Identity guard (docs/04 §1): a run is driven and read by the agent that claimed it. Returns an
 * error to hand back, or null when the caller is entitled to the run.
 *
 * `agentId` is the *authenticated* principal, which is always present for a `spa_` token; it is
 * null only under `DEV_AUTH` when the caller sent no `X-Agent-Id`, where there is no identity to
 * compare and the lease alone authorizes (dev headers are not a credential in a deploy).
 */
export function denyForeignRun(run: Row, agentId: string | null | undefined): { ok: false; code: 'NOT_RUN_OWNER'; message: string } | null {
  if (agentId === null || agentId === undefined) return null;
  if ((run.agent_id as string) === agentId) return null;
  return { ok: false, code: 'NOT_RUN_OWNER', message: 'this run belongs to another agent' };
}

export function getRunRow(deps: ClaimsDeps, runId: string): Row | null {
  return deps.sql.exec(`SELECT * FROM runs WHERE id = ?`, runId).toArray()[0] ?? null;
}
