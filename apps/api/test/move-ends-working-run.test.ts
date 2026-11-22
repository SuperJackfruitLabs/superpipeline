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

/**
 * A run left `working` after its card was unbound — what every human move did before it ended
 * the run, so rows like this exist on boards that ran the old code.
 */
async function orphan(board: BoardDO, state: DurableObjectState, id: string, to: { stage: string; state: string }) {
  await board.init(init(id));
  const a = await mustCreate(board, 'A');
  const c = await board.claim(RESEARCHER);
  if (!c.claimed) throw new Error('expected a claim');
  state.storage.sql.exec(
    `UPDATE cards SET current_stage_key = ?, state = ?, delegate_agent_id = NULL, current_run_id = NULL WHERE id = ?`,
    to.stage,
    to.state,
    a.id,
  );
  return { cardId: a.id, runId: c.runId };
}

describe('reclaiming a run its card no longer names', () => {
  it("ends the run without touching the card's failure count or state", async () => {
    await runInDurableObject(freshBoard(), async (board: BoardDO, state) => {
      const { cardId, runId } = await orphan(board, state, 'brd_rc_orphan', { stage: 'build', state: 'submitted' });
      expect(board.reclaimExpired(FAR_FUTURE)).toBe(1);

      expect(runOf(state, runId)).toMatchObject({ status: 'ended', outcome: 'reclaimed' });
      expect(cardOf(state, cardId)).toMatchObject({ current_stage_key: 'build', state: 'submitted', failure_count: 0 });
      // The concurrency it held is free.
      const other = await mustCreate(board, 'B');
      expect(await board.claim(RESEARCHER)).toMatchObject({ claimed: true, card: { id: other.id } });
    });
  });

  it('does not re-queue a card that has finished', async () => {
    await runInDurableObject(freshBoard(), async (board: BoardDO, state) => {
      const { cardId } = await orphan(board, state, 'brd_rc_done', { stage: 'done', state: 'completed' });
      expect(board.reclaimExpired(FAR_FUTURE)).toBe(1);
      expect(cardOf(state, cardId)).toMatchObject({ current_stage_key: 'done', state: 'completed', failure_count: 0 });
    });
  });

  it('still charges the attempt to a card that names the run', async () => {
    await runInDurableObject(freshBoard(), async (board: BoardDO, state) => {
      await board.init(init('brd_rc_bound'));
      const a = await mustCreate(board, 'A');
      const c = await board.claim(RESEARCHER);
      if (!c.claimed) throw new Error('expected a claim');
      expect(board.reclaimExpired(FAR_FUTURE)).toBe(1);
      expect(cardOf(state, a.id)).toMatchObject({ current_stage_key: 'research', state: 'submitted', failure_count: 1 });
    });
  });
});

const NOTE = { type: 'response' as const, body: 'Run stopped because the card moved; partial work saved' };

/** A card claimed and then moved by a person; the run is ended `moved`. */
async function movedRun(board: BoardDO, id: string) {
  await board.init(init(id));
  const a = await mustCreate(board, 'A');
  const c = await board.claim(RESEARCHER);
  if (!c.claimed) throw new Error('expected a claim');
  const moved = await board.moveCard(a.id, 'build', 'usr_a');
  if (!moved.ok) throw new Error(`move failed: ${moved.message}`);
  return { cardId: a.id, lease: { runId: c.runId, leaseEpoch: c.leaseEpoch, agentId: RESEARCHER.agentId } };
}

function notesOn(state: DurableObjectState, runId: string) {
  return state.storage.sql.exec(`SELECT type, body FROM activities WHERE run_id = ?`, runId).toArray();
}

describe("a note on a run a person's move ended", () => {
  it('is taken from the run’s agent inside the grace window, and changes nothing else', async () => {
    await runInDurableObject(freshBoard(), async (board: BoardDO, state) => {
      const { cardId, lease } = await movedRun(board, 'brd_note_in');
      const heartbeat = state.storage.sql.exec(`SELECT last_heartbeat_ms FROM runs WHERE id = ?`, lease.runId).one();

      expect(await board.postActivity({ ...lease, ...NOTE })).toEqual({ ok: true, value: { accepted: true, cardState: 'submitted' } });

      expect(notesOn(state, lease.runId)).toEqual([{ type: 'response', body: NOTE.body }]);
      expect(runOf(state, lease.runId)).toMatchObject({ status: 'ended', outcome: 'moved' });
      expect(state.storage.sql.exec(`SELECT last_heartbeat_ms FROM runs WHERE id = ?`, lease.runId).one()).toEqual(heartbeat);
      expect(cardOf(state, cardId)).toMatchObject({ current_stage_key: 'build', state: 'submitted', current_run_id: null });
    });
  });

  it('is refused as STALE_LEASE once the window has passed', async () => {
    await runInDurableObject(freshBoard(), async (board: BoardDO, state) => {
      const { lease } = await movedRun(board, 'brd_note_late');
      const longAgo = new Date(Date.now() - 11 * 60 * 1000).toISOString();
      state.storage.sql.exec(`UPDATE runs SET ended_at = ? WHERE id = ?`, longAgo, lease.runId);

      expect(await board.postActivity({ ...lease, ...NOTE })).toMatchObject({ ok: false, code: 'STALE_LEASE' });
      expect(notesOn(state, lease.runId)).toEqual([]);
    });
  });

  it('takes nothing but a plain note: every other verb is STALE_LEASE', async () => {
    await runInDurableObject(freshBoard(), async (board: BoardDO, state) => {
      const { cardId, lease } = await movedRun(board, 'brd_note_verbs');
      for (const verb of [
        () => board.postActivity({ ...lease, type: 'elicitation', body: 'May I?', signal: 'select', parameter: { options: [{ name: 'yes', title: 'Yes' }] } }),
        () => board.postActivity({ ...lease, ...NOTE, usage: { inputTokens: 1, outputTokens: 1 } }),
        () => board.postActivity({ ...lease, ...NOTE, leaseEpoch: lease.leaseEpoch + 1 }),
        () => board.heartbeat(lease),
        () => board.complete({ ...lease, handoff: { summary: 'late' } }),
        () => board.submitForReview({ ...lease }),
        () => board.block({ ...lease, reason: 'late' }),
        () => board.fail({ ...lease, reason: 'late' }),
        () => board.release(lease),
      ]) {
        expect(await verb()).toMatchObject({ ok: false, code: 'STALE_LEASE' });
      }
      expect(notesOn(state, lease.runId)).toEqual([]);
      expect(cardOf(state, cardId)).toMatchObject({ current_stage_key: 'build', state: 'submitted', failure_count: 0 });
    });
  });

  it('is refused for a run that ended any other way', async () => {
    const endings: Array<[string, (board: BoardDO, lease: { runId: string; leaseEpoch: number }) => Promise<unknown>]> = [
      ['released', (board, lease) => board.release(lease)],
      ['crashed', (board, lease) => board.fail({ ...lease, reason: 'boom' })],
      ['blocked', (board, lease) => board.block({ ...lease, reason: 'stuck' })],
      ['reclaimed', async (board) => board.reclaimExpired(FAR_FUTURE)],
    ];
    for (const [outcome, end] of endings) {
      await runInDurableObject(freshBoard(), async (board: BoardDO, state) => {
        await board.init(init(`brd_note_${outcome}`));
        await mustCreate(board, 'A');
        const c = await board.claim(RESEARCHER);
        if (!c.claimed) throw new Error('expected a claim');
        const lease = { runId: c.runId, leaseEpoch: c.leaseEpoch, agentId: RESEARCHER.agentId };
        await end(board, lease);
        expect(runOf(state, c.runId)).toMatchObject({ status: 'ended', outcome });

        expect(await board.postActivity({ ...lease, ...NOTE })).toMatchObject({ ok: false, code: 'STALE_LEASE' });
        expect(notesOn(state, c.runId)).toEqual([]);
      });
    }
  });
});
