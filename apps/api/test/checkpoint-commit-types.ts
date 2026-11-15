import type { CheckpointCandidateDeps } from '../src/board/checkpoint-candidate';

type AssertFalse<T extends false> = T;
// tsc must reject the void-return callback loophole: an async function becomes
// assignable if commit is weakened back to void. This file performs no effects.
export type AsyncCommitMustBeRejected = AssertFalse<
  (() => Promise<void>) extends CheckpointCandidateDeps['commit'] ? true : false
>;
