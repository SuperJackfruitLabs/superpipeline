/** The capability registry and its implications. */
import { ApiError } from '../loading';
import { fetch, headers } from './client';

/**
 * A capability, as a record rather than a string on two objects (migration 0006).
 *
 * The field names are A2A's `AgentSkill` on purpose — `docs/01` already names AgentCard as an
 * agent's capability document, and the charter's layer-reference says a capability registry must
 * not invent a replacement for A2A. A future AgentCard is a projection of these, not a
 * translation.
 */
export interface CapabilityRecord {
  id: string;
  key: string;
  name: string;
  description: string | null;
  tags: string[];
  examples: string[];
  /** `inferred` means it turned up in use and nobody ever defined it. */
  origin: 'declared' | 'inferred';
  /** Where it is also known — an OASF dotted id, say. Null is the normal state. */
  externalId: string | null;
  externalSource: string | null;
  /** A2A `AgentSkill.inputModes`/`outputModes`. Stored and projected, never enforced. */
  inputModes: string[];
  outputModes: string[];
  /** What holding this also implies holding. Absent when it implies nothing. */
  implies?: string[];
  /** How many agents hold it, and how many boards name it on a stage. */
  agentCount: number;
  boardCount: number;
}

/** An edge in the workspace's implication graph: holding `from` also means holding `to`. */
export interface Implication {
  from: string;
  to: string;
}

export async function getImplications(): Promise<Implication[]> {
  const res = await fetch('/v1/capabilities/implications', { headers });
  if (!res.ok) return [];
  return ((await res.json()) as { implications: Implication[] }).implications;
}

export function addImplication(from: string, to: string): Promise<Response> {
  return fetch('/v1/capabilities/implications', {
    method: 'POST',
    headers,
    body: JSON.stringify({ from, to }),
  });
}

export function removeImplication(from: string, to: string): Promise<Response> {
  return fetch(
    `/v1/capabilities/implications?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { method: 'DELETE', headers },
  );
}

export async function getCapabilities(): Promise<CapabilityRecord[]> {
  const res = await fetch('/v1/capabilities', { headers });
  if (!res.ok) throw new ApiError('getCapabilities', res.status);
  return ((await res.json()) as { capabilities: CapabilityRecord[] }).capabilities;
}

export function createCapability(input: { key: string; name?: string; description?: string }): Promise<Response> {
  return fetch('/v1/capabilities', { method: 'POST', headers, body: JSON.stringify(input) });
}

export function updateCapability(
  id: string,
  patch: { name?: string; description?: string | null; tags?: string[]; examples?: string[]; externalId?: string | null; externalSource?: string | null },
): Promise<Response> {
  return fetch(`/v1/capabilities/${id}`, { method: 'PATCH', headers, body: JSON.stringify(patch) });
}

export function deleteCapability(id: string): Promise<Response> {
  return fetch(`/v1/capabilities/${id}`, { method: 'DELETE', headers });
}
