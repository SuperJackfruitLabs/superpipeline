// One board: its snapshot, name, stages, settings, events, usage, notifications and profiles.
import { stagePatchRefusal } from '../../auth/scopes';
import type { StageDef, StagePatch, BoardSnapshot } from '../../board/board-do';
import { renameBoard, updateBoardStages, deleteBoard } from '../../db/catalog';
import { isWorkspaceAdmin } from '../callers';
import { statusForCode } from '../errors';
import type { BoardRequest } from './request';
import { registerStageCapabilities } from './stage-capabilities';

// GET /v1/boards/:id/ws — live feed (WebSocket upgrade forwarded to the DO)
export async function liveFeed({ request, stub }: BoardRequest): Promise<Response> {
  return stub.fetch(request);
}

// GET /v1/boards/:id — board snapshot
export async function boardSnapshot({ stub }: BoardRequest): Promise<Response> {
  const snapshot: BoardSnapshot = await stub.getState();
  if (!snapshot.boardId) return Response.json({ error: 'board not found' }, { status: 404 });
  return Response.json(snapshot);
}

// PATCH /v1/boards/:id — rename the board (DO + catalog)
export async function boardRename({ request, env, tenantId, boardId, stub }: BoardRequest): Promise<Response> {
  const body = (await request.json()) as { name?: string };
  if (body.name && body.name.trim() !== '') {
    const r = await stub.setName(body.name.trim());
    if (!r.ok) return Response.json({ error: r }, { status: statusForCode(r.code) });
    await renameBoard(env.DB, tenantId, boardId, body.name.trim());
  }
  return Response.json(await stub.getState());
}

// PATCH /v1/boards/:id/stages/:stageKey — change ONE stage (docs/15 §5)
//
// Beside the whole-pipeline PUT rather than replacing it: reordering and adding stages are
// statements about the pipeline and stay there. This is for the fields that belong to one
// stage, where a full replace would discard a concurrent edit to a stage nobody touched.
export async function stageEdit({ request, env, user, agent, stub }: BoardRequest, stageMatch: RegExpMatchArray): Promise<Response> {
  const body = (await request.json().catch(() => null)) as StagePatch | null;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'a stage patch must be a JSON object' }, { status: 400 });
  }
  /**
   * An agent may set a stage's `instructions` and nothing else.
   *
   * `compose` opened this route for prose; the body is where the rest is refused. `instructions`
   * is what an agent is handed when it claims the stage, and wrong prose is bad work — visible
   * in a handoff, recoverable, costing one card. `owner`, `requires`, `gate` and `wipLimit` are
   * routing, and wrong routing strands every card in the lane with nothing to see.
   */
  if (agent) {
    const refusal = stagePatchRefusal(body as Record<string, unknown>);
    if (refusal) {
      return Response.json({ error: { code: 'FIELD_NOT_COMPOSABLE', message: refusal } }, { status: 403 });
    }
  }
  // Named rather than ignored. A caller sending `key` means to rename the stage, and
  // silently dropping it would report success for a change that did not happen.
  for (const forbidden of ['key', 'order'] as const) {
    if (forbidden in body) {
      return Response.json(
        { error: `\`${forbidden}\` is not patchable — use PUT /stages, where its effect on the other stages is visible` },
        { status: 400 },
      );
    }
  }
  // Built from named fields rather than forwarding `body` whole: the cast above names the
  // same type `updateStage` accepts, but it is still only a compile-time assertion — it does
  // not stop a caller's JSON from carrying a key the type never declared.
  const result = await stub.updateStage(stageMatch[1], {
    name: body.name,
    owner: body.owner,
    ownerKind: body.ownerKind,
    requires: body.requires,
    gate: body.gate,
    wipLimit: body.wipLimit,
    instructions: body.instructions,
    summary: body.summary,
    completion: body.completion,
    returnStage: body.returnStage,
    timeout: body.timeout,
    quorum: body.quorum,
    holdFor: body.holdFor,
    checks: body.checks,
    // A stage's gate is decision policy, a workspace admin's to change (charter decision 6); the
    // board compares and refuses `WORKSPACE_ADMIN_REQUIRED`. An agent never reaches it (above).
  }, { kind: 'person', mayChangeDecisionPolicy: !agent && isWorkspaceAdmin(env, user) });
  if (!result.ok) {
    // `UNKNOWN_STAGE` is a 400 in the shared mapping, which is right where the stage is in
    // the BODY — `move` asking for a lane that does not exist is a bad request. Here it is a
    // path segment, and a path naming nothing is a 404: that is how a caller tells a typo in
    // the URL from a bad payload without reading the message.
    const status = result.code === 'UNKNOWN_STAGE' ? 404 : statusForCode(result.code);
    return Response.json({ error: result }, { status });
  }
  return Response.json(result.value);
}

// PUT /v1/boards/:id/stages — rework the pipeline (docs/03).
//
// The whole list, not a patch: order is a property of the list rather than of any stage in
// it, so a partial update cannot express a reorder. The DO validates and refuses first; the
// catalog's `stages_json` is only mirrored after that succeeds, so a rejected change never
// leaves the two disagreeing about what the board's pipeline is.
export async function stagesReplace({ request, env, tenantId, boardId, user, stub }: BoardRequest): Promise<Response> {
  const body = (await request.json()) as { stages?: StageDef[] };
  // `manage` let this caller in by the local role; changing any stage's decision policy also needs
  // a workspace owner or admin by the Accounts role (charter decision 6), which the board checks.
  const r = await stub.setStages(body.stages ?? [], { kind: 'person', mayChangeDecisionPolicy: isWorkspaceAdmin(env, user) });
  if (!r.ok) return Response.json({ error: r }, { status: statusForCode(r.code) });
  await updateBoardStages(env.DB, tenantId, boardId, JSON.stringify(r.value.stages));
  await registerStageCapabilities(env, tenantId, r.value.stages, user?.userId ?? null);
  return Response.json(await stub.getState());
}

// DELETE /v1/boards/:id — remove the board, and everything it held.
//
// This used to delete the catalog row alone, leaving the Durable Object and all its cards,
// runs, activities and references alive: unreachable through any route, undeleted, and
// still billing storage. A person who deleted a board had every reason to believe its
// contents were gone.
//
// The DO is emptied FIRST. If that throws, the catalog row survives and the board is still
// listed and still reachable — a delete that visibly did not happen, rather than a board
// that vanished from the list while its contents quietly stayed.
//
// That ordering only works if the SECOND half — `deleteBoard` — cannot fail. It used to be
// a bare `DELETE FROM boards`, which was safe only because nothing referenced that table.
// Migration 0012 changed that: `card_links_external` FKs onto `boards(id)` with no `ON
// DELETE`, so a board named by any cross-board advisory edge started throwing here, AFTER
// the DO was already gone — the exact "quiet loss" this comment describes, just moved to
// the other half. `deleteBoard` (`db/catalog.ts`) now cleans those rows in the SAME batch as
// the board itself, so this call cannot fail on that FK. Whoever next adds a foreign key
// onto `boards(id)`: it needs the same treatment here, not a reordering of these two lines —
// reordering only relocates the failure window to the irreversible half.
export async function boardDelete({ env, tenantId, boardId, stub }: BoardRequest): Promise<Response> {
  await stub.destroy();
  await deleteBoard(env.DB, tenantId, boardId);
  return new Response(null, { status: 204 });
}

// GET /v1/boards/:id/events — the board's own event log (docs/03).
//
// `BoardDO.getEvents` has existed since the DO did, with no route and no caller: every
// state change on a board — created, moved, claimed, blocked, resolved — was appended to
// `events` and there was no way to read it back. The only audit trail the product keeps was
// unreachable, which is the same as not keeping one.
export async function boardEvents({ url, stub }: BoardRequest): Promise<Response> {
  const limitParam = Number(url.searchParams.get('limit'));
  const limit = Number.isInteger(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 100;
  return Response.json({ events: await stub.getEvents(limit) });
}

// GET /v1/boards/:id/usage — cost/usage rollup (docs/07 §6). `?window=` filters to a recent span.
export async function boardUsage({ url, stub }: BoardRequest): Promise<Response> {
  const window = url.searchParams.get('window');
  return Response.json(await stub.getUsage(window ? { window } : undefined));
}

// GET /v1/boards/:id/notifications — in-app notification feed (docs/07 §7)
export async function notificationsList({ url, user, stub }: BoardRequest): Promise<Response> {
  const unreadOnly = url.searchParams.get('unread') === 'true';
  // Scoped to the caller: `user_id` was written and never read, so every board notification
  // reached every member of the workspace.
  return Response.json({ notifications: await stub.getNotifications({ unreadOnly, userId: user!.userId }) });
}

// POST /v1/boards/:id/notifications/:seq/read — mark a notification read (docs/07 §7)
export async function notificationRead({ stub }: BoardRequest, notifReadMatch: RegExpMatchArray): Promise<Response> {
  const r = await stub.markNotificationRead(Number(notifReadMatch[1]));
  return Response.json(r.ok ? r.value : { error: r });
}

// GET/POST /v1/boards/:id/profiles — agent profiles as data (docs/05 §7)
export async function profilesList({ stub }: BoardRequest): Promise<Response> {
  return Response.json({ profiles: await stub.getProfiles() });
}

export async function profileSet({ request, stub }: BoardRequest): Promise<Response> {
  const body = (await request.json()) as {
    key: string;
    name?: string;
    harness?: string;
    model?: string;
    permissionPolicy?: string;
    autonomyLevel?: string;
    capabilities?: string[];
  };
  // Built from named fields rather than forwarding `body` whole: the cast above strips
  // nothing at runtime, so the route has to name what `setProfile` accepts.
  const result = await stub.setProfile({
    key: body.key,
    name: body.name,
    harness: body.harness,
    model: body.model,
    permissionPolicy: body.permissionPolicy,
    autonomyLevel: body.autonomyLevel,
    capabilities: body.capabilities,
  });
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  return Response.json(result.value, { status: 201 });
}

// PUT /v1/boards/:id/budget — set/clear USD budget caps (docs/07 §6)
// PUT /v1/boards/:id/stale — how long a card may wait before it counts as stale, and whether
// the board reports stale cards at all (the digest and the default list). `manage`, like budget.
export async function staleSettings({ request, stub }: BoardRequest): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { enabled?: unknown; afterHours?: unknown } | null;
  if (!body || typeof body !== 'object') {
    return Response.json({ error: { code: 'INVALID_STALE_SETTINGS', message: 'send { "afterHours"?: number, "enabled"?: boolean }' } }, { status: 400 });
  }
  const result = await stub.setStaleSettings({
    ...(body.enabled !== undefined ? { enabled: body.enabled as boolean } : {}),
    ...(body.afterHours !== undefined ? { afterHours: body.afterHours as number } : {}),
  });
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  return Response.json({ stale: result.value });
}

// PUT /v1/boards/:id/decision-timeout — the board's default timeout for stages without their own
// (charter 2026-11-08, decision 1): `{ remindAfterMinutes?, escalateAfterMinutes? }`, or `null` to
// clear it. `manage` lets the caller in, like `stale`; it is decision policy, so it also needs a
// workspace owner or admin by the Accounts role (decision 6).
export async function decisionTimeoutSet({ request, env, user, stub }: BoardRequest): Promise<Response> {
  if (!isWorkspaceAdmin(env, user)) {
    return Response.json({ error: { code: 'WORKSPACE_ADMIN_REQUIRED', message: 'only a workspace owner or admin can set the board decision timeout' } }, { status: 403 });
  }
  const body: unknown = await request.json().catch(() => undefined);
  if (body === undefined) {
    return Response.json({ error: { code: 'INVALID_TIMEOUT', message: 'send { "remindAfterMinutes"?: number, "escalateAfterMinutes"?: number } or null' } }, { status: 400 });
  }
  const result = await stub.setDecisionTimeout(body);
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  return Response.json(result.value);
}

export async function budgetSet({ request, stub }: BoardRequest): Promise<Response> {
  const body = (await request.json()) as { boardUsdCap?: number | null; cardUsdCap?: number | null };
  // Built from named fields rather than forwarding `body` whole, same as the other PUT/POST
  // routes in this file: the cast strips nothing at runtime.
  const result = await stub.setBudget({ boardUsdCap: body.boardUsdCap, cardUsdCap: body.cardUsdCap });
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  return Response.json(result.value);
}
