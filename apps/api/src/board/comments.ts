import { newId } from '../ids';
import type { BoardContext } from './context';
import type { Result } from './model';
import { COMMENT_MAX_BYTES } from './rules';
import type { CommentView } from './views';

/**
 * A card's comment thread, from people and from the agent holding its run.
 */

/** What comments needs from the rest of the board. */
export type CommentsDeps = Pick<
  BoardContext,
  | 'addComment'
  | 'denyForeignRun'
  | 'emit'
  | 'getCardRow'
  | 'getMeta'
  | 'getRunRow'
  | 'listComments'
  | 'now'
  | 'sql'
>;

/** How many comments, and how many bytes of them, a run context carries at most. */
export const RUN_CONTEXT_COMMENTS = 20;

export const RUN_CONTEXT_COMMENT_BYTES = 16384;

export async function listComments(deps: CommentsDeps, cardId: string): Promise<Result<CommentView[]>> {
  if (!deps.getMeta('boardId')) return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  if (!deps.getCardRow(cardId)) return { ok: false, code: 'CARD_NOT_FOUND', message: `card not found: ${cardId}` };
  return { ok: true, value: commentRows(deps, cardId) };
}

export async function addComment(deps: CommentsDeps, input: { cardId: string; author: CommentView['author']; body: string }): Promise<Result<CommentView>> {
  if (!deps.getMeta('boardId')) return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  if (!deps.getCardRow(input.cardId)) return { ok: false, code: 'CARD_NOT_FOUND', message: `card not found: ${input.cardId}` };
  if (typeof input.body !== 'string' || input.body.trim() === '') {
    return { ok: false, code: 'INVALID_COMMENT', message: 'a comment needs a non-empty body' };
  }
  const bytes = new TextEncoder().encode(input.body).length;
  if (bytes > COMMENT_MAX_BYTES) {
    return { ok: false, code: 'INVALID_COMMENT', message: `a comment is at most ${COMMENT_MAX_BYTES} bytes; this one is ${bytes}` };
  }
  if (input.author.kind === 'agent') {
    const holds = deps.sql
      .exec(`SELECT 1 FROM runs WHERE card_id = ? AND agent_id = ? AND status = 'working' LIMIT 1`, input.cardId, input.author.id)
      .toArray();
    if (holds.length === 0) {
      return { ok: false, code: 'NO_RUN_ON_CARD', message: 'an agent may comment only on a card its live run holds' };
    }
  }
  return { ok: true, value: writeComment(deps, input.cardId, input.author, input.body) };
}

/**
 * Write a comment, with no say over whether this author may.
 *
 * `addComment` is the door, and it checks; this is the room behind it, for the board's own writes
 * on someone's behalf — a judge's findings land as the judge's comment after its run has ended,
 * which `addComment`'s live-run rule would refuse.
 */
export function writeComment(deps: CommentsDeps, cardId: string, author: CommentView['author'], body: string): CommentView {
  const input = { cardId, author, body };
  const id = newId('cmt');
  // Strictly after the newest comment on this card: Workers freezes the clock inside a request,
  // and a thread ordered by a timestamp two comments share is a thread whose order is a guess.
  const last = deps.sql
    .exec(`SELECT created_at FROM card_comments WHERE card_id = ? ORDER BY created_at DESC LIMIT 1`, input.cardId)
    .toArray()[0];
  const nowMs = Date.parse(deps.now());
  const lastMs = last ? Date.parse(last.created_at as string) : Number.NaN;
  const createdAt = new Date(Number.isNaN(lastMs) ? nowMs : Math.max(nowMs, lastMs + 1)).toISOString();
  deps.sql.exec(
    `INSERT INTO card_comments (id, card_id, author_kind, author_id, author_name, body, created_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
    id,
    input.cardId,
    input.author.kind,
    input.author.id,
    input.author.name,
    input.body,
    createdAt,
  );
  // The event names the comment, never its text: the event log is kept for good, and a body
  // copied into it would outlive the author deleting it.
  deps.emit('card.comment.added', { cardId: input.cardId, commentId: id, authorKind: input.author.kind });
  return commentRows(deps, input.cardId).find((c) => c.id === id)!;
}

export async function deleteComment(deps: CommentsDeps, input: { cardId: string; commentId: string; userId: string }): Promise<Result<CommentView>> {
  if (!deps.getMeta('boardId')) return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  const row = deps.sql
    .exec(`SELECT * FROM card_comments WHERE id = ? AND card_id = ?`, input.commentId, input.cardId)
    .toArray()[0];
  if (!row) return { ok: false, code: 'COMMENT_NOT_FOUND', message: `comment not found: ${input.commentId}` };
  if ((row.author_kind as string) !== 'human' || (row.author_id as string) !== input.userId) {
    return { ok: false, code: 'NOT_COMMENT_AUTHOR', message: 'only the person who wrote a comment may delete it' };
  }
  if (!row.deleted_at) {
    deps.sql.exec(`UPDATE card_comments SET body = '', deleted_at = ? WHERE id = ?`, deps.now(), input.commentId);
    deps.emit('card.comment.deleted', { cardId: input.cardId, commentId: input.commentId });
  }
  return { ok: true, value: commentRows(deps, input.cardId).find((c) => c.id === input.commentId)! };
}

export async function listRunComments(deps: CommentsDeps, input: { runId: string; agentId: string | null }): Promise<Result<CommentView[]>> {
  const row = deps.getRunRow(input.runId);
  if (!row) return { ok: false, code: 'RUN_NOT_FOUND', message: `run not found: ${input.runId}` };
  const denied = deps.denyForeignRun(row, input.agentId);
  if (denied) return denied;
  return deps.listComments(row.card_id as string);
}

export async function addRunComment(deps: CommentsDeps, input: { runId: string; agentId: string; agentName: string | null; body: string }): Promise<Result<CommentView>> {
  const row = deps.getRunRow(input.runId);
  if (!row) return { ok: false, code: 'RUN_NOT_FOUND', message: `run not found: ${input.runId}` };
  const denied = deps.denyForeignRun(row, input.agentId);
  if (denied) return denied;
  return deps.addComment({
    cardId: row.card_id as string,
    author: { kind: 'agent', id: input.agentId, name: input.agentName },
    body: input.body,
  });
}

function commentRows(deps: CommentsDeps, cardId: string): CommentView[] {
  return deps.sql
    .exec(`SELECT * FROM card_comments WHERE card_id = ? ORDER BY created_at ASC, id ASC`, cardId)
    .toArray()
    .map((r) => ({
      id: r.id as string,
      cardId: r.card_id as string,
      author: {
        kind: r.author_kind as 'human' | 'agent',
        id: r.author_id as string,
        name: (r.author_name as string | null) ?? null,
      },
      body: r.body as string,
      createdAt: r.created_at as string,
      deletedAt: (r.deleted_at as string | null) ?? null,
    }));
}

/** The bounded slice of a card's thread a run context carries (see `RunContext.comments`). */
export function commentsForRunContext(deps: CommentsDeps, cardId: string): { comments: CommentView[]; commentsOmitted: number } {
  const live = commentRows(deps, cardId).filter((c) => c.deletedAt === null);
  const kept: CommentView[] = [];
  let bytes = 0;
  const enc = new TextEncoder();
  for (let i = live.length - 1; i >= 0 && kept.length < RUN_CONTEXT_COMMENTS; i--) {
    const size = enc.encode(live[i].body).length;
    if (bytes + size > RUN_CONTEXT_COMMENT_BYTES) break;
    bytes += size;
    kept.unshift(live[i]);
  }
  return { comments: kept, commentsOmitted: live.length - kept.length };
}
