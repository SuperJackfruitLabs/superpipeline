import type { BoardContext } from './context';
import { newId } from '../ids';
import type { CardView, Result, Row, StaleCardView, StaleSettings } from './model';
import { handoffSummary } from './rules';

/**
 * The board sweep: overdue cards, due schedules, and cards that have gone stale.
 */

/** What the sweep needs from the rest of the board. */
export type StaleDeps = Pick<
  BoardContext,
  | 'backfillArchivedReviews'
  | 'backfillDueDates'
  | 'backfillLabelNames'
  | 'backfillTerminalStageCards'
  | 'ctx'
  | 'emit'
  | 'fireDueSchedules'
  | 'getMeta'
  | 'isAgentClaimable'
  | 'notify'
  | 'now'
  | 'rowToCard'
  | 'setNeedsHuman'
  | 'setMeta'
  | 'sql'
  | 'stages'
>;

/** The default threshold, in hours, past which a waiting card counts as stale. */
export const STALE_DEFAULT_HOURS = 24;

/** The digest tells an owner about the same card at most once in this long. */
const STALE_DIGEST_REPEAT_MS = 24 * 3600_000;

/**
 * The per-board cron arm, called from the Worker's `scheduled()` every five minutes.
 *
 * It is here rather than on the DO alarm deliberately: a Durable Object has exactly one alarm and
 * this one already serves two jobs (lease reclaim and push drain — see `scheduleReclaim`). The
 * Worker cron already iterates every board, so this costs no new infrastructure.
 *
 * Three jobs share this sweep now: the once-per-board backfill above, the overdue notification
 * query below, and `fireDueSchedules`. Each is isolated from the other two — a failure in one
 * must not silently disable the others, which is exactly the failure mode Phase 1's whole-branch
 * review found here (a failing backfill had been taking the overdue sweep down with it, silently
 * and forever). `schedulesFired` reports 0, honestly, when firing itself failed.
 */
export async function sweepBoard(deps: StaleDeps, nowIso: string): Promise<{ overdueNotified: number; schedulesFired: number; staleNotified: number }> {
  // The backfill is a migration, not a sweep job. Guarded by a meta flag because its query
  // (`WHERE due_at IS NULL`) matches every card that never had a due date — i.e. most of them,
  // forever — so running it on each five-minute tick would be a full table scan for nothing.
  // A board whose backfill can never succeed (e.g. a missing tenant row `backfillLabelNames`
  // needs) must not lose its overdue sweep forever — that would silently kill notifications AND
  // re-scan the whole card table every five minutes. So the backfill's own failure is caught
  // here and deferred past the overdue query below, rather than aborting the whole sweep before
  // it runs. The flag stays unset on failure — a failure still retries the whole pass next
  // sweep, which is deliberate and tested (`backfillLabelNames` above) — but the deferred error
  // is re-thrown at the end so a caller still sees the sweep failed.
  /**
   * Cards stranded in a terminal stage nobody can act on, resolved once per board.
   *
   * Its OWN flag, not `dueBackfillDone`'s: that flag is already set on every existing board, so
   * sharing it would mean this migration never ran anywhere it is needed — which is every board
   * made from a shipped template. Guarded for the same reason the other is, and in its own
   * try/catch for the reason this sweep's comments give three times over: one job's failure must
   * not abort the two after it.
   */
  let terminalBackfillError: unknown = null;
  if (!deps.getMeta('terminalBackfillDone')) {
    try {
      const { completed } = await deps.backfillTerminalStageCards();
      deps.setMeta('terminalBackfillDone', '1');
      if (completed > 0) deps.emit('cards.terminal_backfilled', { completed });
    } catch (err) {
      terminalBackfillError = err;
    }
  }

  /**
   * ONE-SHOT, CHANGES LIVE DATA. Cancels the pending gates and questions of cards that were
   * archived before archiving learned to cancel them (observed 2026-10-10: seven such gates in
   * Needs you). Its own flag, for the reason `terminalBackfillDone` gives. Only an ARCHIVED
   * card's PENDING rows are touched; a live card's gate is never read here.
   */
  let archivedReviewsError: unknown = null;
  if (!deps.getMeta('archivedReviewsBackfillDone')) {
    try {
      const { cancelled } = deps.backfillArchivedReviews();
      deps.setMeta('archivedReviewsBackfillDone', '1');
      if (cancelled > 0) deps.emit('cards.archived_reviews_backfilled', { cancelled });
    } catch (err) {
      archivedReviewsError = err;
    }
  }

  let backfillError: unknown = null;
  if (!deps.getMeta('dueBackfillDone')) {
    try {
      const { migrated } = await deps.backfillDueDates();
      // Same guard, same pass: a card's legacy `spec.labels` is the other half of "two sources of
      // truth for one fact" this flag exists to close. If either backfill throws, the flag below
      // is never set — a failure retries the whole pass next sweep rather than skipping either
      // migration forever. Both backfills are individually idempotent, so a retried
      // `backfillDueDates` after a `backfillLabelNames` failure costs nothing extra.
      const { migrated: labelsMigrated } = await deps.backfillLabelNames();
      deps.setMeta('dueBackfillDone', '1');
      if (migrated > 0) deps.emit('cards.due_backfilled', { migrated });
      if (labelsMigrated > 0) deps.emit('cards.labels_backfilled', { migrated: labelsMigrated });
    } catch (err) {
      backfillError = err;
    }
  }

  // Its own try/catch too, for the same reason the backfill and `fireDueSchedules` below each
  // have one: three jobs share this sweep, and the comment above claims all three are isolated
  // — a claim a whole-branch review found false for this block specifically. Before this, a
  // throw here (e.g. from `notify`) aborted the sweep before `fireDueSchedules` ever ran,
  // reintroducing Phase 1's failure shape one slot lower. `overdueNotified` is reported as
  // however many were notified before a failure, which is honest — that many were.
  let overdueNotified = 0;
  try {
    const today = nowIso.slice(0, 10); // the column is a date, so compare dates
    const rows = deps.sql
      .exec(
        `SELECT id, title, due_at FROM cards
          WHERE due_at IS NOT NULL AND due_at < ?
            AND archived_at IS NULL
            AND overdue_notified_at IS NULL
            AND state NOT IN ('completed', 'canceled', 'rejected', 'failed')`,
        today,
      )
      .toArray();

    for (const row of rows) {
      deps.notify('overdue', row.id as string, `"${row.title as string}" was due ${row.due_at as string}`);
      deps.sql.exec(`UPDATE cards SET overdue_notified_at = ? WHERE id = ?`, nowIso, row.id);
      overdueNotified += 1;
    }
  } catch (err) {
    deps.emit('overdue.sweep_failed', { reason: String(err) });
  }

  // A manual delivery reminder is separate from the stale digest: the person chose an exact
  // instant, so the board must notify once at that instant even when stale-card notices are off.
  try {
    const reminders = deps.sql
      .exec(
        `SELECT id, card_id, approval_subject_id, decided_by FROM gates
          WHERE status = 'resolved' AND decision = 'approve_manual'
            AND live_post_url IS NULL AND live_post_remind_at IS NOT NULL
            AND live_post_remind_at <= ? AND live_post_reminder_notified_at IS NULL`,
        nowIso,
      )
      .toArray();
    // Each reminder is claimed and audited in one transaction before anyone is told, so a failure
    // after the claim costs at most this one notice instead of repeating it every sweep. And each
    // has its own try: one gate that cannot be reminded must not silence the others on the board.
    for (const reminder of reminders) {
      try {
        const detail = 'record the live post URL or switch to automatic without a fresh approval';
        if (typeof reminder.card_id !== 'string') throw new Error('manual delivery reminder has no card id');
        const cardId = reminder.card_id;
        const claimed = deps.ctx.storage.transactionSync(() => {
          const marked = deps.sql.exec(
            `UPDATE gates SET live_post_reminder_notified_at = ? WHERE id = ? AND live_post_reminder_notified_at IS NULL`,
            nowIso,
            reminder.id,
          );
          if (marked.rowsWritten === 0) return false;
          deps.sql.exec(
            `INSERT INTO approval_delivery_events
               (id, gate_id, subject_id, event, from_mode, to_mode, actor, live_url, created_at)
             VALUES (?, ?, ?, 'reminder_sent', 'manual', 'manual', ?, NULL, ?)`,
            newId('ade'),
            reminder.id,
            reminder.approval_subject_id,
            typeof reminder.decided_by === 'string' ? reminder.decided_by : 'system',
            nowIso,
          );
          return true;
        });
        if (!claimed) continue;
        deps.notify('approval-delivery-reminder', cardId, `Manual delivery is waiting: ${detail}.`);
        deps.setNeedsHuman(cardId, { reason: 'review', detail });
      } catch (err) {
        deps.emit('approval_delivery_reminder.sweep_failed', { gateId: reminder.id, reason: String(err) });
      }
    }
  } catch (err) {
    deps.emit('approval_delivery_reminder.sweep_failed', { reason: String(err) });
  }

  // Its own try/catch, for the reason the backfill above has one: three jobs share this sweep, and
  // a failure in any of them must not silently disable the other two. `schedulesFired` is still
  // reported as 0 when firing failed, which is honest — nothing fired.
  let schedulesFired = 0;
  try {
    schedulesFired = (await deps.fireDueSchedules(nowIso)).fired.length;
  } catch (err) {
    deps.emit('schedules.sweep_failed', { reason: String(err) });
  }

  // The stale digest, isolated like the jobs above it: its failure must cost none of them.
  let staleNotified = 0;
  try {
    staleNotified = sendStaleDigest(deps, nowIso);
  } catch (err) {
    deps.emit('stale.sweep_failed', { reason: String(err) });
  }

  // The overdue sweep and schedule firing above ran regardless of the backfill's outcome. Now
  // that they have, surface the deferred failure so a caller (the cron loop) still learns the
  // sweep was not clean.
  if (backfillError) throw backfillError;
  // Reported after the sweep's own work, same as `backfillError` above: a migration that failed
  // must be visible to the caller, and must not have cost the overdue pass or the schedules.
  if (terminalBackfillError) throw terminalBackfillError;
  if (archivedReviewsError) throw archivedReviewsError;

  return { overdueNotified, schedulesFired, staleNotified };
}

export async function setStaleSettings(deps: StaleDeps, input: { enabled?: boolean; afterHours?: number }): Promise<Result<StaleSettings>> {
  if (!deps.getMeta('boardId')) return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  if (input.enabled !== undefined && typeof input.enabled !== 'boolean') {
    return { ok: false, code: 'INVALID_STALE_SETTINGS', message: '`enabled` must be true or false' };
  }
  if (input.afterHours !== undefined && (typeof input.afterHours !== 'number' || !Number.isFinite(input.afterHours) || input.afterHours < 0)) {
    return { ok: false, code: 'INVALID_STALE_SETTINGS', message: '`afterHours` must be a number of hours, 0 or more' };
  }
  if (input.enabled !== undefined) deps.setMeta('staleEnabled', input.enabled ? '1' : '0');
  if (input.afterHours !== undefined) deps.setMeta('staleAfterHours', String(input.afterHours));
  deps.emit('board.stale_settings', { ...staleSettings(deps) });
  return { ok: true, value: staleSettings(deps) };
}

export function staleSettings(deps: StaleDeps): StaleSettings {
  const hours = Number(deps.getMeta('staleAfterHours'));
  return {
    enabled: deps.getMeta('staleEnabled') !== '0',
    afterHours: deps.getMeta('staleAfterHours') !== null && Number.isFinite(hours) ? hours : STALE_DEFAULT_HOURS,
  };
}

/**
 * Cards waiting past a threshold, oldest first.
 *
 * With no `afterHours` the board's own setting applies, and a board that switched stale cards off
 * lists nothing. An explicit threshold is a person asking directly, and is answered whatever the
 * switch says: the switch silences the board, it does not hide its cards.
 */
export async function staleCards(deps: StaleDeps, input: { nowIso: string; afterHours?: number; attention?: boolean }): Promise<StaleCardView[]> {
  return collectStale(deps, input);
}

/**
 * `attention`: the Needs-you feed rather than the stale list. Every card waiting on a person, at
 * any age — those want an answer now, not tomorrow — plus cards in an ownerless stage once they
 * pass the board's threshold (before it, a card in an intake column is just backlog), and only
 * while the board reports stale cards at all.
 */
function collectStale(deps: StaleDeps, input: { nowIso: string; afterHours?: number; attention?: boolean }): StaleCardView[] {
  const boardId = deps.getMeta('boardId');
  if (!boardId) return [];
  const settings = staleSettings(deps);
  if (input.afterHours === undefined && !input.attention && !settings.enabled) return [];
  const afterHours = input.afterHours ?? settings.afterHours;
  const nowMs = Date.parse(input.nowIso);
  const stages = deps.stages();
  const last = stages[stages.length - 1]?.key;
  // Stages nothing will ever take a submitted card from. The last stage is excluded because
  // arriving there resolves the card (`completesOnArrival`).
  const ownerless = stages.filter((st) => !deps.isAgentClaimable(st) && st.gate !== 'approval' && st.key !== last).map((st) => st.key);
  const placeholders = ownerless.map(() => '?').join(', ');
  const rows = deps.sql
    .exec(
      `SELECT * FROM cards WHERE archived_at IS NULL AND (state = 'input-required'
         ${ownerless.length > 0 ? `OR (state = 'submitted' AND current_stage_key IN (${placeholders}))` : ''})`,
      ...ownerless,
    )
    .toArray();
  const out: StaleCardView[] = [];
  for (const row of rows) {
    const since = ((row.state_since as string | null) ?? (row.updated_at as string | null) ?? (row.created_at as string));
    const ageMs = nowMs - Date.parse(since);
    const waitingOnPerson = (row.state as string) === 'input-required';
    if (!(input.attention && waitingOnPerson)) {
      if (input.attention && !settings.enabled) continue;
      if (!(ageMs >= afterHours * 3600_000)) continue;
    }
    const card = deps.rowToCard(row);
    const stage = stages.find((st) => st.key === card.currentStageKey);
    const why = staleWhy(deps, card, row);
    out.push({
      boardId,
      boardName: deps.getMeta('name') ?? '',
      cardId: card.id,
      title: card.title,
      ownerUserId: card.ownerUserId,
      stageKey: card.currentStageKey,
      stageName: stage?.name ?? card.currentStageKey,
      state: card.state,
      why,
      summary: handoffSummary((row.handoff_json as string | null) ?? null),
      since,
      ageHours: Math.floor((ageMs / 3600_000) * 10) / 10,
      next: staleNext(boardId, card, why),
    });
  }
  return out.sort((a, b) => a.since.localeCompare(b.since));
}

function staleWhy(deps: StaleDeps, card: CardView, row: Row): StaleCardView['why'] {
  if (card.state !== 'input-required') return { kind: 'no-owner' };
  const gate = deps.sql.exec(`SELECT id FROM gates WHERE card_id = ? AND status = 'pending' LIMIT 1`, card.id).toArray()[0];
  const needs = card.needsHuman;
  if (needs) {
    return {
      kind: 'needs-human',
      reason: needs.reason,
      ...(needs.detail !== undefined ? { detail: needs.detail } : {}),
      ...(needs.failureCount !== undefined ? { failureCount: needs.failureCount } : {}),
      ...(needs.elicitationId !== undefined ? { elicitationId: needs.elicitationId } : {}),
      ...(gate ? { gateId: gate.id as string } : {}),
    };
  }
  // The two parks that predate `needsHuman`: a review gate opened on entry, and a deferred advance.
  if (gate) return { kind: 'needs-human', reason: 'review', gateId: gate.id as string };
  if (row.pending_advance_json) return { kind: 'needs-human', reason: 'sub-tasks', detail: 'waiting on its open sub-tasks' };
  return { kind: 'needs-human', reason: 'blocked' };
}

function staleNext(boardId: string, card: CardView, why: StaleCardView['why']): string {
  const resume = `supi resume ${boardId} ${card.id} --comment "what changed"`;
  if (why.kind === 'no-owner') {
    return `nothing claims stage "${card.currentStageKey}" — move it to a stage someone works (supi move ${boardId} ${card.id} <stage>), or give the stage an owner`;
  }
  switch (why.reason) {
    case 'question':
      return "answer the agent's question on the card";
    case 'review':
      return why.gateId
        ? `decide the review: supi approve ${boardId} ${why.gateId}, or supi request-changes ${boardId} ${why.gateId} --comment "…"`
        : 'decide the review on the card';
    case 'sub-tasks':
      return 'finish or remove its open sub-tasks';
    case 'not-authorised':
      return `resume it as someone allowed to dispatch this work: ${resume}`;
    default:
      return `read why it stopped, fix that, then resume it: ${resume}`;
  }
}

/**
 * The daily digest: each stale card's owner is told once, and every push config that subscribed
 * to `cards.stale` gets one delivery listing them. Quiet when there is nothing new to say; a card
 * already told about in the last 24 hours is left out (`stale_notified_at`).
 */
function sendStaleDigest(deps: StaleDeps, nowIso: string): number {
  const nowMs = Date.parse(nowIso);
  const due = collectStale(deps, { nowIso }).filter((c) => {
    const row = deps.sql.exec(`SELECT stale_notified_at FROM cards WHERE id = ?`, c.cardId).toArray()[0];
    const last = (row?.stale_notified_at as string | null | undefined) ?? null;
    return last === null || nowMs - Date.parse(last) >= STALE_DIGEST_REPEAT_MS;
  });
  if (due.length === 0) return 0;
  for (const c of due) {
    const why = c.why.kind === 'no-owner' ? `nothing claims stage "${c.stageKey}"` : c.why.detail ?? c.why.reason;
    deps.notify('stale', c.cardId, `Stuck ${Math.floor(c.ageHours)}h in ${c.stageName}: ${why}. Next: ${c.next}`);
    deps.sql.exec(`UPDATE cards SET stale_notified_at = ? WHERE id = ?`, nowIso, c.cardId);
  }
  const body = JSON.stringify({
    event: 'cards.stale',
    boardId: deps.getMeta('boardId'),
    boardName: deps.getMeta('name') ?? '',
    cards: due,
    ts: nowIso,
  });
  for (const cfg of deps.sql.exec(`SELECT * FROM push_configs`).toArray()) {
    const events = JSON.parse(cfg.events_json as string) as string[];
    if (!events.includes('cards.stale')) continue;
    deps.sql.exec(
      `INSERT INTO push_deliveries (config_id, url, body, status, attempts, created_at) VALUES (?, ?, ?, 'pending', 0, ?)`,
      cfg.id,
      cfg.url,
      body,
      deps.now(),
    );
  }
  deps.emit('cards.stale_digest', { count: due.length, cardIds: due.map((c) => c.cardId) });
  return due.length;
}
