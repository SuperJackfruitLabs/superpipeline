// The workspace itself: its forge host, and its link to a hub fleet.
import { orgPlaneMode } from '../auth/org-plane';
import { resolveUser, resolveHubUser } from '../auth/resolve';
import { setTenantExternalMapping, setTenantForgeHost, tenantById } from '../db/catalog';
import { refuseByRole } from './callers';
import { unexpected } from './errors';
import type { WorkerRequest } from './router';

// PATCH /v1/tenant — link this workspace to a hub fleet, or unlink it.
//
// The whole-branch review's Important: `setTenantExternalMapping` had NO production caller,
// only tests — the fifth column in this programme with none — while BOTH `resolveHubUser` and
// `resolveHubAgent` require `findTenantByExternal(db, 'agentpod', claims.tenant)` to resolve
// before a hub credential can do anything here. So the row existed only where somebody had
// made it by hand, which is the "no SQL at any point" rule broken at the exact seam between
// the two repositories. This is that writer.
//
// Shaped as the deliberate mirror of `PATCH /v1/agents/:id` (routes/agents.ts), because it is the same act
// one plane up: `{ externalId: "fleet_…" }` to link, `{ externalId: null }` to unlink, the
// source hardcoded rather than accepted from the body.
//
// **Human-only, and not merely by convention.** `u` comes from `resolveUser` alone — session
// cookie or dev headers, never a `spa_` bearer and never a hub token. Linking a plane is at
// least as consequential as revoking a credential (charter
// decisions/2026-08-13-ecosystem-identity.md Decision 3), and the hub-token path could not
// work here anyway: `resolveHubUser` needs this mapping to already exist, so a token can
// never establish the mapping that makes that token resolve. It is human-only or it is
// unreachable.
//
// Scoped to owners. The comment this replaces recorded the absence of that check as "a
// decision about the whole product rather than about this endpoint" — the decision is now
// made, in db/members.ts, and every route reads it from the same place.
/**
 * GET|PUT /v1/tenant/forge — where this workspace's forge lives.
 *
 * Deliberately NOT part of `PATCH /v1/tenant`, which is human-only because a hub token cannot
 * establish the very mapping that makes a hub token resolve — a bootstrap problem this has
 * none of. Hanging the forge host there made it unreachable from `supi`, which authenticates
 * with exactly that kind of token: the setting existed and the only client that would set it
 * got a 401.
 *
 * `manage`, not `own`. Linking a plane is an owner's act; saying which host is the forge is
 * ordinary workspace configuration, and it changes how references are read rather than who
 * this workspace answers to.
 */
export async function tenantForge({ request, env }: WorkerRequest): Promise<Response> {
  const u = (await resolveUser(request, env)) ?? (await resolveHubUser(request, env));
  if (!u) return Response.json({ error: 'sign in to continue' }, { status: 401 });

  if (request.method === 'GET') {
    const refused = refuseByRole(u, 'read');
    if (refused) return refused;
    const tenant = await tenantById(env.DB, u.tenantId);
    return Response.json({ forgeHost: tenant?.forgeHost ?? null });
  }
  if (request.method !== 'PUT') return Response.json({ error: 'method not allowed' }, { status: 405 });
  {
    const refused = refuseByRole(u, 'manage');
    if (refused) return refused;
  }
  const body = (await request.json().catch(() => null)) as { forgeHost?: string | null } | null;
  if (!body || body.forgeHost === undefined) {
    return Response.json(
      { error: 'forgeHost is required (a host like `forge.example.com`, or null to clear)' },
      { status: 400 },
    );
  }
  try {
    await setTenantForgeHost(env.DB, u.tenantId, body.forgeHost);
  } catch {
    return Response.json(
      { error: 'forgeHost must be a host — `forge.example.com`, not a URL with a path' },
      { status: 400 },
    );
  }
  return Response.json({ forgeHost: body.forgeHost });
}

export async function tenantSettings({ request, env }: WorkerRequest): Promise<Response> {
  try {
    const u = await resolveUser(request, env);
    if (!u) return Response.json({ error: 'sign in to continue' }, { status: 401 });

    if (request.method === 'GET') {
      const tenant = await tenantById(env.DB, u.tenantId);
      if (!tenant) return Response.json({ error: 'workspace not found' }, { status: 404 });
      return Response.json({ tenant });
    }
    if (request.method !== 'PATCH') return Response.json({ error: 'method not allowed' }, { status: 405 });
    // In plane mode this workspace IS an org-plane mapping; writing a fleet over it would
    // orphan it, and the next token would create a fresh tenant by first sight.
    if (orgPlaneMode(env).kind !== 'off') {
      return Response.json({ error: 'this workspace is managed by the organization plane' }, { status: 409 });
    }
    // Linking a plane is at least as consequential as revoking a credential, so it is the one
    // act reserved to an owner. The comment this replaces recorded the absence of exactly this
    // check as "a decision about the whole product rather than about this endpoint" — the
    // decision is now made, in db/members.ts, and every route reads it from the same place.
    {
      const refused = refuseByRole(u, 'own');
      if (refused) return refused;
    }

    const body = (await request.json()) as { externalId?: string | null };
    if (body.externalId === undefined) {
      return Response.json({ error: 'externalId is required (a fleet_… string, or null to unlink)' }, { status: 400 });
    }
    if (body.externalId === null) {
      await setTenantExternalMapping(env.DB, u.tenantId, null);
      return Response.json({ ok: true });
    }
    // Validated here, not left to the CHECK constraint or a downstream join, for the reason
    // the agent route gives: a typo becomes a 400 that names the mistake rather than a
    // mapping that silently matches nothing. `fleet_` + 20 hex is the hub's own TenantId
    // shape (apps/hub db/schema/tenants.ts).
    if (!/^fleet_[0-9a-f]{20}$/.test(body.externalId)) {
      return Response.json({ error: 'externalId must look like fleet_ followed by 20 lowercase hex characters' }, { status: 400 });
    }
    // **No uniqueness check here, and no unique index behind it — deliberately, and not by
    // omission.** The obvious mirror of the agent route would 409 when another workspace
    // already claims this fleet, and migration 0005 was written to enforce it before
    // migration 0002's own comment settled the question the other way: "Deliberately NOT
    // unique. superpipeline is one-tenant-per-user, so two people in the same real organisation
    // legitimately map two local boundaries onto one external id. A shared mapping must
    // never become a shared keyspace: isolation stays local, on tenant_id."
    // `test/tenant-external-mapping.test.ts` asserts exactly that. A fix wave is not the
    // place to reverse a documented decision, so the mapping stays many-to-one.
    //
    // That leaves a REAL residual, recorded rather than quietly patched: under a shared
    // mapping, `findTenantByExternal` runs `.first()` with no `ORDER BY`, so a hub credential
    // for a shared fleet lands in an ARBITRARY one of the sharing workspaces —
    // `resolveHubUser` admits into it, and `resolveHubAgent` fails closed unpredictably when
    // the agent's own row sits in the other. That ambiguity predates this route and is a
    // question about whether hub-token resolution is well-defined under a many-to-one
    // mapping at all, which is a decision above this endpoint.
    await setTenantExternalMapping(env.DB, u.tenantId, { externalId: body.externalId, externalSource: 'agentpod' });
    return Response.json({ ok: true });
  } catch (err) {
    return unexpected(err);
  }
}
