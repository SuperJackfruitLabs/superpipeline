// A card's machine checks: reading them, and an owner or admin passing one by hand (charter:
// decisions/2026-11-09-a-gate-may-be-decided-by-checks.md, decisions 5 and 7).
import { principalIdsFor } from '../../db/catalog';
import { flatError } from '../../flat-error';
import { workspaceRoleFor } from '../callers';
import { statusForCode } from '../errors';
import type { BoardRequest } from './request';

// GET /v1/boards/:id/cards/:cardId/checks — the checks of the card's latest arrival at a stage with
// checks, or `null` when it never reached one.
//
// Open to an agent or a person, as `gates/:id` is: everyone who can see the card sees its checks
// (charter, "who sees what"), a read names nobody and carries no authority, and the agent whose
// work came back needs it as much as the chat bridge relaying the result.
export async function cardChecksRead({ stub }: BoardRequest, match: RegExpMatchArray): Promise<Response> {
  const result = await stub.cardChecks(match[1]);
  if (!result.ok) return Response.json({ error: flatError(result) }, { status: statusForCode(result.code) });
  return Response.json({ checks: result.value });
}

// POST /v1/boards/:id/cards/:cardId/checks/:name/override — `{ comment }`. A workspace owner or
// admin, by the role in the verified token at the time, passes a pending check (or a failed one the
// card is still waiting on). Reachable with an agent's credential only to be refused by name.
export async function checkOverride({ request, env, tenantId, user, agent, stub }: BoardRequest, match: RegExpMatchArray): Promise<Response> {
  if (agent) {
    return Response.json({ error: { code: 'CHECK_OVERRIDE_NOT_ALLOWED', message: 'an agent never overrides a check' } }, { status: 403 });
  }
  const body: unknown = await request.json().catch(() => null);
  const comment = body !== null && typeof body === 'object' && 'comment' in body && typeof body.comment === 'string' ? body.comment : null;
  if (comment === null) {
    return Response.json({ error: { code: 'INVALID_COMMENT', message: 'overriding a check needs a `comment` saying why' } }, { status: 400 });
  }
  const localId = user?.userId ?? 'usr_dev';
  const principalIds = await principalIdsFor(env.DB, tenantId, [localId]);
  const principalId = principalIds.get(localId) ?? null;
  const result = await stub.overrideCheck({
    cardId: match[1],
    name: decodeURIComponent(match[2]),
    by: principalId ?? localId,
    principalId,
    role: workspaceRoleFor(env, user),
    comment,
  });
  if (!result.ok) return Response.json({ error: flatError(result) }, { status: statusForCode(result.code) });
  return Response.json(result.value);
}
