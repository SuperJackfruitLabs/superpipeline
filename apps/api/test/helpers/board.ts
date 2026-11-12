import { env } from 'cloudflare:test';
import type { BoardDO } from '../../src/board/board-do';

/** A board Durable Object no other test has touched. */
export function freshBoard(): DurableObjectStub<BoardDO> {
  return env.BOARD_DO.get(env.BOARD_DO.newUniqueId()) as unknown as DurableObjectStub<BoardDO>;
}
