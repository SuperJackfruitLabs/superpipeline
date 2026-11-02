/** Cards: creating, editing, moving and resuming them, and what ran on them. */
import { ApiError } from '../loading';
import { withAuthority } from '../hub-token';
import { fetch, headers, noteAuth } from './client';
import type { Gate } from './gates';

export interface Card {
  id: string;
  title: string;
  spec?: Record<string, unknown> | null;
  ownerUserId: string;
  currentStageKey: string;
  state: string;
  priority: number;
  costUsd: number;
  overBudget: boolean;
  attemptCount: number;
  delegateAgentId?: string | null;
  /** The agent of the card's most recent run; null with no runs. */
  lastAgentId: string | null;
  /** Whose dispatch grant the queue ran on; null when not recorded. */
  queuedGrantOwner: string | null;
  /** When the card entered its current stage. */
  stageSince: string;
  createdAt: string;
  /**
   * Who authorised this card's dispatch — the third of a card's three identities, and the one this
   * client never declared.
   *
   * It has been on the wire since the control pair shipped and is deliberately preserved when
   * ownership is reassigned, which means the API has always distinguished "who is answerable" from
   * "who asked" while the board showed only the first. Null on a card created before it was
   * recorded.
   */
  queuedBy: string | null;
  /**
   * The AGENT that queued it, when one did — `agt_…`, not a principal. Null means a person did,
   * which is every card that existed before agents could queue work.
   */
  queuedByAgentId: string | null;
  /**
   * What the queuer was permitted to dispatch when they queued it. Null is "no authority was
   * captured"; `[]` is "somebody decided nobody" — both refuse a claim under enforcement, and they
   * are different facts about why.
   */
  queuedGrant: string[] | null;
  /** Applied label ids; the catalogue itself is fetched separately (`listLabels`). */
  labels: string[];
  dueAt: string | null;
  archivedAt: string | null;
  /**
   * This card's `parent` edge (`card_links`, this card as `to_card_id`), or null if it has none.
   * Task 14; type-only addition here (Task 17b) — already on the wire via `CardView`, just never
   * declared on this client type until the sub-tasks UI needed to count siblings by it.
   */
  parentCardId: string | null;
  /**
   * How many of this card's direct children are still unresolved — the same rule
   * `blockedWhere`/`openChildCount` enforce at claim time (Task 14). A DIFFERENT fact from
   * `blockedBy`: an open child parks the PARENT (it cannot advance), it does not block anything
   * from being claimed, so it gets its own counter rather than sharing the `⛔` badge.
   */
  openChildCount: number;
  /**
   * `costUsd` plus one level of children's summed cost (Task 14). Deliberately separate from
   * `costUsd`, which still means "what this card itself spent" for `overBudget`.
   */
  costUsdRollup: number;
  /**
   * Unresolved same-board `blocks` edges holding this card back — the enforced kind, derived
   * server-side from the same predicate the claim query uses (`CardView.blockedBy`, Task 17c).
   * Empty when nothing blocks the card, including when it only has an open child (that is
   * `openChildCount`'s fact, not this one) or only cross-board advisory blockers (Task 16, not
   * enforced, carried separately by the links route).
   */
  blockedBy: Array<{ cardId: string; title: string }>;
  /**
   * Cross-board project/milestone membership (Task 19, `CardView.projectId`/`milestoneId`) —
   * already on the wire since the DO started stamping it; never declared on this client type
   * until Step 3's project filter and milestone picker needed to read it.
   *
   * An unresolved id is a normal state, not an error: `DELETE /v1/projects/:id` deletes
   * unconditionally (`db/projects.ts`), and a card sitting in a board Durable Object has no way
   * to be told its project just vanished. Treat it exactly like a stale label id — droppable,
   * never a reason to assume `listProjects()`/`getProject()` can resolve it.
   */
  projectId: string | null;
  milestoneId: string | null;
  /**
   * Why this card is waiting on a person, when it is (`CardView.needsHuman`). Absent whenever it is
   * not. `detail` is the agent's or the board's own words — text to render as text, never HTML.
   */
  needsHuman?: NeedsHuman;
  /** When the card last changed state or stage. Absent from a server older than this field. */
  stateSince?: string;
}

export interface NeedsHuman {
  reason: 'question' | 'repeated-failure' | 'blocked' | 'review' | 'not-authorised';
  elicitationId?: string;
  detail?: string;
  failureCount?: number;
  /** The agent's one-line version of `detail`. */
  summary?: string;
}

/** A card waiting past a threshold, or waiting on a person (`GET /v1/stale`). */
export interface StaleCard {
  boardId: string;
  boardName: string;
  cardId: string;
  title: string;
  ownerUserId: string;
  stageKey: string;
  stageName: string;
  state: string;
  why:
    | { kind: 'needs-human'; reason: NeedsHuman['reason'] | 'sub-tasks'; detail?: string; failureCount?: number; elicitationId?: string; gateId?: string }
    | { kind: 'no-owner' };
  summary: string | null;
  since: string;
  ageHours: number;
  next: string;
}

export interface Attempt {
  runId: string;
  agentId: string;
  stageKey: string;
  status: string;
  outcome: string | null;
  costUsd: number;
  model: string | null;
  profileKey: string | null;
  /**
   * What THIS run handed on, kept per-run since the spec of 2026-10-02.
   *
   * The card's `handoff` is one value overwritten at every stage, so it only ever showed the latest.
   * This is what lets a reader see the account stage by stage rather than its last line.
   */
  handoff: unknown;
  /** Why this run died. Null for one that completed, or is still open. */
  failureReason: string | null;
  startedAt: string;
  endedAt: string | null;
  /** The stage's completion verdict; `{ ok: false, missing }` is a refused hand-off ("sent back"). */
  completion: { ok?: boolean; missing?: string[] } | null;
}

export interface Activity {
  seq: number;
  runId: string;
  type: string;
  ts: string;
  body: string | null;
  action: string | null;
  parameter: unknown;
  result: unknown;
  signal: string | null;
}

export interface CardActivities {
  activities: Activity[];
  handoff: Record<string, unknown> | null;
  /** Every gate on this card, decided ones included — the card's approval history. */
  gates: Gate[];
}

export interface Reference {
  id: string;
  cardId: string;
  /**
   * The run that attached this, when an agent did it mid-run. Null for a human's, and for every
   * reference from before the column existed — both of which belong to the card rather than to a
   * stage.
   */
  runId?: string | null;
  url: string;
  title?: string | null;
  subtitle?: string | null;
  provider: string;
  sourceType: string;
  externalId?: string | null;
  metadata?: Record<string, unknown> | null;
  addedBy: 'agent' | 'user';
}

/**
 * Creating a card in the first stage IS queueing it — it is claimable the moment
 * it exists — so this carries the operator's authority, and the server records
 * what it permits against the card. Without it the card is queued by nobody with
 * permission, and under enforcement no agent may run it.
 */
export async function createCard(
  boardId: string,
  title: string,
  detail?: { priority?: number; spec?: Record<string, unknown>; dueAt?: string; stageKey?: string; labelIds?: string[]; projectId?: string | null },
): Promise<void> {
  const res = await fetch(`/v1/boards/${boardId}/cards`, {
    method: 'POST',
    headers: await withAuthority(headers),
    // Owner is the signed-in user, set by the server. Priority, spec and dueAt are sent only when
    // given, so a one-line dispatch produces exactly the request it always did.
    body: JSON.stringify({
      title,
      ...(detail?.priority !== undefined ? { priority: detail.priority } : {}),
      ...(detail?.spec ? { spec: detail.spec } : {}),
      ...(detail?.dueAt !== undefined ? { dueAt: detail.dueAt } : {}),
      ...(detail?.stageKey !== undefined ? { stageKey: detail.stageKey } : {}),
      ...(detail?.labelIds !== undefined ? { labelIds: detail.labelIds } : {}),
      ...(detail?.projectId !== undefined ? { projectId: detail.projectId } : {}),
    }),
  });
  if (!res.ok) throw new ApiError('createCard', res.status);
}

/**
 * Split a card into children, one per (non-blank) title (Task 15's `POST …/cards/:cardId/split`,
 * unwired to any web client until now). "Add sub-task" (Task 17b) calls this with a single title
 * rather than `createCard` + `addLink('parent')`: `createCard`'s wrapper above discards its
 * response body, so it has no way to hand back the new card's id to link as a child, while this
 * route's response already carries the created children in full — one call, no race.
 *
 * Returns the raw response, like `addLink`/`removeLink` do, so a caller can surface the server's
 * own refusal (`TOO_MANY_CHILDREN`, `NOTHING_TO_SPLIT`, `CARD_BLOCKED`) as a sentence.
 */
export function splitCard(boardId: string, cardId: string, titles: string[]): Promise<Response> {
  return fetch(`/v1/boards/${boardId}/cards/${cardId}/split`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ titles }),
  });
}

/**
 * Edit a card's title / description (spec) / priority / owner.
 *
 * `ownerUserId` reassigns. It is deliberately not `queuedBy`: who is answerable for a card and
 * who authorised its dispatch are different questions, and only the second is checked at claim.
 */
export function updateCard(
  boardId: string,
  cardId: string,
  patch: {
    title?: string;
    spec?: Record<string, unknown>;
    priority?: number;
    ownerUserId?: string;
    labels?: string[];
    /**
     * The comma-separated names `CardDrawer`'s Labels input parses — resolved to catalogue ids
     * server-side (`resolveLabelNames`), which creates a name that does not exist yet rather than
     * refusing it. Sent instead of `labels`, never alongside it.
     */
    labelNames?: string[];
    dueAt?: string | null;
    archivedAt?: string | null;
    /**
     * Cross-board project/milestone membership (migration 0013; Task 19). `null` clears it. The
     * route validates both — an unknown `projectId` is left alone (a normal state, see
     * `Card.projectId`'s comment), but a `milestoneId` that does not belong to the EFFECTIVE
     * project (after this same patch) is refused as `MILESTONE_NOT_IN_PROJECT`. `CardDrawer`'s
     * picker (`milestone-picker.ts`'s `assignmentPatch`) is written to never send a mismatch, by
     * clearing the milestone the moment the project changes — not by relying on this route to
     * catch it after the fact.
     */
    projectId?: string | null;
    milestoneId?: string | null;
  },
): Promise<Response> {
  return fetch(`/v1/boards/${boardId}/cards/${cardId}`, { method: 'PATCH', headers, body: JSON.stringify(patch) });
}

/** Delete a card and everything scoped to it. */
export function deleteCard(boardId: string, cardId: string): Promise<Response> {
  return fetch(`/v1/boards/${boardId}/cards/${cardId}`, { method: 'DELETE', headers });
}

/**
 * Archive a card: `PATCH archivedAt` with a real timestamp, not a client-side flag. Phase 1
 * shipped an `archivedAt` column and a "show archived" filter with no way to ever produce an
 * archived card — a filter for a state nothing could reach. This is that write.
 */
export function archiveCard(boardId: string, cardId: string): Promise<Response> {
  return updateCard(boardId, cardId, { archivedAt: new Date().toISOString() });
}

/**
 * Un-archive a card: `PATCH archivedAt` to `null`. Whole-branch review, Minor: `board-do.ts:3347`
 * names un-archiving as one of three recoveries for a parent parked by an archived child — the
 * other two already had a surface, this one didn't, making an archived card a one-way door through
 * the web app even though the route/DO have always accepted `archivedAt: null`.
 */
export function unarchiveCard(boardId: string, cardId: string): Promise<Response> {
  return updateCard(boardId, cardId, { archivedAt: null });
}

/** Attach a reference (link) to a card by hand. */
export function addReference(boardId: string, cardId: string, ref: { url: string; title?: string }): Promise<Response> {
  return fetch(`/v1/boards/${boardId}/cards/${cardId}/references`, { method: 'PUT', headers, body: JSON.stringify({ ...ref, addedBy: 'user' }) });
}

/**
 * Returns the raw response so callers can surface WIP-limit (409) and
 * unknown-stage (400) cases.
 *
 * Carries authority for the same reason `createCard` does: whoever moves a card
 * into a dispatchable stage is the one dispatching it now, and that need not be
 * the person who created it.
 */
export async function moveCard(boardId: string, cardId: string, toStageKey: string): Promise<Response> {
  return fetch(`/v1/boards/${boardId}/cards/${cardId}/move`, {
    method: 'POST',
    headers: await withAuthority(headers),
    body: JSON.stringify({ toStageKey }),
  });
}

/** The attempts (runs) for a card, for the comparison view (docs/07 §5). */
export async function getAttempts(boardId: string, cardId: string): Promise<Attempt[]> {
  const res = await fetch(`/v1/boards/${boardId}/cards/${cardId}/attempts`, { headers });
  if (!res.ok) throw new ApiError('getAttempts', res.status);
  return ((await res.json()) as { attempts: Attempt[] }).attempts;
}

/** A card's session-replay timeline + carried handoff (docs/07 §4). */
export async function getCardActivities(boardId: string, cardId: string): Promise<CardActivities> {
  const res = noteAuth(await fetch(`/v1/boards/${boardId}/cards/${cardId}/activities`, { headers }));
  if (!res.ok) throw new ApiError('getCardActivities', res.status);
  return (await res.json()) as CardActivities;
}

/**
 * Send a card that is waiting on a person back to work, with a comment the next agent reads.
 * The caller reads `res.ok` and, on a refusal, `{ error: { message } }` — the server says what to
 * do instead (answer the question, decide the review).
 */
export async function resumeCard(boardId: string, cardId: string, comment: string, toStageKey?: string): Promise<Response> {
  return fetch(`/v1/boards/${boardId}/cards/${cardId}/resume`, {
    method: 'POST',
    headers: await withAuthority(headers),
    body: JSON.stringify({ comment, ...(toStageKey ? { toStageKey } : {}) }),
  }).then(noteAuth);
}

/**
 * Everything waiting on a person across the workspace (`GET /v1/stale?attention=1`): every card in
 * `input-required` at any age, plus cards sitting in a stage nothing claims past their board's
 * threshold.
 */
export async function listAttention(): Promise<{ cards: StaleCard[]; boardsUnanswered: number }> {
  const res = noteAuth(await fetch('/v1/stale?attention=1', { headers }));
  if (!res.ok) throw new ApiError('listAttention', res.status);
  return (await res.json()) as { cards: StaleCard[]; boardsUnanswered: number };
}
