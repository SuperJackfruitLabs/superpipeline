import { migrateBoardSchemaPart2 } from './schema-part-2';

/**
 * The Board Durable Object's SQLite schema, created or brought up to date on every construction.
 * Every statement is idempotent, and they run in the order written: these, then the rest in
 * `schema-part-2.ts` (one function split in two only to keep each file readable).
 */
export function migrateBoardSchema(sql: SqlStorage): void {
  sql.exec(`CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)`);
  sql.exec(
    `CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      spec_json TEXT NOT NULL DEFAULT '{}',
      owner_user_id TEXT NOT NULL,
      current_stage_key TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'submitted',
      priority INTEGER NOT NULL DEFAULT 0,
      context_id TEXT NOT NULL,
      delegate_agent_id TEXT,
      current_run_id TEXT,
      claim_seq INTEGER NOT NULL DEFAULT 0,
      failure_count INTEGER NOT NULL DEFAULT 0,
      handoff_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT
    )`,
  );
  sql.exec(
    `CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      stage_key TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      lease_epoch INTEGER NOT NULL,
      status TEXT NOT NULL,
      outcome TEXT,
      last_heartbeat_ms INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT
    )`,
  );
  sql.exec(`CREATE INDEX IF NOT EXISTS idx_runs_card ON runs(card_id)`);
  sql.exec(
    `CREATE TABLE IF NOT EXISTS activities (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      card_id TEXT NOT NULL,
      type TEXT NOT NULL,
      ephemeral INTEGER NOT NULL DEFAULT 0,
      body TEXT,
      action TEXT,
      detail_json TEXT,
      ts TEXT NOT NULL
    )`,
  );
  sql.exec(
    `CREATE TABLE IF NOT EXISTS events (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      ts TEXT NOT NULL
    )`,
  );
  // Per-activity cost/usage rollup source (docs/07 §6). `cost_usd` is REAL — fine for display and a
  // coarse dollar budget gate; migrate to integer micro-dollars if we ever pass-through-bill.
  sql.exec(
    `CREATE TABLE IF NOT EXISTS usage_records (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      card_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      model TEXT,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd REAL NOT NULL DEFAULT 0,
      estimated INTEGER NOT NULL DEFAULT 0,
      ts TEXT NOT NULL
    )`,
  );
  sql.exec(`CREATE INDEX IF NOT EXISTS idx_usage_card ON usage_records(card_id)`);
  // Outbound push (docs/05 §4): per-agent PushNotificationConfig + a durable delivery queue.
  sql.exec(
    `CREATE TABLE IF NOT EXISTS push_configs (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      url TEXT NOT NULL,
      token TEXT NOT NULL,
      capabilities_json TEXT NOT NULL DEFAULT '[]',
      events_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      UNIQUE(agent_id, url)
    )`,
  );
  sql.exec(
    `CREATE TABLE IF NOT EXISTS push_deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_id TEXT NOT NULL,
      url TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_status INTEGER,
      created_at TEXT NOT NULL
    )`,
  );
  // Agent profiles (docs/05 §7): reusable configuration bundles, selected on claim.
  sql.exec(
    `CREATE TABLE IF NOT EXISTS profiles (
      key TEXT PRIMARY KEY,
      name TEXT,
      harness TEXT,
      model TEXT,
      permission_policy TEXT,
      autonomy_level TEXT,
      capabilities_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    )`,
  );
  // An attempt pins the profile it ran under (docs/05 §7) — added as a guarded migration.
  try {
    sql.exec(`ALTER TABLE runs ADD COLUMN profile_key TEXT`);
  } catch {
    // column already exists
  }
  /**
   * The completion verdict, so a trace can say WHY a run ended as it did.
   *
   * Without it the receipt could only report `completed` or `blocked` and had to guess at the
   * rest — which is how a published trace came to record a publish run that had refused. It also
   * carries `override` and `unchecked`, because a waived check and an unverifiable one are both
   * things a reader must be able to see.
   */
  try {
    sql.exec(`ALTER TABLE runs ADD COLUMN completion TEXT`);
  } catch {
    // column already exists
  }
  /**
   * Who queued this card — the principal on whose behalf an agent runs it.
   *
   * The control pair asks "who may dispatch which agent"
   * (charter decisions/2026-08-13-ecosystem-identity.md, Decision 4), and to
   * answer that at claim time this board has to know who caused the card to
   * become claimable in the first place.
   *
   * It is NOT the same as `owner_user_id`: a card can be moved into a
   * dispatchable stage by someone other than the person who created it, and it
   * is the mover who dispatched.
   *
   * Nullable on purpose. A card reaches the claimable state from six places
   * and only two of them are a human act — creating it, and moving it. The
   * other four are automatic: a stage advancing after a run completes, a
   * release, a reclaim, a gate resolving. Those must NOT overwrite this: the
   * pipeline that follows is the continuation of the work a person queued, so
   * the value persists as "who last deliberately queued this card".
   */
  try {
    sql.exec(`ALTER TABLE cards ADD COLUMN queued_by TEXT`);
  } catch {
    // column already exists
  }
  /**
   * Which agent queued the card, as distinct from which principal authorised it.
   *
   * Guarded ALTER, like `queued_by` above: every existing card reads NULL, which is exactly
   * right — all of them were queued by a person.
   */
  try {
    sql.exec(`ALTER TABLE cards ADD COLUMN queued_by_agent_id TEXT`);
  } catch {
    // column already exists
  }
  /**
   * What this run handed on, and why it died — kept on the RUN rather than only on the card.
   *
   * `cards.handoff_json` is one column, overwritten by every `complete()`, so stage N+1 destroyed
   * stage N's handoff the moment the card advanced. And `fail()` stored a LABEL
   * (`outcome = 'crashed'`) while the reason went to a human's notification and the event stream —
   * never to the agent about to repeat the work.
   *
   * The card's copy is unchanged: it is the live INPUT the next claim reads. These are the record.
   */
  try {
    sql.exec(`ALTER TABLE runs ADD COLUMN handoff_json TEXT`);
  } catch {
    // column already exists
  }
  try {
    sql.exec(`ALTER TABLE runs ADD COLUMN failure_reason TEXT`);
  } catch {
    // column already exists
  }
  /** The queuer, pinned onto the run, so an attempt records whose work it was. */
  try {
    sql.exec(`ALTER TABLE runs ADD COLUMN queued_by TEXT`);
  } catch {
    // column already exists
  }
  /**
   * When this run's REPORTED state last changed — superwitness's `reported_at` (superwitness app
   * spec §3.5: "the run row's own update timestamp"). Strictly increasing per run (`reportRun`).
   * Nullable: rows from before this column read NULL, and the backfill reports them at
   * COALESCE(updated_at, ended_at, started_at). Heartbeats do not touch it.
   */
  try {
    sql.exec(`ALTER TABLE runs ADD COLUMN updated_at TEXT`);
  } catch {
    // column already exists
  }
  /**
   * The superwitness run-report outbox (superwitness app spec §3.5), the same pattern as
   * `push_deliveries`. One row per run holding its LATEST snapshot; `gen` counts upserts so a
   * drain that sent an older snapshot never deletes a newer one. `status` is `pending` or `dead`
   * (parked); `next_attempt_at` is epoch ms.
   */
  sql.exec(
    `CREATE TABLE IF NOT EXISTS run_reports (
      run_id TEXT PRIMARY KEY,
      gen INTEGER NOT NULL DEFAULT 1,
      report_json TEXT NOT NULL,
      reported_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at INTEGER NOT NULL,
      last_error TEXT,
      created_at TEXT NOT NULL
    )`,
  );
  sql.exec(`CREATE INDEX IF NOT EXISTS idx_run_reports_due ON run_reports(status, next_attempt_at)`);
  /**
   * What the queuer was PERMITTED to dispatch, as granted at the moment they
   * queued it.
   *
   * Authority is captured at the moment of the act, not looked up later. An
   * agent claims work minutes or hours after a human queued it and the human
   * is not present, so there is no caller to ask "may you dispatch this?" —
   * the answer has to have been written down when it was still askable.
   *
   * Recorded as granted THEN. A later change to someone's grant does not
   * retroactively authorise or deauthorise work already queued, which is what
   * makes this an audit record and not a cache.
   *
   * NULL means no authorising token accompanied the act. Under enforcement
   * that card is not claimable — nobody with authority ever asked for it to
   * run.
   */
  try {
    sql.exec(`ALTER TABLE cards ADD COLUMN queued_grant TEXT`);
  } catch {
    // column already exists
  }
  /** Applied label ids (D1 catalogue, migration 0010). JSON array; ids, not names. */
  try {
    sql.exec(`ALTER TABLE cards ADD COLUMN labels TEXT NOT NULL DEFAULT '[]'`);
  } catch {
    // column already exists
  }
  /**
   * A due date, promoted out of `spec.due`.
   *
   * A date, not a timestamp — that is what the UI has always written, and inventing a time of
   * day would make every existing value wrong by up to a day.
   */
  try {
    sql.exec(`ALTER TABLE cards ADD COLUMN due_at TEXT`);
  } catch {
    // column already exists
  }
  /**
   * When the owner was last told this card is overdue. Internal to the sweep and deliberately
   * absent from `CardView`: a five-minute cron tick with nothing to remember would notify on
   * every tick forever.
   */
  try {
    sql.exec(`ALTER TABLE cards ADD COLUMN overdue_notified_at TEXT`);
  } catch {
    // column already exists
  }
  /** Archived cards stay on the board's record and leave its working set. */
  try {
    sql.exec(`ALTER TABLE cards ADD COLUMN archived_at TEXT`);
  } catch {
    // column already exists
  }
  /**
   * What `advanceCard` would have done, if it had not found this card held back by an open
   * child: the from-stage, who produced the handoff, and the handoff itself (already a JSON
   * string). Set only while parked (Task 14 step 3); cleared the moment the deferred advance is
   * replayed. Internal, like `overdue_notified_at` above — not on `CardView`. A reader doesn't
   * need the stored from-stage/handoff, only that the card is waiting (`openChildCount > 0`
   * plus `state = 'input-required'` already says that).
   */
  try {
    sql.exec(`ALTER TABLE cards ADD COLUMN pending_advance_json TEXT`);
  } catch {
    // column already exists
  }
  /**
   * Cross-board project/milestone membership (D1 catalogue, migration 0013; Task 19). A single-DO
   * write, like every other card edit — the project itself, and the rollup that fans out across
   * every board carrying its id, live entirely in D1 and are never consulted here. Either column
   * may point at a project/milestone this tenant has since deleted (`DELETE /v1/projects/:id`
   * deletes unconditionally and cannot reach this DO to clear it); that is a normal state, read
   * straight off the row below exactly like a dangling label id, never checked and never fatal.
   */
  try {
    sql.exec(`ALTER TABLE cards ADD COLUMN project_id TEXT`);
  } catch {
    // column already exists
  }
  /**
   * WHY this card needs a human, when it does.
   *
   * `input-required` says that one is needed and not what for, and the two reasons
   * want opposite things from the reader: a question wants answering, a tripped
   * circuit breaker wants looking at. Card `a9619fe` sat in `input-required` with no
   * pending elicitation and a handoff reading "Verification is in progress", which to
   * a person is a card demanding input that offers nothing to input.
   *
   * JSON rather than columns because the arms differ — a question carries an id, a
   * failure carries a count and the run's own words — and because this is read, never
   * filtered on. Null whenever the card is not waiting on anybody, which is the
   * normal case and is what every existing reader already assumes.
   */
  try {
    sql.exec(`ALTER TABLE cards ADD COLUMN needs_human_json TEXT`);
  } catch {
    // column already exists
  }
  try {
    sql.exec(`ALTER TABLE cards ADD COLUMN milestone_id TEXT`);
  } catch {
    // column already exists
  }
  /**
   * The one automatic rework this card's current stage visit has already spent, when it has.
   *
   * Set by `complete()` on a first completion refusal (`{ stageKey, reason, runId }`) and read by
   * the next one: a second refusal on the same visit parks the card instead of reworking again.
   * Cleared by the trigger below whenever the card changes stage, and by `resumeCard` — a person
   * sending the card back is a fresh start, and so is a reviewer asking for changes (which moves
   * the card off its review stage and back). Internal; not on `CardView`.
   */
  try {
    sql.exec(`ALTER TABLE cards ADD COLUMN completion_rework_json TEXT`);
  } catch {
    // column already exists
  }
  /**
   * How many times a judging stage's `changes-needed` has sent this card back on its own since a
   * person last acted on it (`MAX_AUTOMATIC_RETURNS`).
   *
   * Per CARD, not per stage visit like `completion_rework_json`: a return IS a new visit, so a
   * per-visit count would reset on every lap of the fix → judge loop it exists to stop. Nothing
   * automatic resets it — not a later pass, which would let two judges take turns forever — only
   * a person: `resumeCard`, `moveCard`, a reviewer's request-changes. Internal; not on `CardView`.
   */
  try {
    sql.exec(`ALTER TABLE cards ADD COLUMN auto_returns INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // column already exists
  }
  /**
   * When the card last changed state or stage — how long it has been sitting where it is.
   *
   * Written by a trigger rather than by each writer because there are more than twenty statements
   * in this file that move a card, and a timestamp every one of them must remember to set is a
   * timestamp one of them will forget. It copies the row's own `updated_at`, which every one of
   * those statements already sets, so the trigger holds no clock of its own. NULL on a card that
   * has not moved since this column arrived; readers fall back to `updated_at`, then `created_at`.
   *
   * `stale_notified_at` is the stale digest's memory, like `overdue_notified_at` is the overdue
   * sweep's: the last time this card's owner was told it was stuck. Deliberately NOT reset when the
   * card moves: the promise is "never the same card twice in a day", and a card flapping between
   * two stuck states would otherwise be reported on every flap.
   */
  try {
    sql.exec(`ALTER TABLE cards ADD COLUMN state_since TEXT`);
  } catch {
    // column already exists
  }
  try {
    sql.exec(`ALTER TABLE cards ADD COLUMN stale_notified_at TEXT`);
  } catch {
    // column already exists
  }
  sql.exec(
    `CREATE TRIGGER IF NOT EXISTS cards_state_since AFTER UPDATE OF state, current_stage_key ON cards
     WHEN NEW.state IS NOT OLD.state OR NEW.current_stage_key IS NOT OLD.current_stage_key
     BEGIN
       UPDATE cards SET
         state_since = COALESCE(NEW.updated_at, NEW.created_at),
         completion_rework_json = CASE WHEN NEW.current_stage_key IS NOT OLD.current_stage_key
                                       THEN NULL ELSE completion_rework_json END
       WHERE id = NEW.id;
     END`,
  );
  try {
    sql.exec(`ALTER TABLE cards ADD COLUMN active_approval_subject_id TEXT`);
  } catch {
    // column already exists
  }
  migrateBoardSchemaPart2(sql);
}
