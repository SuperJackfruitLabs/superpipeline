import type { CheckpointCandidateDeps } from '../src/board/checkpoint-candidate';

type AssertFalse<T extends false> = T;
// tsc must reject the void-return callback loophole: an async function becomes
// assignable if commit is weakened back to void. This file performs no effects.
export type AsyncCommitMustBeRejected = AssertFalse<
  (() => Promise<void>) extends CheckpointCandidateDeps['commit'] ? true : false
>;

import type { CommitEffects } from '../src/board/commit-effects';
export function assertEffectCallbackTypes(effects: CommitEffects, storage: DurableObjectStorage): void {
  // @ts-expect-error -- async transaction callbacks must never compile; this function is not executed.
  void effects.run(storage, async () => undefined);
}
