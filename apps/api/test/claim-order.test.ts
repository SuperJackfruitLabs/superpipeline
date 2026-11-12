/**
 * The order a claim hands cards out in, pinned before reservations arrive: priority first, then
 * due date (soonest first, undated last), then age; only ready cards at a stage the agent can take.
 *
 * A reservation must change none of this while no card carries one, so this record is written
 * against the code before the hold and must pass unchanged after it.
 */
import { runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import type { BoardDO, BoardInit } from '../src/board/board-do';
import { freshBoard as fresh } from './helpers/board';

const STAGES: BoardInit['stages'] = [
  { key: 'build', name: 'Build', order: 0, ownerKind: 'capability', owner: 'build' },
  { key: 'ship', name: 'Ship', order: 1, ownerKind: 'capability', owner: 'ship' },
  { key: 'review', name: 'Review', order: 2, ownerKind: 'human' },
];

async function card(board: BoardDO, title: string, opts: { priority?: number; dueAt?: string; stageKey?: string } = {}): Promise<string> {
  const r = await board.createCard({ title, ownerUserId: 'usr_a', priority: opts.priority ?? 0, ...(opts.dueAt ? { dueAt: opts.dueAt } : {}), ...(opts.stageKey ? { stageKey: opts.stageKey } : {}) });
  if (!r.ok) throw new Error(r.message);
  return r.value.title;
}

/** Claim until nothing is left, each claim by a fresh agent so concurrency never stops the walk. */
async function drain(board: BoardDO, capabilities: string[]): Promise<{ order: string[]; last: unknown }> {
  const order: string[] = [];
  for (let i = 0; i < 20; i++) {
    const c = await board.claim({ agentId: `agt_${i}`, capabilities });
    if (!c.claimed) return { order, last: c };
    order.push(c.card.title);
  }
  throw new Error('the board never ran dry');
}

describe('claim order (no reservations)', () => {
  it('hands out by priority, then due date with undated last, then age', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await board.init({ id: 'brd_order', tenantId: 'tnt_o', name: 'O', stages: STAGES });
      await card(board, 'p0 old');
      await card(board, 'p0 due late', { dueAt: '2031-06-01' });
      await card(board, 'p0 undated');
      await card(board, 'p0 due soon', { dueAt: '2031-02-01' });
      await card(board, 'p5 due', { priority: 5, dueAt: '2031-09-01' });
      await card(board, 'p0 young');
      await card(board, 'p9', { priority: 9 });
      await card(board, 'ship lane', { priority: 99, stageKey: 'ship' });
      await card(board, 'human lane', { priority: 99, stageKey: 'review' });
      const { order, last } = await drain(board, ['build']);
      expect(order).toEqual(['p9', 'p5 due', 'p0 due soon', 'p0 due late', 'p0 old', 'p0 undated', 'p0 young']);
      expect(last).toEqual({ claimed: false, reason: 'no_matching_card' });
    });
  });

  it('takes the best card across every stage the agent can take', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await board.init({ id: 'brd_order2', tenantId: 'tnt_o', name: 'O', stages: STAGES });
      await card(board, 'build low', { priority: 1 });
      await card(board, 'ship high', { priority: 7, stageKey: 'ship' });
      await card(board, 'build mid', { priority: 4 });
      const { order } = await drain(board, ['build', 'ship']);
      expect(order).toEqual(['ship high', 'build mid', 'build low']);
    });
  });
});
