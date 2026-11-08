// Who is calling a workspace route, and whether their role reaches the act.
import { resolveUser, resolveAgent, type UserPrincipal, type AgentPrincipal, resolveHubUser, resolveHubAgent, resolveOrgPlaneUser } from '../auth/resolve';
import { orgPlaneMode } from '../auth/org-plane';
import { scopePermits, type AgentScope } from '../auth/scopes';
import { permits, type Capability } from '../db/members';
import type { Env } from '../env';

/**
 * Refuse an act this member's role does not reach, or null to proceed.
 *
 * `memberships.role` was CHECK-constrained, written once as 'owner', and read by zero queries —
 * the whole human authorization model recorded and never consulted. This is the consultation.
 *
 * Fails closed on a null role: a person whose membership was removed still holds a valid session
 * cookie naming that tenant, and they are refused rather than demoted to a reader.
 */
export function refuseByRole(user: UserPrincipal | null, capability: Capability): Response | null {
  if (!user) return Response.json({ error: 'sign in to continue' }, { status: 401 });
  if (!user.role) return Response.json({ error: 'you are not a member of this workspace' }, { status: 403 });
  if (!permits(user.role, capability)) {
    return Response.json({ error: `a ${user.role} may not do that in this workspace` }, { status: 403 });
  }
  return null;
}

/**
 * A caller on a WORKSPACE route — a person, or an agent.
 *
 * These routes (`/v1/projects`, `/v1/milestones`, `/v1/labels`, `/v1/capabilities`, `/v1/agents`)
 * resolved a human and only a human, and that was never a decision about agents: `resolveAgent` is
 * called in exactly one other place in this file, inside the board router, so an agent credential
 * never ARRIVED here to be refused. The cost was concrete — a coordinator that can queue a card
 * could not set its project, so the work fell out of every rollup and `costUsd` under-counted.
 *
 * A person is resolved first and keeps the role check they always had. Only if no human resolves is
 * an agent tried, and then the scope decides. `agentScope: null` means the route is human-only on
 * purpose, and an agent credential there is refused by name rather than with "sign in to continue",
 * which would send a thing that cannot sign in round a loop.
 */
export async function resolveWorkspaceCaller(
  request: Request,
  env: Env,
  needed: {
    human: Capability;
    agentScope: AgentScope | null;
    /**
     * Which credentials count as a PERSON here.
     *
     * `'session'` means a session cookie only — the boundary `/v1/capabilities` keeps on its writes:
     * "writes fall through to `resolveUser` alone, which is the boundary this keeps." Collapsing that
     * into an unconditional hub fallback let a hub token DEFINE a capability, which its own test
     * caught. Default is `'session-or-hub'`, because `supi` carries a hub JWT and most routes are
     * meant to answer it.
     *
     * `'session-or-plane'` adds a HUMAN org-plane bearer and nothing else — not a legacy hub token
     * (`resolveOrgPlaneUser`). It is how a person at a terminal reaches an operator act that stays
     * closed to the hub's looser subject mapping.
     */
    humanVia?: 'session' | 'session-or-hub' | 'session-or-plane';
  },
): Promise<{ tenantId: string; user: UserPrincipal | null; agent: AgentPrincipal | null } | Response> {
  const user =
    (await resolveUser(request, env)) ??
    (needed.humanVia === 'session'
      ? null
      : needed.humanVia === 'session-or-plane'
        ? await resolveOrgPlaneUser(request, env)
        : await resolveHubUser(request, env));
  if (user) {
    const refused = refuseByRole(user, needed.human);
    if (refused) return refused;
    return { tenantId: user.tenantId, user, agent: null };
  }

  const agent = (await resolveAgent(request, env)) ?? (await resolveHubAgent(request, env));
  if (!agent) return Response.json({ error: 'sign in to continue' }, { status: 401 });
  if (needed.agentScope === null) {
    return Response.json(
      { error: 'this is not something an agent may do in this workspace' },
      { status: 403 },
    );
  }
  if (!scopePermits(agent.scopes, needed.agentScope)) {
    return Response.json(
      { error: `this token is not permitted to ${needed.agentScope}` },
      { status: 403 },
    );
  }
  return { tenantId: agent.tenantId, user: null, agent };
}

/**
 * A person's workspace role where it decides policy: who approves a broker request, who may choose
 * "Always allow", who changes a stage's decision policy (charter: workspace owners and admins). On
 * the Organization plane that is the Accounts workspace role in the verified token (`orgRole`),
 * never the local membership: a fresh tenant makes its first visitor a local `owner`. A plane
 * caller with no token role (a session cookie) is no admin. Without the plane there are no Accounts
 * roles, and the local membership is the workspace.
 */
export function workspaceRoleFor(env: Env, user: UserPrincipal | null): 'owner' | 'admin' | 'member' | 'viewer' | null {
  if (orgPlaneMode(env).kind === 'off') return user?.role ?? null;
  return user?.orgRole ?? null;
}

/** Whether this person is a workspace owner or admin, by `workspaceRoleFor`. */
export function isWorkspaceAdmin(env: Env, user: UserPrincipal | null): boolean {
  const role = workspaceRoleFor(env, user);
  return role === 'owner' || role === 'admin';
}
