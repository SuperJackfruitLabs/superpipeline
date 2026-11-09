/**
 * The tables a stage's checks keep (charter: decisions/2026-11-09-a-gate-may-be-decided-by-checks.md).
 *
 * - `card_check_arrivals`: one row per arrival of a card at a stage with checks — the check set the
 *   arrival records, and what opening its gate needs afterwards (the return stage, the producer,
 *   the run, and a prepared approval subject when the stage binds one). `status` is `open` while the
 *   card waits on its checks, `passed` once an approval gate opened (`gate_id`), `advanced` once a
 *   checks gate let the card on, `returned` once a failure sent it back, `closed` when it left
 *   otherwise. `parked_at` marks an arrival whose failure could not return the card.
 * - `card_checks`: each check of an arrival, with the stage's definition snapshotted (`config_json`),
 *   so a later policy edit never changes what an arrival is judged by.
 * - `ci_results`: CI statuses heard by the board's webhooks, per provider, repository, commit and
 *   context. Kept even when no card waits on them yet, so a check recorded after CI finished is
 *   settled at once.
 */
export function createCheckTables(sql: SqlStorage): void {
  sql.exec(
    `CREATE TABLE IF NOT EXISTS card_check_arrivals (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      stage_key TEXT NOT NULL,
      return_stage_key TEXT NOT NULL,
      produced_by TEXT NOT NULL,
      run_id TEXT,
      approval_json TEXT,
      status TEXT NOT NULL CHECK (status IN ('open', 'passed', 'advanced', 'returned', 'closed')),
      gate_id TEXT,
      parked_at TEXT,
      created_at TEXT NOT NULL,
      ended_at TEXT
    )`,
  );
  sql.exec(`CREATE INDEX IF NOT EXISTS idx_check_arrivals_card ON card_check_arrivals(card_id, status)`);
  sql.exec(
    `CREATE TABLE IF NOT EXISTS card_checks (
      arrival_id TEXT NOT NULL,
      card_id TEXT NOT NULL,
      stage_key TEXT NOT NULL,
      position INTEGER NOT NULL,
      name TEXT NOT NULL,
      provider TEXT NOT NULL CHECK (provider IN ('ci', 'verdict')),
      config_json TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'passed', 'failed', 'overridden')),
      detail TEXT,
      url TEXT,
      head_sha TEXT,
      updated_at TEXT NOT NULL,
      overridden_by TEXT,
      overridden_at TEXT,
      override_comment TEXT,
      PRIMARY KEY (arrival_id, name)
    )`,
  );
  sql.exec(`CREATE INDEX IF NOT EXISTS idx_card_checks_pending ON card_checks(status, provider)`);
  sql.exec(
    `CREATE TABLE IF NOT EXISTS ci_results (
      provider TEXT NOT NULL,
      repo TEXT NOT NULL,
      sha TEXT NOT NULL,
      context TEXT NOT NULL,
      state TEXT NOT NULL CHECK (state IN ('pending', 'success', 'failure')),
      url TEXT,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (provider, repo, sha, context)
    )`,
  );
  sql.exec(`CREATE INDEX IF NOT EXISTS idx_ci_results_updated ON ci_results(updated_at)`);
  // The arrival whose checks passed before this gate opened; NULL on a gate whose stage had none.
  try {
    sql.exec(`ALTER TABLE gates ADD COLUMN check_arrival_id TEXT`);
  } catch {
    // column already exists
  }
}
