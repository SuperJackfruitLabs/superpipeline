// A card's comment thread.
import { agentNamesFor } from '../../db/catalog';
import { statusForCode } from '../errors';
import type { BoardRequest } from './request';

// GET /v1/boards/:id/cards/:cardId/comments — the thread · POST — add to it.
//
// A person posts as themselves. An agent posts as itself, and only while its live run holds
// this card (`NO_RUN_ON_CARD` otherwise) — the scope gate above already required `run` for
// the POST and `read` for the GET. There is no PATCH: nobody edits a comment.
export async function commentsList({ stub }: BoardRequest, commentsMatch: RegExpMatchArray): Promise<Response> {
  const result = await stub.listComments(commentsMatch[1]);
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  return Response.json({ comments: result.value });
}

export async function commentAdd({ request, env, tenantId, user, agent, stub }: BoardRequest, commentsMatch: RegExpMatchArray): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { body?: unknown } | null;
  if (!body || typeof body !== 'object' || typeof body.body !== 'string') {
    return Response.json({ error: { code: 'INVALID_COMMENT', message: 'send { "body": "<text>" }' } }, { status: 400 });
  }
  let author: { kind: 'human' | 'agent'; id: string; name: string | null };
  if (agent) {
    if (!agent.agentId) {
      return Response.json({ error: { code: 'NO_RUN_ON_CARD', message: 'a comment needs an identified agent' } }, { status: 403 });
    }
    const names = await agentNamesFor(env.DB, tenantId, [agent.agentId]);
    author = { kind: 'agent', id: agent.agentId, name: names.get(agent.agentId) ?? null };
  } else {
    author = { kind: 'human', id: user?.userId ?? 'usr_dev', name: user?.name ?? user?.login ?? null };
  }
  const result = await stub.addComment({ cardId: commentsMatch[1], author, body: body.body });
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  return Response.json({ comment: result.value }, { status: 201 });
}

// DELETE /v1/boards/:id/cards/:cardId/comments/:commentId — its author tombstones it.
export async function commentDelete({ user, stub }: BoardRequest, oneComment: RegExpMatchArray): Promise<Response> {
  if (!user) return Response.json({ error: 'only a person deletes a comment' }, { status: 403 });
  const result = await stub.deleteComment({ cardId: oneComment[1], commentId: oneComment[2], userId: user.userId });
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  return Response.json({ comment: result.value });
}

/** Any other method on one comment: a comment is never edited. */
export async function commentNeverEdited(): Promise<Response> {
  return Response.json({ error: 'method not allowed — a comment is never edited' }, { status: 405 });
}
