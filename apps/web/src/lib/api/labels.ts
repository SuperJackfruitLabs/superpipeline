/** The workspace's labels. */
import { ApiError } from '../loading';
import { fetch, headers } from './client';

/** One entry in the tenant's label catalogue (migration 0010). */
export interface Label {
  id: string;
  tenantId: string;
  name: string;
  colour: string;
  /**
   * How this label came to exist — `declared, inferred`, the same spelling and the same
   * distinction `CapabilityRecord.origin` already carries (`apps/api/src/db/capabilities.ts`'s
   * `CapabilityOrigin`). `inferred` means it was typed into a card's Labels field and registered
   * on the spot (`resolveLabelNames`, `apps/api/src/db/labels.ts`); `declared` means someone named
   * it deliberately. Typed as the union the server actually stores, not `string`, so a third value
   * nobody meant to introduce is a compile error here rather than a silently rendered one.
   */
  origin: 'declared' | 'inferred';
  createdAt: string;
}

/** The tenant's label catalogue (migration 0010). Tenant-scoped, not board-scoped — see `/v1/labels`. */
export async function listLabels(): Promise<Label[]> {
  const res = await fetch('/v1/labels', { headers });
  if (!res.ok) throw new ApiError('listLabels', res.status);
  return ((await res.json()) as { labels: Label[] }).labels;
}

export function createLabel(input: { name: string; colour: string }): Promise<Response> {
  return fetch('/v1/labels', { method: 'POST', headers, body: JSON.stringify(input) });
}

export function updateLabel(id: string, patch: { name?: string; colour?: string }): Promise<Response> {
  return fetch(`/v1/labels/${id}`, { method: 'PATCH', headers, body: JSON.stringify(patch) });
}

export function deleteLabel(id: string): Promise<Response> {
  return fetch(`/v1/labels/${id}`, { method: 'DELETE', headers });
}
