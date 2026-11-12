import { agentNamesFor, principalIdsFor } from '../db/catalog';
import { defaultReporterFetch, postRunReports, type ReporterFetch, RUN_REPORT_MAX_ATTEMPTS, runReportBackoffMs } from '../superwitness/client';
import { reporterConfig, reportingEnabled, reportsStage } from '../superwitness/config';
import { logReporter } from '../superwitness/log';
import { buildRunReport, mapRunStatus, type RunReport, type RunReportDraft } from '../superwitness/report';
import type { BoardContext } from './context';
import type { Result, Row, RunReportDrainResult, RunReportOutboxRow } from './model';

/**
 * superwitness run reports: the outbox, building a report from a run, and draining it.
 */

/** What run reports needs from the rest of the board. */
export type RunReportsDeps = Pick<
  BoardContext,
  | 'env'
  | 'getMeta'
  | 'getRunRow'
  | 'now'
  | 'nowMs'
  | 'reportDrain'
  | 'reporterToken'
  | 'scheduleReclaim'
  | 'sql'
>;

/** superwitness run reports (superwitness app spec §3.5; rulings R12, R13). */
const RUN_REPORT_BATCH_MAX = 100;

const RUN_REPORT_BATCH_MAX_BYTES = 200 * 1024;

const RUN_REPORT_MAX_BATCHES_PER_DRAIN = 10;

/** The superwitness outbox, soonest due first (tests, and the backfill route's counts). */
export async function getRunReportOutbox(deps: RunReportsDeps): Promise<RunReportOutboxRow[]> {
  return deps.sql
    .exec(`SELECT * FROM run_reports ORDER BY next_attempt_at ASC, run_id ASC`)
    .toArray()
    .map((r) => ({
      runId: r.run_id as string,
      gen: Number(r.gen),
      status: r.status as 'pending' | 'dead',
      attempts: Number(r.attempts),
      nextAttemptAt: Number(r.next_attempt_at),
      lastError: (r.last_error as string | null) ?? null,
      reportedAt: r.reported_at as string,
      draft: JSON.parse(r.report_json as string) as RunReportDraft,
    }));
}

/**
 * Send due superwitness run reports (superwitness app spec §3.5). Called by the alarm, and by the
 * Worker cron as a backstop. `fetcher`/`nowMs` are injectable for tests, like
 * `dispatchPushDeliveries`'s sender. Never throws for a delivery failure — those are recorded on
 * the rows.
 */
export async function drainRunReports(deps: RunReportsDeps, opts: { fetcher?: ReporterFetch; nowMs?: number } = {}): Promise<RunReportDrainResult> {
  if (deps.reportDrain) return deps.reportDrain;
  const run = drainRunReportsOnce(deps, opts.fetcher ?? defaultReporterFetch, opts.nowMs ?? deps.nowMs());
  deps.reportDrain = run;
  try {
    return await run;
  } finally {
    deps.reportDrain = null;
  }
}

/**
 * Enqueue one report per run on this board (superwitness app spec §3.5 backfill; ruling R18).
 *
 * Safe to re-run: each run is reported at its OWN stored update time and nothing here bumps it,
 * so a report superwitness already holds arrives with an equal `reported_at` and is a no-op
 * there. Parked rows go back to pending, which makes this the repair tool as well.
 */
export async function enqueueAllRunReports(deps: RunReportsDeps): Promise<Result<{ enqueued: number; pending: number; dead: number }>> {
  if (!deps.getMeta('boardId')) return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  let enqueued = 0;
  if (reportingEnabled(deps.env)) {
    for (const run of deps.sql.exec(`SELECT * FROM runs ORDER BY started_at ASC`).toArray()) {
      const reportedAt = (run.updated_at as string | null) ?? (run.ended_at as string | null) ?? (run.started_at as string);
      enqueueRunReport(deps, run, reportedAt);
      enqueued += 1;
    }
    await deps.scheduleReclaim();
  }
  const counts = deps.sql
    .exec(
      `SELECT COALESCE(SUM(status = 'pending'), 0) AS pending, COALESCE(SUM(status = 'dead'), 0) AS dead FROM run_reports`,
    )
    .one();
  return { ok: true, value: { enqueued, pending: Number(counts.pending), dead: Number(counts.dead) } };
}

/**
 * A run's reported state just changed: bump `runs.updated_at` and, when reporting is on, upsert
 * the run's outbox row with its current state.
 *
 * SYNCHRONOUS ON PURPOSE (ruling R5). Every caller invokes it in the same synchronous span as the
 * write that changed the run, with no `await` between them, so the Durable Object commits the
 * run change and its report together. Adding an `await` before a call to this breaks that.
 *
 * `updated_at` is strictly increasing per run — `max(now, previous + 1 ms)` — because Workers
 * freezes the clock inside a request and superwitness drops a report whose `reported_at` is not
 * strictly newer than the one it holds (R4).
 */
export function reportRun(deps: RunReportsDeps, runId: string): void {
  const run = deps.getRunRow(runId);
  if (!run) return;
  const previous = (run.updated_at as string | null) ?? null;
  const nextMs = previous ? Math.max(deps.nowMs(), Date.parse(previous) + 1) : deps.nowMs();
  const updatedAt = new Date(nextMs).toISOString();
  deps.sql.exec(`UPDATE runs SET updated_at = ? WHERE id = ?`, updatedAt, runId);
  if (!reportingEnabled(deps.env)) return;
  enqueueRunReport(deps, run, updatedAt);
}

/** Upsert `run`'s outbox row with its current state as of `reportedAt` (R6: latest wins, gen bumps). */
function enqueueRunReport(deps: RunReportsDeps, run: Row, reportedAt: string): void {
  deps.sql.exec(
    `INSERT INTO run_reports (run_id, gen, report_json, reported_at, status, attempts, next_attempt_at, last_error, created_at)
     VALUES (?, 1, ?, ?, 'pending', 0, ?, NULL, ?)
     ON CONFLICT(run_id) DO UPDATE SET
       gen = run_reports.gen + 1,
       report_json = excluded.report_json,
       reported_at = excluded.reported_at,
       status = 'pending',
       attempts = 0,
       next_attempt_at = excluded.next_attempt_at,
       last_error = NULL`,
    run.id,
    JSON.stringify(runReportDraft(deps, run, reportedAt)),
    reportedAt,
    deps.nowMs(),
    deps.now(),
  );
}

function runReportDraft(deps: RunReportsDeps, run: Row, reportedAt: string): RunReportDraft {
  const runId = run.id as string;
  const pendingElicitation =
    Number(deps.sql.exec(`SELECT COUNT(*) AS n FROM elicitations WHERE run_id = ? AND status = 'pending'`, runId).one().n) > 0;
  const mapped = mapRunStatus({
    status: run.status as string,
    outcome: (run.outcome as string | null) ?? null,
    pendingElicitation,
    gate: gateJudgingRun(deps, run),
  });
  const card = deps.sql.exec(`SELECT title FROM cards WHERE id = ?`, run.card_id).toArray()[0];
  return {
    boardId: deps.getMeta('boardId') ?? '',
    boardName: deps.getMeta('name'),
    runId,
    agentId: run.agent_id as string,
    stageKey: typeof run.stage_key === 'string' ? run.stage_key : null,
    cardId: typeof run.card_id === 'string' ? run.card_id : null,
    title: (card?.title as string | undefined) ?? null,
    status: mapped.status,
    sourceStatus: mapped.sourceStatus,
    startedAt: (run.started_at as string | null) ?? null,
    endedAt: (run.ended_at as string | null) ?? null,
    reportedAt,
  };
}

/**
 * The newest gate judging this run's work (ruling R3). Gates carry `run_id` since 2026-09-29;
 * an older gate has none and is matched as the first gate on the same card and stage opened at
 * or after a `submitted` run ended — the one outcome that always opened one (R21).
 */
function gateJudgingRun(deps: RunReportsDeps, run: Row): { status: string; decision: string | null } | null {
  const linked = deps.sql
    .exec(`SELECT status, decision FROM gates WHERE run_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1`, run.id)
    .toArray()[0];
  if (linked) return { status: linked.status as string, decision: (linked.decision as string | null) ?? null };
  if ((run.outcome as string | null) !== 'submitted' || !run.ended_at) return null;
  const legacy = deps.sql
    .exec(
      `SELECT status, decision FROM gates
        WHERE run_id IS NULL AND card_id = ? AND stage_key = ? AND created_at >= ?
        ORDER BY created_at ASC, rowid ASC LIMIT 1`,
      run.card_id,
      run.stage_key,
      run.ended_at,
    )
    .toArray()[0];
  return legacy ? { status: legacy.status as string, decision: (legacy.decision as string | null) ?? null } : null;
}

/** The run a gate judges: its `run_id`, or for a legacy gate, the submitted run it was opened for (R21). */
export function runJudgedByGate(deps: RunReportsDeps, gate: Row): string | null {
  if (gate.run_id) return gate.run_id as string;
  const row = deps.sql
    .exec(
      `SELECT id FROM runs WHERE card_id = ? AND stage_key = ? AND outcome = 'submitted' AND ended_at <= ?
        ORDER BY ended_at DESC LIMIT 1`,
      gate.card_id,
      gate.stage_key,
      gate.created_at,
    )
    .toArray()[0];
  return row ? (row.id as string) : null;
}

async function drainRunReportsOnce(deps: RunReportsDeps, fetcher: ReporterFetch, nowMs: number): Promise<RunReportDrainResult> {
  const result: RunReportDrainResult = { sent: 0, retried: 0, parked: 0 };
  if (!reportingEnabled(deps.env)) return result;
  const boardId = deps.getMeta('boardId') ?? '';
  for (let i = 0; i < RUN_REPORT_MAX_BATCHES_PER_DRAIN; i++) {
    const rows = deps.sql
      .exec(
        `SELECT run_id, gen, report_json, attempts FROM run_reports
          WHERE status = 'pending' AND next_attempt_at <= ?
          ORDER BY next_attempt_at ASC, run_id ASC LIMIT ?`,
        nowMs,
        RUN_REPORT_BATCH_MAX,
      )
      .toArray();
    if (rows.length === 0) break;
    // A row that does not parse can never be sent: park it here, or it stays due and every
    // alarm re-arms at now for it.
    const due: Array<{ runId: string; gen: number; attempts: number; draft: RunReportDraft }> = [];
    for (const r of rows) {
      const d = { runId: r.run_id as string, gen: Number(r.gen), attempts: Number(r.attempts) };
      let draft: RunReportDraft;
      try {
        draft = JSON.parse(r.report_json as string) as RunReportDraft;
      } catch {
        parkRunReport(deps, d, boardId, 'corrupt_report', 0, 'corrupt_report');
        result.parked += 1;
        continue;
      }
      due.push({ ...d, draft });
    }
    if (due.length === 0) continue;

    try {
      const cfg = reporterConfig(deps.env);
      if ('error' in cfg) {
        logReporter('warn', { msg: 'superwitness.reporter_misconfigured', 'board.id': boardId, code: cfg.error });
        tallyRetry(result, retryRunReports(deps, due, nowMs, cfg.error, null), due.length);
        break;
      }

      let executors: Map<string, { principalId: string | null; name: string | null }>;
      try {
        executors = await runReportExecutors(deps, due.map((d) => d.draft.agentId));
      } catch {
        logReporter('warn', { msg: 'superwitness.report_retry', 'board.id': boardId, code: 'catalog_unavailable', count: due.length });
        tallyRetry(result, retryRunReports(deps, due, nowMs, 'catalog_unavailable', null), due.length);
        break;
      }

      // Cap by bytes as well as by count: 100 reports of multibyte text can pass 256 KiB (R12).
      const withStage = reportsStage(deps.env);
      const batch: typeof due = [];
      const reports: RunReport[] = [];
      let bytes = '{"runs":[]}'.length;
      for (const d of due) {
        const report = buildRunReport(d.draft, executors.get(d.draft.agentId) ?? { principalId: null, name: null }, { withStage });
        const size = new TextEncoder().encode(JSON.stringify(report)).length + 1;
        if (batch.length > 0 && bytes + size > RUN_REPORT_BATCH_MAX_BYTES) break;
        batch.push(d);
        reports.push(report);
        bytes += size;
      }

      const outcome = await postRunReports(cfg, deps.reporterToken, fetcher, nowMs, reports);
      if (outcome.kind === 'ok') {
        // `gen` guard (R6): a row re-written while this batch was in flight holds a newer snapshot.
        for (const d of batch) deps.sql.exec(`DELETE FROM run_reports WHERE run_id = ? AND gen = ?`, d.runId, d.gen);
        result.sent += batch.length;
        continue;
      }
      if (outcome.kind === 'retry') {
        logReporter('warn', { msg: 'superwitness.report_retry', 'board.id': boardId, 'http.status': outcome.status, code: outcome.code, count: batch.length });
        tallyRetry(result, retryRunReports(deps, batch, nowMs, outcome.code, outcome.retryAfterMs), batch.length);
        break;
      }
      // Refused: the one named item, or the whole batch (R11). The rest stay due and go next loop.
      const refused = outcome.index !== null ? [batch[outcome.index]] : batch;
      for (const d of refused) parkRunReport(deps, d, boardId, `${outcome.status} ${outcome.code}`, outcome.status, outcome.code);
      result.parked += refused.length;
    } catch (err) {
      // Anything unexpected: back the rows off as for a failed send, so the alarm that
      // `scheduleReclaim` arms next is not at now. The alarm's own catch stays the last resort.
      logReporter('error', { msg: 'superwitness.drain_failed', 'board.id': boardId, code: err instanceof Error ? err.name : 'unknown', count: due.length });
      tallyRetry(result, retryRunReports(deps, due, nowMs, 'drain_error', null), due.length);
      break;
    }
  }
  const dead = Number(deps.sql.exec(`SELECT COUNT(*) AS n FROM run_reports WHERE status = 'dead'`).one().n);
  if (dead > 0) {
    logReporter('warn', { msg: 'superwitness.run_reports_dead', metric: 'run_reports_dead', value: dead, 'board.id': boardId });
  }
  return result;
}

function tallyRetry(result: RunReportDrainResult, parked: number, total: number): void {
  result.parked += parked;
  result.retried += total - parked;
}

/** A retryable failure (R9, R10): back off, or park on the 12th attempt. Returns how many were parked. */
function retryRunReports(deps: RunReportsDeps, rows: Array<{ runId: string; gen: number; attempts: number }>, nowMs: number, code: string, retryAfterMs: number | null): number {
  let parked = 0;
  const boardId = deps.getMeta('boardId') ?? '';
  for (const d of rows) {
    const attempts = d.attempts + 1;
    if (attempts >= RUN_REPORT_MAX_ATTEMPTS) {
      parkRunReport(deps, d, boardId, `gave up: ${code}`, 0, code);
      parked += 1;
      continue;
    }
    const delay = Math.max(runReportBackoffMs(attempts), retryAfterMs ?? 0);
    deps.sql.exec(
      `UPDATE run_reports SET attempts = ?, next_attempt_at = ?, last_error = ? WHERE run_id = ? AND gen = ?`,
      attempts,
      nowMs + delay,
      code,
      d.runId,
      d.gen,
    );
  }
  return parked;
}

/** Park a row: kept, never retried, counted as `run_reports_dead` (R16). Ids and codes only in the log. */
function parkRunReport(deps: RunReportsDeps, d: { runId: string; gen: number }, boardId: string, lastError: string, status: number, code: string): void {
  deps.sql.exec(
    `UPDATE run_reports SET status = 'dead', attempts = attempts + 1, last_error = ? WHERE run_id = ? AND gen = ?`,
    lastError,
    d.runId,
    d.gen,
  );
  logReporter('warn', {
    msg: 'superwitness.report_parked',
    metric: 'run_reports_dead',
    'board.id': boardId,
    'run.id': d.runId,
    'http.status': status,
    code,
  });
}

/** Executor identity from the catalog (ruling R7). */
async function runReportExecutors(deps: RunReportsDeps, agentIds: string[]): Promise<Map<string, { principalId: string | null; name: string | null }>> {
  const tenantId = deps.getMeta('tenantId') ?? '';
  const [principals, names] = await Promise.all([
    principalIdsFor(deps.env.DB, tenantId, agentIds),
    agentNamesFor(deps.env.DB, tenantId, agentIds),
  ]);
  const out = new Map<string, { principalId: string | null; name: string | null }>();
  for (const id of new Set(agentIds)) out.set(id, { principalId: principals.get(id) ?? null, name: names.get(id) ?? null });
  return out;
}
