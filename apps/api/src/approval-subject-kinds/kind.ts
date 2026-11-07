import type { JsonValue } from '../json';

/**
 * One piece of what a person must see before approving a subject (charter: gate.v2 §3).
 * Every string is bounded by `boundedPreview`, so a subject cannot turn a room into a
 * document store.
 */
export type PreviewBlock =
  | { type: 'text'; label?: string; text: string }
  | { type: 'field'; label: string; value: string }
  | { type: 'link'; label: string; url: string };

export const PREVIEW_TEXT_MAX = 4000;
export const PREVIEW_FIELD_MAX = 200;
export const PREVIEW_BLOCKS_MAX = 20;

function cut(v: string, max: number): string {
  return v.length > max ? `${v.slice(0, max - 1)}…` : v;
}

/**
 * Clamp a kind's preview to the wire's bounds. `complete` is false when anything was cut or
 * dropped, so a client never offers to approve text the person could not see in full.
 */
export function boundedPreview(blocks: PreviewBlock[]): { blocks: PreviewBlock[]; complete: boolean } {
  const kept = blocks.slice(0, PREVIEW_BLOCKS_MAX).map((b): PreviewBlock => {
    if (b.type === 'text') return { type: 'text', ...(b.label ? { label: cut(b.label, PREVIEW_FIELD_MAX) } : {}), text: cut(b.text, PREVIEW_TEXT_MAX) };
    if (b.type === 'field') return { type: 'field', label: cut(b.label, PREVIEW_FIELD_MAX), value: cut(b.value, PREVIEW_FIELD_MAX) };
    return { type: 'link', label: cut(b.label, PREVIEW_FIELD_MAX), url: cut(b.url, PREVIEW_TEXT_MAX) };
  });
  const complete = blocks.length <= PREVIEW_BLOCKS_MAX && kept.every((b, i) => JSON.stringify(b) === JSON.stringify(blocks[i]));
  return { blocks: kept, complete };
}

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
  /**
   * What the decider must see before approving, from the frozen payload (charter: gate.v2 §3).
   * For a post it is the exact text, character for character; a client that cannot draw every
   * block must not offer an approving option.
   */
  preview(payload: unknown): PreviewBlock[];
}

export function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value)) : null;
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
