import { z } from 'zod';

const id = z.string().min(1).max(256);
export const ExecutionExportHintV1 = z.object({
  schema_version: z.literal('agentpod-execution-export/v1'),
  export_id: z.uuid(), manifest_sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
/** Producer metadata only. Does not confer authority or independent verification. */
export const RunEvidenceProvenanceV1 = z.object({
  lease_epoch: z.number().int().nonnegative(),
  queued_by: id.nullable(),
  completion: z.object({ met: z.boolean(), unchecked_count: z.number().int().nonnegative() }).strict().nullable(),
  handoff_recorded: z.boolean(),
  references_truncated: z.boolean(),
  references: z.array(z.object({
    id, cardId: id, runId: id, url: z.string().url().max(8192),
    provider: id, sourceType: id, externalId: id.nullable(), execution_export: ExecutionExportHintV1.extend({ verification: z.literal('unverified') }).strict().nullable(), createdAt: z.iso.datetime(),
  }).strict()).max(256),
}).strict();
export const RunUsageEvidenceV1 = z.object({
  status: z.enum(['known', 'estimated', 'unknown', 'unreported', 'partial']),
  recorded_cost_usd: z.number().nonnegative().nullable(),
  estimated_cost_usd: z.number().nonnegative().nullable(),
  cost_provenance: z.enum(['agent-reported-not-provider-bill', 'unknown']),
}).strict();
