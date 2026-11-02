/** A card's comment thread. */
import { ApiError } from '../loading';
import { fetch, headers, noteAuth } from './client';

/**
 * A remark on a card, by a person or by the agent whose run holds it. `body` is Markdown source and
 * is shown as TEXT — never put it through `{@html}`. Empty once its author deleted it.
 */
export interface CardComment {
  id: string;
  cardId: string;
  author: { kind: 'human' | 'agent'; id: string; name: string | null };
  body: string;
  createdAt: string;
  deletedAt: string | null;
}

/** A card's comment thread, oldest first. */
export async function getComments(boardId: string, cardId: string): Promise<CardComment[]> {
  const res = noteAuth(await fetch(`/v1/boards/${boardId}/cards/${cardId}/comments`, { headers }));
  if (!res.ok) throw new ApiError('getComments', res.status);
  return ((await res.json()) as { comments: CardComment[] }).comments;
}

/** Post a comment as the signed-in person. Raw response, so a refusal (400 too long, 403) can be shown as the server said it. */
export async function postComment(boardId: string, cardId: string, body: string): Promise<Response> {
  return noteAuth(
    await fetch(`/v1/boards/${boardId}/cards/${cardId}/comments`, { method: 'POST', headers, body: JSON.stringify({ body }) }),
  );
}

/** Delete one of your own comments. It stays in the thread as a tombstone. */
export async function deleteComment(boardId: string, cardId: string, commentId: string): Promise<Response> {
  return noteAuth(await fetch(`/v1/boards/${boardId}/cards/${cardId}/comments/${commentId}`, { method: 'DELETE', headers }));
}
