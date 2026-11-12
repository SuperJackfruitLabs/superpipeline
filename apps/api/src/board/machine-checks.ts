import { returnStageError, routeOutcome } from '@superpipeline/contract';
import { newId } from '../ids';
import type { CiResult } from '../references/ci-events';
import { cleanCheck } from './check-rules';
import { type CheckProvider, type CheckRow, arrivalChecks, checkView } from './check-store';
import type { BoardContext } from './context';
import type { CardView, CheckDef, CheckStatus, Result, Row } from './model';
import { queueRelay, queueSubscribedPush } from './push';
import { CIRCUIT_BREAKER_LIMIT, COMMENT_MAX_BYTES } from './rules';
import { returnCard } from './run-verbs';
import type { CardChecksView, CheckFailedBody, CheckOverriddenBody, PreparedApproval, PreparedApprovalSubject } from './views';

/**
 * A gate may be decided by checks (charter: decisions/2026-11-09-a-gate-may-be-decided-by-checks.md).
 *
 * When a card arrives at a stage with checks — a human approval stage's gate, or a stage whose gate
 * is `checks` — the arrival records its check set, and the card waits on the stage, "waiting for
 * checks", with no person asked. Results arrive by webhook (`ci`) or by the sweep (`verdict`,
 * check-verdicts.ts). Every check passed or overridden: the approval gate opens for people, or a
 * checks gate lets the card on. Any check failed: the card goes back to the stage's `returnStage`
 * with the findings, as an agent's `changes-needed` does, and `check.failed` is pushed.
 */

/** What checks need from the rest of the board. */
/** A card's title for a push, or '' when the card is gone. */
function cardTitleOf(deps: Pick<BoardContext, 'getCardRow'>, cardId: string): string {
  const title = deps.getCardRow(cardId)?.title;
  return typeof title === 'string' ? title : '';
}

export type MachineChecksDeps = Pick<
  BoardContext,
  | 'advanceCard'
  | 'createGate'
  | 'emit'
  | 'env'
  | 'getCard'
  | 'getCardHandoffJson'
  | 'getCardRow'
  | 'getMeta'
  | 'mustGetCard'
  | 'notify'
  | 'notifyWorkAvailable'
  | 'now'
  | 'parkForHuman'
  | 'parseHandoff'
  | 'scheduleReclaim'
  | 'setNeedsHuman'
  | 'sql'
  | 'stages'
  | 'startDecisionWait'
>;

/** What a card waiting on its checks says it is waiting for. Not a wait chat carries: no attention push. */
export const WAITING_FOR_CHECKS = 'waiting for checks';

type ArrivalStatus = CardChecksView['status'];

// ---------------------------------------------------------------------------------------------
// A prepared approval subject waits with its arrival: frozen at submission, used when the gate opens.

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCodePoint(b);
  return btoa(binary);
}

function fromBase64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.codePointAt(0) ?? 0);
}

function encodeSubject(s: PreparedApprovalSubject): Record<string, unknown> {
  return { ...s, canonicalBytes: toBase64(s.canonicalBytes) };
}

function encodeApproval(a: PreparedApproval | null): string | null {
  if (a === null) return null;
  if ('variants' in a) return JSON.stringify({ variants: a.variants.map((v) => ({ variantId: v.variantId, label: v.label, subject: encodeSubject(v.subject) })) });
  return JSON.stringify({ subject: encodeSubject(a) });
}

function decodeSubject(v: unknown): PreparedApprovalSubject | null {
  if (v === null || typeof v !== 'object') return null;
  const get = (k: string): unknown => (Object.hasOwn(v, k) ? Object.getOwnPropertyDescriptor(v, k)?.value : undefined);
  const [id, schema, revision, bytes, digest, producerRunId, producedBy, createdAt] = [
    get('id'),
    get('schema'),
    get('revision'),
    get('canonicalBytes'),
    get('digest'),
    get('producerRunId'),
    get('producedBy'),
    get('createdAt'),
  ];
  if (typeof id !== 'string' || typeof schema !== 'string' || typeof revision !== 'number' || typeof bytes !== 'string') return null;
  if (typeof digest !== 'string' || typeof producerRunId !== 'string' || typeof producedBy !== 'string' || typeof createdAt !== 'string') return null;
  return { id, schema, revision, canonicalBytes: fromBase64(bytes), digest, producerRunId, producedBy, createdAt };
}

function decodeApproval(json: unknown): PreparedApproval | null {
  if (typeof json !== 'string') return null;
  const parsed: unknown = JSON.parse(json);
  if (parsed === null || typeof parsed !== 'object') return null;
  if ('subject' in parsed) return decodeSubject(parsed.subject);
  if ('variants' in parsed && Array.isArray(parsed.variants)) {
    const variants = parsed.variants.flatMap((v: unknown) => {
      if (v === null || typeof v !== 'object' || !('variantId' in v) || !('label' in v) || !('subject' in v)) return [];
      const subject = decodeSubject(v.subject);
      return typeof v.variantId === 'string' && typeof v.label === 'string' && subject ? [{ variantId: v.variantId, label: v.label, subject }] : [];
    });
    return { variants };
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Recording an arrival.

/**
 * Record the check set for a card arriving at `stageKey`, which names checks, and leave the card
 * waiting on them. Called where a gate would open (createGate, for an approval stage) and where a
 * checks gate is reached (advanceCard). `returnStageKey`, `producedBy`, `runId` and `approval` are
 * what the approval gate opens with once the checks pass. Returns the arrival's id.
 */
export function awaitChecks(
  deps: MachineChecksDeps,
  cardId: string,
  stageKey: string,
  returnStageKey: string,
  producedBy: string,
  runId: string | null,
  approval: PreparedApproval | null = null,
): string {
  const stage = deps.stages().find((s) => s.key === stageKey);
  const checks: CheckDef[] = stage?.checks ?? [];
  const id = newId('chka');
  const now = deps.now();
  // One arrival at a time: an earlier one this card never finished is over.
  deps.sql.exec(`UPDATE card_check_arrivals SET status = 'closed', ended_at = ? WHERE card_id = ? AND status = 'open'`, now, cardId);
  deps.sql.exec(
    `INSERT INTO card_check_arrivals (id, card_id, stage_key, return_stage_key, produced_by, run_id, approval_json, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
    id,
    cardId,
    stageKey,
    returnStageKey,
    producedBy,
    runId,
    encodeApproval(approval),
    now,
  );
  checks.forEach((c, position) => {
    deps.sql.exec(
      `INSERT INTO card_checks (arrival_id, card_id, stage_key, position, name, provider, config_json, status, detail, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      id,
      cardId,
      stageKey,
      position,
      c.name,
      c.provider,
      JSON.stringify(cleanCheck(c)),
      c.provider === 'ci' ? 'waiting for CI on the pull request head' : 'waiting for a verdict on the run',
      now,
    );
  });
  deps.setNeedsHuman(cardId, { reason: 'review', detail: WAITING_FOR_CHECKS });
  // A stage's timeout covers pending checks (decision 4): reminded about, then escalated.
  deps.startDecisionWait({ kind: 'checks', decisionId: id, cardId, stageKey });
  deps.emit('checks.started', { cardId, stageKey, arrivalId: id, checks: checks.map((c) => c.name) });
  // CI may have answered before the card got here.
  refreshCiChecks(deps, id);
  settleArrival(deps, id);
  return id;
}

// ---------------------------------------------------------------------------------------------
// Reading an arrival.

function arrivalRow(deps: Pick<MachineChecksDeps, 'sql'>, arrivalId: string): Row | null {
  return deps.sql.exec(`SELECT * FROM card_check_arrivals WHERE id = ?`, arrivalId).toArray()[0] ?? null;
}

function latestArrival(deps: Pick<MachineChecksDeps, 'sql'>, cardId: string): Row | null {
  return deps.sql.exec(`SELECT * FROM card_check_arrivals WHERE card_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1`, cardId).toArray()[0] ?? null;
}

/**
 * Whether an open arrival is still the card's: the card waits on that stage, not archived. A card
 * moved, resumed or archived left its checks behind; the arrival is closed when found so.
 */
function arrivalLive(deps: Pick<MachineChecksDeps, 'getCardRow' | 'now' | 'sql'>, arrival: Row): boolean {
  if (arrival.status !== 'open') return false;
  const card = typeof arrival.card_id === 'string' ? deps.getCardRow(arrival.card_id) : null;
  const live = !!card && !card.archived_at && card.current_stage_key === arrival.stage_key && card.state === 'input-required';
  if (!live) deps.sql.exec(`UPDATE card_check_arrivals SET status = 'closed', ended_at = ? WHERE id = ? AND status = 'open'`, deps.now(), arrival.id);
  return live;
}

/** For decision-timeouts.ts: is this arrival still waiting on a check? */
export function checksStillPending(deps: Pick<MachineChecksDeps, 'getCardRow' | 'now' | 'sql'>, arrivalId: string): boolean {
  const arrival = arrivalRow(deps, arrivalId);
  if (!arrival || !arrivalLive(deps, arrival)) return false;
  return deps.sql.exec(`SELECT 1 FROM card_checks WHERE arrival_id = ? AND status = 'pending' LIMIT 1`, arrivalId).toArray().length > 0;
}

function arrivalStatus(v: unknown): ArrivalStatus {
  if (v === 'open' || v === 'returned' || v === 'closed') return v;
  return 'passed';
}

/** The checks of a card's latest arrival at a stage with checks; null when it never reached one. */
export function cardChecks(deps: Pick<MachineChecksDeps, 'getCard' | 'getCardRow' | 'now' | 'sql'>, cardId: string): Result<CardChecksView | null> {
  if (!deps.getCard(cardId)) return { ok: false, code: 'CARD_NOT_FOUND', message: `card not found: ${cardId}` };
  const arrival = latestArrival(deps, cardId);
  if (!arrival || typeof arrival.id !== 'string' || typeof arrival.stage_key !== 'string') return { ok: true, value: null };
  if (arrival.status === 'open') arrivalLive(deps, arrival);
  const status = arrivalStatus(deps.sql.exec(`SELECT status FROM card_check_arrivals WHERE id = ?`, arrival.id).one().status);
  return { ok: true, value: { cardId, stageKey: arrival.stage_key, status, checks: arrivalChecks(deps.sql, arrival.id).map(checkView) } };
}

// ---------------------------------------------------------------------------------------------
// Changing a check.

/** Set a check's result; true when it changed. Only a pending or passed check is ever re-judged. */
function judge(deps: Pick<MachineChecksDeps, 'now' | 'sql'>, c: CheckRow, status: CheckStatus, detail: string, url: string | null, headSha: string | null): boolean {
  if (c.status === status && c.detail === detail && c.url === url && c.headSha === headSha) return false;
  const written = deps.sql.exec(
    `UPDATE card_checks SET status = ?, detail = ?, url = ?, head_sha = ?, updated_at = ?
      WHERE arrival_id = ? AND name = ? AND status IN ('pending', 'passed')`,
    status,
    detail,
    url,
    headSha,
    deps.now(),
    c.arrivalId,
    c.name,
  );
  return written.rowsWritten > 0 && c.status !== status;
}

export { judge as judgeCheck };

// ---------------------------------------------------------------------------------------------
// ci: the head commit of the card's linked pull request.

/** The pull request a card's `ci` checks judge: its most recently linked one whose head is known. */
function ciHead(deps: Pick<MachineChecksDeps, 'sql'>, cardId: string): { provider: string; repo: string; sha: string; url: string | null } | null {
  const rows = deps.sql
    .exec(
      `SELECT provider, external_id, url, metadata_json FROM card_references
        WHERE card_id = ? AND source_type = 'pull_request' AND provider IN ('github', 'forge') AND external_id IS NOT NULL
        ORDER BY created_at DESC, rowid DESC`,
      cardId,
    )
    .toArray();
  for (const r of rows) {
    if (typeof r.metadata_json !== 'string' || typeof r.external_id !== 'string' || typeof r.provider !== 'string') continue;
    const meta: unknown = JSON.parse(r.metadata_json);
    const sha = meta !== null && typeof meta === 'object' && 'headSha' in meta && typeof meta.headSha === 'string' ? meta.headSha : null;
    const hash = r.external_id.lastIndexOf('#');
    if (sha === null || hash <= 0) continue;
    return { provider: r.provider, repo: r.external_id.slice(0, hash).toLowerCase(), sha, url: typeof r.url === 'string' ? r.url : null };
  }
  return null;
}

interface CiRecord {
  context: string;
  state: 'pending' | 'success' | 'failure';
  url: string | null;
}

function ciState(v: unknown): CiRecord['state'] | null {
  return v === 'pending' || v === 'success' || v === 'failure' ? v : null;
}

function ciResultsFor(deps: Pick<MachineChecksDeps, 'sql'>, provider: string, repo: string, sha: string): CiRecord[] {
  return deps.sql
    .exec(`SELECT context, state, url FROM ci_results WHERE provider = ? AND repo = ? AND sha = ? ORDER BY context ASC`, provider, repo, sha)
    .toArray()
    .flatMap((r) => {
      const state = ciState(r.state);
      return typeof r.context === 'string' && state ? [{ context: r.context, state, url: typeof r.url === 'string' ? r.url : null }] : [];
    });
}

/** Judge a `ci` check against the results for one commit (decision 1). Pure. */
export function judgeCi(def: Extract<CheckDef, { provider: 'ci' }>, results: CiRecord[], sha: string): { status: 'pending' | 'passed' | 'failed'; detail: string; url: string | null } {
  const short = sha.slice(0, 12);
  const scoped = def.contexts ? results.filter((r) => def.contexts?.includes(r.context)) : results;
  const failed = scoped.find((r) => r.state === 'failure');
  if (failed) return { status: 'failed', detail: `CI context "${failed.context}" failed on ${short}`, url: failed.url };
  if (def.contexts) {
    const missing = def.contexts.filter((name) => !scoped.some((r) => r.context === name && r.state === 'success'));
    if (missing.length > 0) return { status: 'pending', detail: `waiting for ${missing.join(', ')} on ${short}`, url: null };
    return { status: 'passed', detail: `${def.contexts.length} required context${def.contexts.length === 1 ? '' : 's'} succeeded on ${short}`, url: onlyUrl(scoped) };
  }
  if (scoped.length === 0) return { status: 'pending', detail: `no CI result reported yet for ${short}`, url: null };
  const running = scoped.filter((r) => r.state === 'pending').map((r) => r.context);
  if (running.length > 0) return { status: 'pending', detail: `waiting for ${running.join(', ')} on ${short}`, url: null };
  return { status: 'passed', detail: `every reported context (${scoped.length}) succeeded on ${short}`, url: onlyUrl(scoped) };
}

/** One context's own link when the check judged exactly one; else none (the pull request stands in). */
function onlyUrl(results: CiRecord[]): string | null {
  return results.length === 1 ? (results[0]?.url ?? null) : null;
}

/** Re-judge an open arrival's `ci` checks from the stored results; true when any changed status. */
function refreshCiChecks(deps: MachineChecksDeps, arrivalId: string): boolean {
  const checks = arrivalChecks(deps.sql, arrivalId).filter((c) => c.provider === 'ci' && (c.status === 'pending' || c.status === 'passed'));
  if (checks.length === 0) return false;
  const cardId = checks[0]?.cardId ?? '';
  const head = ciHead(deps, cardId);
  let changed = false;
  for (const c of checks) {
    if (c.def.provider !== 'ci') continue;
    if (!head) {
      changed = judge(deps, c, 'pending', 'the card links no pull request whose head commit is known', null, null) || changed;
      continue;
    }
    const verdict = judgeCi(c.def, ciResultsFor(deps, head.provider, head.repo, head.sha), head.sha);
    changed = judge(deps, c, verdict.status, verdict.detail, verdict.url ?? head.url, head.sha) || changed;
  }
  return changed;
}

/** The open arrivals with checks of this provider, read fresh. */
function openArrivalsWith(deps: Pick<MachineChecksDeps, 'sql'>, provider: CheckProvider): string[] {
  return deps.sql
    .exec(
      `SELECT DISTINCT a.id FROM card_check_arrivals a JOIN card_checks c ON c.arrival_id = a.id
        WHERE a.status = 'open' AND c.provider = ? ORDER BY a.created_at ASC`,
      provider,
    )
    .toArray()
    .flatMap((r) => (typeof r.id === 'string' ? [r.id] : []));
}

/**
 * A CI result arrived by the board's webhook (decision 6): store it, then judge every open arrival
 * whose card's pull request has that head commit on that provider. Returns how many arrivals it
 * changed. A result for any other commit is stored and changes nothing.
 */
export async function recordCiResult(deps: MachineChecksDeps, provider: 'github' | 'forge', result: CiResult): Promise<number> {
  deps.sql.exec(
    `INSERT INTO ci_results (provider, repo, sha, context, state, url, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (provider, repo, sha, context) DO UPDATE SET state = excluded.state, url = excluded.url, updated_at = excluded.updated_at`,
    provider,
    result.repo,
    result.sha,
    result.context,
    result.state,
    result.url,
    deps.now(),
  );
  let changed = 0;
  for (const arrivalId of openArrivalsWith(deps, 'ci')) {
    const cardId = arrivalRow(deps, arrivalId)?.card_id;
    const head = typeof cardId === 'string' ? ciHead(deps, cardId) : null;
    if (!head || head.provider !== provider || head.repo !== result.repo || head.sha !== result.sha) continue;
    if (refreshCiChecks(deps, arrivalId)) {
      changed += 1;
      settleArrival(deps, arrivalId);
    }
  }
  if (changed > 0) await deps.scheduleReclaim();
  return changed;
}

/**
 * A card's pull request has a new head commit (a push: `synchronize`): its open arrival's `ci`
 * checks go back to pending for the new commit — passed ones too, and a failure that parked the
 * card — then are judged against what is already known for it. An override stands.
 */
export async function resetCiChecksForCard(deps: MachineChecksDeps, cardId: string): Promise<void> {
  const arrival = deps.sql.exec(`SELECT * FROM card_check_arrivals WHERE card_id = ? AND status = 'open'`, cardId).toArray()[0];
  if (!arrival || typeof arrival.id !== 'string' || !arrivalLive(deps, arrival)) return;
  const reset = deps.sql.exec(
    `UPDATE card_checks SET status = 'pending', detail = 'the pull request has a new head commit', head_sha = NULL, updated_at = ?
      WHERE arrival_id = ? AND provider = 'ci' AND status IN ('pending', 'passed', 'failed')`,
    deps.now(),
    arrival.id,
  );
  if (reset.rowsWritten === 0) return;
  deps.sql.exec(`UPDATE card_check_arrivals SET parked_at = NULL WHERE id = ?`, arrival.id);
  deps.emit('checks.reset', { cardId, arrivalId: arrival.id, reason: 'new head commit' });
  refreshCiChecks(deps, arrival.id);
  settleArrival(deps, arrival.id);
  await deps.scheduleReclaim();
}

// ---------------------------------------------------------------------------------------------
// Settling an arrival: open the gate, let the card on, or send it back.

/**
 * Act on an arrival whose checks changed: any failed sends the card back (once; a failure that
 * could not return it parks the card and waits for a push or an override); all passed or
 * overridden opens the gate or lets the card on. Otherwise it waits.
 */
export function settleArrival(deps: MachineChecksDeps, arrivalId: string): void {
  const arrival = arrivalRow(deps, arrivalId);
  if (!arrival || !arrivalLive(deps, arrival)) return;
  const checks = arrivalChecks(deps.sql, arrivalId);
  const failed = checks.filter((c) => c.status === 'failed');
  if (failed.length > 0) {
    if (arrival.parked_at === null) failArrival(deps, arrival, failed);
    return;
  }
  if (checks.every((c) => c.status === 'passed' || c.status === 'overridden')) passArrival(deps, arrival);
}

function failArrival(deps: MachineChecksDeps, arrival: Row, failed: CheckRow[]): void {
  const cardId = typeof arrival.card_id === 'string' ? arrival.card_id : '';
  const stageKey = typeof arrival.stage_key === 'string' ? arrival.stage_key : '';
  const stages = deps.stages();
  const stage = stages.find((s) => s.key === stageKey);
  const findings = failed
    .map((c) => `Check "${c.name}" (${c.provider}) failed: ${c.detail ?? 'no detail'}${c.url ? ` — ${c.url}` : ''}`)
    .join('\n');
  const returnsSoFar = Number(deps.getCardRow(cardId)?.auto_returns ?? 0);
  const route = routeOutcome(
    { key: stageKey, ...(stage?.returnStage ? { returnStage: stage.returnStage } : {}) },
    { outcome: 'changes-needed', findings },
    { returnsSoFar, limit: CIRCUIT_BREAKER_LIMIT },
  );
  const broken = route.kind === 'return' && stage ? returnStageError(stage, stages) : null;
  const now = deps.now();
  let returnedTo: string | null = null;
  if (route.kind === 'return' && !broken) {
    deps.sql.exec(`UPDATE card_check_arrivals SET status = 'returned', ended_at = ? WHERE id = ?`, now, arrival.id);
    const handoff = deps.parseHandoff(deps.getCardHandoffJson(cardId));
    returnCard(deps, cardId, stageKey, route.to, typeof arrival.run_id === 'string' ? arrival.run_id : '', findings, handoff ?? undefined, returnsSoFar + 1);
    returnedTo = route.to;
  } else {
    // It cannot go back: it stops for a person, and its failed check stays open to an override.
    deps.sql.exec(`UPDATE card_check_arrivals SET parked_at = ? WHERE id = ?`, now, arrival.id);
    const why = broken ?? (route.kind === 'park' ? route.reason : '');
    const detail = `${why}. Findings: ${findings}`;
    const repeated = route.kind === 'park' && route.repeated;
    deps.parkForHuman(cardId, repeated ? { reason: 'repeated-failure', failureCount: returnsSoFar + 1, detail } : { reason: 'blocked', detail });
    deps.emit('card.blocked', { cardId, reason: detail, ...(repeated ? { brokeCircuit: true } : {}) });
    deps.notify(repeated ? 'failed' : 'blocked', cardId, detail);
  }
  for (const c of failed) {
    const body: CheckFailedBody = {
      event: 'check.failed',
      boardId: deps.getMeta('boardId'),
      cardId,
      cardTitle: cardTitleOf(deps, cardId),
      stageKey,
      arrivalId: typeof arrival.id === 'string' ? arrival.id : '',
      check: { name: c.name, provider: c.provider, status: 'failed', ...(c.detail !== null ? { detail: c.detail } : {}), ...(c.url !== null ? { url: c.url } : {}) },
      returnedTo,
    };
    queueSubscribedPush(deps, body);
    queueRelay(deps, body);
    deps.emit('check.failed', { cardId, stageKey, name: c.name, provider: c.provider, returnedTo });
  }
}

function passArrival(deps: MachineChecksDeps, arrival: Row): void {
  const cardId = typeof arrival.card_id === 'string' ? arrival.card_id : '';
  const stageKey = typeof arrival.stage_key === 'string' ? arrival.stage_key : '';
  const producedBy = typeof arrival.produced_by === 'string' ? arrival.produced_by : '';
  const runId = typeof arrival.run_id === 'string' ? arrival.run_id : null;
  const now = deps.now();
  const stage = deps.stages().find((s) => s.key === stageKey);
  deps.emit('checks.passed', { cardId, stageKey, arrivalId: arrival.id });
  if (stage?.gate === 'checks') {
    // Nobody is asked (decision 2): the stage passes the moment every check passes.
    deps.sql.exec(`UPDATE card_check_arrivals SET status = 'advanced', ended_at = ? WHERE id = ?`, now, arrival.id);
    deps.setNeedsHuman(cardId, null);
    deps.advanceCard(cardId, stageKey, producedBy, deps.getCardHandoffJson(cardId), runId);
    return;
  }
  // Checks before people (decision 2): now the gate opens, carrying them (createGate binds it).
  deps.sql.exec(`UPDATE card_check_arrivals SET status = 'passed', ended_at = ? WHERE id = ?`, now, arrival.id);
  deps.setNeedsHuman(cardId, { reason: 'review' });
  const returnStageKey = typeof arrival.return_stage_key === 'string' ? arrival.return_stage_key : stageKey;
  const gateId = deps.createGate(cardId, stageKey, returnStageKey, producedBy, runId, decodeApproval(arrival.approval_json));
  // Bound even if the stage lost its checks meanwhile, so this arrival can never open a second gate.
  deps.sql.exec(`UPDATE card_check_arrivals SET gate_id = COALESCE(gate_id, ?) WHERE id = ?`, gateId, arrival.id);
}

// ---------------------------------------------------------------------------------------------
// Override (decision 5).

/**
 * A workspace owner or admin passes a check by hand, with a comment. Only a check of the card's
 * current arrival that is pending, or failed while the card is still there (a failure that could
 * not return it), can be: a failure that returned the card ended that arrival, and the next
 * submission runs the checks again. Agents never override; the producer of the work never does.
 */
export async function overrideCheck(
  deps: MachineChecksDeps,
  input: { cardId: string; name: string; by: string; principalId?: string | null; role: 'owner' | 'admin' | 'member' | 'viewer' | null; agent?: boolean; comment: string },
): Promise<Result<{ card: CardView; checks: CardChecksView }>> {
  const comment = typeof input.comment === 'string' ? input.comment.trim() : '';
  if (comment === '') return { ok: false, code: 'INVALID_COMMENT', message: 'overriding a check needs a comment saying why' };
  const bytes = new TextEncoder().encode(comment).length;
  if (bytes > COMMENT_MAX_BYTES) return { ok: false, code: 'INVALID_COMMENT', message: `a comment is at most ${COMMENT_MAX_BYTES} bytes; this one is ${bytes}` };
  if (input.agent === true || input.by.startsWith('agt_')) {
    return { ok: false, code: 'CHECK_OVERRIDE_NOT_ALLOWED', message: 'an agent never overrides a check' };
  }
  if (input.role !== 'owner' && input.role !== 'admin') {
    return { ok: false, code: 'CHECK_OVERRIDE_NOT_ALLOWED', message: "only a workspace owner or admin may override a check" };
  }
  if (!deps.getCard(input.cardId)) return { ok: false, code: 'CARD_NOT_FOUND', message: `card not found: ${input.cardId}` };
  const arrival = latestArrival(deps, input.cardId);
  const check = arrival && typeof arrival.id === 'string' ? arrivalChecks(deps.sql, arrival.id).find((c) => c.name === input.name) : undefined;
  if (!arrival || !check) return { ok: false, code: 'CHECK_NOT_FOUND', message: `no check named "${input.name}" on this card's current arrival` };
  if (arrival.produced_by === input.by || (input.principalId && arrival.produced_by === input.principalId)) {
    return { ok: false, code: 'SEPARATION_OF_DUTIES', message: 'the producer of the work cannot override a check on it' };
  }
  if (!arrivalLive(deps, arrival)) {
    return { ok: false, code: 'CHECK_NOT_OPEN', message: 'this arrival is over: the card was returned, moved or let through; its next arrival runs the checks again' };
  }
  if (check.status !== 'pending' && check.status !== 'failed') {
    return { ok: false, code: 'CHECK_NOT_OPEN', message: `check "${check.name}" already ${check.status === 'passed' ? 'passed' : 'was overridden'}` };
  }
  const now = deps.now();
  const written = deps.sql.exec(
    `UPDATE card_checks SET status = 'overridden', overridden_by = ?, overridden_at = ?, override_comment = ?, updated_at = ?
      WHERE arrival_id = ? AND name = ? AND status IN ('pending', 'failed')`,
    input.by,
    now,
    comment,
    now,
    check.arrivalId,
    check.name,
  );
  if (written.rowsWritten === 0) return { ok: false, code: 'CHECK_NOT_OPEN', message: `check "${check.name}" changed while it was being overridden` };
  const body: CheckOverriddenBody = {
    event: 'check.overridden',
    boardId: deps.getMeta('boardId'),
    cardId: input.cardId,
    cardTitle: cardTitleOf(deps, input.cardId),
    stageKey: check.stageKey,
    arrivalId: check.arrivalId,
    check: { name: check.name, provider: check.provider, status: 'overridden' },
    by: input.by,
    comment,
    at: now,
  };
  queueSubscribedPush(deps, body);
  queueRelay(deps, body);
  deps.emit('check.overridden', { cardId: input.cardId, stageKey: check.stageKey, name: check.name, by: input.by });
  // What is left decides: all passed or overridden opens the gate; a parked card stays parked
  // while another check is still failed.
  settleArrival(deps, check.arrivalId);
  await deps.scheduleReclaim();
  const view = arrivalChecks(deps.sql, check.arrivalId).map(checkView);
  const status = arrivalStatus(arrivalRow(deps, check.arrivalId)?.status);
  return { ok: true, value: { card: deps.mustGetCard(input.cardId), checks: { cardId: input.cardId, stageKey: check.stageKey, status, checks: view } } };
}
