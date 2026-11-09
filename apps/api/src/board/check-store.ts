import type { CheckDef, CheckStatus, Row, VerdictJudgeKind } from './model';
import type { CheckView, GateCheckSummary } from './views';

/**
 * Reading the check tables (schema-checks.ts) without acting on them: the rows, their views, and
 * the binding of a passed arrival to the gate it opened. Kept apart from machine-checks.ts, which
 * acts, so gates.ts can read checks without importing what returns and advances cards.
 */

export type CheckProvider = CheckDef['provider'];

function isProvider(v: unknown): v is CheckProvider {
  return v === 'ci' || v === 'verdict';
}

function isStatus(v: unknown): v is CheckStatus {
  return v === 'pending' || v === 'passed' || v === 'failed' || v === 'overridden';
}

function text(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

/** One stored check, as typed fields. Null for a row that does not read (never written so). */
export interface CheckRow {
  arrivalId: string;
  cardId: string;
  stageKey: string;
  name: string;
  provider: CheckProvider;
  def: CheckDef;
  status: CheckStatus;
  detail: string | null;
  url: string | null;
  headSha: string | null;
  updatedAt: string;
  overriddenBy: string | null;
  overriddenAt: string | null;
  overrideComment: string | null;
}

const JUDGE_KINDS: ReadonlySet<string> = new Set<VerdictJudgeKind>(['grader', 'rule', 'agent', 'human']);

function strings(v: unknown): string[] | undefined {
  return Array.isArray(v) && v.every((x) => typeof x === 'string') ? v.filter((x): x is string => typeof x === 'string') : undefined;
}

/**
 * A check's snapshotted definition. Written by awaitChecks from a stage that passed `checksError`;
 * an unreadable one reads as the bare provider: a ci check over every reported context, or a
 * verdict check nothing satisfies (no verdict's kind is empty).
 */
function parseDef(json: unknown, name: string, provider: CheckProvider): CheckDef {
  let parsed: unknown = null;
  try {
    parsed = typeof json === 'string' ? JSON.parse(json) : null;
  } catch {
    parsed = null;
  }
  const o = parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  const field = (k: string): unknown => (Object.hasOwn(o, k) ? Object.getOwnPropertyDescriptor(o, k)?.value : undefined);
  if (provider === 'ci') {
    const contexts = strings(field('contexts'));
    return { name, provider, ...(contexts ? { contexts } : {}) };
  }
  const kind = field('kind');
  const standard = field('standard');
  const atLeast = field('atLeast');
  const judgeKinds = strings(field('judgeKinds'))?.filter((k): k is VerdictJudgeKind => JUDGE_KINDS.has(k));
  return {
    name,
    provider,
    kind: typeof kind === 'string' ? kind : '',
    ...(typeof standard === 'string' ? { standard } : {}),
    ...(typeof atLeast === 'number' ? { atLeast } : { pass: true as const }),
    ...(judgeKinds && judgeKinds.length > 0 ? { judgeKinds } : {}),
  };
}

export function toCheckRow(r: Row): CheckRow | null {
  const { arrival_id: arrivalId, card_id: cardId, stage_key: stageKey, name, provider, status, updated_at: updatedAt } = r;
  if (typeof arrivalId !== 'string' || typeof cardId !== 'string' || typeof stageKey !== 'string' || typeof name !== 'string') return null;
  if (!isProvider(provider) || !isStatus(status) || typeof updatedAt !== 'string') return null;
  return {
    arrivalId,
    cardId,
    stageKey,
    name,
    provider,
    def: parseDef(r.config_json, name, provider),
    status,
    detail: text(r.detail),
    url: text(r.url),
    headSha: text(r.head_sha),
    updatedAt,
    overriddenBy: text(r.overridden_by),
    overriddenAt: text(r.overridden_at),
    overrideComment: text(r.override_comment),
  };
}

/** The checks of one arrival, in the stage's order. */
export function arrivalChecks(sql: SqlStorage, arrivalId: string): CheckRow[] {
  return sql
    .exec(`SELECT * FROM card_checks WHERE arrival_id = ? ORDER BY position ASC`, arrivalId)
    .toArray()
    .map(toCheckRow)
    .filter((c): c is CheckRow => c !== null);
}

export function checkSummary(c: CheckRow): GateCheckSummary {
  return { name: c.name, provider: c.provider, status: c.status, ...(c.url !== null ? { url: c.url } : {}) };
}

export function checkView(c: CheckRow): CheckView {
  return {
    ...checkSummary(c),
    ...(c.detail !== null ? { detail: c.detail } : {}),
    ...(c.headSha !== null ? { headSha: c.headSha } : {}),
    updatedAt: c.updatedAt,
    ...(c.status === 'overridden' && c.overriddenBy !== null && c.overriddenAt !== null
      ? { overridden: { by: c.overriddenBy, at: c.overriddenAt, comment: c.overrideComment ?? '' } }
      : {}),
  };
}

/**
 * A gate's `checks` field (charter 2026-11-09, a gate may be decided by checks, decision 7): the
 * checks of the arrival that opened it. Absent on a gate whose stage had none, so a gate without
 * checks reads exactly as it did before they existed — and costs no extra query.
 */
export function gateChecksField(sql: SqlStorage, gate: Row): { checks?: GateCheckSummary[] } {
  if (typeof gate.check_arrival_id !== 'string') return {};
  return { checks: arrivalChecks(sql, gate.check_arrival_id).map(checkSummary) };
}

/** The arrival at this card and stage whose checks have all passed and whose gate is not open yet. */
export function passedArrivalAwaitingGate(sql: SqlStorage, cardId: string, stageKey: string): string | null {
  const row = sql
    .exec(
      `SELECT id FROM card_check_arrivals WHERE card_id = ? AND stage_key = ? AND status = 'passed' AND gate_id IS NULL ORDER BY created_at DESC, rowid DESC LIMIT 1`,
      cardId,
      stageKey,
    )
    .toArray()[0];
  return typeof row?.id === 'string' ? row.id : null;
}

/** Tie a passed arrival to the gate it opened, both ways, before the gate is pushed. */
export function bindArrivalToGate(sql: SqlStorage, arrivalId: string, gateId: string): void {
  sql.exec(`UPDATE card_check_arrivals SET gate_id = ? WHERE id = ? AND gate_id IS NULL`, gateId, arrivalId);
  sql.exec(`UPDATE gates SET check_arrival_id = ? WHERE id = ?`, arrivalId, gateId);
}
