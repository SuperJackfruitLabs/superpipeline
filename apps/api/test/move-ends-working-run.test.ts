import { runInDurableObject } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import type { BoardDO, BoardInit, CardView } from '../src/board/board-do';
import { freshBoard } from './helpers/board';

/**
 * A person moving a card while its run is working.
 *
 * The move used to unbind the run and leave it `working`. The orphan still counted against its
 * agent's concurrency, so an agent with a limit of one could claim nothing until the heartbeat
 * timeout reclaimed it — and that reclaim then charged a failure to a card that had moved on.
 */

const PIPELINE: BoardInit['stages'] = [
  { key: 'research', name: 'Research', order: 0, ownerKind: 'capability', owner: 'research' },
  { key: 'build', name: 'Build', order: 1, ownerKind: 'capability', owner: 'build' },
  { key: 'done', name: 'Done', order: 2, ownerKind: 'human' },
];

const init = (id: string): BoardInit => ({ id, tenantId: 'tnt_mv', name: 'Moves', stages: PIPELINE });

async function mustCreate(board: BoardDO, title: string): Promise<CardView> {
  const r = await board.createCard({ title, ownerUserId: 'usr_a' });
  if (!r.ok) throw new Error(`createCard failed: ${r.message}`);
  return r.value;
}

const RESEARCHER = { agentId: 'agt_r', capabilities: ['research'], maxConcurrency: 1 };
const FAR_FUTURE = 8_000_000_000_000;

function runOf(state: DurableObjectState, runId: string) {
  return state.storage.sql.exec(`SELECT status, outcome, ended_at FROM runs WHERE id = ?`, runId).one();
}

function cardOf(state: DurableObjectState, cardId: string) {
  return state.storage.sql
    .exec(`SELECT current_stage_key, state, failure_count, current_run_id FROM cards WHERE id = ?`, cardId)
    .one();
}

describe('a person moving a working card', () => {
  it("frees the agent's concurrency, so its next claim succeeds at once", async () => {
    await runInDurableObject(freshBoard(), async (board: BoardDO) => {
      await board.init(init('brd_mv_frees'));
      const a = await mustCreate(board, 'A');
      const b = await mustCreate(board, 'B');
      const first = await board.claim(RESEARCHER);
      if (!first.claimed) throw new Error('expected a claim');
      expect(first.card.id).toBe(a.id);
      expect(await board.claim(RESEARCHER)).toEqual({ claimed: false, reason: 'concurrency_reached' });

      const moved = await board.moveCard(a.id, 'build', 'usr_a');
      expect(moved.ok).toBe(true);

      // No heartbeat timeout in between: the claim is free the moment the card leaves.
      expect(await board.claim(RESEARCHER)).toMatchObject({ claimed: true, card: { id: b.id } });
    });
  });

  it('ends the run as moved, and every agent verb on it is refused as STALE_LEASE', async () => {
    await runInDurableObject(freshBoard(), async (board: BoardDO, state) => {
      await board.init(init('brd_mv_ends'));
      const a = await mustCreate(board, 'A');
      const c = await board.claim(RESEARCHER);
      if (!c.claimed) throw new Error('expected a claim');

      expect((await board.moveCard(a.id, 'build', 'usr_a')).ok).toBe(true);

      const run = runOf(state, c.runId);
      expect(run.status).toBe('ended');
      expect(run.outcome).toBe('moved');
      expect(run.ended_at).not.toBeNull();
      expect(cardOf(state, a.id)).toMatchObject({ current_stage_key: 'build', state: 'submitted', current_run_id: null });

      const lease = { runId: c.runId, leaseEpoch: c.leaseEpoch };
      for (const verb of [
        () => board.heartbeat(lease),
        () => board.complete({ ...lease, handoff: { summary: 'late' } }),
        () => board.fail({ ...lease, reason: 'late' }),
        () => board.release(lease),
      ]) {
        expect(await verb()).toMatchObject({ ok: false, code: 'STALE_LEASE' });
      }
      // The late verbs changed nothing: the card is where the person put it.
      expect(cardOf(state, a.id)).toMatchObject({ current_stage_key: 'build', state: 'submitted', failure_count: 0 });
    });
  });

  it('to a finished stage ends the run too', async () => {
    await runInDurableObject(freshBoard(), async (board: BoardDO, state) => {
      await board.init(init('brd_mv_done'));
      const a = await mustCreate(board, 'A');
      const c = await board.claim(RESEARCHER);
      if (!c.claimed) throw new Error('expected a claim');

      expect((await board.moveCard(a.id, 'done', 'usr_a')).ok).toBe(true);

      expect(runOf(state, c.runId)).toMatchObject({ status: 'ended', outcome: 'moved' });
      expect(cardOf(state, a.id)).toMatchObject({ current_stage_key: 'done', state: 'completed' });
      // Nothing is left for the reclaim alarm to find.
      expect(board.reclaimExpired(FAR_FUTURE)).toBe(0);
    });
  });

  // Pins the end state, not this change alone: the move's review cancel already closed the card's
  // questions, and the run's own cancel now closes them first.
  it("leaves the run's pending question cancelled", async () => {
    await runInDurableObject(freshBoard(), async (board: BoardDO, state) => {
      await board.init(init('brd_mv_question'));
      const a = await mustCreate(board, 'A');
      const c = await board.claim(RESEARCHER);
      if (!c.claimed) throw new Error('expected a claim');
      const asked = await board.postActivity({
        runId: c.runId,
        leaseEpoch: c.leaseEpoch,
        agentId: RESEARCHER.agentId,
        type: 'elicitation',
        body: 'May I run the test suite?',
        signal: 'select',
        parameter: { options: [{ name: 'yes', title: 'Yes' }] },
      });
      expect(asked.ok).toBe(true);

      expect((await board.moveCard(a.id, 'build', 'usr_a')).ok).toBe(true);

      const statuses = state.storage.sql
        .exec(`SELECT status FROM elicitations WHERE run_id = ?`, c.runId)
        .toArray()
        .map((r) => r.status);
      expect(statuses).toEqual(['cancelled']);
    });
  });
});
