import type { BoardContext } from './context';
import type { DecisionDeadline, DecisionKind, DecisionTimeout, Result, StageDef } from './model';
import { queueSubscribedPush } from './push';
import { cleanTimeout, parseDecisionTimeout, timeoutError } from './rules';

/**
 * Unanswered decisions remind, then escalate (charter: decisions/2026-11-08-unanswered-decisions-
 * remind-then-escalate.md, decisions 1, 2, 4 and 5).
 *
 * A stage may declare `timeout: { remindAfterMinutes?, escalateAfterMinutes? }`, and a board a
 * default for stages without one. When a decision starts waiting on that stage — its gate, a
 * question, a manual delivery follow-up, a waiting card — its deadlines are recorded in
 * `decision_waits`, in the Durable Object's own SQL, so they survive a restart. The board sweep
 * acts once per deadline: a reminder to the same people, then an escalation. Nothing here ever
 * decides anything (decision 4): a passed deadline changes no gate, question, delivery or card.
 */



type TimeoutDeps = Pick<BoardContext, 'emit' | 'getMeta' | 'setMeta' | 'sql' | 'stages'>;

/** The board's default timeout, for stages without their own, or null. */
export function boardDecisionTimeout(deps: Pick<BoardContext, 'getMeta'>): DecisionTimeout | null {
  return parseDecisionTimeout(deps.getMeta('decisionTimeout'));
}

/** Set (or with null clear) the board's default timeout. The route has checked who may. */
export function setBoardDecisionTimeout(deps: TimeoutDeps, value: unknown): Result<{ decisionTimeout: DecisionTimeout | null }> {
  if (!deps.getMeta('boardId')) return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  if (value === null) {
    deps.sql.exec(`DELETE FROM meta WHERE k = 'decisionTimeout'`);
    deps.emit('board.decision_timeout', { decisionTimeout: null });
    return { ok: true, value: { decisionTimeout: null } };
  }
  const invalid = timeoutError(value, 'decisionTimeout');
  if (invalid || typeof value !== 'object') return { ok: false, code: 'INVALID_TIMEOUT', message: invalid ?? 'decisionTimeout must be an object' };
  const clean = cleanTimeout(value);
  deps.setMeta('decisionTimeout', JSON.stringify(clean));
  deps.emit('board.decision_timeout', { decisionTimeout: clean });
  return { ok: true, value: { decisionTimeout: clean } };
}

/** The timeout that governs a decision waiting on this stage: its own, else the board's, else none. */
function effectiveTimeout(deps: Pick<BoardContext, 'getMeta' | 'stages'>, stageKey: string): DecisionTimeout | null {
  const stage: StageDef | undefined = deps.stages().find((s) => s.key === stageKey);
  return stage?.timeout ?? boardDecisionTimeout(deps);
}

function plusMinutes(iso: string, minutes: number | undefined): string | null {
  if (minutes === undefined) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms + minutes * 60_000).toISOString() : null;
}

/**
 * Record a decision that just started waiting, with its deadlines from the stage's policy, and
 * return them as a body's `deadline` field (empty when no timeout applies).
 *
 * The clock starts now, when the wait is recorded — never at the card's `state_since`, which does
 * not move when an already-waiting card gets a new reason (a gate expiring into `blocked`, a lapsed
 * delivery, a restore), and would put both deadlines in the past for a seconds-old wait. A wait
 * already recorded under the same kind and id keeps its first deadlines (a re-push is not a new
 * wait); a new gate, question or wait id is a new row, and starts again. No timeout, no row.
 */
export function startDecisionWait(
  deps: Pick<BoardContext, 'getMeta' | 'now' | 'sql' | 'stages'>,
  wait: { kind: DecisionKind; decisionId: string; cardId: string; stageKey: string },
): { deadline?: DecisionDeadline } {
  const timeout = effectiveTimeout(deps, wait.stageKey);
  if (!timeout) return {};
  const since = deps.now();
  const remindAt = plusMinutes(since, timeout.remindAfterMinutes);
  const escalateAt = plusMinutes(since, timeout.escalateAfterMinutes);
  const nextDueAt = remindAt ?? escalateAt;
  if (nextDueAt === null) return {};
  deps.sql.exec(
    `INSERT OR IGNORE INTO decision_waits (kind, decision_id, card_id, stage_key, waiting_since, remind_at, escalate_at, next_due_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    wait.kind,
    wait.decisionId,
    wait.cardId,
    wait.stageKey,
    since,
    remindAt,
    escalateAt,
    nextDueAt,
  );
  return decisionDeadline(deps, wait.kind, wait.decisionId);
}

/** A waiting decision's deadlines, as a body's `deadline` field: absent when it has none. */
export function decisionDeadline(deps: Pick<BoardContext, 'sql'>, kind: DecisionKind, decisionId: string): { deadline?: DecisionDeadline } {
  const row = deps.sql.exec(`SELECT remind_at, escalate_at FROM decision_waits WHERE kind = ? AND decision_id = ?`, kind, decisionId).toArray()[0];
  if (!row) return {};
  const deadline: DecisionDeadline = {
    ...(typeof row.remind_at === 'string' ? { remindAt: row.remind_at } : {}),
    ...(typeof row.escalate_at === 'string' ? { escalateAt: row.escalate_at } : {}),
  };
  return deadline.remindAt === undefined && deadline.escalateAt === undefined ? {} : { deadline };
}

/** What the sweep needs from the rest of the board. */
export type DecisionTimeoutDeps = Pick<BoardContext, 'emit' | 'getCard' | 'getCardRow' | 'getMeta' | 'notify' | 'now' | 'sql' | 'stages'>;

/** `decision.reminded` and `decision.escalated`, pushed to the decision carrier (docs/05 §4). */
export interface DecisionNoticeBody {
  event: 'decision.reminded' | 'decision.escalated';
  boardId: string | null;
  boardName: string;
  cardId: string;
  cardTitle: string;
  stageKey: string;
  stageName: string;
  decisionKind: DecisionKind;
  /** The gate id, the question's elicitation id, the delivery's gate id, the card's wait id, or a check set's arrival id. */
  decisionId: string;
  waitingSince: string;
  remindedAt?: string;
  escalatedAt?: string;
  ts: string;
}

/**
 * Whether the decision a wait row names is still waiting. Read from each decision's own row
 * rather than hooked into every way one ends (decided, cancelled, superseded, moved, archived,
 * expired): a closed wait is found here and marked closed, and is never reminded about.
 */
function stillWaiting(deps: DecisionTimeoutDeps, kind: DecisionKind, decisionId: string, cardId: string): boolean {
  const card = deps.getCardRow(cardId);
  if (!card || card.archived_at) return false;
  if (kind === 'gate') {
    return deps.sql.exec(`SELECT 1 FROM gates WHERE id = ? AND status = 'pending'`, decisionId).toArray().length > 0;
  }
  if (kind === 'question') {
    return deps.sql.exec(`SELECT 1 FROM elicitations WHERE id = ? AND status = 'pending'`, decisionId).toArray().length > 0;
  }
  if (kind === 'delivery') {
    return (
      deps.sql
        .exec(
          `SELECT 1 FROM gates g JOIN approval_subjects s ON s.id = g.approval_subject_id
            WHERE g.id = ? AND g.status = 'resolved' AND g.decision = 'approve_manual' AND g.live_post_url IS NULL
              AND s.status = 'active' AND g.approval_subject_id = ?
              AND NOT EXISTS (SELECT 1 FROM approval_delivery_events e WHERE e.gate_id = g.id AND e.event = 'expired')`,
          decisionId,
          card.active_approval_subject_id ?? null,
        )
        .toArray().length > 0
    );
  }
  if (kind === 'checks') {
    // A check set: its arrival is open, the card still waits on that stage, and a check is pending
    // (charter 2026-11-09, a gate may be decided by checks, decision 4). Read here rather than in
    // machine-checks.ts, which acts on arrivals and is not imported by the timeouts.
    const arrival = deps.sql.exec(`SELECT stage_key FROM card_check_arrivals WHERE id = ? AND status = 'open'`, decisionId).toArray()[0];
    if (!arrival || card.current_stage_key !== arrival.stage_key || card.state !== 'input-required') return false;
    return deps.sql.exec(`SELECT 1 FROM card_checks WHERE arrival_id = ? AND status = 'pending' LIMIT 1`, decisionId).toArray().length > 0;
  }
  // An attention wait: the card's current wait, as `currentWaitId` in attention.ts reads it (not
  // imported: that module records waits through this one).
  return card.state === 'input-required' && typeof card.needs_human_json === 'string' && card.needs_human_id === decisionId;
}

const KIND_WORDS: Record<DecisionKind, string> = {
  gate: 'A review',
  question: "An agent's question",
  delivery: 'A manual delivery',
  attention: 'A waiting card',
  checks: "A stage's checks",
};

function noticeBody(deps: DecisionTimeoutDeps, row: { kind: DecisionKind; decisionId: string; cardId: string; stageKey: string; since: string }, event: DecisionNoticeBody['event'], at: string): DecisionNoticeBody | null {
  const card = deps.getCard(row.cardId);
  if (!card) return null;
  const stage = deps.stages().find((s) => s.key === row.stageKey);
  return {
    event,
    boardId: deps.getMeta('boardId'),
    boardName: deps.getMeta('name') ?? '',
    cardId: row.cardId,
    cardTitle: card.title,
    stageKey: row.stageKey,
    stageName: stage?.name ?? row.stageKey,
    decisionKind: row.kind,
    decisionId: row.decisionId,
    waitingSince: row.since,
    ...(event === 'decision.reminded' ? { remindedAt: at } : { escalatedAt: at }),
    ts: at,
  };
}

function isKind(v: unknown): v is DecisionKind {
  return v === 'gate' || v === 'question' || v === 'delivery' || v === 'attention' || v === 'checks';
}

/** How many due waits one sweep acts on; the rest are due on the next. */
const DUE_BATCH = 200;
/** Closed waits are kept this long (a re-pushed wait id finds its row), then pruned in batches. */
const CLOSED_KEEP_MS = 30 * 24 * 3600_000;
const PRUNE_BATCH = 500;

/**
 * The sweep's job: every open wait whose next deadline has passed, acted on once.
 *
 * - **remind**: the card's owner — who the in-app notice for the decision went to — is told again,
 *   and `decision.reminded` is pushed to the subscribers of decision events, which re-surface the
 *   decision where they put it.
 * - **escalate**: `decision.escalated` is pushed; the carrier escalates to the workspace's owners
 *   and admins (charter decision 3). The owner is told in-app too. When both are due at once only
 *   the escalation is sent, and the reminder is recorded as skipped (`remind_skipped`).
 *
 * `next_due_at` is the one indexed column the sweep reads: the earlier deadline still to act on,
 * null once nothing is left. A wait found already over is closed; a wait whose last deadline acts
 * is closed with it. Each act is claimed in the write that queues its push (`reminded_at IS NULL`
 * / `escalated_at IS NULL`), so two sweeps cannot both send it. Closed rows are pruned after
 * `CLOSED_KEEP_MS`. Nothing is decided.
 */
export function sweepDecisionTimeouts(deps: DecisionTimeoutDeps, nowIso: string): { reminded: number; escalated: number } {
  const result = { reminded: 0, escalated: 0 };
  const due = deps.sql
    .exec(`SELECT * FROM decision_waits WHERE next_due_at IS NOT NULL AND next_due_at <= ? ORDER BY next_due_at ASC LIMIT ?`, nowIso, DUE_BATCH)
    .toArray();
  for (const r of due) {
    const { kind, decision_id: decisionId, card_id: cardId, stage_key: stageKey, waiting_since: since } = r;
    if (!isKind(kind) || typeof decisionId !== 'string' || typeof cardId !== 'string' || typeof stageKey !== 'string' || typeof since !== 'string') continue;
    const wait = { kind, decisionId, cardId, stageKey, since };
    // Each wait on its own: one that cannot be acted on must not silence the rest.
    try {
      if (!stillWaiting(deps, kind, decisionId, cardId)) {
        deps.sql.exec(`UPDATE decision_waits SET closed_at = ?, next_due_at = NULL WHERE kind = ? AND decision_id = ?`, nowIso, kind, decisionId);
        continue;
      }
      const title = deps.getCard(cardId)?.title ?? cardId;
      const escalateDue = typeof r.escalate_at === 'string' && r.escalated_at === null && r.escalate_at <= nowIso;
      if (escalateDue) {
        // The last deadline: the row closes with it, and an unsent reminder is recorded as skipped.
        const claimed = deps.sql.exec(
          `UPDATE decision_waits
              SET escalated_at = ?, remind_skipped = CASE WHEN remind_at IS NOT NULL AND reminded_at IS NULL THEN 1 ELSE remind_skipped END,
                  next_due_at = NULL, closed_at = ?
            WHERE kind = ? AND decision_id = ? AND escalated_at IS NULL`,
          nowIso,
          nowIso,
          kind,
          decisionId,
        );
        if (claimed.rowsWritten > 0) {
          const body = noticeBody(deps, wait, 'decision.escalated', nowIso);
          if (body) queueSubscribedPush(deps, body);
          deps.notify('decision-escalated', cardId, `${KIND_WORDS[kind]} on "${title}" went unanswered and was escalated to the workspace's owners and admins.`);
          deps.emit('decision.escalated', { kind, decisionId, cardId });
          result.escalated += 1;
        }
        continue;
      }
      if (typeof r.remind_at === 'string' && r.remind_at <= nowIso) {
        // What is left is the escalation, if there is one; with none, the row closes here.
        const claimed = deps.sql.exec(
          `UPDATE decision_waits
              SET reminded_at = ?, next_due_at = CASE WHEN escalated_at IS NULL THEN escalate_at ELSE NULL END,
                  closed_at = CASE WHEN escalate_at IS NULL OR escalated_at IS NOT NULL THEN ? ELSE NULL END
            WHERE kind = ? AND decision_id = ? AND reminded_at IS NULL AND escalated_at IS NULL`,
          nowIso,
          nowIso,
          kind,
          decisionId,
        );
        if (claimed.rowsWritten > 0) {
          const body = noticeBody(deps, wait, 'decision.reminded', nowIso);
          if (body) queueSubscribedPush(deps, body);
          deps.notify('decision-reminder', cardId, `Reminder: ${KIND_WORDS[kind].toLowerCase()} on "${title}" is still waiting on you.`);
          deps.emit('decision.reminded', { kind, decisionId, cardId });
          result.reminded += 1;
        }
      }
    } catch (err) {
      deps.emit('decision_timeout.failed', { kind, decisionId, reason: String(err) });
    }
  }
  const cutoff = new Date(Date.parse(nowIso) - CLOSED_KEEP_MS).toISOString();
  deps.sql.exec(
    `DELETE FROM decision_waits WHERE rowid IN (SELECT rowid FROM decision_waits WHERE closed_at IS NOT NULL AND closed_at < ? LIMIT ?)`,
    cutoff,
    PRUNE_BATCH,
  );
  return result;
}
