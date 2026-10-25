import { z } from 'zod';

/** Correlation only: the digest names the consumer's full decision envelope, not authority. */
export const StrictDecision = z.object({
  version: z.literal(1),
  request_id: z.string().uuid(),
  decision_digest: z.string().regex(/^[a-f0-9]{64}$/),
  expires_at: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
}).strict();
export type StrictDecision = z.infer<typeof StrictDecision>;

export function canonicalDecisionRequest(value: unknown): string {
  function normalized(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(normalized);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, normalized(x)]));
    return v;
  }
  return JSON.stringify(normalized(value));
}

/**
 * What a person approving a strict decision is shown (readable approvals): the operation in plain
 * words, each file with its size and a short preview, the agent's one-line reason, and the
 * operation digest. Carried as structured fields by the producer; never parsed from the question.
 */
export const ApprovalDetail = z.object({
  version: z.literal(1),
  summary: z.string().min(1).max(200),
  reason: z.string().min(1).max(300).nullable(),
  files: z.array(z.object({
    path: z.string().min(1).max(512),
    change: z.enum(['create', 'edit', 'delete']),
    bytes: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),
    preview: z.string().max(1200).nullable(),
  }).strict()).max(16),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export type ApprovalDetail = z.infer<typeof ApprovalDetail>;
