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
