/**
 * What a card is related to: its external references, its links to other cards and its comments;
 * plus the webhook delivery dedup table and recurring schedules. Runs last.
 */
export function createRelationTables(sql: SqlStorage): void {
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
