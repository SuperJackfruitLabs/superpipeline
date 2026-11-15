import { Validator, type Schema } from '@cfworker/json-schema';
import submissionSchema from './checkpoint-contract/checkpoint-settlement.v1.json';
import policySchema from './checkpoint-contract/run-checkpoint-policy.v1.json';
import { parseCheckpointJSON } from './checkpoint-json';

export interface CheckpointPolicy {
  version: 'superpipeline.checkpoint-policy.v1';
  kind: 'superbench';
  allowUnchanged: boolean;
  repositories: Array<{ name: string; provider: 'forge' | 'github'; repository: string }>;
  checkpointRepository: string;
  reporterPrincipalId: string;
  nodeId: string;
  executors: Array<{ agentId: string; stationId: string }>;
}
export interface CheckpointReport {
  version: 'superpipeline.run-checkpoint.v1';
  settlementId: string;
  binding: {
    boardId: string;
    cardId: string;
    stageKey: string;
    runId: string;
    leaseEpoch: number;
    agentId: string;
    stationId: string;
    nodeId: string;
    attemptId: string;
  };
  policyDigest: string;
  disposition: 'changed' | 'unchanged';
  start: Array<{ name: string; commit: string }>;
  checkpoint: {
    protocol: 'superbench.v2';
    key: string;
    benchId: string;
    requestId: string;
    generationId: string;
    seal: string;
    manifestSha256: string;
    checkpointRepository: string;
    members: Array<{
      name: string;
      provider: 'forge' | 'github';
      repository: string;
      branch: string;
      objectFormat: 'sha1' | 'sha256';
      commit: string;
    }>;
  };
  execution: { id: string; exitCode: 0 };
  workerResultSha256: string;
  sourceReceiptSha256: string;
  sourceRequestSha256: string;
}
export interface CheckpointSubmission {
  version: 'superpipeline.checkpoint-settlement.v1';
  checkpoint: CheckpointReport;
  handoff: Record<string, string>;
  outcome: 'pass' | 'changes-needed';
  findings?: string;
}
// Static schema bytes are pinned by CI; this guard admits no caller-supplied schema.
function pinnedSchema(value: unknown): value is Schema {
  return typeof value === 'object' && value !== null;
}
if (!pinnedSchema(submissionSchema) || !pinnedSchema(policySchema)) throw new Error('invalid pinned schema');
const submission = new Validator(submissionSchema, '2020-12', false);
const policy = new Validator(policySchema, '2020-12', false);
function isSubmission(value: unknown): value is CheckpointSubmission {
  return submission.validate(value).valid;
}
function isPolicy(value: unknown): value is CheckpointPolicy {
  return policy.validate(value).valid;
}
export function parseCheckpointSubmission(raw: Uint8Array): CheckpointSubmission {
  const value = parseCheckpointJSON(raw);
  if (!isSubmission(value)) throw new Error('INVALID_CHECKPOINT');
  const r = value.checkpoint;
  const names = r.checkpoint.members.map((m) => m.name);
  if (
    names.some((name, i) => i > 0 && names[i - 1] >= name) ||
    r.start.length !== names.length ||
    r.start.some((m, i) => m.name !== names[i])
  )
    throw new Error('INVALID_CHECKPOINT');
  const coordinator = r.checkpoint.members.find((m) => m.name === r.checkpoint.checkpointRepository);
  if (!coordinator || r.checkpoint.seal.length !== (coordinator.objectFormat === 'sha1' ? 40 : 64))
    throw new Error('INVALID_CHECKPOINT');
  for (const [i, member] of r.checkpoint.members.entries()) {
    const width = member.objectFormat === 'sha1' ? 40 : 64;
    if (
      member.commit.length !== width ||
      r.start[i]?.commit.length !== width ||
      member.branch !== `card/${r.binding.cardId}`
    )
      throw new Error('INVALID_CHECKPOINT');
  }
  const changed = r.start.some((m, i) => m.commit !== r.checkpoint.members[i]?.commit);
  if (changed !== (r.disposition === 'changed')) throw new Error('INVALID_CHECKPOINT');
  return value;
}
export function parseCheckpointPolicy(raw: Uint8Array): CheckpointPolicy {
  const value = parseCheckpointJSON(raw);
  if (!isPolicy(value)) throw new Error('INVALID_CHECKPOINT');
  const names = value.repositories.map((m) => m.name);
  if (names.some((name, i) => i > 0 && names[i - 1] >= name) || !names.includes(value.checkpointRepository))
    throw new Error('INVALID_CHECKPOINT');
  const executors = value.executors.map((e) => e.agentId + '\0' + e.stationId);
  if (new Set(executors).size !== executors.length) throw new Error('INVALID_CHECKPOINT');
  return value;
}
