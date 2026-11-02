/**
 * The second half of the board's schema statements, run after `schema.ts`'s, in order.
 */
export function migrateBoardSchemaPart2(sql: SqlStorage): void {
  try {
    sql.exec(`ALTER TABLE cards ADD COLUMN queued_grant_owner TEXT`);
  } catch {
    // column already exists
  }
  try {
    sql.exec(`ALTER TABLE cards ADD COLUMN stage_since TEXT`);
  } catch {
    // column already exists
  }
  // When the card entered its current stage. state_since moves on a state OR a stage change; this
  // moves on a stage change only, so "in Reproduce for 2 days" survives a stop inside the stage.
  sql.exec(
    `CREATE TRIGGER IF NOT EXISTS cards_stage_since AFTER UPDATE OF current_stage_key ON cards
     WHEN NEW.current_stage_key IS NOT OLD.current_stage_key
     BEGIN
       UPDATE cards SET stage_since = COALESCE(NEW.updated_at, NEW.created_at) WHERE id = NEW.id;
     END`,
  );
  // Only `project_id` is indexed: `projectSummary` is the one query that filters cards by it,
  // and nothing here looks cards up by `milestone_id` on its own.
  sql.exec(`CREATE INDEX IF NOT EXISTS idx_cards_project ON cards(project_id)`);
  sql.exec(`CREATE INDEX IF NOT EXISTS idx_cards_due_at ON cards(due_at)`);
  // In-app notifications (docs/07 §7): the notify-worthy status transitions, for the card owner.
  sql.exec(
    `CREATE TABLE IF NOT EXISTS notifications (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      card_id TEXT NOT NULL,
      user_id TEXT,
      body TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )`,
  );
  sql.exec(
    `CREATE TABLE IF NOT EXISTS gates (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      stage_key TEXT NOT NULL,
      return_stage_key TEXT NOT NULL,
      status TEXT NOT NULL,
      decision TEXT,
      comment TEXT,
      produced_by TEXT NOT NULL DEFAULT '',
      decided_by TEXT,
      options_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    )`,
  );
  sql.exec(`CREATE INDEX IF NOT EXISTS idx_gates_card ON gates(card_id)`);
  /** The surface a gate was decided through (matrix, web, api). Null on gates decided before this column. */
  try {
    sql.exec(`ALTER TABLE gates ADD COLUMN decided_via TEXT`);
  } catch {
    // column already exists
  }
  /**
   * The run whose work this gate judges (charter -> decisions/2026-09-29-evidence-joins-on-the-
   * work-run.md, decision 4), so a human's rejection can be attributed to the run and the
   * configuration that produced it. Nullable on purpose: gates opened before this column have
   * none, and the evidence route reads a null as "a legacy gate on this card and stage".
   */
  try {
    sql.exec(`ALTER TABLE gates ADD COLUMN run_id TEXT`);
  } catch {
    // column already exists
  }
  try {
    sql.exec(`ALTER TABLE gates ADD COLUMN approval_subject_id TEXT`);
  } catch {
    // column already exists
  }
  try {
    sql.exec(`ALTER TABLE gates ADD COLUMN approval_subject_digest TEXT`);
  } catch {
    // column already exists
  }
  try {
    sql.exec(`ALTER TABLE gates ADD COLUMN live_post_url TEXT`);
  } catch {
    // column already exists
  }
  try {
    sql.exec(`ALTER TABLE gates ADD COLUMN live_post_url_recorded_by TEXT`);
  } catch {
    // column already exists
  }
  try {
    sql.exec(`ALTER TABLE gates ADD COLUMN live_post_url_recorded_at TEXT`);
  } catch {
    // column already exists
  }
  try {
    sql.exec(`ALTER TABLE gates ADD COLUMN live_post_readback_status TEXT`);
  } catch {
    // column already exists
  }
  try {
    sql.exec(`ALTER TABLE gates ADD COLUMN approval_decider_ids_json TEXT`);
  } catch {
    // column already exists
  }
  sql.exec(`CREATE INDEX IF NOT EXISTS idx_gates_run ON gates(run_id)`);
  sql.exec(
    `CREATE TABLE IF NOT EXISTS approval_subjects (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      gate_stage_key TEXT NOT NULL,
      schema TEXT NOT NULL,
      revision INTEGER NOT NULL,
      canonical_bytes BLOB NOT NULL,
      digest TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active', 'invalidated')),
      producer_run_id TEXT NOT NULL,
      produced_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      invalidated_at TEXT,
      invalidated_by TEXT,
      invalidation_reason TEXT,
      UNIQUE(card_id, schema, revision)
    )`,
  );
  sql.exec(`CREATE INDEX IF NOT EXISTS idx_approval_subjects_card ON approval_subjects(card_id)`);
  sql.exec(
    `CREATE TABLE IF NOT EXISTS approval_delivery_events (
      id TEXT PRIMARY KEY,
      gate_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      event TEXT NOT NULL,
      from_mode TEXT,
      to_mode TEXT,
      actor TEXT NOT NULL,
      live_url TEXT,
      created_at TEXT NOT NULL
    )`,
  );
  sql.exec(`CREATE INDEX IF NOT EXISTS idx_approval_delivery_events_gate ON approval_delivery_events(gate_id)`);
  sql.exec(`CREATE TABLE IF NOT EXISTS strict_decision_requests (
    request_id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, run_id TEXT NOT NULL,
    lease_epoch INTEGER NOT NULL, elicitation_id TEXT NOT NULL UNIQUE,
    payload_json TEXT NOT NULL, response_json TEXT NOT NULL, binding_json TEXT NOT NULL
  )`);
  // An agent's open question to a human (docs/04 §4). Persisting it is what makes an answer
  // possible: the activity stream is append-only history, and history cannot be replied to.
  sql.exec(
    `CREATE TABLE IF NOT EXISTS elicitations (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      stage_key TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      question TEXT NOT NULL,
      signal TEXT,
      options_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL,
      answer_option TEXT,
      answer_text TEXT,
      answered_by TEXT,
      created_at TEXT NOT NULL,
      answered_at TEXT
    )`,
  );
  sql.exec(`CREATE INDEX IF NOT EXISTS idx_elicitations_card ON elicitations(card_id)`);
  sql.exec(`CREATE INDEX IF NOT EXISTS idx_elicitations_run ON elicitations(run_id)`);
  // `references` is a SQL keyword, so the table is `card_references`. UNIQUE(card_id, url) is the
  // idempotent-upsert dedup key (docs/06 §1).
  sql.exec(
    `CREATE TABLE IF NOT EXISTS card_references (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      url TEXT NOT NULL,
      title TEXT,
      subtitle TEXT,
      provider TEXT NOT NULL,
      source_type TEXT NOT NULL,
      external_id TEXT,
      metadata_json TEXT,
      sync_state TEXT NOT NULL DEFAULT 'synced',
      last_synced_at TEXT,
      added_by TEXT NOT NULL DEFAULT 'agent',
      created_at TEXT NOT NULL,
      updated_at TEXT,
      UNIQUE(card_id, url)
    )`,
  );
  /**
   * Which run attached a reference. NULL means a human did it, or that it predates this column —
   * both honest, and neither invented.
   *
   * Placed AFTER the CREATE above, not with the `runs` migrations: an ALTER that runs before its
   * table exists throws into the guard's catch and is silently skipped, which is exactly what
   * happened on the first attempt — the insert then failed with "no column named run_id" on a
   * migration that looked like it had succeeded.
   */
  try {
    sql.exec(`ALTER TABLE card_references ADD COLUMN run_id TEXT`);
  } catch {
    // column already exists
  }
  sql.exec(`CREATE INDEX IF NOT EXISTS idx_refs_card ON card_references(card_id)`);
  sql.exec(`CREATE INDEX IF NOT EXISTS idx_refs_external ON card_references(external_id)`);
  // Dependencies AND sub-task containment, in one table (spec §3.4). Same-board only: an edge
  // that may refuse a claim has to be strongly consistent, which means inside this DO.
  sql.exec(
    `CREATE TABLE IF NOT EXISTS card_links (
      from_card_id TEXT NOT NULL,
      to_card_id   TEXT NOT NULL,
      kind         TEXT NOT NULL,
      created_at   TEXT NOT NULL,
      created_by   TEXT,
      PRIMARY KEY (from_card_id, to_card_id, kind)
    )`,
  );
  // A card has at most one parent.
  sql.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS card_links_one_parent ON card_links (to_card_id) WHERE kind = 'parent'`,
  );
  sql.exec(`CREATE INDEX IF NOT EXISTS idx_card_links_to ON card_links(to_card_id, kind)`);
  // The mirror of idx_card_links_to: the `parent` clause in `blockedWhere`/`openChildCount` (and
  // `notifyDependents`'s `blocks` fan-out) both filter on `from_card_id`, unindexed until now.
  // Negligible with today's card counts; Task 15 starts creating children in bulk.
  sql.exec(`CREATE INDEX IF NOT EXISTS idx_card_links_from ON card_links(from_card_id, kind)`);
  // Inbound webhook delivery dedup (docs/06 §3): GitHub may redeliver the same X-GitHub-Delivery.
  sql.exec(
    `CREATE TABLE IF NOT EXISTS webhook_deliveries (delivery_id TEXT PRIMARY KEY, received_at TEXT NOT NULL)`,
  );
  // Card comments. Append-only: a row is never updated except to tombstone it (`deleted_at`,
  // body cleared), so the thread keeps saying a comment was there and who wrote it.
  sql.exec(
    `CREATE TABLE IF NOT EXISTS card_comments (
      id          TEXT PRIMARY KEY,
      card_id     TEXT NOT NULL,
      author_kind TEXT NOT NULL,
      author_id   TEXT NOT NULL,
      author_name TEXT,
      body        TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      deleted_at  TEXT
    )`,
  );
  sql.exec(`CREATE INDEX IF NOT EXISTS idx_card_comments_card ON card_comments(card_id, created_at)`);
  // Recurring cards (spec §3.7). In the board rather than D1 because a schedule is a property of
  // one board's pipeline, and firing it is a write to this DO.
  sql.exec(
    `CREATE TABLE IF NOT EXISTS schedules (
      id            TEXT PRIMARY KEY,
      enabled       INTEGER NOT NULL DEFAULT 1,
      title         TEXT NOT NULL,
      spec_json     TEXT NOT NULL DEFAULT '{}',
      priority      INTEGER NOT NULL DEFAULT 0,
      labels        TEXT NOT NULL DEFAULT '[]',
      stage_key     TEXT,
      rule          TEXT NOT NULL,
      timezone      TEXT NOT NULL,
      overlap       TEXT NOT NULL DEFAULT 'skip',
      next_fire_at  TEXT NOT NULL,
      last_fired_at TEXT,
      last_card_id  TEXT,
      skip_count    INTEGER NOT NULL DEFAULT 0,
      created_by    TEXT,
      created_at    TEXT NOT NULL,
      queued_grant  TEXT
    )`,
  );
  sql.exec(`CREATE INDEX IF NOT EXISTS idx_schedules_next ON schedules(next_fire_at)`);
  /**
   * What the creator was PERMITTED to dispatch, as granted at the moment the schedule was
   * declared — the same reasoning `cards.queued_grant` above already follows, applied one step
   * earlier. Creating a schedule IS the act of authorising unattended dispatch, exactly as
   * wiring a webhook's `triggerGrant` is: there is no human present when the schedule fires
   * later, so the answer to "may this run?" has to be written down now, while it is still
   * askable.
   *
   * Without this column, `fireDueSchedules` had nothing to pass but `undefined`, so
   * `createCardFromTrigger` fell back to `triggerGrant()` — the board's GitHub-webhook grant,
   * which has exactly one writer (`PUT /v1/boards/:id/github`). A board whose operator never
   * saved GitHub settings has `null` there, so under enforcement every scheduled card parked in
   * `input-required` on first claim, forever, and — because that state is not terminal —
   * `scheduleInstanceOpen` read the instance as open forever too, silencing the schedule behind
   * its own default `overlap: 'skip'`. Guarded ALTER, matching the `cards.queued_grant` migration
   * above, because a board's DO may already have a `schedules` table from before this column
   * existed — the `CREATE TABLE IF NOT EXISTS` above only helps a board created fresh.
   */
  try {
    sql.exec(`ALTER TABLE schedules ADD COLUMN queued_grant TEXT`);
  } catch {
    // column already exists
  }
}
