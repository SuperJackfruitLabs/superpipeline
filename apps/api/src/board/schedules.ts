import { newId } from '../ids';
import type { JsonValue } from '../json';
import type { BoardContext } from './context';
import type { Result, Row, ScheduleView } from './model';
import { advanceFireTime, nextFireAt, parseRule } from './recurrence';

/**
 * Recurring cards: schedules, and firing the ones that are due.
 */

/** What schedules needs from the rest of the board. */
export type SchedulesDeps = Pick<
  BoardContext,
  | 'createCardFromTrigger'
  | 'emit'
  | 'getMeta'
  | 'moveCard'
  | 'now'
  | 'sql'
  | 'stages'
  | 'updateCard'
>;

/**
 * Define a recurring card.
 *
 * `createdBy` is required, not optional: a schedule mints cards on its own, with no human in the
 * loop at fire time, and Principle 3 says every card has a human owner. A schedule with no
 * recorded creator cannot satisfy that, so it is refused here rather than accepted and quietly
 * disabled later.
 *
 * The rule is validated through `parseRule` and its own error message is returned verbatim — a
 * rule is typed by a human, and the parser's message is the only one worth showing them. The
 * timezone is validated by construction: an `Intl.DateTimeFormat` either accepts it or throws.
 * Never compare it against a list, or against `resolvedOptions().timeZone` — ICU canonicalises
 * `Asia/Kolkata` to `Asia/Calcutta`, so a string comparison rejects zones that work perfectly
 * (Task 1's spike). The operator's own spelling is what gets stored.
 *
 * `stageKey`, `overlap` and `createdBy` are all refused here too, on the same argument as the
 * rule and the timezone: a human is standing right here, reading the response, which is the
 * only moment any of this is cheap to fix. A `stageKey` naming no stage on this board would
 * otherwise surface months later as cards silently landing in the default lane; an `overlap`
 * outside `'skip' | 'allow'` would otherwise be read by `fireDueSchedules`'s `=== 'skip'` check
 * as *allow* — the permissive direction, and the wrong one to fail open into.
 */
export async function createSchedule(deps: SchedulesDeps, input: {
  title: string;
  rule: string;
  timezone: string;
  overlap: 'skip' | 'allow';
  createdBy: string;
  spec?: JsonValue;
  priority?: number;
  labels?: string[];
  stageKey?: string | null;
  enabled?: boolean;
  /**
   * What the creator was permitted to dispatch, captured at the moment the schedule was
   * declared — the only moment there is a caller present to ask. `fireDueSchedules` passes this
   * straight to `createCardFromTrigger`, whose own `?? this.triggerGrant()` fallback remains for
   * schedules created before this field existed. See the `schedules.queued_grant` column note.
   */
  queuedGrant?: string[] | null;
}): Promise<Result<ScheduleView>> {
  if (!deps.getMeta('boardId')) return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };

  const parsed = parseRule(input.rule);
  if (!parsed.ok) return { ok: false, code: 'INVALID_RULE', message: parsed.error };

  try {
    // oxlint-disable-next-line no-new -- constructed only to throw on a zone the runtime does not know
    new Intl.DateTimeFormat('en-GB', { timeZone: input.timezone });
  } catch {
    return { ok: false, code: 'INVALID_TIMEZONE', message: `"${input.timezone}" is not a time zone this runtime knows` };
  }

  if (input.stageKey && !deps.stages().some((s) => s.key === input.stageKey)) {
    return { ok: false, code: 'UNKNOWN_STAGE', message: `unknown stage: ${input.stageKey}` };
  }

  if (input.overlap !== 'skip' && input.overlap !== 'allow') {
    return { ok: false, code: 'INVALID_SCHEDULE', message: `overlap must be "skip" or "allow", not "${String(input.overlap)}"` };
  }

  if (typeof input.createdBy !== 'string' || input.createdBy.trim() === '') {
    return { ok: false, code: 'INVALID_SCHEDULE', message: 'createdBy is required — a schedule mints cards with no human present at fire time, so it needs a recorded human owner up front' };
  }

  const id = newId('sch');
  const now = deps.now();
  const nextFire = nextFireAt(parsed.rule, input.timezone, now);
  deps.sql.exec(
    `INSERT INTO schedules
      (id, enabled, title, spec_json, priority, labels, stage_key, rule, timezone, overlap,
       next_fire_at, last_fired_at, last_card_id, skip_count, created_by, created_at, queued_grant)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 0, ?, ?, ?)`,
    id,
    input.enabled === false ? 0 : 1,
    input.title,
    JSON.stringify(input.spec ?? {}),
    input.priority ?? 0,
    JSON.stringify(input.labels ?? []),
    input.stageKey ?? null,
    input.rule,
    // Stored exactly as typed — never the resolved spelling.
    input.timezone,
    input.overlap,
    nextFire,
    input.createdBy,
    now,
    input.queuedGrant ? JSON.stringify(input.queuedGrant) : null,
  );
  const view = mustGetSchedule(deps, id);
  deps.emit('schedule.created', { schedule: view });
  return { ok: true, value: view };
}

/**
 * Edit a schedule. Changing `rule` or `timezone` recomputes `next_fire_at` from now — it must
 * not silently keep a fire time computed from the rule or zone being replaced.
 */
export async function updateSchedule(deps: SchedulesDeps, id: string, patch: {
    title?: string;
    rule?: string;
    timezone?: string;
    overlap?: 'skip' | 'allow';
    spec?: JsonValue;
    priority?: number;
    labels?: string[];
    stageKey?: string | null;
    enabled?: boolean;
  }): Promise<Result<ScheduleView>> {
  if (!deps.getMeta('boardId')) return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  const existing = getScheduleRow(deps, id);
  if (!existing) return { ok: false, code: 'SCHEDULE_NOT_FOUND', message: `schedule not found: ${id}` };

  const rule = patch.rule ?? (existing.rule as string);
  const timezone = patch.timezone ?? (existing.timezone as string);
  const ruleOrZoneChanged = patch.rule !== undefined || patch.timezone !== undefined;

  // Re-parsed here (not reused from creation) because either half of the pair may be new: a
  // changed rule needs re-validating, and an unchanged rule needs re-validating too when the zone
  // it is read against changes, since `nextFireAt` recomputes from both together.
  let reparsed: ReturnType<typeof parseRule> | null = null;
  if (ruleOrZoneChanged) {
    reparsed = parseRule(rule);
    if (!reparsed.ok) return { ok: false, code: 'INVALID_RULE', message: reparsed.error };
    if (patch.timezone !== undefined) {
      try {
        // oxlint-disable-next-line no-new -- constructed only to throw on a zone the runtime does not know
        new Intl.DateTimeFormat('en-GB', { timeZone: timezone });
      } catch {
        return { ok: false, code: 'INVALID_TIMEZONE', message: `"${timezone}" is not a time zone this runtime knows` };
      }
    }
  }

  if (patch.stageKey && !deps.stages().some((s) => s.key === patch.stageKey)) {
    return { ok: false, code: 'UNKNOWN_STAGE', message: `unknown stage: ${patch.stageKey}` };
  }

  if (patch.overlap !== undefined && patch.overlap !== 'skip' && patch.overlap !== 'allow') {
    return { ok: false, code: 'INVALID_SCHEDULE', message: `overlap must be "skip" or "allow", not "${String(patch.overlap)}"` };
  }

  const sets: string[] = [];
  const vals: unknown[] = [];
  if (patch.title !== undefined) { sets.push('title = ?'); vals.push(patch.title); }
  if (patch.spec !== undefined) { sets.push('spec_json = ?'); vals.push(JSON.stringify(patch.spec)); }
  if (patch.priority !== undefined) { sets.push('priority = ?'); vals.push(patch.priority); }
  if (patch.labels !== undefined) { sets.push('labels = ?'); vals.push(JSON.stringify(patch.labels)); }
  if (patch.stageKey !== undefined) { sets.push('stage_key = ?'); vals.push(patch.stageKey); }
  if (patch.overlap !== undefined) { sets.push('overlap = ?'); vals.push(patch.overlap); }
  if (patch.enabled !== undefined) { sets.push('enabled = ?'); vals.push(patch.enabled ? 1 : 0); }
  if (patch.rule !== undefined) { sets.push('rule = ?'); vals.push(patch.rule); }
  if (patch.timezone !== undefined) { sets.push('timezone = ?'); vals.push(patch.timezone); }
  // Must not silently keep a fire time computed from the rule or zone being replaced.
  if (reparsed && reparsed.ok) {
    sets.push('next_fire_at = ?');
    vals.push(nextFireAt(reparsed.rule, timezone, deps.now()));
  }

  if (sets.length > 0) {
    deps.sql.exec(`UPDATE schedules SET ${sets.join(', ')} WHERE id = ?`, ...vals, id);
  }
  const view = mustGetSchedule(deps, id);
  deps.emit('schedule.updated', { schedule: view });
  return { ok: true, value: view };
}

export async function deleteSchedule(deps: SchedulesDeps, id: string): Promise<Result<{ id: string }>> {
  if (!deps.getMeta('boardId')) return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  if (!getScheduleRow(deps, id)) return { ok: false, code: 'SCHEDULE_NOT_FOUND', message: `schedule not found: ${id}` };
  deps.sql.exec(`DELETE FROM schedules WHERE id = ?`, id);
  deps.emit('schedule.deleted', { scheduleId: id });
  return { ok: true, value: { id } };
}

export async function listSchedules(deps: SchedulesDeps): Promise<ScheduleView[]> {
  return deps.sql
    .exec(`SELECT * FROM schedules ORDER BY created_at ASC`)
    .toArray()
    .map((r) => rowToSchedule(r));
}

/**
 * Create cards for every schedule whose time has come.
 *
 * Called from `sweepBoard`, which the Worker cron calls every five minutes — so a schedule may
 * fire up to five minutes late, and the UI says so next to the field.
 *
 * Idempotent by construction: `next_fire_at` advances in the same call that creates the card, so
 * a double tick finds nothing due. If the create throws, `next_fire_at` is left alone and the next
 * tick retries — at-least-once, which for a maintenance card is the right way round.
 *
 * Missed occurrences collapse to one. A board whose cron was down for a week produces one
 * "sweep the logs" card when it comes back, not seven. That is the right shape for maintenance
 * work, and it is exactly what a later reader "fixes" into a card storm — leave it alone.
 *
 * How that is achieved differs by rule kind, and the difference matters:
 *   - **clock rules** (daily/weekly/monthly) recompute the next wall-clock occurrence after now,
 *     so they are self-correcting;
 *   - **interval rules** advance by whole intervals from the PREVIOUS `next_fire_at` until past
 *     now (`advanceFireTime`), which collapses the backlog in one step AND keeps the phase.
 *
 * Advancing an interval rule from `nowIso` instead — the sweep instant, always a little after the
 * scheduled one — looks equivalent and is not: each cycle absorbs that lateness permanently, so
 * `every 5 minutes` becomes every 5 or 10, drifting without bound. That was a real defect here,
 * found by review rather than by a test, which is why this paragraph is longer than it looks
 * like it needs to be.
 */
export async function fireDueSchedules(deps: SchedulesDeps, nowIso: string): Promise<{ fired: string[]; skipped: string[] }> {
  const due = deps.sql
    .exec(`SELECT * FROM schedules WHERE enabled = 1 AND next_fire_at <= ? ORDER BY next_fire_at ASC`, nowIso)
    .toArray();

  const fired: string[] = [];
  const skipped: string[] = [];

  for (const row of due) {
    const id = row.id as string;
    // Principle 3: every card has a human owner. A schedule with no recorded creator cannot
    // produce one, so it is disabled rather than allowed to mint ownerless cards. `createdBy` is
    // required at creation, so this can only be a row predating that — it is not a normal state.
    if (!row.created_by) {
      deps.sql.exec(`UPDATE schedules SET enabled = 0 WHERE id = ?`, id);
      deps.emit('schedule.disabled', { scheduleId: id, reason: 'no creator recorded; cannot own a card' });
      continue;
    }
    const parsed = parseRule(row.rule as string);
    if (!parsed.ok) {
      // A rule that no longer parses cannot fire and must not be retried every five minutes
      // forever. Disable it and say so, loudly, on the event log.
      deps.sql.exec(`UPDATE schedules SET enabled = 0 WHERE id = ?`, id);
      deps.emit('schedule.disabled', { scheduleId: id, reason: parsed.error });
      continue;
    }

    if ((row.overlap as string) === 'skip' && scheduleInstanceOpen(deps, row.last_card_id as string | null)) {
      deps.sql.exec(
        `UPDATE schedules SET skip_count = skip_count + 1, next_fire_at = ? WHERE id = ?`,
        nextFireAt(parsed.rule, row.timezone as string, nowIso),
        id,
      );
      // Visible, not silent. A schedule quietly skipping for a month is the failure this guards.
      deps.emit('schedule.skipped', { scheduleId: id, openCardId: row.last_card_id, at: nowIso });
      skipped.push(id);
      continue;
    }

    const created = await deps.createCardFromTrigger({
      title: row.title as string,
      ownerUserId: row.created_by as string,
      // The grant captured when the schedule was created (`createSchedule`'s `queuedGrant`).
      // `createCardFromTrigger` falls back to `triggerGrant()` when this is `undefined` OR
      // `null` (`??` treats both as nullish) — that fallback is what a board's GitHub-webhook
      // grant covers, and is exactly the wrong one to lean on here: it has exactly one writer
      // (`PUT /v1/boards/:id/github`), so a board whose operator never saved GitHub settings has
      // `null` there, and under enforcement the card would park in `input-required` on first
      // claim, forever — `scheduleInstanceOpen` then reads the instance as open forever too,
      // silencing the schedule behind its own default `overlap: 'skip'`. A row predating this
      // column has `queued_grant IS NULL`, which is exactly the same fallback behaviour a
      // schedule with no queuedGrant supplied at creation gets — nothing regresses for it.
      queuedGrant: row.queued_grant ? (JSON.parse(row.queued_grant as string) as string[]) : undefined,
      spec: { ...(JSON.parse(row.spec_json as string) as Record<string, unknown>), scheduleId: id },
    });
    if (!created.ok) {
      // next_fire_at is deliberately NOT advanced: the next tick tries again.
      deps.emit('schedule.failed', { scheduleId: id, reason: created.code });
      continue;
    }

    const cardId = created.value.card.id;
    // `moveCard` returns a Result and does NOT throw for the realistic failures — `UNKNOWN_STAGE`
    // (a stage renamed or removed by `setStages` after this schedule was written) and
    // `WIP_LIMIT`. Discarding it means the card lands in the default lane, `schedule.fired` is
    // emitted as a success, and nothing anywhere records that the routing was dropped. That is
    // the same silent failure this task exists to prevent, wearing a different hat.
    if (row.stage_key) {
      const moved = await deps.moveCard(cardId, row.stage_key as string, row.created_by as string);
      if (!moved.ok) deps.emit('schedule.stage_failed', { scheduleId: id, cardId, stageKey: row.stage_key, reason: moved.code });
    }
    if (Number(row.priority) !== 0 || (row.labels as string) !== '[]') {
      // Checked for the same reason `moveCard`'s Result is checked just above: an unchecked
      // Result reads as a fix half-applied. In practice `updateCard` can only fail here with
      // `NOT_INITIALIZED` (the board this schedule just fired on) or `CARD_NOT_FOUND` (the card
      // `createCardFromTrigger` just created, moments ago) — neither realistic on this path — but
      // "cannot fail today" is not the same guarantee as "checked", and the next caller to touch
      // this block should not have to re-derive that.
      const updated = await deps.updateCard(cardId, {
        priority: Number(row.priority),
        labels: JSON.parse(row.labels as string) as string[],
      });
      if (!updated.ok) deps.emit('schedule.card_update_failed', { scheduleId: id, cardId, reason: updated.code });
    }

    // `advanceFireTime`, not `nextFireAt(parsed.rule, row.timezone, nowIso)`: `nowIso` is the
    // sweep instant, always a little after the instant that was actually due, and pure addition
    // from it bakes that lateness into the phase forever — `every 5 minutes` drifts into "every
    // 5 or 10, unpredictably". Advancing by whole intervals from the PREVIOUS `next_fire_at`
    // keeps the phase and still collapses a missed week into one card. Clock rules are immune
    // and `advanceFireTime` delegates to the same wall-clock computation for them unchanged.
    deps.sql.exec(
      `UPDATE schedules SET next_fire_at = ?, last_fired_at = ?, last_card_id = ? WHERE id = ?`,
      advanceFireTime(parsed.rule, row.timezone as string, row.next_fire_at as string, nowIso),
      nowIso,
      cardId,
      id,
    );
    deps.emit('schedule.fired', { scheduleId: id, cardId, at: nowIso });
    fired.push(id);
  }

  return { fired, skipped };
}

/**
 * Is the previous instance of a schedule still open? Absent or resolved both mean "go ahead".
 *
 * All four terminal states count as closed here — deliberately different from the
 * blocker-resolution rule a later phase introduces, where only `completed` and `canceled` count
 * as resolved, because a blocker that failed must keep its dependent blocked. A schedule's own
 * previous instance is not a blocker: if it `failed`, the schedule must not wedge forever, so
 * this helper is NOT shared with that later rule and does not use `isTerminal()`.
 */
function scheduleInstanceOpen(deps: SchedulesDeps, lastCardId: string | null): boolean {
  if (!lastCardId) return false;
  const row = deps.sql.exec(`SELECT state, archived_at FROM cards WHERE id = ?`, lastCardId).toArray()[0];
  if (!row) return false; // the card was deleted; nothing to wait for
  if (row.archived_at) return false;
  const state = row.state as string;
  return state !== 'completed' && state !== 'canceled' && state !== 'rejected' && state !== 'failed';
}

function getScheduleRow(deps: SchedulesDeps, id: string): Row | null {
  return deps.sql.exec(`SELECT * FROM schedules WHERE id = ?`, id).toArray()[0] ?? null;
}

function rowToSchedule(row: Row): ScheduleView {
  return {
    id: row.id as string,
    enabled: Number(row.enabled) === 1,
    title: row.title as string,
    spec: JSON.parse(row.spec_json as string) as JsonValue,
    priority: Number(row.priority),
    labels: JSON.parse(row.labels as string) as string[],
    stageKey: (row.stage_key as string | null) ?? null,
    rule: row.rule as string,
    timezone: row.timezone as string,
    overlap: row.overlap as 'skip' | 'allow',
    nextFireAt: row.next_fire_at as string,
    lastFiredAt: (row.last_fired_at as string | null) ?? null,
    lastCardId: (row.last_card_id as string | null) ?? null,
    skipCount: Number(row.skip_count),
    createdBy: (row.created_by as string | null) ?? null,
  };
}

function mustGetSchedule(deps: SchedulesDeps, id: string): ScheduleView {
  const row = getScheduleRow(deps, id);
  if (!row) throw new Error(`invariant violation: schedule ${id} missing immediately after write`);
  return rowToSchedule(row);
}
