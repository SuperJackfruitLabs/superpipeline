import { newId } from '../ids';
import { PUSH_TIMEOUT_MS, type PushOutcome, type PushSender, postWithTimeout, signAndSend } from '../push/deliver';
import { SUBSCRIBABLE_EVENTS, cardIdsOf } from '../push/events';
import { RELAY_CONFIG_ID, RELAYED_EVENTS, relayRequest, relaySettings } from '../push/relay';
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
  | 'env'
  | 'getMeta'
  | 'now'
  | 'sql'
>;

/** Where one delivery of a pushed event goes: a push config, or the relay. */
export interface PushTarget {
  configId: string;
  url: string;
}

/**
 * Queue one pushed event: a delivery row for each target, and one for the suite's event relay
 * when this deployment publishes to one and relays this event (treaty plan step 7). Every row of
 * the event carries one event id, `<boardId>:<seq>`, where `seq` is the board's own event sequence
 * (treaty phase 2, ruling 2), so a consumer that receives it on both paths applies it once.
 *
 * A record event passes the seq and time `emit` gave it. Any other event is written to the event log here,
 * by name and the cards it names only (a decision body can carry an approval request's arguments,
 * which the log's readers must not see), and not broadcast. Nothing is written when nothing is
 * queued. Returns the seq, or null when no row was queued.
 */
export function queueEvent(
  deps: Pick<PushDeps, 'env' | 'now' | 'sql'>,
  payload: { event: string },
  targets: readonly PushTarget[],
  opts?: { seq?: number; ts?: string },
): number | null {
  const relay = relaySettings(deps.env);
  const rows = relay && RELAYED_EVENTS.has(payload.event) ? [...targets, { configId: RELAY_CONFIG_ID, url: relay.url }] : [...targets];
  if (rows.length === 0) return null;
  const ts = opts?.ts ?? deps.now();
  const seq = opts?.seq ?? logPushedEvent(deps, payload, ts);
  const body = JSON.stringify(payload);
  for (const row of rows) {
    deps.sql.exec(
      `INSERT INTO push_deliveries (config_id, url, body, status, attempts, created_at, event_seq) VALUES (?, ?, ?, 'pending', 0, ?, ?)`,
      row.configId,
      row.url,
      body,
      ts,
      seq,
    );
  }
  return seq;
}

/** The pushed event's place in the board's event log: its seq. */
function logPushedEvent(deps: Pick<PushDeps, 'sql'>, payload: { event: string }, ts: string): number {
  const cardIds = cardIdsOf(payload);
  deps.sql.exec(`INSERT INTO events (type, payload_json, ts) VALUES (?, ?, ?)`, payload.event, JSON.stringify({ cardIds }), ts);
  return Number(deps.sql.exec(`SELECT last_insert_rowid() AS seq`).one().seq);
}

/**
 * Every push config subscribed to an event. **Subscription only, never capability**: a gate, a
 * question, a follow-up or a waiting card is addressed to a person, and matching on capability (as
 * `work.available` does) would send it to whichever agents advertise the stage, or to nobody when a
 * person owns it.
 */
export function subscribedTargets(deps: Pick<PushDeps, 'sql'>, event: string, opts?: { servicesOnly?: boolean }): PushTarget[] {
  const out: PushTarget[] = [];
  for (const cfg of deps.sql.exec(`SELECT * FROM push_configs`).toArray()) {
    // A service config subscribed to a decision event was registered with `approval-requests:relay`
    // (service-routes.ts), so `servicesOnly` reaches the decision carrier and no agent.
    if (opts?.servicesOnly === true && !(typeof cfg.agent_id === 'string' && cfg.agent_id.startsWith('svc:'))) continue;
    const events: unknown = typeof cfg.events_json === 'string' ? JSON.parse(cfg.events_json) : null;
    if (!Array.isArray(events) || !events.includes(event)) continue;
    out.push({ configId: cfg.id as string, url: cfg.url as string });
  }
  return out;
}

/** Queue one event for every push config subscribed to it, and for the relay when it relays it. */
export function queuePush(deps: Pick<PushDeps, 'env' | 'now' | 'sql'>, payload: { event: string }, opts?: { servicesOnly?: boolean }): number | null {
  return queueEvent(deps, payload, subscribedTargets(deps, payload.event, opts));
}

/** Queue one event for the relay alone (`card.ready`, which no push config subscribes to). */
export function queueRelay(deps: Pick<PushDeps, 'env' | 'now' | 'sql'>, payload: { event: string }): number | null {
  return queueEvent(deps, payload, []);
}

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

/**
 * A delivery row's event id: `<boardId>:<seq>`. A row queued before rows carried their event's seq
 * keeps an id of its own, which no event's id can equal.
 */
function eventIdOf(deps: Pick<PushDeps, 'getMeta'>, row: Record<string, unknown>): string {
  const boardId = deps.getMeta('boardId') ?? '';
  return row.event_seq === null || row.event_seq === undefined ? `${boardId}:delivery-${Number(row.id)}` : `${boardId}:${Number(row.event_seq)}`;
}

/** Inspect the push delivery queue (docs/05 §4). */
export async function getPushDeliveries(deps: PushDeps, opts?: { status?: string }): Promise<PushDeliveryView[]> {
  const where = opts?.status ? ` WHERE status = ?` : '';
  const p = opts?.status ? [opts.status] : [];
  return deps.sql
    .exec(`SELECT * FROM push_deliveries${where} ORDER BY id DESC LIMIT 200`, ...p)
    .toArray()
    .toReversed()
    .map((r) => ({
      id: Number(r.id),
      configId: r.config_id as string,
      url: r.url as string,
      body: r.body as string,
      status: r.status as string,
      attempts: Number(r.attempts),
      eventId: eventIdOf(deps, r),
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
      `SELECT d.id, d.config_id, d.url, d.body, d.attempts, d.event_seq, c.token FROM push_deliveries d LEFT JOIN push_configs c ON d.config_id = c.id
       WHERE d.status IN ('pending', 'failed') AND d.attempts < ? AND (c.id IS NOT NULL OR d.config_id = ?)
       ORDER BY d.attempts ASC, d.id ASC LIMIT 500`,
      MAX_PUSH_ATTEMPTS,
      RELAY_CONFIG_ID,
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
    const outcome =
      r.config_id === RELAY_CONFIG_ID
        ? await sendToRelay(deps, Number(r.id), eventIdOf(deps, r), typeof r.body === 'string' ? r.body : '', sender, opts?.timeoutMs)
        : await signAndSend({ id: Number(r.id), url: r.url as string, body: r.body as string, token: r.token as string }, sender, opts?.timeoutMs);
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

/** One relay delivery: the queued body as a CloudEvent, to the relay this deployment names now. */
async function sendToRelay(deps: Pick<PushDeps, 'env' | 'getMeta'>, id: number, eventId: string, body: string, sender: PushSender, timeoutMs?: number): Promise<PushOutcome> {
  const relay = relaySettings(deps.env);
  const boardId = deps.getMeta('boardId');
  const tenantId = deps.getMeta('tenantId');
  // Unset since the row was queued, or a board without its ids: retried, then dead-lettered.
  if (!relay || !boardId || !tenantId) return { id, ok: false, status: 0 };
  let request;
  try {
    request = relayRequest({ eventId, body }, { boardId, tenantId }, relay);
  } catch {
    return { id, ok: false, status: 0 };
  }
  return postWithTimeout(id, request.url, request.headers, body, sender, timeoutMs);
}
