/**
 * In-app notifications, and everything that waits on a person: approval gates and their columns,
 * approval subjects and delivery events, strict decision requests, and questions (elicitations).
 * Runs after `schema-columns.ts`.
 */
export function createDecisionTables(sql: SqlStorage): void {
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
}
