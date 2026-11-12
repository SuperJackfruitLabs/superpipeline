/**
 * When a card that just became ready may be claimed, pinned before the placement window arrives:
 * on a board with no window, at once, by any agent that matches, whichever way it became ready
 * (created, moved into an agent's stage, re-queued after a failed run, resumed by a person). And
 * nothing about its readiness goes to the event relay.
 *
 * The placement window must change none of this on a board that has not opted into scheduling, so
 * this record is written against the code before the window and must pass unchanged after it.
 */
import { env, runInDurableObject } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { BoardDO, BoardInit } from '../src/board/board-do';
import { RELAY_CONFIG_ID } from '../src/push/relay';
import { freshBoard as fresh } from './helpers/board';

const STAGES: BoardInit['stages'] = [
  { key: 'triage', name: 'Triage', order: 0, ownerKind: 'human' },
  { key: 'build', name: 'Build', order: 1, ownerKind: 'capability', owner: 'build' },
  { key: 'review', name: 'Review', order: 2, ownerKind: 'human' },
];

beforeEach(() => {
  Reflect.set(env, 'RELAY_URL', 'https://relay.test');
  Reflect.set(env, 'RELAY_TOKEN', 'producer-token');
});
afterEach(() => {
  Reflect.deleteProperty(env, 'RELAY_URL');
  Reflect.deleteProperty(env, 'RELAY_TOKEN');
});

async function setup(board: BoardDO, id: string): Promise<void> {
  await board.init({ id, tenantId: 'tnt_ready', name: 'Ready', stages: STAGES });
}

async function card(board: BoardDO, title: string, stageKey = 'build'): Promise<string> {
  const r = await board.createCard({ title, ownerUserId: 'usr_a', stageKey });
  if (!r.ok) throw new Error(r.message);
  return r.value.id;
}

const relayed = async (board: BoardDO) => (await board.getPushDeliveries()).filter((d) => d.configId === RELAY_CONFIG_ID).map((d) => JSON.parse(d.body).event as string);

describe('a card that just became ready, on a board with no placement window', () => {
  it('is claimable at once when it is created in an agent stage', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await setup(board, 'brd_ready_create');
      const id = await card(board, 'new');
      const c = await board.claim({ agentId: 'agt_any', capabilities: ['build'] });
      expect(c.claimed && c.card.id).toBe(id);
      expect(await relayed(board)).toEqual([]);
    });
  });

  it('is claimable at once when a person moves it into an agent stage', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await setup(board, 'brd_ready_move');
      const id = await card(board, 'triaged', 'triage');
      expect(await board.claim({ agentId: 'agt_any', capabilities: ['build'] })).toEqual({ claimed: false, reason: 'no_matching_card' });
      const moved = await board.moveCard(id, 'build', 'usr_a');
      if (!moved.ok) throw new Error(moved.message);
      const c = await board.claim({ agentId: 'agt_any', capabilities: ['build'] });
      expect(c.claimed && c.card.id).toBe(id);
      expect(await relayed(board)).toEqual([]);
    });
  });

  it('is claimable at once by another agent when a run fails and the card is queued again', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await setup(board, 'brd_ready_fail');
      const id = await card(board, 'flaky');
      const first = await board.claim({ agentId: 'agt_first', capabilities: ['build'] });
      if (!first.claimed) throw new Error(first.reason);
      const failed = await board.fail({ runId: first.runId, leaseEpoch: first.leaseEpoch, agentId: 'agt_first', reason: 'tool crashed' });
      if (!failed.ok) throw new Error(failed.message);
      const again = await board.claim({ agentId: 'agt_second', capabilities: ['build'] });
      expect(again.claimed && again.card.id).toBe(id);
      expect(await relayed(board)).toEqual([]);
    });
  });
});
