/** Proposed service RPC boundary. No config in the repository enables it. */
import type { VerifiedCheckpointReporter } from '../auth/checkpoint-reporter';
import type { BoardContext } from './context';
import type { Result, BoardErrorCode } from './model';
import { admitCheckpointSource, readCheckpointSource } from './checkpoint-source';

const codes = ['CHECKPOINT_SOURCE_DISABLED', 'INVALID_CHECKPOINT_SOURCE', 'NOT_CHECKPOINT_REPORTER',
  'STALE_LEASE', 'CHECKPOINT_SOURCE_CONFLICT', 'CHECKPOINT_SOURCE_MISSING', 'CHECKPOINT_SOURCE_NOT_SAVED'] as const;
async function operation<T>(board: BoardContext, perform: () => T | Promise<T>): Promise<Result<T>> {
  if (board.env.PROPOSED_CHECKPOINT_SOURCE !== 'true')
    return { ok: false, code: 'CHECKPOINT_SOURCE_DISABLED', message: 'checkpoint source protocol is disabled' };
  if (!board.getMeta('boardId')) return { ok: false, code: 'NOT_INITIALIZED', message: 'board not found' };
  try { return { ok: true, value: await perform() }; }
  catch (error) {
    const message = error instanceof Error ? error.message : '';
    const code: BoardErrorCode = message === 'INVALID_CHECKPOINT' ? 'INVALID_CHECKPOINT_SOURCE' :
      codes.find((candidate) => candidate === message) ?? 'CHECKPOINT_SOURCE_FAILED';
    return { ok: false, code, message: code };
  }
}
export function admit(board: BoardContext, actor: VerifiedCheckpointReporter, runId: string, raw: Uint8Array) {
  // Copy the resolved actor and bytes before any digest await; caller mutation is not authority.
  return operation(board, () => {
    const savedActor = { ...actor, scopes: [...actor.scopes] };
    const savedRaw = raw.slice();
    return admitCheckpointSource(board, () => savedActor, savedRaw, runId);
  });
}
export function read(board: BoardContext, actor: VerifiedCheckpointReporter, runId: string) {
  return operation(board, () => readCheckpointSource(board, actor, runId));
}
