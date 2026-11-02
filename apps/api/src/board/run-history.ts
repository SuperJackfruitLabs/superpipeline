import type { JsonValue } from '../json';
import { isModelPriced } from '../metering/pricing';
import type { BoardContext } from './context';
import type { Result, RunAuth } from './model';
import { record } from './rules';
import type { ActivityView, AttemptView, EvidenceReferenceInput, GateView, ReferenceView, RunContext, RunEvidence, RunEvidenceGate, RunEvidenceV1 } from './views';

/**
 * What a run sees and leaves behind: its context, its evidence, a card's attempts and activities.
 */

/** What run history needs from the rest of the board. */
export type RunHistoryDeps = Pick<
  BoardContext,
  | 'addReference'
  | 'commentsForRunContext'
  | 'denyForeignRun'
  | 'elicitationsForRun'
  | 'gatesForCard'
  | 'getCard'
  | 'getCardHandoffJson'
  | 'getMeta'
  | 'getRunEvidence'
  | 'getRunRow'
  | 'now'
  | 'parseHandoff'
  | 'rowToReference'
  | 'sql'
  | 'stages'
>;

/** These are locators asserted by the original run, never verification receipts. */
function executionExportHint(metadata: JsonValue | null): { schema_version: 'agentpod-execution-export/v1'; export_id: string; manifest_sha256: string; verification: 'unverified' } | null {
  const hint = record(record(metadata)?.execution_export);
  if (!hint || Object.keys(hint).sort().join(',') !== 'export_id,manifest_sha256,schema_version'
    || hint.schema_version !== 'agentpod-execution-export/v1'
    || typeof hint.export_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(hint.export_id)
    || typeof hint.manifest_sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(hint.manifest_sha256)) return null;
  return { schema_version: 'agentpod-execution-export/v1', export_id: hint.export_id, manifest_sha256: hint.manifest_sha256, verification: 'unverified' };
}

const EVIDENCE_DECISION: Record<string, RunEvidenceGate['decision']> = {
  approve: 'approved',
  approve_manual: 'approved',
  approve_automatic: 'approved',
  request_changes: 'changes_requested',
  reject: 'rejected',
};

/**
 * The agent read surface (docs/04 §3 `getCard`): everything the agent that owns `runId` needs to
 * work its card, and nothing else. Authorized by the same predicate as the run verbs — a run
 * belongs to the agent that claimed it — so there is one ownership rule, not two.
 *
 * Unlike the verbs this does not require a live lease: a finished run stays readable so an agent
 * can verify the outcome it produced (and a reclaimed one can see that it lost the card).
 */
export async function getRunContext(deps: RunHistoryDeps, input: { runId: string; agentId?: string | null }): Promise<Result<RunContext>> {
  const row = deps.getRunRow(input.runId);
  if (!row) return { ok: false, code: 'RUN_NOT_FOUND', message: `run not found: ${input.runId}` };
  const denied = deps.denyForeignRun(row, input.agentId);
  if (denied) return denied;

  const cardId = row.card_id as string;
  const card = deps.getCard(cardId);
  if (!card) return { ok: false, code: 'CARD_NOT_FOUND', message: `card not found: ${cardId}` };
  return {
    ok: true,
    value: {
      run: {
        runId: row.id as string,
        cardId,
        stageKey: row.stage_key as string,
        leaseEpoch: Number(row.lease_epoch),
        status: row.status as string,
        outcome: (row.outcome as string | null) ?? null,
        startedAt: row.started_at as string,
        endedAt: (row.ended_at as string | null) ?? null,
        handoff: deps.parseHandoff((row.handoff_json as string | null) ?? null),
        completion: row.completion ? JSON.parse(row.completion as string) as JsonValue : null,
      },
      card,
      stage: deps.stages().find((s) => s.key === card.currentStageKey) ?? null,
      handoff: deps.parseHandoff(deps.getCardHandoffJson(cardId)),
      references: deps.sql
        .exec(`SELECT * FROM card_references WHERE card_id = ? ORDER BY created_at ASC`, cardId)
        .toArray()
        .map((r) => deps.rowToReference(r)),
      elicitations: deps.elicitationsForRun(input.runId),
      ...deps.commentsForRunContext(cardId),
    },
  };
}

/**
 * A run as evidence (superwitness contract C4; charter evidence-joins-on-the-work-run decisions
 * 4 and 5). Read-only. Gates: those this run opened, plus legacy gates (null run_id) on the same
 * card whose `stage_key` is the run's stage or whose `return_stage_key` is (advanceCard opens a
 * gate on the NEXT stage and records the stage the work came from as its return stage). Usage: `unreported` with null numbers when no record exists — a
 * bridge-dispatched run's cost is not zero, it is unknown.
 */
export async function getRunEvidence(deps: RunHistoryDeps, runId: string): Promise<Result<RunEvidence>> {
  const boardId = deps.getMeta('boardId');
  if (!boardId) return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  const row = deps.getRunRow(runId);
  if (!row) return { ok: false, code: 'RUN_NOT_FOUND', message: `run not found: ${runId}` };
  const cardId = row.card_id as string;
  const card = deps.getCard(cardId);
  // deleteCard removes a card's runs with it, so this is unreachable today; if card deletion
  // starts keeping runs (workstream 3b) this must return the run without a card instead.
  if (!card) return { ok: false, code: 'RUN_NOT_FOUND', message: `run not found: ${runId}` };

  const gates = deps.sql
    .exec(
      `SELECT * FROM gates WHERE card_id = ? AND (run_id = ? OR (run_id IS NULL AND (stage_key = ? OR return_stage_key = ?)))
       ORDER BY created_at ASC, rowid ASC`,
      cardId,
      runId,
      row.stage_key as string,
      row.stage_key as string,
    )
    .toArray()
    .map((g) => ({
      id: g.id as string,
      run_id: (g.run_id as string | null) ?? null,
      stage_key: g.stage_key as string,
      status: g.status as RunEvidenceGate['status'],
      decision: g.decision ? (EVIDENCE_DECISION[g.decision as string] ?? null) : null,
      decided_by: (g.decided_by as string | null) ?? null,
      produced_by: g.produced_by as string,
      // Not resolved here: the Durable Object has no catalog. The Worker fills these in.
      produced_by_principal_id: null,
      decided_by_principal_id: null,
      decided_by_hub_sub: null,
      created_at: g.created_at as string,
      resolved_at: (g.resolved_at as string | null) ?? null,
    }));

  const u = deps.sql
    .exec(
      `SELECT COUNT(*) AS n, COALESCE(SUM(input_tokens), 0) AS i, COALESCE(SUM(output_tokens), 0) AS o,
              COALESCE(SUM(cost_usd), 0) AS c
         FROM usage_records WHERE run_id = ?`,
      runId,
    )
    .toArray()[0];
  const usage: RunEvidence['usage'] =
    Number(u.n) > 0
      ? { status: 'reported', input_tokens: Number(u.i), output_tokens: Number(u.o), cost_usd: Number(u.c) }
      : { status: 'unreported', input_tokens: null, output_tokens: null, cost_usd: null };

  return {
    ok: true,
    value: {
      run: {
        id: row.id as string,
        board_id: boardId,
        card_id: cardId,
        stage_key: row.stage_key as string,
        agent_id: row.agent_id as string,
        agent_principal_id: null,
        status: row.status as string,
        outcome: (row.outcome as string | null) ?? null,
        started_at: row.started_at as string,
        ended_at: (row.ended_at as string | null) ?? null,
      },
      card: { id: card.id, title: card.title, stage_key: card.currentStageKey },
      gates,
      usage,
      as_of: deps.now(),
    },
  };
}

export async function getRunEvidenceV1(deps: RunHistoryDeps, runId: string): Promise<Result<RunEvidenceV1>> {
  const legacy = await deps.getRunEvidence(runId);
  if (!legacy.ok) return legacy;
  const row = deps.getRunRow(runId)!;
  const records = deps.sql.exec(`SELECT model, cost_usd, estimated FROM usage_records WHERE run_id = ?`, runId).toArray();
  const reported = records.filter(r => Number(r.estimated) === 0);
  // An unpriced estimate was persisted as zero by the old metering path. It is unknown here.
  const estimates = records.filter(r => Number(r.estimated) !== 0 && isModelPriced(r.model as string | undefined));
  const unknown = records.length - reported.length - estimates.length;
  const status = records.length === 0 ? 'unreported'
    : unknown === records.length ? 'unknown'
    : unknown > 0 || (reported.length > 0 && estimates.length > 0) ? 'partial'
    : estimates.length > 0 ? 'estimated' : 'known';
  const refs = deps.sql.exec(`SELECT * FROM card_references WHERE card_id = ? AND run_id = ? ORDER BY created_at, id LIMIT 257`, row.card_id, runId).toArray();
  const completion = row.completion ? JSON.parse(row.completion as string) as { met?: unknown; unchecked?: unknown } : null;
  return { ok: true, value: {
    schema_version: 'superpipeline-run-evidence/v1',
    pipeline: legacy.value,
    provenance: {
      lease_epoch: Number(row.lease_epoch),
      queued_by: (row.queued_by as string | null) ?? null,
      completion: completion && typeof completion.met === 'boolean' ? { met: completion.met, unchecked_count: Array.isArray(completion.unchecked) ? completion.unchecked.length : 0 } : null,
      handoff_recorded: row.handoff_json !== null && row.handoff_json !== undefined,
      references_truncated: refs.length > 256,
      references: refs.slice(0, 256).map(r => { const ref = deps.rowToReference(r); return { id: ref.id, cardId: ref.cardId, runId: ref.runId, url: ref.url, provider: ref.provider, sourceType: ref.sourceType, externalId: ref.externalId, execution_export: executionExportHint(ref.metadata), createdAt: ref.createdAt }; }),
    },
    usage: {
      status,
      recorded_cost_usd: reported.length ? reported.reduce((sum, r) => sum + Number(r.cost_usd), 0) : null,
      estimated_cost_usd: estimates.length ? estimates.reduce((sum, r) => sum + Number(r.cost_usd), 0) : null,
      cost_provenance: reported.length ? 'agent-reported-not-provider-bill' : 'unknown',
    },
    executor_evidence: {
      external_source: 'superpipeline', external_run_id: runId,
      agentpod_path: `/api/evidence/runs/superpipeline/${encodeURIComponent(runId)}/execution?schema_version=salaam-execution-evidence%2Fv1`,
    },
  } };
}

export async function attachEvidenceReference(deps: RunHistoryDeps, input: EvidenceReferenceInput): Promise<Result<ReferenceView>> {
  const auth = authorizeEvidenceAnnotation(deps, input);
  if (!auth.ok) return auth;
  const row = auth.run;
  if (row.card_id !== input.cardId || row.stage_key !== input.stageKey) return { ok: false, code: 'NOT_RUN_OWNER', message: 'original card and stage must match' };
  const hint = executionExportHint({ execution_export: { schema_version: 'agentpod-execution-export/v1', export_id: input.exportId, manifest_sha256: input.manifestSha256 } });
  if (!hint) return { ok: false, code: 'INVALID_URL', message: 'invalid export locator' };
  const existing = deps.sql.exec(`SELECT run_id, metadata_json FROM card_references WHERE card_id = ? AND url = ?`, input.cardId, input.url).toArray()[0];
  if (existing && (existing.run_id !== input.runId || executionExportHint(existing.metadata_json ? JSON.parse(existing.metadata_json as string) as JsonValue : null)?.manifest_sha256 !== input.manifestSha256)) return { ok: false, code: 'NOT_RUN_OWNER', message: 'export locator already belongs to different evidence' };
  return deps.addReference({ cardId: input.cardId, runId: input.runId, url: input.url,
    provider: 'url', sourceType: 'execution-export', externalId: input.exportId, addedBy: 'agent',
    metadata: { execution_export: { schema_version: hint.schema_version, export_id: hint.export_id, manifest_sha256: hint.manifest_sha256 } },
  });
}

/**
 * An export locator annotates original evidence; it never resumes work. Successful terminal
 * runs retain their original owner and epoch even after the card moves on. Reclaimed and
 * other unsuccessful runs remain fenced. Unlike the dev work gate, identity is mandatory.
 */
function authorizeEvidenceAnnotation(deps: RunHistoryDeps, input: EvidenceReferenceInput): RunAuth {
  const row = deps.getRunRow(input.runId);
  if (!input.agentId || (row && row.agent_id !== input.agentId)) {
    return { ok: false, code: 'NOT_RUN_OWNER', message: 'original authenticated run owner required' };
  }
  const permitted = row && (row.status === 'working' ||
    (row.status === 'ended' && row.ended_at != null && (row.outcome === 'completed' || row.outcome === 'submitted')));
  if (!permitted || Number(row.lease_epoch) !== input.leaseEpoch) {
    return { ok: false, code: 'STALE_LEASE', message: 'original run epoch and permitted evidence state required' };
  }
  return { ok: true, run: row };
}

/** The attempts (runs) for a card, newest-stage-first, with each run's cost and model (docs/07 §5). */
export async function getAttempts(deps: RunHistoryDeps, cardId: string): Promise<AttemptView[]> {
  return deps.sql
    .exec(`SELECT * FROM runs WHERE card_id = ? ORDER BY started_at ASC`, cardId)
    .toArray()
    .map((r) => {
      const runId = r.id as string;
      const cost = Number(deps.sql.exec(`SELECT COALESCE(SUM(cost_usd), 0) AS c FROM usage_records WHERE run_id = ?`, runId).one().c);
      const modelRow = deps.sql
        .exec(`SELECT model FROM usage_records WHERE run_id = ? AND model IS NOT NULL ORDER BY seq DESC LIMIT 1`, runId)
        .toArray()[0];
      return {
        runId,
        cardId: r.card_id as string,
        stageKey: r.stage_key as string,
        agentId: r.agent_id as string,
        status: r.status as string,
        outcome: (r.outcome as string | null) ?? null,
        startedAt: r.started_at as string,
        endedAt: (r.ended_at as string | null) ?? null,
        costUsd: cost,
        model: modelRow ? (modelRow.model as string) : null,
        profileKey: (r.profile_key as string | null) ?? null,
        handoff: r.handoff_json ? (JSON.parse(r.handoff_json as string) as JsonValue) : null,
        failureReason: (r.failure_reason as string | null) ?? null,
        /**
         * Why this run ended as it did, when a stage asked for something.
         *
         * Carried so a reader does not have to infer intent from an outcome. A published
         * receipt once recorded `publish · completed` for a run that had refused, and the only
         * fix available was a prose caveat explaining that a repeated stage usually means the
         * earlier one did nothing. This is that caveat replaced by the fact.
         */
        completion: r.completion ? (JSON.parse(r.completion as string) as Record<string, unknown>) : null,
      };
    });
}

export async function getCardActivities(deps: RunHistoryDeps, cardId: string): Promise<{ activities: ActivityView[]; handoff: JsonValue | null; gates: GateView[] }> {
  const activities = deps.sql
    .exec(`SELECT * FROM activities WHERE card_id = ? AND ephemeral = 0 ORDER BY seq ASC`, cardId)
    .toArray()
    .map((r) => {
      const detail = (r.detail_json ? JSON.parse(r.detail_json as string) : {}) as {
        parameter?: JsonValue;
        result?: JsonValue;
        signal?: string;
      };
      return {
        seq: Number(r.seq),
        runId: r.run_id as string,
        type: r.type as string,
        ts: r.ts as string,
        body: (r.body as string | null) ?? null,
        action: (r.action as string | null) ?? null,
        parameter: detail.parameter ?? null,
        result: detail.result ?? null,
        signal: detail.signal ?? null,
      };
    });
  // Gates ride along with the timeline rather than getting their own route: "who approved this
  // and what did they say" is a question about the card's history, which is what this endpoint
  // already answers.
  return { activities, handoff: deps.parseHandoff(deps.getCardHandoffJson(cardId)), gates: deps.gatesForCard(cardId) };
}
