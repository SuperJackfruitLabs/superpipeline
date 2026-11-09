import type { CheckDef, StageDef, VerdictJudgeKind } from './model';

/**
 * The shape of a stage's `checks` (charter: decisions/2026-11-09-a-gate-may-be-decided-by-checks.md,
 * decisions 1 and 8). Pure, so the board, the create route and the tests judge one rule.
 */

export const CHECKS_MAX = 5;
export const CHECK_NAME_MAX = 40;
const CONTEXTS_MAX = 20;
const CONTEXT_MAX = 200;
const KIND_MAX = 100;
const STANDARD_MAX = 200;
const JUDGE_KINDS: ReadonlySet<string> = new Set<VerdictJudgeKind>(['grader', 'rule', 'agent', 'human']);
const GATES: ReadonlySet<string> = new Set(['none', 'approval', 'checks']);
const CI_KEYS: ReadonlySet<string> = new Set(['name', 'provider', 'contexts']);
const VERDICT_KEYS: ReadonlySet<string> = new Set(['name', 'provider', 'kind', 'standard', 'atLeast', 'pass', 'judgeKinds']);

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function boundedString(v: unknown, max: number): v is string {
  return typeof v === 'string' && v.trim() !== '' && v.trim() === v && v.length <= max;
}

/** Why one check is out of shape, or null. */
function checkError(c: unknown, label: string): string | null {
  if (!isRecord(c)) return `${label} must be an object`;
  if (!boundedString(c.name, CHECK_NAME_MAX) || c.name.includes('/')) {
    return `${label} needs a name of 1 to ${CHECK_NAME_MAX} characters, without surrounding spaces or "/"`;
  }
  const named = `${label} "${c.name}"`;
  if (c.provider === 'ci') {
    const extra = Object.keys(c).find((k) => !CI_KEYS.has(k));
    if (extra) return `${named}: a ci check has no "${extra}"`;
    if (c.contexts === undefined) return null;
    if (!Array.isArray(c.contexts) || c.contexts.length === 0 || c.contexts.length > CONTEXTS_MAX) {
      return `${named}: contexts must list 1 to ${CONTEXTS_MAX} CI contexts, or be left out for every reported one`;
    }
    if (!c.contexts.every((x) => boundedString(x, CONTEXT_MAX))) return `${named}: each context must be a non-empty string of at most ${CONTEXT_MAX} characters`;
    if (new Set(c.contexts).size !== c.contexts.length) return `${named}: contexts must not repeat`;
    return null;
  }
  if (c.provider === 'verdict') {
    const extra = Object.keys(c).find((k) => !VERDICT_KEYS.has(k));
    if (extra) return `${named}: a verdict check has no "${extra}"`;
    if (!boundedString(c.kind, KIND_MAX)) return `${named}: kind must be a non-empty string of at most ${KIND_MAX} characters`;
    if (c.standard !== undefined && !boundedString(c.standard, STANDARD_MAX)) return `${named}: standard must be a non-empty string of at most ${STANDARD_MAX} characters`;
    const hasAtLeast = c.atLeast !== undefined;
    const hasPass = c.pass !== undefined;
    if (hasAtLeast === hasPass) return `${named}: say either atLeast (a number) or pass: true`;
    if (hasAtLeast && (typeof c.atLeast !== 'number' || !Number.isFinite(c.atLeast))) return `${named}: atLeast must be a number`;
    if (hasPass && c.pass !== true) return `${named}: pass must be true`;
    if (c.judgeKinds !== undefined) {
      if (!Array.isArray(c.judgeKinds) || c.judgeKinds.length === 0 || !c.judgeKinds.every((k) => typeof k === 'string' && JUDGE_KINDS.has(k))) {
        return `${named}: judgeKinds must list one or more of grader, rule, agent, human`;
      }
      if (new Set(c.judgeKinds).size !== c.judgeKinds.length) return `${named}: judgeKinds must not repeat`;
    }
    return null;
  }
  return `${named}: provider must be "ci" or "verdict"`;
}

/**
 * Why a stage's gate and checks are out of shape, or null: 1 to 5 checks with unique names, each
 * well formed; a stage with checks needs a `returnStage` and an approval or checks gate; a checks
 * gate needs checks and is decided by nobody, so no agent may own it.
 */
export function checksError(s: Pick<StageDef, 'key' | 'gate' | 'checks' | 'returnStage' | 'ownerKind'>): string | null {
  const label = `stage "${s.key}"`;
  if (s.gate !== undefined && !GATES.has(s.gate)) return `${label} gate must be "none", "approval" or "checks"`;
  if (s.gate === 'checks' && (s.ownerKind === 'capability' || s.ownerKind === 'agent')) {
    return `${label} is decided by its checks, so no agent may own it: give it ownerKind "human"`;
  }
  if (s.checks === undefined) return s.gate === 'checks' ? `${label} gate "checks" needs at least one check` : null;
  const checks: unknown = s.checks;
  if (!Array.isArray(checks) || checks.length === 0 || checks.length > CHECKS_MAX) return `${label} checks must list 1 to ${CHECKS_MAX} checks`;
  for (const [i, c] of checks.entries()) {
    const bad = checkError(c, `${label} check ${i + 1}`);
    if (bad) return bad;
  }
  const names = checks.map((c: { name: string }) => c.name);
  const repeated = names.find((n, i) => names.indexOf(n) !== i);
  if (repeated !== undefined) return `${label} has two checks named "${repeated}"`;
  if (s.gate !== 'approval' && s.gate !== 'checks') return `${label} has checks, so its gate must be "approval" or "checks"`;
  if (s.returnStage === undefined || s.returnStage === '') return `${label} has checks, so it needs a returnStage for the card to go back to when one fails`;
  return null;
}

/** One check in its one stored spelling: fixed key order, absent fields left out. */
export function cleanCheck(c: CheckDef): CheckDef {
  if (c.provider === 'ci') return { name: c.name, provider: 'ci', ...(c.contexts ? { contexts: [...c.contexts] } : {}) };
  return {
    name: c.name,
    provider: 'verdict',
    kind: c.kind,
    ...(c.standard !== undefined ? { standard: c.standard } : {}),
    ...(c.atLeast !== undefined ? { atLeast: c.atLeast } : {}),
    ...(c.pass === true ? { pass: true as const } : {}),
    ...(c.judgeKinds ? { judgeKinds: [...c.judgeKinds] } : {}),
  };
}

/** A stage's checks in their stored spelling, for comparing decision policy. */
export function cleanChecks(checks: CheckDef[] | undefined): CheckDef[] | null {
  return checks && checks.length > 0 ? checks.map(cleanCheck) : null;
}
