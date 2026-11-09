import { defaultReporterFetch, getVerdicts, type ReporterFetch, type WitnessVerdict } from '../superwitness/client';
import { reporterConfig, reportingEnabled } from '../superwitness/config';
import { externalRef, REPORT_SOURCE } from '../superwitness/report';
import { type CheckRow, toCheckRow } from './check-store';
import type { BoardContext } from './context';
import type { CheckDef } from './model';
import { type MachineChecksDeps, judgeCheck, settleArrival } from './machine-checks';

/**
 * `verdict` checks (charter: decisions/2026-11-09-a-gate-may-be-decided-by-checks.md, decisions 1
 * and 6). SuperWitness sends no events, so the board's five-minute sweep asks it, for pending
 * verdict checks only, until it does.
 *
 * **Which run.** The verdicts read are those on the run that produced the work the stage judges:
 * the run recorded with the arrival — the run whose completion moved the card onto the stage, or
 * whose submission put it up for review there (the same run a gate opened at that moment would
 * judge). Its SuperWitness subject is `superpipeline:<boardId>/<runId>`, the reference the run
 * report gave it. An arrival with no run (a card a person moved on) has nothing to read and waits.
 */

export type CheckVerdictsDeps = MachineChecksDeps & Pick<BoardContext, 'env' | 'nowMs' | 'reporterToken'>;

const CI_RESULTS_KEEP_MS = 30 * 24 * 3600_000;

type VerdictDef = Extract<CheckDef, { provider: 'verdict' }>;

/**
 * Judge a verdict check against the verdicts on its run (decision 1). Pure. Verdicts of the named
 * kind (and standard, and judge kinds, when given); one superseded by another is ignored; the latest
 * of the rest wins. `atLeast`: its numeric value is at or over the bar. `pass`: its value is `true`
 * or `"pass"`. None yet: pending.
 */
export function judgeVerdict(def: VerdictDef, verdicts: WitnessVerdict[]): { status: 'pending' | 'passed' | 'failed'; detail: string } {
  const superseded = new Set(verdicts.flatMap((v) => (v.supersedes !== null ? [v.supersedes] : [])));
  const candidates = verdicts
    .filter((v) => v.kind === def.kind)
    .filter((v) => def.standard === undefined || v.standard === def.standard)
    .filter((v) => def.judgeKinds === undefined || def.judgeKinds.some((k) => k === v.judgeKind))
    .filter((v) => v.supersededBy === null && !superseded.has(v.id))
    .toSorted((a, b) => (a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt.localeCompare(b.createdAt)));
  const latest = candidates.at(-1);
  const what = `"${def.kind}"${def.standard !== undefined ? ` (${def.standard})` : ''}`;
  if (!latest) return { status: 'pending', detail: `no ${what} verdict on the run yet` };
  const by = `${latest.judgeKind} verdict ${latest.id}`;
  if (def.atLeast !== undefined) {
    if (typeof latest.value !== 'number') return { status: 'failed', detail: `${by}: its value is not a number` };
    return latest.value >= def.atLeast
      ? { status: 'passed', detail: `${by}: ${latest.value}, at least ${def.atLeast}` }
      : { status: 'failed', detail: `${by}: ${latest.value}, under ${def.atLeast}` };
  }
  const passed = latest.value === true || latest.value === 'pass';
  return { status: passed ? 'passed' : 'failed', detail: `${by}: ${JSON.stringify(latest.value) ?? 'no value'}` };
}

/**
 * The sweep's job: read the verdicts for every pending verdict check of an open arrival, one read
 * per run, and settle each arrival whose checks changed. Returns how many checks were decided.
 * SuperWitness off, misconfigured or unreachable leaves every check pending (the stage's timeout
 * reminds and escalates), and says why in an event.
 */
export async function pollVerdictChecks(deps: CheckVerdictsDeps, nowIso: string, opts: { fetcher?: ReporterFetch } = {}): Promise<number> {
  // CI results nobody asked about for a month are pruned, a batch per sweep.
  const cutoff = new Date(Date.parse(nowIso) - CI_RESULTS_KEEP_MS).toISOString();
  deps.sql.exec(`DELETE FROM ci_results WHERE rowid IN (SELECT rowid FROM ci_results WHERE updated_at < ? LIMIT 500)`, cutoff);
  const pending = deps.sql
    .exec(
      `SELECT c.*, a.run_id AS arrival_run_id FROM card_checks c JOIN card_check_arrivals a ON a.id = c.arrival_id
        WHERE c.status = 'pending' AND c.provider = 'verdict' AND a.status = 'open' ORDER BY a.created_at ASC, c.position ASC`,
    )
    .toArray();
  if (pending.length === 0) return 0;
  if (!reportingEnabled(deps.env)) {
    deps.emit('checks.verdicts_unavailable', { code: 'superwitness_off', pending: pending.length });
    return 0;
  }
  const cfg = reporterConfig(deps.env);
  if ('error' in cfg) {
    deps.emit('checks.verdicts_unavailable', { code: cfg.error, pending: pending.length });
    return 0;
  }
  const byRun = new Map<string, CheckRow[]>();
  for (const r of pending) {
    const check = toCheckRow(r);
    if (!check || typeof r.arrival_run_id !== 'string') continue;
    byRun.set(r.arrival_run_id, [...(byRun.get(r.arrival_run_id) ?? []), check]);
  }
  const boardId = deps.getMeta('boardId') ?? '';
  const fetcher = opts.fetcher ?? defaultReporterFetch;
  const changed = new Set<string>();
  let decided = 0;
  for (const [runId, checks] of byRun) {
    const read = await getVerdicts(cfg, deps.reporterToken, fetcher, deps.nowMs(), { kind: 'run', ref: `${REPORT_SOURCE}:${externalRef(boardId, runId)}` });
    if (read.kind === 'error') {
      deps.emit('checks.verdicts_unavailable', { code: read.code, status: read.status, runId });
      continue;
    }
    for (const c of checks) {
      if (c.def.provider !== 'verdict') continue;
      const verdict = judgeVerdict(c.def, read.verdicts);
      // The read awaited: `judgeCheck` writes only a check still pending (or passed), so one an
      // override or a webhook settled meanwhile is left alone.
      if (judgeCheck(deps, c, verdict.status, verdict.detail, null, null)) {
        changed.add(c.arrivalId);
        decided += 1;
      }
    }
  }
  for (const arrivalId of changed) settleArrival(deps, arrivalId);
  if (changed.size > 0) await deps.scheduleReclaim();
  return decided;
}
