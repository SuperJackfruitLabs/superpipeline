import { migrateCardAndRunColumns } from './schema-columns';
import { createDecisionTables } from './schema-decisions';
import { createRelationTables } from './schema-relations';

/**
 * The Board Durable Object's SQLite schema, created or brought up to date on every construction.
 * Every statement is idempotent, and they run in the order written, in four groups: the tables the
 * work lives in (here); the columns, triggers and indexes added to cards and runs since
 * (`schema-columns.ts`); notifications and what waits on a person — gates, approval subjects,
 * strict decisions, questions (`schema-decisions.ts`); and what a card is related to — references,
 * links, comments — with webhook dedup and schedules (`schema-relations.ts`).
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
  migrateCardAndRunColumns(sql);
  createDecisionTables(sql);
  createRelationTables(sql);
}
