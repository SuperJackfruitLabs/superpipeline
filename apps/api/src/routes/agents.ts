// A workspace's agents, their tokens and their A2A AgentCard.
import { capabilityTags } from '@superpipeline/contract';
import { resolveUser, resolveAgent, type AgentPrincipal, resolveHubUser, resolveHubAgent, resolveOrgPlaneUser } from '../auth/resolve';
import { AGENT_TOKEN_SCOPES, isAgentScope, scopePermits, type AgentScope } from '../auth/scopes';
import { boardStub } from '../board/stub';
import { buildAgentCard } from '../db/agent-card';
import { listCapabilities, ensureCapabilities } from '../db/capabilities';
import { listBoards, listAgents, createAgent, updateAgent, createAgentToken, revokeAgentToken, deleteAgent, setAgentExternalMapping, findAgentByExternal, agentBelongsToTenant } from '../db/catalog';
import { effectiveCapabilities } from '../db/implications';
import { mayOwnWork } from '../db/members';
import { refuseByRole } from './callers';
import { unexpected } from './errors';
import type { WorkerRequest } from './router';

// /v1/agents[/:id[/tokens/:tokenId]] — a workspace's agents + token minting (the "connect an
// agent" surface) + token revocation, right beside it. The plaintext token is returned ONCE
// on create; thereafter only its hash is stored, and revoking sets `revoked_at` on that row —
// `findAgentByTokenHash` already refuses anything revoked (catalog.ts), so this write is the
// whole mechanism.
// GET /v1/agents/:id/card — the agent's A2A AgentCard, projected from the registry.
//
// Matched before the agents block, whose regex ends at `/tokens`. This is what naming
// migration 0006's columns after `AgentSkill` was for: the card is a projection of those rows
// rather than a translation of them, so nothing is renamed on the way out.
export async function agentCard({ request, env }: WorkerRequest, cardMatch: RegExpMatchArray): Promise<Response> {
  try {
    const u = await resolveUser(request, env);
    if (!u) return Response.json({ error: 'sign in to continue' }, { status: 401 });
    if (request.method !== 'GET') return Response.json({ error: 'method not allowed' }, { status: 405 });
    const refused = refuseByRole(u, 'read');
    if (refused) return refused;

    const agents = await listAgents(env.DB, u.tenantId);
    const found = agents.find((a) => a.id === cardMatch[1]);
    if (!found) return Response.json({ error: 'no such agent' }, { status: 404 });

    // The card shows the EFFECTIVE set: what this agent can actually be routed for. Showing
    // only the declared set would publish a card that disagrees with the claim predicate.
    const effective = await effectiveCapabilities(env.DB, u.tenantId, found.capabilities);
    const card = buildAgentCard(
      { name: found.name, capabilities: effective },
      await listCapabilities(env.DB, u.tenantId),
    );
    return Response.json({ card });
  } catch (err) {
    return unexpected(err);
  }
}

export async function agentRegistry({ request, env }: WorkerRequest, agentsMatch: RegExpMatchArray): Promise<Response> {
  // Every route below is inside this, and the whole-branch review is why.
  // The only catch-all in this file wrapped `/v1/boards` alone, so an
  // unexpected error anywhere in the agents routes — a raced UNIQUE write
  // against `agents_external_pair_unique`, a malformed body, a D1 hiccup —
  // escaped the Worker's fetch handler entirely instead of becoming a
  // structured 500. Same write safety, strictly worse failure: the caller
  // got a bare Worker error with no shape a client could read. Kept out of
  // an earlier narrow fix round on purpose, because it is a property of the
  // whole route block rather than of one endpoint, and a route-wide change
  // belongs in one deliberate edit.
  try {
    // The first endpoint to accept a hub-issued token
    // (charter decisions/2026-08-15-one-issuer-and-offline-verification.md).
    //
    // Read-only, and only as a FALLBACK: the session cookie and `spa_` token
    // paths are untouched and still take precedence, so nothing that works
    // today changes. The hub token is verified offline against a cached JWKS —
    // no network call in this path — and resolves to the same principal shape,
    // so nothing downstream can tell which credential arrived.
    //
    // Deliberately not extended to POST or DELETE: a first integration should not also be the
    // first credential able to mint an agent token.
    //
    // PATCH is, and the reason above is exactly why it is safe to. That sentence is about
    // CREDENTIALS, and a PATCH mints none — it changes what an agent IS. Leaving it out had a
    // cost that showed up immediately: `supi` carries a hub token and nothing else, so the
    // queueing policy shipped with a setter the only client written for it answered 401 to,
    // while `supi agents` beside it answered 200. A permission nobody can set is the failure
    // that setter existed to fix.
    //
    // `externalId` is carved back out below. Mapping an agent to a principal is what makes an
    // agent-kind hub token resolve at all (`resolveHubAgent` finds the agent BY that mapping),
    // so a credential able to write it could point an agent row at any principal and grant
    // itself identities.
    let u = await resolveUser(request, env);
    const viaHubToken = !u;
    if (!u && (request.method === 'GET' || request.method === 'PATCH')) {
      u = await resolveHubUser(request, env);
    }
    /**
     * The two operator acts a terminal needs, opened to a person's ORGANIZATION-PLANE token:
     *
     *   - `POST /v1/agents` — create an agent, linked to its principal as it is made;
     *   - `POST /v1/agents/:id/tokens` — mint a credential for one.
     *
     * Only those two, only a human (`resolveOrgPlaneUser` resolves `principalKind: "human"` and
     * nothing else), and never a legacy hub token: the sentence above about a first integration
     * not also being the first credential able to mint still holds for the hub. The role check
     * below is the one the cookie path makes, unchanged — `manage`, so admin or owner.
     */
    const operatorAct =
      request.method === 'POST' &&
      (!agentsMatch[1] || (agentsMatch[2] === 'tokens' && !agentsMatch[3]));
    if (!u && operatorAct) u = await resolveOrgPlaneUser(request, env);
    /**
     * An AGENT may READ this list, on `read`, and nothing more.
     *
     * It is half of any routing diagnosis — a card that will not move is almost always a stage
     * asking for a capability nobody declares, and this is the side that says who declares what.
     * The row carries `tokenIds` and the queueing policy but never a token, so reading which
     * credentials exist is not holding one.
     *
     * Writes need a person: PATCH answers a hub token too, since `supi` carries one; creating an
     * agent and minting a credential answer a session or a person's org-plane token (below);
     * revoking and deleting need a session. Never an agent — charter Decision 3.
     */
    let listingAgent: AgentPrincipal | null = null;
    if (!u && request.method === 'GET' && !agentsMatch[2]) {
      listingAgent = (await resolveAgent(request, env)) ?? (await resolveHubAgent(request, env));
      if (listingAgent && !scopePermits(listingAgent.scopes, 'read')) {
        return Response.json({ error: 'this token is not permitted to read' }, { status: 403 });
      }
      if (listingAgent) {
        return Response.json({ agents: await listAgents(env.DB, listingAgent.tenantId) });
      }
    }
    if (!u && request.method !== 'GET') {
      /**
       * An AGENT on a write here is refused by name, not told to sign in.
       *
       * Every write below is workspace administration — minting and revoking credentials,
       * linking an agent to a principal, restaffing, deleting — and the control pair puts all of
       * it on the human side: an agent must never mint itself (or a peer) a credential, nor point
       * an agent row at a principal, which is what makes an agent token resolve at all. A 401
       * would send a thing that cannot sign in round a loop.
       */
      const agent = (await resolveAgent(request, env)) ?? (await resolveHubAgent(request, env));
      if (agent) {
        return Response.json({ error: 'this is not something an agent may do in this workspace' }, { status: 403 });
      }
    }
    if (!u) return Response.json({ error: 'sign in to continue' }, { status: 401 });
    const agentId = agentsMatch[1];
    const tokenId = agentsMatch[3];
    const mintingTokens = agentId && agentsMatch[2] === 'tokens' && !tokenId;

    // POST /v1/agents/:id/tokens — issue a fresh `spa_` for an agent that already exists.
    //
    // Without this, revoking an agent's last token was terminal: tokens were only ever minted
    // inside `POST /v1/agents`, so "cannot authenticate until reconnected" named a reconnect
    // that did not exist, and a linked agent — which is created with no `spa_` at all — could
    // never be issued one even when it needed a native credential.
    //
    // Human-only, exactly like revocation: `u` came from `resolveUser` or, for this route and
    // create alone, a person's org-plane token (`resolveOrgPlaneUser`, humans only) — so an
    // agent can never mint itself a second credential to outlive one a person revoked
    // (charter decisions/2026-08-13-ecosystem-identity.md Decision 3).
    // Everything below the agent list is workspace administration: minting and revoking
    // credentials, restaffing an agent, deleting one. `member` works the board; managing what
    // works it is `admin`.
    if (request.method !== 'GET') {
      const refused = refuseByRole(u, 'manage');
      if (refused) return refused;
    } else {
      const refused = refuseByRole(u, 'read');
      if (refused) return refused;
    }

    if (mintingTokens) {
      if (request.method !== 'POST') return Response.json({ error: 'method not allowed' }, { status: 405 });
      if (!(await agentBelongsToTenant(env.DB, u.tenantId, agentId))) {
        return Response.json({ error: 'agent not found' }, { status: 404 });
      }
      /**
       * A caller may ask for less than the default, and never for more than exists.
       *
       * Both mint sites passed `AGENT_TOKEN_SCOPES` unconditionally, so there was no way to
       * issue a credential that can finish the card it holds and cannot ask for another. That
       * narrowing is what makes direct MCP access for an agent defensible: AgentPod's prompt
       * contract objects that a harness driving the board itself "would keep a lease open past
       * the card it was claimed for", and a run-only token is the answer to it.
       *
       * Absent means the default, so every existing caller is unaffected.
       */
      const mintBody = (await request.json().catch(() => ({}))) as { scopes?: unknown };
      let scopes: AgentScope[] = AGENT_TOKEN_SCOPES;
      if (mintBody.scopes !== undefined) {
        const asked = mintBody.scopes;
        if (
          !Array.isArray(asked) ||
          asked.length === 0 ||
          !asked.every(isAgentScope)
        ) {
          return Response.json(
            { error: `scopes must be a non-empty subset of ${AGENT_TOKEN_SCOPES.join(', ')}` },
            { status: 400 },
          );
        }
        scopes = [...new Set(asked)];
      }
      const minted = await createAgentToken(env.DB, u.tenantId, agentId, scopes);
      return Response.json({ token: minted.token, tokenId: minted.id, scopes }, { status: 201 });
    }

    if (agentId && tokenId) {
      // Revoking a credential is a HUMAN act, same as minting one: `u` above came ONLY from
      // `resolveUser` (session cookie or dev headers) — never from a `spa_` bearer or a hub
      // token — so an agent can never revoke its own token, or a peer's, to escape an audit
      // (charter decisions/2026-08-13-ecosystem-identity.md Decision 3).
      if (request.method === 'DELETE') {
        await revokeAgentToken(env.DB, u.tenantId, agentId, tokenId);
        return new Response(null, { status: 204 });
      }
      return Response.json({ error: 'method not allowed' }, { status: 405 });
    }
    if (agentId) {
      if (request.method === 'DELETE') {
        await deleteAgent(env.DB, u.tenantId, agentId);
        return new Response(null, { status: 204 });
      }
      // PATCH links (or clears) this agent's suite principal (charter
      // decisions/2026-08-30-an-agent-is-a-principal.md §5): `{ externalId: "prn_…" }` to link,
      // `{ externalId: null }` to clear. `setAgentExternalMapping` has existed since an earlier
      // task with no caller — this is that caller. It is what lets `resolveHubAgent` turn an
      // agent-kind hub token into a local agent; with no mapping there is nothing for that
      // resolver to find, and NULL stays the normal state for a standalone board.
      if (request.method === 'PATCH') {
        // `setAgentExternalMapping` is itself tenant-scoped (mirroring `revokeAgentToken`) —
        // this check is what turns a cross-tenant PATCH into a 404 instead of a 200 whose write
        // silently landed nowhere.
        if (!(await agentBelongsToTenant(env.DB, u.tenantId, agentId))) {
          return Response.json({ error: 'agent not found' }, { status: 404 });
        }
        const body = (await request.json()) as {
          externalId?: string | null;
          name?: string;
          capabilities?: string[];
          iconUrl?: string | null;
          concurrency?: number;
          /** The queueing policy (migration 0015). `unknown` because both are validated below. */
          ownerUserId?: unknown;
          mayQueueTo?: unknown;
          queueCeilingPerHour?: unknown;
        };

        // The agent's OWN properties, which until now could be set exactly once — in the
        // INSERT inside `createAgent` — and changed nowhere. An agent staffed with the wrong
        // capabilities could not be restaffed; the only remedy was to delete it and make
        // another, which for a linked agent discards its principal link too.
        //
        // Handled before the externalId branch, and independently of it: linking a principal
        // and editing an agent are different acts that happen to share a route, and a PATCH
        // carrying only `capabilities` must not be refused for want of an `externalId`.
        const patch: {
          name?: string;
          capabilities?: string[];
          iconUrl?: string | null;
          concurrency?: number;
          ownerUserId?: string | null;
          mayQueueTo?: string[] | null;
          queueCeilingPerHour?: number;
        } = {};
        if (body.name !== undefined) {
          if (typeof body.name !== 'string' || body.name.trim() === '') {
            return Response.json({ error: 'name must be a non-empty string' }, { status: 400 });
          }
          patch.name = body.name.trim();
        }
        if (body.capabilities !== undefined) {
          if (!Array.isArray(body.capabilities) || body.capabilities.some((c) => typeof c !== 'string' || c.trim() === '')) {
            return Response.json({ error: 'capabilities must be an array of non-empty strings' }, { status: 400 });
          }
          // Normalised on the way in, with the SAME function that spells a stage's owner
          // (`capabilityTag`, in the contract). Routing is exact string equality, so an
          // operator typing "Code Review" must produce `code-review` — what a stage named
          // "Code Review" carries — and not `code review`, which equals nothing.
          patch.capabilities = capabilityTags(body.capabilities);
          // Registered, not refused. Refusing an unknown capability here was the first design
          // and it was wrong twice over: it dead-ends the first agent in a workspace with no
          // boards, and it only ever stops the NEXT typo — the agents already holding `claim`
          // would have sailed through. Recording it instead lets `GET /v1/capabilities` say
          // "held by 13 agents, named by no stage", which finds the bug retroactively.
          await ensureCapabilities(env.DB, u.tenantId, patch.capabilities, u.userId);
        }
        if (body.iconUrl !== undefined) {
          if (body.iconUrl !== null && !/^https:\/\//i.test(body.iconUrl)) {
            // Rendered as an <img> src in the board UI, so the scheme is checked at the write
            // boundary — the same rule `addReference` applies to a reference url.
            return Response.json({ error: 'iconUrl must be an https URL, or null to clear it' }, { status: 400 });
          }
          patch.iconUrl = body.iconUrl;
        }
        if (body.concurrency !== undefined) {
          if (!Number.isInteger(body.concurrency) || body.concurrency < 1) {
            return Response.json({ error: 'concurrency must be a whole number of at least 1' }, { status: 400 });
          }
          patch.concurrency = body.concurrency;
        }
        /**
         * What bounds this agent when it queues work of its own (migration 0015).
         *
         * Both ids are checked against this workspace rather than trusted. An owner who is not
         * a user would own real work to somebody who does not exist — the `usr_dev` failure
         * with extra steps — and an allowlist naming a board that is not here permits nothing,
         * silently, while reading as configured. Both would surface only when an agent tried to
         * queue, which is the wrong end of the system to learn about a typo.
         */
        if ('ownerUserId' in body) {
          if (body.ownerUserId !== null) {
            if (typeof body.ownerUserId !== 'string' || body.ownerUserId.trim() === '') {
              return Response.json({ error: 'ownerUserId must be a user id, or null to clear it' }, { status: 400 });
            }
            if (!(await mayOwnWork(env.DB, u.tenantId, body.ownerUserId))) {
              return Response.json(
                { error: `${body.ownerUserId} is not a user in this workspace` },
                { status: 400 },
              );
            }
          }
          patch.ownerUserId = body.ownerUserId;
        }
        if ('mayQueueTo' in body) {
          if (body.mayQueueTo !== null) {
            if (!Array.isArray(body.mayQueueTo) || body.mayQueueTo.some((b) => typeof b !== 'string' || b.trim() === '')) {
              return Response.json(
                { error: 'mayQueueTo must be an array of board ids, [] for none, or null to clear it' },
                { status: 400 },
              );
            }
            const known = new Set((await listBoards(env.DB, u.tenantId)).map((b) => b.id));
            const unknown = (body.mayQueueTo as string[]).filter((b) => !known.has(b));
            if (unknown.length > 0) {
              return Response.json(
                { error: `not a board in this workspace: ${unknown.join(', ')}` },
                { status: 400 },
              );
            }
          }
          patch.mayQueueTo = body.mayQueueTo as string[] | null;
        }
        if (body.queueCeilingPerHour !== undefined) {
          const ceiling = body.queueCeilingPerHour;
          if (typeof ceiling !== 'number' || !Number.isInteger(ceiling) || ceiling < 1) {
            // Zero would be an agent that holds the scope and silently cannot use it. If that
            // is what the operator means, `mayQueueTo: []` is where they say so.
            return Response.json({ error: 'queueCeilingPerHour must be a whole number of at least 1' }, { status: 400 });
          }
          patch.queueCeilingPerHour = ceiling;
        }
        if (Object.keys(patch).length > 0) await updateAgent(env.DB, u.tenantId, agentId, patch);

        if (body.externalId !== undefined && viaHubToken) {
          // The one field a hub token may not write, and the refusal is explicit rather than a
          // silent drop: a caller that asked to link a principal and got `{ok:true}` would
          // believe it had.
          return Response.json(
            {
              error:
                'externalId cannot be set with a hub token — mapping an agent to a principal is what makes an agent token resolve, so it is a session-only act',
            },
            { status: 403 },
          );
        }
        if (body.externalId === undefined) {
          // A patch that only touched the agent's own fields is complete. Only a request that
          // named NOTHING at all is a mistake worth reporting.
          if (Object.keys(patch).length > 0) return Response.json({ ok: true });
          return Response.json(
            {
              error:
                'nothing to change: send name, capabilities, iconUrl, concurrency, ownerUserId, mayQueueTo, queueCeilingPerHour, or externalId',
            },
            { status: 400 },
          );
        }
        if (body.externalId === null) {
          await setAgentExternalMapping(env.DB, u.tenantId, agentId, null);
          return Response.json({ ok: true });
        }
        // Caught here, not left to the CHECK constraint or a downstream join: a typo becomes a
        // 400 that names the mistake, not a mapping that silently matches nothing.
        if (!/^prn_[0-9a-f]{20}$/.test(body.externalId)) {
          return Response.json({ error: 'externalId must look like prn_ followed by 20 lowercase hex characters' }, { status: 400 });
        }
        // A principal is one agent (the premise `agents_external_pair_unique`, migration 0004,
        // enforces in the schema). Checked here first so a collision reads as a sentence, not a
        // raw UNIQUE-constraint failure; re-linking THIS agent to the principal it already has
        // is not a collision — that stays idempotent.
        const claimedBy = await findAgentByExternal(env.DB, 'org-plane', body.externalId);
        if (claimedBy && claimedBy.agentId !== agentId) {
          return Response.json({ error: `${body.externalId} is already linked to a different agent` }, { status: 409 });
        }
        await setAgentExternalMapping(env.DB, u.tenantId, agentId, { externalId: body.externalId, externalSource: 'org-plane' });
        return Response.json({ ok: true });
      }
      return Response.json({ error: 'method not allowed' }, { status: 405 });
    }
    if (request.method === 'GET') {
      const agents = await listAgents(env.DB, u.tenantId);
      // How many cards each agent holds and works, summed over every board of the workspace.
      // A board that does not answer contributes nothing rather than failing the list.
      const boards = await listBoards(env.DB, u.tenantId);
      const loads = await Promise.allSettled(boards.map((b) => boardStub(env, u.tenantId, b.id).agentLoad()));
      const total = new Map<string, { claimed: number; working: number }>();
      for (const l of loads) {
        if (l.status !== 'fulfilled') continue;
        for (const [a, v] of Object.entries(l.value)) {
          const t = total.get(a) ?? { claimed: 0, working: 0 };
          total.set(a, { claimed: t.claimed + v.claimed, working: t.working + v.working });
        }
      }
      return Response.json({
        agents: agents.map((a) => ({ ...a, claimedCount: total.get(a.id)?.claimed ?? 0, workingCount: total.get(a.id)?.working ?? 0 })),
      });
    }
    if (request.method === 'POST') {
      const body = (await request.json()) as {
        name?: string;
        capabilities?: string[];
        /**
         * A suite principal this agent IS, linked as it is created.
         *
         * Optional, and its absence is the ordinary case: a standalone
         * superpipeline has no principals to name, and an agent nobody links is
         * a complete agent (migration 0003). What it removes is a
         * four-step chore — create, copy the `agt_` id, go find the `prn_`
         * in the other plane, PUT the link — and the window between the
         * create and the link where a failure leaves an agent that exists
         * and is linked to nobody.
         */
        externalId?: string;
        /** The ceiling on cards it may hold at once; absent means the default (1). */
        concurrency?: unknown;
      };
      if (!body.name || body.name.trim() === '') return Response.json({ error: 'name is required' }, { status: 400 });
      // Checked before anything is written, like the link below: a refused create leaves no agent.
      if (
        body.concurrency !== undefined &&
        (typeof body.concurrency !== 'number' || !Number.isInteger(body.concurrency) || body.concurrency < 1)
      ) {
        return Response.json({ error: 'concurrency must be a whole number of at least 1' }, { status: 400 });
      }

      const linking = typeof body.externalId === 'string' && body.externalId.trim() !== '';
      if (linking) {
        // The same two checks the PUT path makes, made BEFORE anything is
        // written: a rejected link must leave no agent behind.
        if (!/^prn_[0-9a-f]{20}$/.test(body.externalId!)) {
          return Response.json({ error: 'externalId must look like prn_ followed by 20 lowercase hex characters' }, { status: 400 });
        }
        const claimedBy = await findAgentByExternal(env.DB, 'org-plane', body.externalId!);
        if (claimedBy) {
          return Response.json({ error: `${body.externalId} is already linked to a different agent` }, { status: 409 });
        }
      }

      // Same normalisation as PATCH. This path had none at all, so an agent could be created
      // with a capability spelled in a way no stage would ever match, and the only way to
      // discover that was a card that never moved.
      const wanted = capabilityTags(body.capabilities ?? []);
      let created = await createAgent(env.DB, u.tenantId, { name: body.name.trim(), capabilities: wanted });
      await ensureCapabilities(env.DB, u.tenantId, wanted, u.userId);
      if (typeof body.concurrency === 'number' && body.concurrency !== created.concurrency) {
        await updateAgent(env.DB, u.tenantId, created.id, { concurrency: body.concurrency });
        created = { ...created, concurrency: body.concurrency };
      }

      if (linking) {
        await setAgentExternalMapping(env.DB, u.tenantId, created.id, {
          externalId: body.externalId!,
          externalSource: 'org-plane',
        });
        // No `spa_` token. A linked agent authenticates with hub JWTs
        // (`resolveHubAgent`), so minting one here would hand back a
        // long-lived secret the caller must store and never uses — and the
        // whole point of this path is to stop making the operator handle
        // credentials they did not ask for. An agent that later needs its
        // own native credential can still be issued one.
        return Response.json(
          { agent: { ...created, externalId: body.externalId, externalSource: 'org-plane' } },
          { status: 201 },
        );
      }

      const { id: tokenId, token } = await createAgentToken(env.DB, u.tenantId, created.id, AGENT_TOKEN_SCOPES);
      return Response.json({ agent: created, token, tokenId }, { status: 201 });
    }
    return Response.json({ error: 'method not allowed' }, { status: 405 });
  } catch (err) {
    return unexpected(err);
  }
}
