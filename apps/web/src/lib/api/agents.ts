/** Agents, their tokens, and the hub's dispatchable principals. */
import type { AgentScope } from '@superpipeline/contract';
import { ApiError } from '../loading';
import { hubAudienceToken } from '../hub-token';
import { fetch, headers } from './client';

export interface AgentToken {
  agent: { id: string; name: string; capabilities: string[] };
  token: string;
  tokenId: string;
}

/** One agent as the console sees it — including whether it's linked to a suite principal, and what it can still authenticate with. */
export interface AgentSummary {
  id: string;
  name: string;
  /** Display role ("Diagnostics"); null reads as "agent". */
  role: string | null;
  /** Cards this agent holds across the workspace's boards (not archived, not finished). */
  claimedCount: number;
  /** Of those, the ones it is working right now. */
  workingCount: number;
  capabilities: string[];
  /** Its mapped suite principal (`prn_…`), or null — the normal state for a standalone board. */
  externalId: string | null;
  externalSource: string | null;
  /** An avatar for card tiles, or null — the tile falls back to a coloured initial. */
  iconUrl: string | null;
  /** How many cards this agent may hold at once. */
  concurrency: number;
  /**
   * Active (non-revoked) token ids. Empty means this agent cannot authenticate with a `spa_`
   * token right now — which for a linked agent is the ordinary state, since it authenticates
   * with hub-issued tokens instead.
   */
  tokenIds: string[];
}

/** The scope vocabulary a mint may narrow to. See `issueAgentToken`. */
export { AGENT_TOKEN_SCOPES, type AgentScope } from '@superpipeline/contract';

/**
 * Register an agent and mint its bearer token (shown once).
 *
 * With `externalId` the agent is created AND linked to that suite principal in
 * the one call, and **no** `spa_` token comes back: a linked agent
 * authenticates with hub JWTs, so minting one would hand over a secret the
 * operator must store and never uses.
 */
export async function createAgent(
  name: string,
  capabilities: string[],
  externalId?: string,
  opts: { concurrency?: number } = {},
): Promise<AgentToken> {
  const body: Record<string, unknown> = externalId ? { name, capabilities, externalId } : { name, capabilities };
  if (opts.concurrency !== undefined) body.concurrency = opts.concurrency;
  const res = await fetch('/v1/agents', { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    // The Worker's message is the useful one — "already linked to a different
    // agent" is what an operator needs to read, not a bare status code.
    const detail = await res.json().catch(() => null) as { error?: string } | null;
    throw new Error(detail?.error ?? `createAgent failed (${res.status})`);
  }
  return (await res.json()) as AgentToken;
}

/**
 * An agent this operator may dispatch, as the hub reports it.
 *
 * Three fields, because three is what the endpoint returns. There is no `kind`
 * — everything in the list is an agent — and no `suspendedAt`, because a
 * suspended agent is not in the list at all: the hub filters it, and it has to,
 * since the answer is "what you may use" rather than an inventory of the fleet.
 */
export interface HubPrincipal {
  id: string;
  handle: string;
  displayName: string | null;
}

/**
 * The agents this operator may dispatch, from the hub.
 *
 * **Changed from `GET /api/admin/principals` with `credentials: 'include'`,
 * which could not work from `superpipeline.dev` and never did.** The hub's session
 * cookie is `SameSite=Lax` on another registrable domain, so the browser never
 * attached it; and the hub's admin middleware does not accept a hub-issued
 * token either, so holding one would not have rescued it. `GET
 * /api/fleet/dispatchable` is the endpoint built for this question: a Bearer
 * token, no admin role, and it answers with the agents the token's own
 * `mayDispatch` names rather than every principal in the fleet.
 *
 * **Null is an ordinary result and must stay one** — a standalone superpipeline, an
 * operator who has not connected, an expired token, a hub that is down. The
 * caller shows nothing rather than an error, because a superpipeline with no hub is
 * not a broken superpipeline (migration 0003).
 */
export async function getHubPrincipals(): Promise<HubPrincipal[] | null> {
  // Asked first so a board with no authority makes no cross-origin request at
  // all: with no token there is nothing to send, and the answer is the same.
  //
  // `hubAudienceToken`, not `hubToken`: after the Organization-plane cutover the app's own token
  // names this deployment as its audience and the hub refuses it, so the picker uses the second,
  // hub-audience token the issuer contract (§3.1) lets this client hold.
  const token = await hubAudienceToken();
  if (!token) return null;

  const base = import.meta.env.PUBLIC_HUB_URL ?? 'https://hub.agentpod.dev';
  try {
    // No `credentials`. The Bearer is the whole credential, and asking for the
    // hub's cookie would be asking for the thing that cannot travel here.
    const res = await fetch(`${base}/api/fleet/dispatchable`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { agents?: HubPrincipal[] };
    return body.agents ?? [];
  } catch {
    return null;
  }
}

/** The agents registered in the signed-in user's workspace. */
export async function getAgents(): Promise<AgentSummary[]> {
  const res = await fetch('/v1/agents', { headers });
  if (!res.ok) throw new ApiError('getAgents', res.status);
  return ((await res.json()) as { agents: AgentSummary[] }).agents;
}

/** Revoke an agent and all of its tokens. */
export function deleteAgent(agentId: string): Promise<Response> {
  return fetch(`/v1/agents/${agentId}`, { method: 'DELETE', headers });
}

/**
 * Link (or, with `null`, clear) an agent's suite principal id.
 *
 * A console action, same as minting or revoking a token — carries no `withAuthority`, because
 * this changes what a hub token can resolve to, not something the change itself needs authority
 * for. Returns the raw response so the caller can read the server's own refusal (a malformed id,
 * or an agent it doesn't own) instead of a generic failure.
 */
export function setAgentPrincipal(agentId: string, externalId: string | null): Promise<Response> {
  return fetch(`/v1/agents/${agentId}`, { method: 'PATCH', headers, body: JSON.stringify({ externalId }) });
}

/**
 * Change an agent's own properties after it exists.
 *
 * Until the API grew this, `capabilities` was fixed at creation: an agent staffed for the wrong
 * stages could only be deleted and remade, which for a linked agent threw away its principal link
 * too. Deliberately separate from {@link setAgentPrincipal} even though both are a PATCH to the
 * same route — linking an identity and editing a description are different acts, and a caller
 * should not have to think about one to do the other.
 */
export function updateAgent(
  agentId: string,
  patch: { name?: string; capabilities?: string[]; iconUrl?: string | null; concurrency?: number },
): Promise<Response> {
  return fetch(`/v1/agents/${agentId}`, { method: 'PATCH', headers, body: JSON.stringify(patch) });
}

/**
 * Issue a fresh `spa_` token for an agent that already exists.
 *
 * The missing half of revocation: the UI has always said a revoked agent "cannot authenticate
 * until reconnected", and there was no reconnect — tokens were minted only when an agent was
 * created. The plaintext comes back exactly once, as it does on create.
 *
 * `scopes` narrows it. A `run`-only credential can drive the card it already holds and cannot
 * claim another — which is what makes it safe to hand to a harness, where the agent itself
 * spends it through MCP. Narrowing is a human act here by design: an agent cannot mint for
 * itself at all, so it can neither narrow nor widen what it was given.
 */
export async function issueAgentToken(
  agentId: string,
  scopes?: AgentScope[],
): Promise<{ token: string; tokenId: string; scopes?: AgentScope[] }> {
  const res = await fetch(`/v1/agents/${agentId}/tokens`, {
    method: 'POST',
    headers,
    // Absent means the full set, which is what every existing caller sends.
    ...(scopes ? { body: JSON.stringify({ scopes }) } : {}),
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(detail?.error ?? `issueAgentToken failed (${res.status})`);
  }
  return (await res.json()) as { token: string; tokenId: string; scopes?: AgentScope[] };
}

/**
 * Revoke ONE token, not the agent. Immediate and irreversible: `findAgentByTokenHash` refuses a
 * revoked token on every request from the moment this call succeeds — there is no undo.
 */
export function revokeAgentToken(agentId: string, tokenId: string): Promise<Response> {
  return fetch(`/v1/agents/${agentId}/tokens/${tokenId}`, { method: 'DELETE', headers });
}
