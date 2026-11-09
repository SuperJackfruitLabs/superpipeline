/**
 * In-app notifications, and everything that waits on a person: approval gates and their columns,
 * approval subjects and delivery events, strict decision requests, questions (elicitations) and
 * broker approval requests.
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
    sql.exec(`ALTER TABLE gates ADD COLUMN live_post_remind_at TEXT`);
  } catch {
    // column already exists
  }
  try {
    sql.exec(`ALTER TABLE gates ADD COLUMN live_post_reminder_notified_at TEXT`);
  } catch {
    // column already exists
  }
  try {
    sql.exec(`ALTER TABLE gates ADD COLUMN approval_decider_ids_json TEXT`);
  } catch {
    // column already exists
  }
  // The stage's quorum as the gate opened with it (charter 2026-11-09, more than one approver); NULL
  // for a gate that passes on one approval.
  try {
    sql.exec(`ALTER TABLE gates ADD COLUMN quorum_json TEXT`);
  } catch {
    // column already exists
  }
  sql.exec(`CREATE INDEX IF NOT EXISTS idx_gates_run ON gates(run_id)`);
  /**
   * A decision waiting on a person, with the deadlines its stage's timeout gave it when it started
   * (charter: unanswered decisions remind, then escalate, decision 2). One row per wait: a gate, a
   * question, a manual delivery (keyed by its gate) or a waiting card (keyed by its wait id).
   * `reminded_at` / `escalated_at` make each deadline act once (`remind_skipped` when the escalation
   * came due first); `next_due_at` is the earlier deadline still to act on; `closed_at` marks a wait
   * that ended or has nothing left to act on, pruned after 30 days. Durable because it is here, not in memory.
   */
  sql.exec(
    `CREATE TABLE IF NOT EXISTS decision_waits (
      kind TEXT NOT NULL CHECK (kind IN ('gate', 'question', 'delivery', 'attention')),
      decision_id TEXT NOT NULL,
      card_id TEXT NOT NULL,
      stage_key TEXT NOT NULL,
      waiting_since TEXT NOT NULL,
      remind_at TEXT,
      escalate_at TEXT,
      reminded_at TEXT,
      escalated_at TEXT,
      remind_skipped INTEGER NOT NULL DEFAULT 0,
      next_due_at TEXT,
      closed_at TEXT,
      PRIMARY KEY (kind, decision_id)
    )`,
  );
  // The sweep reads due waits by `next_due_at` alone (null once nothing is left to act on).
  sql.exec(`CREATE INDEX IF NOT EXISTS idx_decision_waits_due ON decision_waits(next_due_at)`);
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
  /**
   * A gate's choice of variants (charter: a gate may offer a choice of variants, 2026-11-09), in
   * order. Each variant is its own frozen subject; the gate's `approval_subject_id` and digest stay
   * NULL until an approval chooses one, which then becomes the gate's and the card's subject.
   */
  sql.exec(
    `CREATE TABLE IF NOT EXISTS gate_variants (
      gate_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      variant_id TEXT NOT NULL,
      label TEXT NOT NULL,
      subject_id TEXT NOT NULL UNIQUE,
      digest TEXT NOT NULL,
      PRIMARY KEY (gate_id, position),
      UNIQUE (gate_id, variant_id)
    )`,
  );
  /**
   * The approvals recorded on a quorum gate, one per person (charter 2026-11-09, more than one
   * approver, decision 3). Each keeps the binding it was given; kept after the gate closes, as its
   * history. `variant_id` is the variant an approval named on a variant gate, else NULL.
   */
  sql.exec(
    `CREATE TABLE IF NOT EXISTS gate_approvals (
      gate_id TEXT NOT NULL,
      principal_id TEXT NOT NULL,
      decision TEXT NOT NULL,
      variant_id TEXT,
      subject_id TEXT,
      subject_digest TEXT,
      comment TEXT,
      via TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (gate_id, principal_id)
    )`,
  );
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
  // A poster's `harness-permission/v1` subject, as posted and validated (charter: strict decisions
  // bind their subject §7). Null for every other question; a strict decision's subject is built
  // from `strict_decision_requests`.
  try {
    sql.exec(`ALTER TABLE elicitations ADD COLUMN subject_json TEXT`);
  } catch {
    // column already exists
  }
  // A broker's approval request (charter: waiting cards and broker approvals reach chat §3): a
  // board-level question with a `stk-capability/v1` subject, tied to no card or run. Idempotent on
  // the requesting principal's own id, so a retried create returns the same record and one
  // principal's id can never collide with another's.
  sql.exec(
    `CREATE TABLE IF NOT EXISTS approval_requests (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      requested_by TEXT NOT NULL,
      question TEXT NOT NULL,
      subject_json TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied')),
      decided_option TEXT,
      decided_by TEXT,
      decided_by_label TEXT,
      decided_at TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(requested_by, request_id)
    )`,
  );
  sql.exec(`CREATE INDEX IF NOT EXISTS idx_elicitations_card ON elicitations(card_id)`);
  sql.exec(`CREATE INDEX IF NOT EXISTS idx_elicitations_run ON elicitations(run_id)`);
}
