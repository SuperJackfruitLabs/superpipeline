import { DECISION_TIMEOUT_MAX_MINUTES } from '@superpipeline/contract';
import type { BoardContext } from './context';
import type { DecisionDeadline, DecisionTimeout, Result, StageDef } from './model';
import { queueSubscribedPush } from './push';

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

/** The longest a timeout may be: thirty days, in minutes (the contract's bound). */
export { DECISION_TIMEOUT_MAX_MINUTES };

export type DecisionKind = 'gate' | 'question' | 'delivery' | 'attention';


/** What is wrong with a timeout, or null. `label` names where it was set, for the message. */
export function timeoutError(value: unknown, label: string): string | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return `${label} must be an object`;
  const entries: Array<[string, unknown]> = Object.entries(value);
  const t = new Map(entries);
  const extra = [...t.keys()].filter((k) => k !== 'remindAfterMinutes' && k !== 'escalateAfterMinutes');
  if (extra.length > 0) return `${label} takes remindAfterMinutes and escalateAfterMinutes only, not ${extra.join(', ')}`;
  for (const key of ['remindAfterMinutes', 'escalateAfterMinutes'] as const) {
    const v = t.get(key);
    if (v === undefined) continue;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > DECISION_TIMEOUT_MAX_MINUTES) {
      return `${label}.${key} must be a whole number of minutes from 1 to ${DECISION_TIMEOUT_MAX_MINUTES} (30 days)`;
    }
  }
  const remind = t.get('remindAfterMinutes');
  const escalate = t.get('escalateAfterMinutes');
  if (remind === undefined && escalate === undefined) {
    return `${label} needs remindAfterMinutes, escalateAfterMinutes or both; leave it out for none`;
  }
  if (typeof remind === 'number' && typeof escalate === 'number' && escalate <= remind) {
    return `${label}.escalateAfterMinutes must be later than remindAfterMinutes`;
  }
  return null;
}

/** Only the two known fields, so a stored timeout never carries more than was validated. */
export function cleanTimeout(t: object): DecisionTimeout {
  const remind = 'remindAfterMinutes' in t && typeof t.remindAfterMinutes === 'number' ? t.remindAfterMinutes : undefined;
  const escalate = 'escalateAfterMinutes' in t && typeof t.escalateAfterMinutes === 'number' ? t.escalateAfterMinutes : undefined;
  return {
    ...(remind !== undefined ? { remindAfterMinutes: remind } : {}),
    ...(escalate !== undefined ? { escalateAfterMinutes: escalate } : {}),
  };
}

type TimeoutDeps = Pick<BoardContext, 'emit' | 'getMeta' | 'setMeta' | 'sql' | 'stages'>;

/** The board's default timeout, for stages without their own, or null. */
export function boardDecisionTimeout(deps: Pick<BoardContext, 'getMeta'>): DecisionTimeout | null {
  const raw = deps.getMeta('decisionTimeout');
  if (!raw) return null;
  const parsed: unknown = JSON.parse(raw);
  return parsed !== null && typeof parsed === 'object' && timeoutError(parsed, 'timeout') === null ? cleanTimeout(parsed) : null;
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
 * return them as a body's `deadline` field (empty when no timeout applies). A wait
 * already recorded under the same kind and id keeps its first deadlines (a re-push is not a new
 * wait); a new gate, question or wait id is a new row, and starts again. No timeout, no row.
 */
export function startDecisionWait(
  deps: Pick<BoardContext, 'getMeta' | 'sql' | 'stages'>,
  wait: { kind: DecisionKind; decisionId: string; cardId: string; stageKey: string; since: string },
): { deadline?: DecisionDeadline } {
  const timeout = effectiveTimeout(deps, wait.stageKey);
  if (!timeout) return {};
  const remindAt = plusMinutes(wait.since, timeout.remindAfterMinutes);
  const escalateAt = plusMinutes(wait.since, timeout.escalateAfterMinutes);
  if (remindAt === null && escalateAt === null) return {};
  deps.sql.exec(
    `INSERT OR IGNORE INTO decision_waits (kind, decision_id, card_id, stage_key, waiting_since, remind_at, escalate_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    wait.kind,
    wait.decisionId,
    wait.cardId,
    wait.stageKey,
    wait.since,
    remindAt,
    escalateAt,
  );
  return deadlineField(deps, wait.kind, wait.decisionId);
}

/** A waiting decision's deadlines, as a body's `deadline` field: absent when it has none. */
export function deadlineField(deps: Pick<BoardContext, 'sql'>, kind: DecisionKind, decisionId: string): { deadline?: DecisionDeadline } {
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
  /** The gate id, the question's elicitation id, the delivery's gate id, or the card's wait id. */
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
  // An attention wait: the card's current wait, as `currentWaitId` in attention.ts reads it (not
  // imported: that module records waits through this one).
  return card.state === 'input-required' && typeof card.needs_human_json === 'string' && card.needs_human_id === decisionId;
}

const KIND_WORDS: Record<DecisionKind, string> = {
  gate: 'A review',
  question: "An agent's question",
  delivery: 'A manual delivery',
  attention: 'A waiting card',
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
  return v === 'gate' || v === 'question' || v === 'delivery' || v === 'attention';
}

/**
 * The sweep's job: every open wait whose remind or escalate deadline has passed, acted on once.
 *
 * - **remind**: the card's owner — who the in-app notice for the decision went to — is told again,
 *   and `decision.reminded` is pushed to the subscribers of decision events, which re-surface the
 *   decision where they put it.
 * - **escalate**: `decision.escalated` is pushed; the carrier escalates to the workspace's owners
 *   and admins (charter decision 3). The owner is told in-app too.
 *
 * Each deadline is claimed (`reminded_at` / `escalated_at`) in the same write that queues its push,
 * so a crash between cannot repeat it and two sweeps cannot both send it. Nothing is decided.
 */
export function sweepDecisionTimeouts(deps: DecisionTimeoutDeps, nowIso: string): { reminded: number; escalated: number } {
  const result = { reminded: 0, escalated: 0 };
  const due = deps.sql
    .exec(
      `SELECT * FROM decision_waits
        WHERE closed_at IS NULL
          AND ((remind_at IS NOT NULL AND reminded_at IS NULL AND remind_at <= ?)
            OR (escalate_at IS NOT NULL AND escalated_at IS NULL AND escalate_at <= ?))
        ORDER BY waiting_since ASC`,
      nowIso,
      nowIso,
    )
    .toArray();
  for (const r of due) {
    const { kind, decision_id: decisionId, card_id: cardId, stage_key: stageKey, waiting_since: since } = r;
    if (!isKind(kind) || typeof decisionId !== 'string' || typeof cardId !== 'string' || typeof stageKey !== 'string' || typeof since !== 'string') continue;
    const wait = { kind, decisionId, cardId, stageKey, since };
    // Each wait on its own: one that cannot be acted on must not silence the rest.
    try {
      if (!stillWaiting(deps, kind, decisionId, cardId)) {
        deps.sql.exec(`UPDATE decision_waits SET closed_at = ? WHERE kind = ? AND decision_id = ?`, nowIso, kind, decisionId);
        continue;
      }
      const card = deps.getCard(cardId);
      const title = card?.title ?? cardId;
      // The claim below is what makes it once: it writes only while `reminded_at` is still unset.
      if (typeof r.remind_at === 'string' && r.remind_at <= nowIso) {
        const body = noticeBody(deps, wait, 'decision.reminded', nowIso);
        const claimed = deps.sql.exec(`UPDATE decision_waits SET reminded_at = ? WHERE kind = ? AND decision_id = ? AND reminded_at IS NULL`, nowIso, kind, decisionId);
        if (claimed.rowsWritten > 0) {
          if (body) queueSubscribedPush(deps, body);
          deps.notify('decision-reminder', cardId, `Reminder: ${KIND_WORDS[kind].toLowerCase()} on "${title}" is still waiting on you.`);
          deps.emit('decision.reminded', { kind, decisionId, cardId });
          result.reminded += 1;
        }
      }
      if (typeof r.escalate_at === 'string' && r.escalate_at <= nowIso) {
        const body = noticeBody(deps, wait, 'decision.escalated', nowIso);
        const claimed = deps.sql.exec(`UPDATE decision_waits SET escalated_at = ? WHERE kind = ? AND decision_id = ? AND escalated_at IS NULL`, nowIso, kind, decisionId);
        if (claimed.rowsWritten > 0) {
          if (body) queueSubscribedPush(deps, body);
          deps.notify('decision-escalated', cardId, `${KIND_WORDS[kind]} on "${title}" went unanswered and was escalated to the workspace's owners and admins.`);
          deps.emit('decision.escalated', { kind, decisionId, cardId });
          result.escalated += 1;
        }
      }
    } catch (err) {
      deps.emit('decision_timeout.failed', { kind, decisionId, reason: String(err) });
    }
  }
  return result;
}
