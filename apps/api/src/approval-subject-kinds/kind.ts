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
 * The whole preview's budget the decision carrier accepts, in UTF-8 bytes of its JSON-encoded
 * strings (agentpod's hub, `PREVIEW_TOTAL_BYTES` in its gate wire). A variant gate splits it
 * evenly between its variants, so no variant's preview is cut to make room for a sibling's.
 */
export const PREVIEW_TOTAL_BYTES = 16_000;

const utf8 = new TextEncoder();
/** What a string costs inside an event: its JSON encoding, in UTF-8 bytes (the carrier's measure). */
function jsonBytes(v: string): number {
  return utf8.encode(JSON.stringify(v)).length;
}

/** What a block costs against a byte budget, measured as the carrier measures it. */
export function previewBlockBytes(b: PreviewBlock): number {
  if (b.type === 'text') return jsonBytes(b.label ?? '') + jsonBytes(b.text);
  if (b.type === 'field') return jsonBytes(b.label) + jsonBytes(b.value);
  return jsonBytes(b.label) + jsonBytes(b.url);
}

/**
 * Cut a string to at most `max` JSON-encoded bytes, marking the cut. It never ends on half of a
 * surrogate pair: JSON escapes a lone surrogate to six bytes, more than the whole pair costs, so
 * the longest prefix that fits always keeps the pair whole.
 */
function cutToBytes(v: string, max: number): string {
  if (jsonBytes(v) <= max) return v;
  let lo = 0;
  let hi = v.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (jsonBytes(`${v.slice(0, mid)}…`) <= max) lo = mid;
    else hi = mid - 1;
  }
  return `${v.slice(0, lo)}…`;
}

/**
 * Keep blocks, in order, within `totalBytes`. The first block that does not fit is shortened when
 * it is text (a field or a link is never shortened past its per-block bound: a cut URL is a
 * different address), and everything after it is dropped.
 */
function withinBytes(blocks: PreviewBlock[], totalBytes: number): PreviewBlock[] {
  const kept: PreviewBlock[] = [];
  let spent = 0;
  for (const b of blocks) {
    const cost = previewBlockBytes(b);
    if (spent + cost <= totalBytes) {
      kept.push(b);
      spent += cost;
      continue;
    }
    const room = totalBytes - spent - jsonBytes(b.label ?? '');
    // Room for at least a few characters and the mark; less than that says nothing.
    if (b.type === 'text' && room > jsonBytes('…') + 8) kept.push({ ...b, text: cutToBytes(b.text, room) });
    break;
  }
  return kept;
}

/**
 * Clamp a kind's preview to the wire's bounds. `complete` is false when anything was cut or
 * dropped, or when there was nothing to show, so a client never offers to approve text the
 * person could not see in full. `totalBytes`, when given, bounds the whole preview as well
 * (a variant's share of `PREVIEW_TOTAL_BYTES`).
 */
export function boundedPreview(blocks: PreviewBlock[], totalBytes?: number): { blocks: PreviewBlock[]; complete: boolean } {
  const clamped = blocks.slice(0, PREVIEW_BLOCKS_MAX).map((b): PreviewBlock => {
    if (b.type === 'text') return { type: 'text', ...(b.label ? { label: cut(b.label, PREVIEW_FIELD_MAX) } : {}), text: cut(b.text, PREVIEW_TEXT_MAX) };
    if (b.type === 'field') return { type: 'field', label: cut(b.label, PREVIEW_FIELD_MAX), value: cut(b.value, PREVIEW_FIELD_MAX) };
    return { type: 'link', label: cut(b.label, PREVIEW_FIELD_MAX), url: cut(b.url, PREVIEW_TEXT_MAX) };
  });
  const kept = totalBytes === undefined ? clamped : withinBytes(clamped, totalBytes);
  // An empty preview is never complete: there is nothing for the person to have seen.
  const complete =
    kept.length > 0 && blocks.length === kept.length && kept.every((b, i) => JSON.stringify(b) === JSON.stringify(blocks[i]));
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
