import type { CardReservation, TaskState } from '@superpipeline/contract';
import { reservationOf } from './hold';
import type { JsonValue } from '../json';
import { cardIdsOf, isRecordEvent, type RecordPushBody } from '../push/events';
import type { BoardContext } from './context';
import type { CardNeedsHuman, CardView, Row, StageDef } from './model';
import { RESOLVED_SQL } from './rules';
import { logError } from '../log';

/**
 * The board's shared reads and writes: its meta keys, its stages, card rows and the cards they
 * read as, the event log (with its WebSocket broadcast and record pushes) and owner notifications.
 * Every other board module goes through these rather than reading the tables itself.
 */

/** What the card store needs from the rest of the board. */
export type CardStoreDeps = Pick<
  BoardContext,
  | 'blockersOf'
  | 'budgetCap'
  | 'cardCost'
  | 'childrenCost'
  | 'ctx'
  | 'now'
  | 'nowMs'
  | 'openChildCount'
  | 'parentIdOf'
  | 'scheduleReclaim'
  | 'sql'
>;

export function getMeta(deps: CardStoreDeps, k: string): string | null {
  const row = deps.sql.exec(`SELECT v FROM meta WHERE k = ?`, k).toArray()[0];
  return row ? (row.v as string) : null;
}

export function setMeta(deps: CardStoreDeps, k: string, v: string): void {
  deps.sql.exec(`INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v`, k, v);
}

export function stages(deps: CardStoreDeps): StageDef[] {
  const raw = getMeta(deps, 'stages');
  return raw ? (JSON.parse(raw) as StageDef[]) : [];
}

export function countInStage(deps: CardStoreDeps, stageKey: string): number {
  return Number(deps.sql.exec(`SELECT COUNT(*) AS n FROM cards WHERE current_stage_key = ?`, stageKey).one().n);
}

export function getCardRow(deps: CardStoreDeps, id: string): Row | null {
  return deps.sql.exec(`SELECT * FROM cards WHERE id = ?`, id).toArray()[0] ?? null;
}

export function getCard(deps: CardStoreDeps, id: string): CardView | null {
  const row = getCardRow(deps, id);
  return row ? rowToCard(deps, row) : null;
}

export function mustGetCard(deps: CardStoreDeps, id: string): CardView {
  const card = getCard(deps, id);
  if (!card) throw new Error(`invariant violation: card ${id} missing immediately after write`);
  return card;
}

export function allCards(deps: CardStoreDeps): CardView[] {
  // Precompute per-card cost + attempt count in grouped queries instead of N point queries —
  // allCards() feeds every snapshot, which is the live-feed hot path. Task 14's three child-card
  // fields (`parentCardId`, `openChildCount`, the cost half of `costUsdRollup`) joined this same
  // batch rather than adding three more point queries per card back onto `rowToCard`.
  const costByCard = new Map<string, number>();
  for (const r of deps.sql.exec(`SELECT card_id, COALESCE(SUM(cost_usd), 0) AS c FROM usage_records GROUP BY card_id`).toArray()) {
    costByCard.set(r.card_id as string, Number(r.c));
  }
  const attemptsByCard = new Map<string, number>();
  for (const r of deps.sql.exec(`SELECT card_id, COUNT(*) AS n FROM runs GROUP BY card_id`).toArray()) {
    attemptsByCard.set(r.card_id as string, Number(r.n));
  }
  const lastAgentByCard = new Map<string, string>();
  for (const r of deps.sql
    .exec(`SELECT r.card_id, r.agent_id FROM runs r WHERE r.id = (SELECT x.id FROM runs x WHERE x.card_id = r.card_id ORDER BY x.started_at DESC, x.id DESC LIMIT 1)`)
    .toArray()) {
    lastAgentByCard.set(r.card_id as string, r.agent_id as string);
  }
  // Child → parent, over every `parent` edge on the board — one row per child, so a direct map.
  const parentByChild = new Map<string, string>();
  for (const r of deps.sql.exec(`SELECT to_card_id, from_card_id FROM card_links WHERE kind = 'parent'`).toArray()) {
    parentByChild.set(r.to_card_id as string, r.from_card_id as string);
  }
  // Parent → its open-child count, the same rule `openChildCount` asks per-card, grouped instead.
  const openChildCountByParent = new Map<string, number>();
  for (const r of deps.sql
    .exec(
      `SELECT l.from_card_id AS parent_id, COUNT(*) AS n FROM card_links l JOIN cards ch ON ch.id = l.to_card_id
         WHERE l.kind = 'parent' AND ch.state NOT IN ${RESOLVED_SQL} GROUP BY l.from_card_id`,
    )
    .toArray()) {
    openChildCountByParent.set(r.parent_id as string, Number(r.n));
  }
  // Parent → its children's summed cost, the same query `childrenCost` runs per-card, grouped.
  const childrenCostByParent = new Map<string, number>();
  for (const r of deps.sql
    .exec(
      `SELECT l.from_card_id AS parent_id, COALESCE(SUM(u.cost_usd), 0) AS c FROM card_links l
         JOIN usage_records u ON u.card_id = l.to_card_id
        WHERE l.kind = 'parent' GROUP BY l.from_card_id`,
    )
    .toArray()) {
    childrenCostByParent.set(r.parent_id as string, Number(r.c));
  }
  // Blocked card → its unresolved blockers (id, title), grouped — Task 17's `CardView.blockedBy`,
  // the same `kind = 'blocks'` + `RESOLVED_SQL` predicate `unresolvedBlockerExists()` tests for,
  // as a SELECT instead of an EXISTS, run once for the whole board rather than once per card
  // (`blockersOf`'s per-card version exists only for `rowToCard`'s single-card fallback below).
  const blockersByCard = new Map<string, Array<{ cardId: string; title: string }>>();
  for (const r of deps.sql
    .exec(
      `SELECT l.to_card_id AS blocked_id, b.id AS blocker_id, b.title AS blocker_title
         FROM card_links l JOIN cards b ON b.id = l.from_card_id
        WHERE l.kind = 'blocks' AND b.state NOT IN ${RESOLVED_SQL}`,
    )
    .toArray()) {
    const blockedId = r.blocked_id as string;
    const list = blockersByCard.get(blockedId) ?? [];
    list.push({ cardId: r.blocker_id as string, title: r.blocker_title as string });
    blockersByCard.set(blockedId, list);
  }
  return deps.sql
    .exec(`SELECT * FROM cards ORDER BY priority DESC, (due_at IS NULL), due_at ASC, created_at ASC`)
    .toArray()
    .map((r) => {
      const id = r.id as string;
      return rowToCard(deps, r, {
        costUsd: costByCard.get(id) ?? 0,
        attemptCount: attemptsByCard.get(id) ?? 0,
        lastAgentId: lastAgentByCard.get(id) ?? null,
        parentCardId: parentByChild.get(id) ?? null,
        openChildCount: openChildCountByParent.get(id) ?? 0,
        childrenCost: childrenCostByParent.get(id) ?? 0,
        blockedBy: blockersByCard.get(id) ?? [],
      });
    });
}

/** `{ reservation }` when the card carries a live hold, else nothing: omitted, like `needsHuman`. */
function reservationField(row: Row, nowMs: number): { reservation?: CardReservation } {
  if (row.reserved_for === null || row.reserved_for === undefined) return {};
  const reservation = reservationOf(row, nowMs);
  return reservation ? { reservation } : {};
}

export function rowToCard(deps: CardStoreDeps, row: Row, pre?: {
    costUsd: number;
    attemptCount: number;
    lastAgentId: string | null;
    parentCardId: string | null;
    openChildCount: number;
    childrenCost: number;
    blockedBy: Array<{ cardId: string; title: string }>;
  }): CardView {
  const id = row.id as string;
  const costUsd = pre?.costUsd ?? deps.cardCost(id);
  const cardCap = deps.budgetCap('budgetCardUsdCap');
  const attemptCount = pre?.attemptCount ?? Number(deps.sql.exec(`SELECT COUNT(*) AS n FROM runs WHERE card_id = ?`, id).one().n);
  // `pre` (not `??`) for these four: `parentCardId` is legitimately `null` for most cards, and
  // `??` would treat a batched `null` as "missing" and re-query — still correct, just defeating
  // the batch it's here to avoid. `blockedBy` joins this group for the same reason from the other
  // direction: an unblocked card's real, batched answer is `[]`, and testing the array itself
  // (its length, or `pre?.blockedBy ?? fallback`) risks mistaking that legitimate empty answer for
  // a missing one. Branching on `pre` — the presence of the whole precomputed object, never the
  // field's own value — is the one test that can't make that mistake for any of the four.
  const lastAgentId = pre
    ? pre.lastAgentId
    : ((deps.sql.exec(`SELECT agent_id FROM runs WHERE card_id = ? ORDER BY started_at DESC, id DESC LIMIT 1`, id).toArray()[0]?.agent_id as string | undefined) ?? null);
  const parentCardId = pre ? pre.parentCardId : deps.parentIdOf(id);
  const openChildCount = pre ? pre.openChildCount : deps.openChildCount(id);
  const childrenCost = pre ? pre.childrenCost : deps.childrenCost(id);
  const blockedBy = pre ? pre.blockedBy : deps.blockersOf(id);
  return {
    id,
    title: row.title as string,
    spec: JSON.parse(row.spec_json as string),
    ownerUserId: row.owner_user_id as string,
    queuedBy: (row.queued_by as string | null) ?? null,
    queuedByAgentId: (row.queued_by_agent_id as string | null) ?? null,
    currentRunId: (row.current_run_id as string | null) ?? null,
    queuedGrant: row.queued_grant ? (JSON.parse(row.queued_grant as string) as string[]) : null,
    labels: row.labels ? (JSON.parse(row.labels as string) as string[]) : [],
    // Columns on the card row, same as `dueAt` below — no query, no `pre` entry, read straight
    // off what `SELECT *` already fetched. A value here that no longer resolves (the project or
    // milestone was deleted) is read as-is; it is the caller's job to decide what to do with it,
    // never this DO's.
    projectId: (row.project_id as string | null) ?? null,
    milestoneId: (row.milestone_id as string | null) ?? null,
    dueAt: (row.due_at as string | null) ?? null,
    // Omitted rather than null when absent: the field means "there is a reason", and
    // a present-but-empty one would make every reader check two things.
    ...(row.needs_human_json
      ? { needsHuman: JSON.parse(row.needs_human_json as string) as CardNeedsHuman }
      : {}),
    ...reservationField(row, deps.nowMs()),
    archivedAt: (row.archived_at as string | null) ?? null,
    currentStageKey: row.current_stage_key as string,
    state: row.state as TaskState,
    delegateAgentId: (row.delegate_agent_id as string | null) ?? null,
    lastAgentId,
    queuedGrantOwner: (row.queued_grant_owner as string | null) ?? null,
    stageSince: (row.stage_since as string | null) ?? (row.state_since as string | null) ?? (row.created_at as string),
    priority: Number(row.priority),
    contextId: row.context_id as string,
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string | null) ?? null,
    stateSince: ((row.state_since as string | null) ?? (row.updated_at as string | null) ?? (row.created_at as string)),
    costUsd,
    // `>=` matches the enforcement gate (postActivity rejects once at/over the cap), so the red
    // chip appears exactly when billing stops.
    overBudget: cardCap !== null && costUsd >= cardCap,
    attemptCount,
    parentCardId,
    openChildCount,
    // Own cost plus one level of children. One level, not recursive: nesting deeper than one is
    // not a shape this board model encourages, and an unbounded walk inside `rowToCard` would run
    // on every card of every board read. NOT folded into `costUsd` above — see that field's own
    // comment on `CardView` and `childrenCost`'s, below `cardCost`.
    costUsdRollup: costUsd + childrenCost,
    blockedBy,
  };
}

export function emit(deps: CardStoreDeps, type: string, payload: Record<string, unknown>): void {
  const ts = deps.now();
  deps.sql.exec(`INSERT INTO events (type, payload_json, ts) VALUES (?, ?, ?)`, type, JSON.stringify(payload), ts);
  const seq = Number(deps.sql.exec(`SELECT last_insert_rowid() AS seq`).one().seq);
  if (isRecordEvent(type)) queueRecordPush(deps, type, seq, payload, ts);
  const msg = JSON.stringify({ kind: 'event', event: { seq, type, payload, ts } });
  for (const ws of deps.ctx.getWebSockets()) {
    try {
      ws.send(msg);
    } catch {
      // drop broken sockets silently
    }
  }
}

/** Record an in-app notification for the card's owner and broadcast it (docs/07 §7). */
export function notify(deps: CardStoreDeps, kind: string, cardId: string, body: string): void {
  const card = getCardRow(deps, cardId);
  const userId = card ? (card.owner_user_id as string) : null;
  deps.sql.exec(
    `INSERT INTO notifications (kind, card_id, user_id, body, read, created_at) VALUES (?, ?, ?, ?, 0, ?)`,
    kind,
    cardId,
    userId,
    body,
    deps.now(),
  );
  emit(deps, 'notification', { kind, cardId, userId, body });
}

/** Record events to whoever subscribed (Superlibrary spec §5). One delivery per matching config. */
function queueRecordPush(deps: CardStoreDeps, type: string, seq: number, payload: Record<string, unknown>, ts: string): void {
  const configs = deps.sql.exec(`SELECT id, url, events_json FROM push_configs`).toArray()
    .filter((c) => (JSON.parse(c.events_json as string) as string[]).includes(type));
  if (configs.length === 0) return;
  const body: RecordPushBody = { event: type, boardId: getMeta(deps, 'boardId') as string, seq, ts, cardIds: cardIdsOf(payload) };
  const text = JSON.stringify(body);
  for (const c of configs) {
    deps.sql.exec(
      `INSERT INTO push_deliveries (config_id, url, body, status, attempts, created_at) VALUES (?, ?, ?, 'pending', 0, ?)`,
      c.id, c.url, text, ts,
    );
  }
  // The one alarm drains pending deliveries (scheduleReclaim computes drainAt from them).
  void deps.scheduleReclaim().catch((err) => logError('record push: alarm not armed', String(err)));
}

export function getCardHandoffJson(deps: CardStoreDeps, cardId: string): string | null {
  const row = getCardRow(deps, cardId);
  return row ? ((row.handoff_json as string | null) ?? null) : null;
}

export function parseHandoff(raw: string | null): JsonValue | null {
  return raw ? (JSON.parse(raw) as JsonValue) : null;
}
