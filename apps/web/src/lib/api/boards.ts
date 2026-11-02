/** Boards: the list, one board's snapshot, its stages, settings, profiles and live feed. */
import { ApiError } from '../loading';
import { fetch, headers, noteAuth, TENANT, DEV_USER } from './client';
import type { Card, Reference } from './cards';
import type { Gate, Elicitation } from './gates';
import type { BoardUsage } from './usage';

export interface BoardSummary {
  id: string;
  name: string;
  /** Live (not archived) cards on the board. */
  cardCount: number;
  /** Of those, the ones that need a person now (the contract's `needsYou` rule). */
  needsYouCount: number;
  /** When a card on the board last changed (ISO), or null when never recorded. */
  lastActivityAt: string | null;
}

export interface Stage {
  /** The stage's standing rule, handed to every agent that claims a card here. */
  instructions?: string;
  /** One line saying what happens here, printed on an empty board. */
  summary?: string;
  key: string;
  name: string;
  order: number;
  gate?: 'none' | 'approval';
  wipLimit?: number;
  routing?: 'pipeline' | 'manager';
  /**
   * Who works this stage.
   *
   * `'agent'` was missing here while the server has always had it — `StageDef.ownerKind` is
   * `'capability' | 'agent' | 'human'` and `isAgentClaimable` tests for exactly that value. So a
   * board with a stage pinned to ONE agent was a board this client's types said could not exist, and
   * any code branching on it was unreachable by the compiler's reckoning rather than by the data's.
   */
  ownerKind?: 'capability' | 'agent' | 'human';
  owner?: string;
  /**
   * A multi-capability requirement: `all` every member, `any` at least one. Wins over `owner`
   * when present. A sibling of `owner` rather than a widening of it, so a board written before
   * this existed reads back unchanged.
   */
  requires?: { all?: string[]; any?: string[] };
}

export interface StaleSettings {
  enabled: boolean;
  afterHours: number;
}

export interface BoardEvent {
  seq: number;
  type: string;
  payload: Record<string, unknown>;
  ts: string;
}

/**
 * The board's own log.
 *
 * `BoardDO.getEvents` has existed since the DO did and had no route: every state change was
 * appended to `events` and there was no way to read them back, so the only audit trail the
 * product keeps was unreachable.
 */
export async function getBoardEvents(boardId: string, limit = 100): Promise<BoardEvent[]> {
  const res = await fetch(`/v1/boards/${boardId}/events?limit=${limit}`, { headers });
  if (!res.ok) throw new ApiError('getBoardEvents', res.status);
  return ((await res.json()) as { events: BoardEvent[] }).events;
}

export interface BoardSnapshot {
  boardId: string | null;
  tenantId: string | null;
  name: string | null;
  stages: Stage[];
  /** The board's introduction, when it was created with one. */
  intro?: { lede: string; composeHint: string };
  cards: Card[];
  gates: Gate[];
  elicitations: Elicitation[];
  references: Reference[];
  usage: BoardUsage;
  github: {
    issueTrigger: boolean;
    webhookConfigured: boolean;
    /** Where to point the GitHub webhook for this board. */
    webhookUrl: string;
    /**
     * How many principals the board's standing trigger grant names, or null when it has none.
     * Null with `issueTrigger` on means every card the integration creates will be refused at
     * claim time — which is worth saying out loud, because nothing else notices.
     */
    triggerGrantCount: number | null;
  };
  /** Absent from a server older than stale-card settings. */
  stale?: StaleSettings;
}

export interface Profile {
  key: string;
  name: string | null;
  harness: string | null;
  model: string | null;
  permissionPolicy: string | null;
  autonomyLevel: string | null;
  capabilities: string[];
}

/**
 * Starting pipelines, and the lanes a board gets when no template is chosen.
 *
 * **Defined in `@superpipeline/contract` since 2026-09-20**, not here. `supi` creates boards too
 * now, and two copies of a template list drift in the way that is hardest to notice: both
 * clients keep working, each making a different board. Re-exported rather than merely imported
 * so every existing import of `$lib/api` keeps resolving (the barrel re-exports this module).
 */
export { DEFAULT_STAGES, BOARD_TEMPLATES, boardTemplate } from '@superpipeline/contract';

export type { BoardTemplate, BoardTemplateStage } from '@superpipeline/contract';

export async function createBoard(name: string, stages: Stage[]): Promise<string> {
  const res = await fetch('/v1/boards', { method: 'POST', headers, body: JSON.stringify({ name, stages }) });
  if (!res.ok) throw new ApiError('createBoard', res.status);
  const data = (await res.json()) as { boardId: string };
  return data.boardId;
}

export async function getBoard(boardId: string): Promise<BoardSnapshot> {
  const res = noteAuth(await fetch(`/v1/boards/${boardId}`, { headers }));
  if (!res.ok) throw new ApiError('getBoard', res.status);
  return (await res.json()) as BoardSnapshot;
}

/**
 * Rework a board's pipeline.
 *
 * The whole list, not a patch: order is a property of the list rather than of any stage in it, so
 * a partial update cannot express a reorder. Returns the raw response so a caller can show the
 * server's own refusal — "stage \"todo\" still holds 3 cards" is the useful sentence, and a
 * generic failure would hide the one fact the operator needs.
 */
export function setStages(boardId: string, stages: Stage[]): Promise<Response> {
  return fetch(`/v1/boards/${boardId}/stages`, { method: 'PUT', headers, body: JSON.stringify({ stages }) });
}

/**
 * Change ONE stage.
 *
 * `setStages` replaces the whole pipeline, so editing one field means sending every other stage
 * back exactly as it was read — and any edit made in between, by a person or by the board itself,
 * is overwritten by a form that never knew about it. `key` and `order` are not patchable; the
 * route refuses them by name, because reordering is a statement about the pipeline as a whole.
 */
export function patchStage(
  boardId: string,
  stageKey: string,
  patch: Partial<Pick<Stage, 'name' | 'owner' | 'ownerKind' | 'gate' | 'wipLimit'>> & {
    instructions?: string | null;
    requires?: Stage['requires'] | null;
  },
): Promise<Response> {
  return fetch(`/v1/boards/${boardId}/stages/${encodeURIComponent(stageKey)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(patch),
  });
}

/** The boards in the signed-in user's workspace. */
export async function getBoards(): Promise<BoardSummary[]> {
  const res = await fetch('/v1/boards', { headers });
  if (!res.ok) throw new ApiError('getBoards', res.status);
  return ((await res.json()) as { boards: BoardSummary[] }).boards;
}

/** Rename a board. */
export function renameBoard(boardId: string, name: string): Promise<Response> {
  return fetch(`/v1/boards/${boardId}`, { method: 'PATCH', headers, body: JSON.stringify({ name }) });
}

/** Remove a board from the workspace. */
export function deleteBoard(boardId: string): Promise<Response> {
  return fetch(`/v1/boards/${boardId}`, { method: 'DELETE', headers });
}

/** Configure the GitHub webhook secret + issue→card trigger for a board. */
export function setGithubConfig(boardId: string, cfg: { secret?: string; issueTrigger?: boolean }): Promise<Response> {
  return fetch(`/v1/boards/${boardId}/github`, { method: 'PUT', headers, body: JSON.stringify(cfg) });
}

/** Agent profiles configured on a board (docs/05 §7). */
export async function getProfiles(boardId: string): Promise<Profile[]> {
  const res = await fetch(`/v1/boards/${boardId}/profiles`, { headers });
  if (!res.ok) throw new ApiError('getProfiles', res.status);
  return ((await res.json()) as { profiles: Profile[] }).profiles;
}

export function createProfile(boardId: string, input: { key: string; name?: string; model?: string; capabilities?: string[] }): Promise<Response> {
  return fetch(`/v1/boards/${boardId}/profiles`, { method: 'POST', headers, body: JSON.stringify(input) });
}

/**
 * One message from the board's live feed.
 *
 * The DO sends a `snapshot` on connect and an `event` for everything after — including one per
 * activity (`emit('activity', { runId, cardId, activityType })` in `postActivity`). `cardId` is
 * the part that matters to a subscriber watching one card: without it every listener has to
 * refetch on every event or none at all.
 */
export interface BoardFeedEvent {
  seq: number;
  type: string;
  payload: { cardId?: string; runId?: string; [k: string]: unknown };
  ts: string;
}

/**
 * Subscribe to the board's live event feed.
 *
 * `onEvent` receives the parsed event, or `null` for the opening snapshot and for anything that
 * will not parse. It used to receive nothing at all — `() => onEvent()` discarded the message —
 * so no subscriber could tell WHICH card had changed, and the only listener refetched the whole
 * board on every event while the open card's own activity list refreshed on nothing. A run posted
 * 67 activities, every one of them delivered here, and the card drawer showed none of them.
 */
export function openBoardSocket(boardId: string, onEvent: (event: BoardFeedEvent | null) => void): WebSocket {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/v1/boards/${boardId}/ws?tenant=${TENANT}${DEV_USER ? `&user=${encodeURIComponent(DEV_USER)}` : ''}`);
  ws.addEventListener('message', (e) => {
    let parsed: BoardFeedEvent | null = null;
    try {
      const msg = JSON.parse(String(e.data)) as { kind?: string; event?: BoardFeedEvent };
      if (msg.kind === 'event' && msg.event) parsed = msg.event;
    } catch {
      // A message we cannot read is still a message: the board changed, so the caller should
      // still refresh. It simply learns nothing about what changed.
    }
    onEvent(parsed);
  });
  return ws;
}
