/**
 * Who an authenticated request is: the principal types every auth path resolves to. Types only, so
 * the resolvers (`resolve.ts`, `org-plane-resolve.ts`) and the MCP surface (`mcp/`) can share them
 * without importing each other.
 */
import type { AgentQueueingPolicy } from '../db/catalog';
import type { Role } from '../db/members';

export interface UserPrincipal {
  userId: string;
  tenantId: string;
  /**
   * What this caller is permitted to dispatch, from a verified hub token.
   *
   * Present only when the caller authenticated with one — a session cookie
   * carries no grant, and `undefined` therefore means "no authority
   * accompanied this act", which is not the same as an empty grant.
   */
  mayDispatch?: string[];
  /**
   * This caller's role in the workspace (`memberships.role`).
   *
   * **Null means "not a member here"**, and every gate refuses on it — including reads. A person
   * whose membership was removed still holds a valid session cookie naming that tenant, and
   * "not a member" must not resolve to the weakest role that can still see the board.
   */
  role: Role | null;
  /**
   * The caller's role in the Accounts workspace, from a verified Organization-plane token's
   * `orgRole` (a token naming none is `member`). Present only when the caller authenticated with a
   * plane token; absent for a session cookie, dev headers or a hub token, which carry no Accounts
   * role. Distinct from `role`, the local membership, which the first person to reach a fresh
   * tenant is given as `owner` whatever Accounts says.
   */
  orgRole?: 'owner' | 'admin' | 'member';
  /**
   * The surface this caller came through, when the credential says: `matrix` for a hub token or a
   * delegated (`act`) plane token, `web` for a plane token held by the app itself. Absent for a
   * session cookie or dev headers, which `viaFor` reads as `web`. Recorded on a gate decision so a
   * later conflict can say where it was decided.
   */
  via?: 'matrix' | 'web';
  name?: string;
  login?: string;
  avatarUrl?: string;
}

export interface AgentPrincipal {
  tenantId: string;
  /**
   * The authenticated agent. A `spa_` token always resolves one: it is compared against
   * `run.agent_id` on every run verb and on the run read, so an agent only drives and reads its own
   * runs. Null only in `DEV_AUTH` mode when no `X-Agent-Id` was sent — there is no identity to
   * compare and the lease alone authorizes; the claim route refuses it outright.
   */
  agentId: string | null;
  /** From the token's agent (catalog); null in dev where capabilities come from the request body. */
  capabilities: string[] | null;
  /**
   * The agent's mapped suite principal id (`agents.external_id`), already known from the same
   * catalog row a `spa_` token resolves. **Absent** (not `null`) when this auth path never looked
   * it up — the dev-header path, which carries no DB-backed identity at all — so a consumer can
   * tell "resolved, and there is none" from "not resolved here, look it up yourself".
   */
  externalId?: string | null;
  /**
   * The scopes on the `spa_` token that authenticated this request (`agent_tokens.scopes_json`).
   *
   * **Null means "this credential is not a superpipeline token"** — a hub-issued agent token, or a dev
   * header — not "no scopes". The distinction is load-bearing: `scopePermits` treats null as
   * unscoped-and-therefore-unrestricted, because a hub token's authority is the hub's and is
   * checked by the control pair at claim time, not by a scope superpipeline never minted.
   */
  scopes?: string[] | null;
  /**
   * The ceiling the operator set on how many cards this agent may hold (`agents.concurrency`).
   * Absent on the paths that never read the catalog row.
   */
  concurrency?: number;
  /**
   * The control pair's first half, as THIS agent holds it — the principals it may itself dispatch.
   *
   * Present only from the hub-token path, because only the hub knows it: the grant is set with
   * `fleet grants set` and travels in the token's claims, exactly as a human's does. A `spa_`
   * token carries no claims, so this is **absent** there — and absent is not `[]`. The hub's own
   * contract says so ("ABSENT from one that does not, and the difference matters — absent must not
   * be read as 'permitted nothing'"), and the queueing route reads the two differently: an empty
   * grant is an operator's decision, an absent one is a credential that cannot speak to the
   * question at all.
   *
   * This is what an agent-queued card's `queuedGrant` is built from. Nothing copies it into this
   * plane: a stored copy would keep authorising dispatches after the operator revoked them.
   */
  mayDispatch?: string[];
  /**
   * What the operator set on the agent row for queueing work of its own (migration 0015): the
   * human an agent-queued card belongs to, which boards may receive one, and how many per hour.
   *
   * Absent on the dev-header path, which reads no catalog row at all.
   */
  queueing?: AgentQueueingPolicy;
}

export interface ServicePrincipal {
  /** The hub's `prn_…`. Not a local user or agent: a service has neither here. */
  principalId: string;
  tenantId: string;
  /**
   * From the token's `scope` claim, split on spaces. Empty when absent. These are the scopes as
   * minted: a hub-side narrowing or revocation reaches superpipeline only when the token expires
   * (the hub's TOKEN_TTL).
   */
  scopes: string[];
}

/** The principal resolved from the bearer token (the OAuth Resource Server side, docs/05 §2). */
export interface McpAuth {
  tenantId: string;
  agentId: string;
  capabilities: string[];
  /**
   * The token's scope set, or `null` for a credential that did not come from `agent_tokens`.
   * `null` means unscoped rather than unpermitted — see `scopePermits`.
   */
  scopes?: string[] | null;
  /**
   * The agent's mapped suite principal id (`agents.external_id`), already known from the same
   * catalog row the `spa_` token resolved against. Absent when this auth path never looked it up
   * (the dev bearer) — see `AgentPrincipal.externalId` above, which this mirrors.
   */
  externalId?: string | null;
}
