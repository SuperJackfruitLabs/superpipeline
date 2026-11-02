/** The workspace itself: its forge host and fleet link. */
import { fetch, headers } from './client';

/** This workspace, and the hub fleet it is linked to (or null for a standalone board). */
export interface WorkspaceTenant {
  id: string;
  slug: string;
  name: string;
  externalId: string | null;
  externalSource: string | null;
}

/** Read this workspace, so an operator can see whether it is linked to a hub fleet. */
export async function getWorkspace(): Promise<WorkspaceTenant | null> {
  const res = await fetch('/v1/tenant', { headers });
  if (!res.ok) return null;
  return ((await res.json()) as { tenant: WorkspaceTenant }).tenant;
}

/**
 * Link (or, with `null`, unlink) this workspace to a hub fleet.
 *
 * The counterpart of {@link setAgentPrincipal} one plane up, and the operator-facing half of the
 * whole-branch review's Important: `tenants.external_id` had no writer at all, while BOTH
 * `resolveHubUser` and `resolveHubAgent` require it before any hub-issued credential can do
 * anything here — so the row existed only where somebody had made it by hand. Linking an agent
 * is useless while the fleet it belongs to is unlinked, which is why this belongs beside that
 * control rather than in a settings page nobody visits.
 *
 * Returns the raw response so the caller can read the server's own refusal (a malformed fleet id)
 * rather than a generic failure, exactly as `setAgentPrincipal` does.
 */
/**
 * This workspace's forge host, shown and set.
 *
 * Its own route rather than part of `PATCH /v1/tenant`: that one is human-only because a hub
 * token cannot establish the mapping that makes a hub token resolve, and the forge host has no
 * such bootstrap problem.
 */
export async function getForgeHost(): Promise<string | null> {
  const res = await fetch('/v1/tenant/forge', { headers });
  if (!res.ok) return null;
  return ((await res.json()) as { forgeHost: string | null }).forgeHost;
}

export function setForgeHost(forgeHost: string | null): Promise<Response> {
  return fetch('/v1/tenant/forge', { method: 'PUT', headers, body: JSON.stringify({ forgeHost }) });
}

export function setWorkspaceFleet(externalId: string | null): Promise<Response> {
  return fetch('/v1/tenant', { method: 'PATCH', headers, body: JSON.stringify({ externalId }) });
}
