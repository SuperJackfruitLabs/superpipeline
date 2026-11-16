/** Private settlement projection. Mapping is server-owned tenant configuration,
 * never a host or URL supplied by a checkpoint report. No route enables it. */
import type { BoardContext } from './context';
import type { CheckpointSubmission } from './checkpoint-proposal';
import { canonicalCheckpoint } from './checkpoint-json';
import { commitReference } from './references';

export interface CheckpointReferenceMapping {
  tenantId: string;
  forgeHost: string | null;
  reporterPrincipalId: string;
}
function forgeOrigin(host: string | null): string {
  if (!host || host !== host.trim() || host !== host.toLowerCase()) throw new Error('CHECKPOINT_REFERENCE_MAPPING_REQUIRED');
  let url: URL;
  try { url = new URL(`https://${host}`); } catch { throw new Error('CHECKPOINT_REFERENCE_MAPPING_REQUIRED'); }
  if (url.host !== host || url.hostname !== host || url.username || url.password || url.pathname !== '/' || url.search || url.hash)
    throw new Error('CHECKPOINT_REFERENCE_MAPPING_REQUIRED');
  return url.origin;
}
/** Run only within the receipt's owned synchronous transaction. A link is an
 * output locator, not independent verification of a producer fence or release. */
export function commitCheckpointReferences(board: BoardContext, input: CheckpointSubmission, mapping: CheckpointReferenceMapping): void {
  if (!board.commitEffects) throw new Error('COMMIT_EFFECTS_REQUIRED');
  board.commitEffects.requireActive();
  const report = input.checkpoint, binding = report.binding;
  const policy = board.stages().find((stage) => stage.key === binding.stageKey)?.checkpointPolicy;
  if (!mapping || mapping.tenantId !== board.getMeta('tenantId') || binding.boardId !== board.getMeta('boardId') ||
    !policy || mapping.reporterPrincipalId !== policy.reporterPrincipalId || policy.repositories.length !== report.checkpoint.members.length)
    throw new Error('CHECKPOINT_REFERENCE_MAPPING_REQUIRED');
  // Validate and prepare the whole vector before the first reference write.
  const references = report.checkpoint.members.map((member, i) => {
    const allowed = policy.repositories[i];
    if (!allowed || member.name !== allowed.name || member.provider !== allowed.provider || member.repository !== allowed.repository ||
      !/^[a-f0-9]+$/.test(member.commit) || member.commit.length !== (member.objectFormat === 'sha1' ? 40 : member.objectFormat === 'sha256' ? 64 : 0))
      throw new Error('INVALID_CHECKPOINT_REFERENCE');
    const parts = member.repository.split('/');
    if (parts.length !== 2 || parts.some((part) => !part || part === '.' || part === '..')) throw new Error('INVALID_CHECKPOINT_REFERENCE');
    const origin = member.provider === 'github' ? 'https://github.com' : forgeOrigin(mapping.forgeHost);
    return {
      cardId: binding.cardId, runId: binding.runId,
      url: `${origin}/${parts.map(encodeURIComponent).join('/')}/commit/${member.commit}`,
      provider: member.provider, sourceType: 'commit',
      externalId: `${member.repository.toLowerCase()}@${member.commit}`,
      title: `${member.repository}@${member.commit.slice(0, 12)}`,
      metadata: { checkpointSettlementId: report.settlementId, reporterPrincipalId: mapping.reporterPrincipalId,
        executingAgentId: binding.agentId, runId: binding.runId, leaseEpoch: binding.leaseEpoch, memberName: member.name },
    };
  });
  for (const reference of references) {
    const saved = commitReference(board, reference);
    if (!saved.ok || saved.value.url !== reference.url || saved.value.cardId !== reference.cardId ||
      saved.value.provider !== reference.provider || saved.value.sourceType !== reference.sourceType ||
      saved.value.externalId !== reference.externalId || saved.value.title !== reference.title ||
      canonicalCheckpoint(saved.value.metadata) !== canonicalCheckpoint(reference.metadata))
      throw new Error('CHECKPOINT_REFERENCE_NOT_SAVED');
  }
}
