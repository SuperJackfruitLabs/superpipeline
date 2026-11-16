/** Explicit private fixture opt-in; never changes the suite's default bindings. */
import type { BoardDO } from '../../src/board/board-do';
import type { BoardContext } from '../../src/board/context';
import { internalStageEditor, type BoardInit } from '../../src/board/model';

export async function initPrivateCheckpointBoard(board: BoardDO, input: BoardInit) {
  const context: BoardContext = Reflect.get(board, 'board');
  const previous = context.env.PROPOSED_CHECKPOINT_POLICY;
  context.env.PROPOSED_CHECKPOINT_POLICY = 'true';
  try { return await board.init(input, internalStageEditor('explicit private checkpoint fixture initialization')); }
  finally {
    if (previous === undefined) delete context.env.PROPOSED_CHECKPOINT_POLICY;
    else context.env.PROPOSED_CHECKPOINT_POLICY = previous;
  }
}
