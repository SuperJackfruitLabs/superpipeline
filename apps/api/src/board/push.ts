import { newId } from '../ids';
import { PUSH_TIMEOUT_MS, type PushSender, signAndSend } from '../push/deliver';
import { SUBSCRIBABLE_EVENTS } from '../push/events';
import { isPublicHttpUrl } from '../push/ssrf';
import type { BoardContext } from './context';
import type { NotificationView, PushConfigInput, PushDeliveryView, Result } from './model';
import { MAX_PUSH_ATTEMPTS } from './rules';

/**
 * In-app notifications and outbound push: configs, the delivery queue and its drain.
 */

/** What push delivery needs from the rest of the board. */
export type PushDeps = Pick<
  BoardContext,
  | 'getMeta'
  | 'now'
  | 'sql'
>;

/** One config's share of a single drain. */
const MAX_PUSH_PER_CONFIG_PER_DRAIN = 10;

/** How a delivery is sent when no sender is passed: `fetch`, with the delivery timeout. */
const defaultPushSender: PushSender = (url, init) => fetch(url, { ...init, signal: init.signal ?? AbortSignal.timeout(PUSH_TIMEOUT_MS) }).then((r) => ({ status: r.status }));

/**
 * In-app notifications for this board, newest first (docs/07 §7).
 *
 * `notifications.user_id` is written from the card owner and was never used as a filter, so
 * every board notification was returned to every caller. With one member per workspace that was
 * invisible; the moment a second person joins it is a disclosure — a notification body names a
 * card and says what happened to it.
 *
 * A null `user_id` is addressed to nobody in particular (work became available, a card was
 * refused at claim time) and reaches everyone. That is the design, not a gap: those are facts
 * about the board rather than about a person.
 *
 * An omitted `userId` keeps the unfiltered read, for internal callers that have no person to
 * filter by. Every route passes one.
 */
export async function getNotifications(deps: PushDeps, opts?: { unreadOnly?: boolean; userId?: string }): Promise<NotificationView[]> {
  const predicates: string[] = [];
  const params: unknown[] = [];
  if (opts?.unreadOnly) predicates.push('read = 0');
  if (opts?.userId !== undefined) {
    predicates.push('(user_id IS NULL OR user_id = ?)');
    params.push(opts.userId);
  }
  const where = predicates.length > 0 ? `WHERE ${predicates.join(' AND ')}` : '';
  return deps.sql
    .exec(`SELECT * FROM notifications ${where} ORDER BY seq DESC LIMIT 200`, ...params)
    .toArray()
    .map((r) => ({
      seq: Number(r.seq),
      kind: r.kind as string,
      cardId: r.card_id as string,
      userId: (r.user_id as string | null) ?? null,
      body: r.body as string,
      read: Number(r.read) === 1,
      createdAt: r.created_at as string,
    }));
}

/** Mark a notification read (docs/07 §7). */
export async function markNotificationRead(deps: PushDeps, seq: number): Promise<Result<{ ok: true }>> {
  deps.sql.exec(`UPDATE notifications SET read = 1 WHERE seq = ?`, seq);
  return { ok: true, value: { ok: true } };
}

/** Register/replace an agent's push subscription (docs/05 §4). Only http(s) urls (SSRF guard). */
export async function registerPushConfig(deps: PushDeps, input: PushConfigInput): Promise<Result<{ configId: string }>> {
  if (!deps.getMeta('boardId')) {
    return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  }
  if (!isPublicHttpUrl(input.url)) {
    return { ok: false, code: 'INVALID_URL', message: `push url must be a public http(s) endpoint: ${input.url}` };
  }
  const existing = deps.sql.exec(`SELECT id FROM push_configs WHERE agent_id = ? AND url = ?`, input.agentId, input.url).toArray()[0];
  const id = existing ? (existing.id as string) : newId('push');
  const unknown = (input.events ?? []).filter((e) => !SUBSCRIBABLE_EVENTS.has(e));
  if (unknown.length > 0) return { ok: false, code: 'UNKNOWN_EVENT', message: `cannot subscribe to: ${unknown.join(', ')}` };
  const caps = JSON.stringify(input.capabilities ?? []);
  const events = JSON.stringify(input.events ?? ['work.available']);
  if (existing) {
    deps.sql.exec(`UPDATE push_configs SET token = ?, capabilities_json = ?, events_json = ? WHERE id = ?`, input.token, caps, events, id);
  } else {
    deps.sql.exec(
      `INSERT INTO push_configs (id, agent_id, url, token, capabilities_json, events_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.agentId,
      input.url,
      input.token,
      caps,
      events,
      deps.now(),
    );
  }
  return { ok: true, value: { configId: id } };
}

/** Inspect the push delivery queue (docs/05 §4). */
export async function getPushDeliveries(deps: PushDeps, opts?: { status?: string }): Promise<PushDeliveryView[]> {
  const where = opts?.status ? ` WHERE status = ?` : '';
  const p = opts?.status ? [opts.status] : [];
  return deps.sql
    .exec(`SELECT * FROM push_deliveries${where} ORDER BY id DESC LIMIT 200`, ...p)
    .toArray()
    .reverse()
    .map((r) => ({
      id: Number(r.id),
      configId: r.config_id as string,
      url: r.url as string,
      body: r.body as string,
      status: r.status as string,
      attempts: Number(r.attempts),
    }));
}

/**
 * Drain pending push deliveries: sign each with its config token and send (docs/05 §4). The sender
 * is injectable (tests pass a stub); production durability — Queue + Workflow with exponential
 * backoff — wraps this. A single drain marks each delivery sent/failed.
 */
export async function dispatchPushDeliveries(deps: PushDeps, sender: PushSender = defaultPushSender, opts?: { timeoutMs?: number }): Promise<{ sent: number; failed: number }> {
  // Retry pending + previously-failed rows under the attempt cap; exhausted ones are dead-lettered.
  // Fresh deliveries go first (attempts ASC), and no one config takes more than
  // MAX_PUSH_PER_CONFIG_PER_DRAIN of a drain, so a down endpoint's retries cannot starve another
  // config's pushes on the same board.
  const perConfig = new Map<string, number>();
  const rows = deps.sql
    .exec(
      `SELECT d.id, d.config_id, d.url, d.body, d.attempts, c.token FROM push_deliveries d JOIN push_configs c ON d.config_id = c.id
       WHERE d.status IN ('pending', 'failed') AND d.attempts < ? ORDER BY d.attempts ASC, d.id ASC LIMIT 500`,
      MAX_PUSH_ATTEMPTS,
    )
    .toArray()
    .filter((r) => {
      const n = perConfig.get(r.config_id as string) ?? 0;
      if (n >= MAX_PUSH_PER_CONFIG_PER_DRAIN) return false;        
      perConfig.set(r.config_id as string, n + 1);
      return true;
    })
    .slice(0, 50);
  let sent = 0;
  let failed = 0;
  for (const r of rows) {
    const outcome = await signAndSend({ id: Number(r.id), url: r.url as string, body: r.body as string, token: r.token as string }, sender, opts?.timeoutMs);
    const attempts = Number(r.attempts) + 1;
    const status = outcome.ok ? 'sent' : attempts >= MAX_PUSH_ATTEMPTS ? 'dead' : 'failed';
    deps.sql.exec(`UPDATE push_deliveries SET status = ?, attempts = ?, last_status = ? WHERE id = ?`, status, attempts, outcome.status, r.id);
    if (outcome.ok) sent++;
    else failed++;
  }
  // Bound the queue: keep only the most recent terminal rows (sent + dead-lettered); pending/failed
  // (still-retrying) rows are always kept.
  deps.sql.exec(
    `DELETE FROM push_deliveries WHERE status IN ('sent', 'dead') AND id NOT IN (SELECT id FROM push_deliveries WHERE status IN ('sent', 'dead') ORDER BY id DESC LIMIT 100)`,
  );
  return { sent, failed };
}
