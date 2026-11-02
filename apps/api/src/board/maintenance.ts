import type { TaskState } from '@superpipeline/contract';
import { resolveLabelNames } from '../db/labels';
import type { BoardContext } from './context';
import type { FixtureBoard } from './fixture-types';

/**
 * Board upkeep that is not a user verb: fixture import, the once-per-board backfills, and the
 * test-only state setters.
 */

/** What maintenance needs from the rest of the board. */
export type MaintenanceDeps = Pick<
  BoardContext,
  | 'completesOnArrival'
  | 'ctx'
  | 'emit'
  | 'endReviewsOfArchivedCard'
  | 'env'
  | 'getCardHandoffJson'
  | 'getMeta'
  | 'invalidateApprovalSubject'
  | 'now'
  | 'openChildCount'
  | 'resolveCard'
  | 'scheduleReclaim'
  | 'sql'
  | 'stages'
>;

class FixtureColumnError extends Error {}

/**
 * Replace every row of this board with a fixture (fixtures-and-harness.md §A.9.3). Dev only and
 * gated here as well as at the route. Writes rows exactly as given — historical timestamps
 * included — emits nothing and schedules no alarm, so the stale sweep never runs on a fixture.
 */
export async function importFixture(deps: MaintenanceDeps, board: FixtureBoard): Promise<
  { ok: true; cards: number } | { ok: false; code: 'FIXTURE_IMPORT_DISABLED' | 'UNKNOWN_COLUMN'; detail?: string }
> {
  if (deps.env.FIXTURE_IMPORT !== 'true') return { ok: false, code: 'FIXTURE_IMPORT_DISABLED' };
  const TABLES = ['meta', 'cards', 'runs', 'activities', 'events', 'usage_records', 'notifications', 'gates', 'approval_subjects',
    'approval_delivery_events', 'strict_decision_requests', 'elicitations', 'card_references', 'card_links', 'card_comments', 'schedules', 'profiles',
    'push_configs', 'push_deliveries', 'run_reports', 'webhook_deliveries'] as const;
  const columns = (t: string) => new Set((deps.sql.exec(`PRAGMA table_info(${t})`).toArray() as Array<{ name: string }>).map((r) => r.name));
  const insert = (table: string, rows: Array<Record<string, unknown>>) => {
    const known = columns(table);
    for (const row of rows) {
      const keys = Object.keys(row);
      const bad = keys.find((k) => !known.has(k));
      if (bad) throw new FixtureColumnError(`${table}.${bad}`);
      deps.sql.exec(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`, ...keys.map((k) => row[k] as SqlStorageValue));
    }
  };
  try {
    deps.ctx.storage.transactionSync(() => {
      for (const t of TABLES) deps.sql.exec(`DELETE FROM ${t}`);
      insert('meta', Object.entries(board.meta).map(([k, v]) => ({ k, v })));
      insert('cards', board.cards);
      insert('runs', board.runs);
      insert('activities', board.activities);
      insert('events', [...board.events].toSorted((a, b) => a.ts.localeCompare(b.ts)).map((e) => ({ type: e.type, payload_json: JSON.stringify(e.payload), ts: e.ts })));
      insert('notifications', [...board.notifications].toSorted((a, b) => a.created_at.localeCompare(b.created_at)));
      insert('gates', board.gates);
      insert('approval_subjects', board.approvalSubjects.map(({ canonical_bytes_b64, ...rest }) => ({
        ...rest, canonical_bytes: Uint8Array.from(atob(canonical_bytes_b64), (c) => c.charCodeAt(0)),
      })));
      insert('elicitations', board.elicitations);
      insert('card_references', board.references);
      insert('card_links', board.links);
      insert('card_comments', board.comments);
    });
  } catch (e) {
    if (e instanceof FixtureColumnError) return { ok: false, code: 'UNKNOWN_COLUMN', detail: e.message };
    throw e;
  }
  await deps.ctx.storage.deleteAlarm();
  return { ok: true, cards: board.cards.length };
}

/**
 * Move `spec.due` onto the `due_at` column, once per board.
 *
 * Idempotent, and it *removes* the key from the spec rather than leaving a copy: two sources of
 * truth for one date is the condition this column exists to end. See the spec's §3.3 note — this
 * also takes the due date out of the agent prompt, which is intended, not a regression.
 */
export async function backfillDueDates(deps: MaintenanceDeps): Promise<{ migrated: number }> {
  const rows = deps.sql.exec(`SELECT id, spec_json FROM cards WHERE due_at IS NULL`).toArray();
  let migrated = 0;
  for (const row of rows) {
    let spec: Record<string, unknown>;
    try {
      spec = JSON.parse(row.spec_json as string) as Record<string, unknown>;
    } catch {
      continue; // an unparseable spec is not this migration's problem to fix
    }
    const due = spec.due;
    if (typeof due !== 'string' || due.trim() === '') continue;
    delete spec.due;
    deps.sql.exec(
      `UPDATE cards SET due_at = ?, spec_json = ?, updated_at = ? WHERE id = ?`,
      due.trim(),
      JSON.stringify(spec),
      deps.now(),
      row.id,
    );
    migrated += 1;
  }
  return { migrated };
}

/**
 * Move `spec.labels` onto `labels` (catalogue ids), once per board.
 *
 * Shares `sweepBoard`'s `dueBackfillDone` guard rather than a flag of its own — the reason this
 * exists is the same reason `backfillDueDates` does, so it runs at the same time, in the same
 * once-per-board pass. Names resolve through `resolveLabelNames` (`src/db/labels.ts`), which
 * reaches D1's tenant-scoped label catalogue rather than this DO's own SQLite storage — a name
 * not yet declared is created with `origin: 'inferred'`, exactly as a person typing it into
 * `CardDrawer.svelte` today would cause.
 *
 * Idempotent, and it *removes* the key from the spec rather than leaving a copy — two sources of
 * truth for one fact is the condition `card.labels` exists to end, same as `due_at`.
 */
export async function backfillLabelNames(deps: MaintenanceDeps): Promise<{ migrated: number }> {
  const tenantId = deps.getMeta('tenantId');
  if (!tenantId) return { migrated: 0 };
  const rows = deps.sql.exec(`SELECT id, spec_json, labels FROM cards`).toArray();
  let migrated = 0;
  for (const row of rows) {
    let spec: Record<string, unknown>;
    try {
      spec = JSON.parse(row.spec_json as string) as Record<string, unknown>;
    } catch {
      continue; // an unparseable spec is not this migration's problem to fix
    }
    const raw = spec.labels;
    if (!Array.isArray(raw) || raw.length === 0) continue;
    const names = raw.filter((n): n is string => typeof n === 'string' && n.trim() !== '');
    delete spec.labels;
    if (names.length === 0) {
      // Nothing resolvable — an array of blanks or non-strings — but the stale key is cleared
      // regardless, same as a legacy `due` that fails its own shape check is still removed.
      deps.sql.exec(`UPDATE cards SET spec_json = ?, updated_at = ? WHERE id = ?`, JSON.stringify(spec), deps.now(), row.id);
      continue;
    }
    const resolvedIds = await resolveLabelNames(deps.env.DB, tenantId, names, null);
    const existing = row.labels ? (JSON.parse(row.labels as string) as string[]) : [];
    const merged = [...new Set([...existing, ...resolvedIds])];
    deps.sql.exec(
      `UPDATE cards SET labels = ?, spec_json = ?, updated_at = ? WHERE id = ?`,
      JSON.stringify(merged),
      JSON.stringify(spec),
      deps.now(),
      row.id,
    );
    migrated += 1;
  }
  return { migrated };
}

/** Test-only: put a due date back in the spec and clear the column, to rehearse the migration. */
export async function testResetDueToSpec(deps: MaintenanceDeps, cardId: string): Promise<void> {
  const row = deps.sql.exec(`SELECT spec_json, due_at FROM cards WHERE id = ?`, cardId).one();
  const spec = JSON.parse(row.spec_json as string) as Record<string, unknown>;
  if (row.due_at) spec.due = row.due_at;
  deps.sql.exec(`UPDATE cards SET due_at = NULL, spec_json = ? WHERE id = ?`, JSON.stringify(spec), cardId);
}

/**
 * Complete every card already stranded in a terminal stage nobody can act on.
 *
 * `completesOnArrival` fixes arrivals from now on and can do nothing for a card that arrived
 * before it existed. There were seven such cards across two boards when this was written, and
 * EIGHT of ten boards were shaped to keep producing them — every board made from a shipped
 * template is, since all four end in a gateless human stage.
 *
 * Keyed on the STAGE, not on the state alone: a `submitted` card in a working stage is a normal
 * queued card and must not be touched. Cards with open children are skipped for the same reason
 * `advanceCard` defers them — "a parent with half-finished children would read as done".
 *
 * Idempotent: the second pass finds nothing, because the first resolved them.
 */
export async function backfillTerminalStageCards(deps: MaintenanceDeps): Promise<{ completed: number }> {
  const stages = deps.stages();
  const last = stages[stages.length - 1];
  if (!last || !deps.completesOnArrival(last)) return { completed: 0 };

  const rows = deps.sql
    .exec(
      `SELECT id FROM cards WHERE current_stage_key = ? AND state NOT IN ('completed', 'canceled', 'rejected', 'failed')`,
      last.key,
    )
    .toArray();

  let completed = 0;
  for (const row of rows) {
    const cardId = row.id as string;
    if (deps.openChildCount(cardId) > 0) continue;
    deps.resolveCard(cardId, deps.getCardHandoffJson(cardId));
    completed++;
  }
  if (completed > 0) {
    deps.emit('cards.terminal_backfilled', { completed });
    // A resolved card may free a parent whose replayed advance reports its run.
    await deps.scheduleReclaim();
  }
  return { completed };
}

/**
 * The one-shot behind `archivedReviewsBackfillDone`: `endReviewsOfArchivedCard` for every card
 * that was archived before archiving did it. Selects only archived cards that still have a
 * PENDING gate or question, so a live card, and any decided row, is out of its reach by query.
 */
export function backfillArchivedReviews(deps: MaintenanceDeps): { cancelled: number } {
  const rows = deps.sql
    .exec(
      `SELECT id FROM cards WHERE archived_at IS NOT NULL AND (
         id IN (SELECT card_id FROM gates WHERE status = 'pending') OR
         id IN (SELECT card_id FROM elicitations WHERE status = 'pending'))`,
    )
    .toArray();
  let cancelled = 0;
  deps.ctx.storage.transactionSync(() => {
    for (const r of rows) {
      const cardId = r.id as string;
      deps.invalidateApprovalSubject(cardId, 'card.archived', null);
      cancelled += deps.endReviewsOfArchivedCard(cardId);
    }
  });
  return { cancelled };
}

/**
 * Put a card into an arbitrary stage/state. **Tests only** — it exists so a test can reproduce the
 * pre-rule shape (`submitted`, in a terminal stage) that no live verb can produce any more.
 * Nothing in the Worker calls it; building the state through real verbs is impossible precisely
 * because the rule being tested now prevents it.
 */
export async function debugForceCardState(deps: MaintenanceDeps, cardId: string, stageKey: string, state: TaskState): Promise<void> {
  deps.sql.exec(
    `UPDATE cards SET current_stage_key = ?, state = ?, updated_at = ? WHERE id = ?`,
    stageKey,
    state,
    deps.now(),
    cardId,
  );
}
