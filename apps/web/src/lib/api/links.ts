/** Links between cards: same-board (enforced) and cross-board (advisory). */
import { fetch, headers } from './client';

/** Dependencies and sub-task containment (spec §3.4) — one table on the DO, told apart by `kind`. */
export type LinkKind = 'blocks' | 'relates' | 'parent' | 'supersedes';

/**
 * A same-board edge (Task 12's `card_links`, read on the claim path). NOT always enforced: the
 * route stamps `enforced` true only for `blocks` and `parent` — `relates` and `supersedes` are
 * decoration, consulted nowhere `blockedWhere` looks, so they read `false` here exactly like a
 * cross-board `ExternalLink` does, even though they live in the same-board store.
 */
export interface Link {
  fromCardId: string;
  toCardId: string;
  kind: LinkKind;
  createdAt: string;
  createdBy: string | null;
  enforced: boolean;
}

/**
 * A cross-board edge (Task 16's `card_links_external`) — advisory, always. `parent` is not a valid
 * kind here: a parent edge carries a rule (a parent does not advance while a child is open), and
 * an edge nothing enforces cannot carry one.
 */
export interface ExternalLink {
  fromBoardId: string;
  fromCardId: string;
  toBoardId: string;
  toCardId: string;
  kind: 'blocks' | 'relates';
  enforced: false;
  /**
   * The OTHER end's card title (whichever end is not the card `listLinks` was asked about),
   * resolved server-side, per row, by `GET .../links` itself (17b follow-up, commit `433f4bb`) —
   * never re-derived or re-fetched on the client. `null` is a real state, not a missing field: the
   * other board may be unavailable, the card may be gone, or it may belong to another tenant, and
   * the route degrades that one row rather than failing the whole response.
   */
  otherCardTitle: string | null;
  /** The OTHER end's board name, resolved the same way and with the same `null` meaning. */
  otherBoardName: string | null;
}

export interface CardLinks {
  links: Link[];
  externalLinks: ExternalLink[];
}

/**
 * Declare an edge between two cards. Returns the raw response, like `setStages` does, so a caller
 * can show the server's own refusal sentence — `LINK_WOULD_CYCLE` and `ALREADY_HAS_PARENT` each
 * say which cards are involved, and "invalid link" would throw that away.
 *
 * `toBoardId` names where `toCardId` lives when it is on another board. Omitted, the edge stays
 * same-board and enforced (Task 12's DO). Given a board other than `boardId`, the SAME route
 * (Task 17d) stores it in Task 16's advisory D1 table instead and the response says
 * `enforced: false` — the server decides the store from this value, never the client.
 */
export function addLink(boardId: string, fromCardId: string, toCardId: string, kind: LinkKind, toBoardId?: string): Promise<Response> {
  return fetch(`/v1/boards/${boardId}/links`, {
    method: 'POST',
    headers,
    body: JSON.stringify(toBoardId ? { fromCardId, toCardId, kind, toBoardId } : { fromCardId, toCardId, kind }),
  });
}

/**
 * Remove an edge. Removing one that is not there is not an error — same as the route it calls.
 * `toBoardId`, as in `addLink`, routes the removal to the advisory D1 store when it names another
 * board.
 */
export function removeLink(boardId: string, fromCardId: string, toCardId: string, kind: LinkKind, toBoardId?: string): Promise<Response> {
  return fetch(`/v1/boards/${boardId}/links`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify(toBoardId ? { fromCardId, toCardId, kind, toBoardId } : { fromCardId, toCardId, kind }),
  });
}

/** Every edge touching this card: same-board (enforced) and cross-board (advisory), kept apart. */
export async function listLinks(boardId: string, cardId: string): Promise<CardLinks> {
  const res = await fetch(`/v1/boards/${boardId}/cards/${cardId}/links`, { headers });
  if (!res.ok) return { links: [], externalLinks: [] };
  return (await res.json()) as CardLinks;
}
