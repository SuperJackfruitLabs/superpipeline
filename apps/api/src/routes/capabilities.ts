// The capability registry and what one capability implies about another.
import { capabilityTag, capabilityTags } from '@superpipeline/contract';
import { resolveUser, resolveHubUser } from '../auth/resolve';
import { listCapabilities, createCapability, updateCapability, deleteCapability, capabilityById, capabilityUsage, ensureCapabilities, similarKeys } from '../db/capabilities';
import { addImplication, listImplications, removeImplication } from '../db/implications';
import { refuseByRole, resolveWorkspaceCaller } from './callers';
import { unexpected } from './errors';
import type { WorkerRequest } from './router';

// /v1/capabilities[/:id] — the capability registry (migration 0006).
//
// A capability used to be a free string on both sides of an equality test, with nothing
// defining the set, so five producers each invented a vocabulary and almost nothing matched.
// These routes give a capability an identity and a definition.
//
// They deliberately do NOT enumerate what may exist: four of the five reference agent
// registries (MCP, A2A, Entra, NANDA) decline to define a vocabulary and standardise the
// record instead, and a closed list here would be a migration every time somebody adds a
// stage. The rows are shaped as A2A `AgentSkill` so a future AgentCard is a projection.
// /v1/capabilities/implications — what one capability implies about another (migration 0007).
//
// Matched BEFORE `/v1/capabilities/:id`, or "implications" would be read as a capability id.
//
// Routing stays exact string equality; this is how a workspace says `code-review` is a kind of
// `code` without making the match fuzzy. An agent's DECLARED set is what an operator typed;
// its EFFECTIVE set is the closure over these edges, and only the latter is matched at claim.
export async function implications({ request, env }: WorkerRequest): Promise<Response> {
  try {
    // A hub token may READ, exactly as `GET /v1/agents` already allows. The edges are half the
    // routing diagnosis — a declared set that reaches a lane only through an implication looks
    // like a mismatch until they are visible — and a terminal could not see them at all.
    // Writes fall through to `resolveUser` alone, below, which is the boundary this keeps.
    let u = await resolveUser(request, env);
    if (!u && request.method === 'GET') u = await resolveHubUser(request, env);
    if (!u) return Response.json({ error: 'sign in to continue' }, { status: 401 });

    if (request.method === 'GET') {
      const refused = refuseByRole(u, 'read');
      if (refused) return refused;
      return Response.json({ implications: await listImplications(env.DB, u.tenantId) });
    }

    // Declaring what a capability means is the same class of act as defining one.
    const refused = refuseByRole(u, 'manage');
    if (refused) return refused;

    if (request.method === 'POST') {
      const body = (await request.json()) as { from?: string; to?: string };
      const res = await addImplication(env.DB, u.tenantId, body.from ?? '', body.to ?? '', u.userId);
      if (!res.ok) {
        const message =
          res.code === 'SELF_IMPLICATION'
            ? 'a capability already implies itself; an edge to itself says nothing'
            : 'both from and to are required, and must contain a letter or a digit';
        return Response.json({ error: message }, { status: 400 });
      }
      // Both sides are registered, so an edge cannot name a capability the registry has never
      // heard of — which would show up later as an effective set nothing can explain.
      await ensureCapabilities(env.DB, u.tenantId, capabilityTags([body.from!, body.to!]), u.userId);
      return Response.json({ implications: await listImplications(env.DB, u.tenantId) }, { status: 201 });
    }

    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      const from = url.searchParams.get('from') ?? '';
      const to = url.searchParams.get('to') ?? '';
      if (!(await removeImplication(env.DB, u.tenantId, from, to))) {
        return Response.json({ error: 'no such implication' }, { status: 404 });
      }
      return new Response(null, { status: 204 });
    }

    return Response.json({ error: 'method not allowed' }, { status: 405 });
  } catch (err) {
    return unexpected(err);
  }
}

export async function capabilities({ request, env }: WorkerRequest, capsMatch: RegExpMatchArray): Promise<Response> {
  try {
    // A hub token may READ the registry — "anyone who can see the board needs to know what its
    // lanes ask for", and that included nobody at a terminal. Defining the vocabulary stays
    // session-only: it is "the same class of act as managing its agents", which is human-only
    // on purpose, so the fallback is scoped to GET and nothing below it changes.
    // Reads open to an agent: routing is exact string equality between a stage's owner and an
    // agent's capabilities, so this is HALF the diagnosis of a card that will not move. Declaring
    // the vocabulary stays a person's act, which the route's own comment already argued.
    const caller = await resolveWorkspaceCaller(request, env, {
      human: request.method === 'GET' ? 'read' : 'manage',
      agentScope: request.method === 'GET' ? 'read' : null,
      // Defining (POST) and redefining (PATCH) also answer a person's org-plane token, so `supi
      // capability define` can do from a terminal what Workspace -> Capabilities does — with the
      // same `manage` role check. A legacy hub token stays refused, and DELETE stays
      // session-only. An agent is refused on every write by `agentScope: null` above.
      humanVia:
        request.method === 'GET'
          ? 'session-or-hub'
          : request.method === 'POST' || request.method === 'PATCH'
            ? 'session-or-plane'
            : 'session',
    });
    if (caller instanceof Response) return caller;
    const { tenantId: wsTenantId, user: u } = caller;
    const capId = capsMatch[1];

    if (request.method === 'GET' && !capId) {
      // A read: anyone who can see the board needs to know what its lanes ask for.
      return Response.json({ capabilities: await listCapabilities(env.DB, wsTenantId) });
    }

    // Defining the workspace's vocabulary is the same class of act as managing its agents.

    if (request.method === 'POST' && !capId) {
      const body = (await request.json()) as {
        key?: string;
        name?: string;
        description?: string | null;
        tags?: string[];
        examples?: string[];
        externalId?: string | null;
        externalSource?: string | null;
      };
      if (!body.key || capabilityTag(body.key) === '') {
        return Response.json({ error: 'key is required, and must contain a letter or a digit' }, { status: 400 });
      }
      // Existing keys that look like the one being created, computed BEFORE the write so the
      // candidate does not match itself. A hint on the response, never a refusal: only a
      // person knows whether `cdoe` was a typo for `code` or a word they meant.
      const existing = (await listCapabilities(env.DB, wsTenantId)).map((c) => c.key);
      const similar = similarKeys(body.key, existing);

      // Built from named fields rather than `{ ...body, key: body.key, createdBy: u.userId }`:
      // `createdBy` already won that field (it was placed after the spread), but the cast
      // above does not stop a body from carrying other keys `createCapability` happens to
      // read — safe today only because its input type coincides with this one.
      const made = await createCapability(env.DB, wsTenantId, {
        key: body.key,
        name: body.name,
        description: body.description,
        tags: body.tags,
        examples: body.examples,
        externalId: body.externalId,
        externalSource: body.externalSource,
        // `u?.`, not `u!.`: the helper above refuses an agent on every non-GET here, so this is
        // always a person — but the guarantee lives in that call's arguments rather than in the
        // type, and `created_by` is nullable precisely so a caller without a user id is
        // representable. Same shape `registerStageCapabilities` already uses.
        createdBy: u?.userId ?? null,
      });
      if (!made) {
        // A collision reads as a sentence rather than a raw UNIQUE failure — and re-declaring
        // an existing capability is a rename, which `PATCH` does.
        return Response.json({ error: `${capabilityTag(body.key)} already exists in this workspace` }, { status: 409 });
      }
      return Response.json(similar.length > 0 ? { capability: made, similar } : { capability: made }, {
        status: 201,
      });
    }

    if (capId && request.method === 'PATCH') {
      const body = (await request.json()) as {
        name?: string;
        description?: string | null;
        tags?: string[];
        examples?: string[];
        externalId?: string | null;
        externalSource?: string | null;
      };
      // `key` is absent by design: stages and agents carry it, so renaming it in place would
      // orphan every one of them silently — the identical reason a stage key cannot be renamed.
      if ('key' in body) {
        return Response.json({ error: 'a capability key cannot be renamed — stages and agents refer to it. Create another and restaff.' }, { status: 400 });
      }
      // Built from named fields rather than forwarding `body` whole: the cast above strips
      // nothing at runtime, so the route has to name what `updateCapability` accepts.
      if (
        !(await updateCapability(env.DB, wsTenantId, capId, {
          name: body.name,
          description: body.description,
          tags: body.tags,
          examples: body.examples,
          externalId: body.externalId,
          externalSource: body.externalSource,
        }))
      ) {
        return Response.json({ error: 'capability not found, or nothing to change' }, { status: 404 });
      }
      return Response.json({ capability: await capabilityById(env.DB, wsTenantId, capId) });
    }

    if (capId && request.method === 'DELETE') {
      const cap = await capabilityById(env.DB, wsTenantId, capId);
      if (!cap) return Response.json({ error: 'capability not found' }, { status: 404 });
      // Removing one that is still named would silently stop the registry describing the
      // product: the strings stay on the stage and the agent, matching carries on, and the
      // list quietly goes wrong. So the refusal names who still refers to it.
      const used = await capabilityUsage(env.DB, wsTenantId, cap.key);
      if (used.agents.length > 0 || used.boards.length > 0 || used.implications.length > 0) {
        const who = [
          used.boards.length > 0 ? `boards ${used.boards.join(', ')}` : null,
          used.agents.length > 0 ? `agents ${used.agents.join(', ')}` : null,
          // An edge refers to it too. Deleting one end would leave an agent's effective set
          // containing a capability the registry can no longer explain.
          used.implications.length > 0 ? `implications ${used.implications.join(', ')}` : null,
        ].filter(Boolean).join(' and ');
        return Response.json({ error: `${cap.key} is still used by ${who}`, usage: used }, { status: 409 });
      }
      await deleteCapability(env.DB, wsTenantId, capId);
      return new Response(null, { status: 204 });
    }

    return Response.json({ error: 'method not allowed' }, { status: 405 });
  } catch (err) {
    return unexpected(err);
  }
}
