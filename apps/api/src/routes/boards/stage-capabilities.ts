// A stage naming a capability registers it.
import { stageRequiredCapabilities } from '@superpipeline/contract';
import type { StageDef } from '../../board/board-do';
import { ensureCapabilities } from '../../db/capabilities';
import type { Env } from '../../env';

/**
 * Register every capability this pipeline names, as `inferred`.
 *
 * The declaring half of the registry's asymmetry: a stage naming `code-review` is a workspace
 * saying it needs code review done, so the capability comes into existence. An agent claiming one
 * must reference something that already exists (see the `/v1/agents` routes) — because an agent
 * holding a capability no stage names is the exact failure that matched nothing and said nothing.
 */
export async function registerStageCapabilities(
  env: Env,
  tenantId: string,
  stages: StageDef[],
  createdBy: string | null,
): Promise<void> {
  // Every capability a stage mentions, however it mentions it — `owner`, or either arm of
  // `requires`. Reading only `owner` would leave a set-valued lane's capabilities unregistered,
  // so they would route correctly and be invisible to the registry that exists to explain them.
  const keys = stages
    .filter((s) => s.ownerKind === 'capability')
    .flatMap((s) => stageRequiredCapabilities(s));
  if (keys.length > 0) await ensureCapabilities(env.DB, tenantId, keys, createdBy);
}
