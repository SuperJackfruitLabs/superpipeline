import type { JsonValue } from '../json';

export interface ApprovalSubjectKind {
  /** Stable kind identifier stored as the subject schema. */
  schema: string;
  /** Capabilities an executor stage must require before canonical bytes can be disclosed. */
  executorCapabilities: readonly string[];
  /** Pull this kind's public payload from a run handoff. */
  payload(handoff: Record<string, JsonValue>): unknown;
  /** Validate the complete payload before any durable write. */
  validationError(value: unknown): string | null;
  /** Whether this kind can inspect this public URL without a posting credential. */
  canReadBack(url: URL): boolean;
  /** Read an approved digest from a credential-free public response, when one is exposed. */
  readBackDigest(response: Response): Promise<string | null>;
}

export function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/** A public endpoint may expose the digest as a header or as a small JSON read-back document. */
export async function publicDigest(response: Response): Promise<string | null> {
  const header = response.headers.get('x-superpipeline-approved-digest');
  if (header) return header;
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) return null;
  try {
    const body = record(await response.json());
    return body && typeof body.approvedDigest === 'string' ? body.approvedDigest : null;
  } catch {
    return null;
  }
}
