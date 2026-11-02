// Edges between cards: same-board (enforced, in the board) and cross-board (advisory, in D1).
import { isEnforcedKind, type LinkKind } from '../../board/links';
import { cardLinksBody } from '../../card-links';
import { addExternalLink, removeExternalLink } from '../../db/card-links-external';
import { statusForCode, statusForExternalLinkCode } from '../errors';
import type { BoardRequest } from './request';

// POST /v1/boards/:id/links — declare an edge · DELETE — remove one (spec §3.4).
//
// Task 12 built `addLink`/`removeLink` on the Durable Object (`board-do.ts:2139-2199`) with
// no HTTP surface; Task 17a gave it one, for the drawer's "Add blocker" and `supi link`.
//
// Task 17d: the SAME route also carries Task 16's cross-board advisory edges
// (`db/card-links-external.ts`), via an optional `toBoardId` alongside `toCardId`. One
// route, and the DATA decides the store: `toBoardId` absent, or equal to the path's own
// board, stays same-board (the DO, enforced); any other value routes to D1 (advisory, never
// read on the claim path). The client names where the other end of the edge lives — it never
// picks the store, which is what keeps the enforced/advisory distinction from becoming a lie
// a client could tell by choosing wrong.
//
// Shape-checked here, not left to the DO or the D1 module: both trust their callers by
// design, so `kind` outside the known set — and now a malformed `toBoardId` — are refused as
// a 400 before either is called, rather than being stored or crashing downstream.
export async function linksEdit({ request, env, tenantId, boardId, user, stub }: BoardRequest): Promise<Response> {
  const body = (await request.json().catch(() => null)) as
    | { fromCardId?: unknown; toCardId?: unknown; kind?: unknown; toBoardId?: unknown }
    | null;
  if (!body || typeof body !== 'object') {
    return Response.json({ error: { message: 'Expected a JSON object.' } }, { status: 400 });
  }
  if (
    typeof body.fromCardId !== 'string' ||
    body.fromCardId.trim() === '' ||
    typeof body.toCardId !== 'string' ||
    body.toCardId.trim() === ''
  ) {
    return Response.json(
      { error: { code: 'INVALID_LINK', message: 'fromCardId and toCardId are required, non-empty card ids' } },
      { status: 400 },
    );
  }
  if (body.kind !== 'blocks' && body.kind !== 'relates' && body.kind !== 'parent' && body.kind !== 'supersedes') {
    return Response.json(
      {
        error: {
          code: 'INVALID_LINK_KIND',
          message: `kind must be 'blocks', 'relates', 'parent' or 'supersedes', got ${JSON.stringify(body.kind)}`,
        },
      },
      { status: 400 },
    );
  }
  if (body.toBoardId !== undefined && (typeof body.toBoardId !== 'string' || body.toBoardId.trim() === '')) {
    return Response.json(
      { error: { code: 'INVALID_LINK', message: 'toBoardId must be a non-empty board id when present' } },
      { status: 400 },
    );
  }
  const kind: LinkKind = body.kind;
  const fromCardId = body.fromCardId;
  const toCardId = body.toCardId;
  const toBoardId = typeof body.toBoardId === 'string' ? body.toBoardId : boardId;

  if (toBoardId !== boardId) {
    // Cross-board: Task 16's advisory D1 store. `parent` is refused here rather than handed
    // to the module: `ExternalLinkKind` excludes it, and — unlike `addExternalLink` —
    // `removeExternalLink` performs no validation of its own, so a DELETE with kind=parent
    // would otherwise silently no-op (nothing was ever written under that kind) instead of
    // saying why such an edge can never exist. Same code and message `addExternalLink` would
    // give, so POST and DELETE disagree about nothing.
    if (kind === 'parent') {
      return Response.json(
        {
          error: {
            code: 'PARENT_MUST_BE_SAME_BOARD',
            message:
              "A parent edge carries a rule — a parent does not advance while a child is open — and an advisory containment relationship is one that fails to contain. Use a project to group cards across boards.",
          },
        },
        { status: 400 },
      );
    }
    // `supersedes` names a card's replacement on its own board (P7); the advisory store has no
    // such kind and its D1 CHECK stays as it is.
    if (kind === 'supersedes') {
      return Response.json(
        { error: { code: 'INVALID_LINK_KIND', message: 'supersedes links cards on one board' } },
        { status: 400 },
      );
    }
    if (request.method === 'POST') {
      const result = await addExternalLink(env.DB, tenantId, {
        from: { boardId, cardId: fromCardId },
        to: { boardId: toBoardId, cardId: toCardId },
        kind,
      });
      if (!result.ok) return Response.json({ error: result }, { status: statusForExternalLinkCode(result.code) });
      return Response.json(
        { link: { fromBoardId: boardId, fromCardId, toBoardId, toCardId, kind, enforced: false as const } },
        { status: 201 },
      );
    }
    await removeExternalLink(env.DB, tenantId, fromCardId, toCardId, kind);
    return Response.json({ ok: true, enforced: false as const });
  }

  if (kind === 'supersedes' && fromCardId === toCardId) {
    return Response.json(
      { error: { code: 'INVALID_LINK', message: 'a card cannot supersede itself' } },
      { status: 400 },
    );
  }

  // Same-board: Task 12's enforced edge on the DO, unchanged from Task 17a except that the
  // response now names its own `enforced` boolean too, matching the cross-board arm above so
  // a caller never has to infer enforcement from whether `toBoardId` was sent.
  if (request.method === 'POST') {
    const result = await stub.addLink({ fromCardId, toCardId, kind, createdBy: user?.userId ?? null });
    if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
    return Response.json({ link: { ...result.value, enforced: isEnforcedKind(kind) } }, { status: 201 });
  }
  const result = await stub.removeLink(fromCardId, toCardId, kind);
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  return Response.json({ ...result.value, enforced: isEnforcedKind(kind) });
}

// GET /v1/boards/:id/cards/:cardId/links — every edge touching this card, from both stores.
//
// `links` (same-board, from the DO's `listLinks`) and `externalLinks` (cross-board, from
// Task 16's advisory D1 rows, `card-links-external.ts`) are kept in two separate arrays
// rather than merged into one list, and each row also carries its own `enforced` boolean —
// belt and braces, because the two kinds mean different things. A same-board `blocks` is
// read on the claim path and genuinely refuses a claim; a cross-board `blocks` is shown and
// nothing more — `addExternalLink`'s own comment calls it "advisory, always". A client that
// merged them into one list, or told them apart only by comparing `toBoardId` to this
// board's id, is one bug away from drawing an enforced badge on an edge that enforces
// nothing. 17b's badge logic is built on this response never requiring that inference.
//
// 17b follow-up: the specified tooltip ("Blocked by *Title* on *Board* — not enforced across
// boards") needs a title and a board name, and `ExternalLinkRow` only ever carried ids. Each
// `externalLinks` row here also carries `otherBoardName`/`otherCardTitle` for whichever end
// is NOT `cardId` — a cheap tenant-scoped D1 read for the name, and a per-row, on-demand
// cross-DO read for the title. This is the ONLY place that title read happens: it is not
// added to `listExternalLinksFor` (the module stays free of cross-DO concerns) and it never
// informs a claim or advance decision — the whole reason the edge is advisory rather than
// enforced is that a cross-DO read is stale the instant it returns, and that stays true of
// this one too; it exists solely to label one drawer, once, on request.
export async function cardLinks({ env, tenantId, stub }: BoardRequest, cardLinksMatch: RegExpMatchArray): Promise<Response> {
  const cardId = cardLinksMatch[1]!;
  return Response.json(await cardLinksBody(env, tenantId, stub, cardId));
}
