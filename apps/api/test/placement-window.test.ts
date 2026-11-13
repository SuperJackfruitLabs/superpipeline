/**
 * The placement window: on a board opted into scheduling, a card that just became ready is held back
 * from pull for a few seconds so a placement service can reserve it; a hold made inside the window is
 * claimable by its agent at once; when no hold comes the window ends on its own and pull proceeds.
 * Each time a card becomes ready there the board relays `card.ready`, sent at once.
 *
 * claim-when-ready.test.ts pins the board with no window, which must not change.
 */
import { env, runInDurableObject } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { BoardDO, BoardInit } from '../src/board/board-do';
import type { EligibilityCandidate } from '../src/board/claims';
import { RELAY_CONFIG_ID } from '../src/push/relay';
import { freshBoard as fresh } from './helpers/board';

const STAGES: BoardInit['stages'] = [
  { key: 'triage', name: 'Triage', order: 0, ownerKind: 'human' },
  { key: 'build', name: 'Build', order: 1, ownerKind: 'capability', owner: 'build' },
];

beforeEach(() => {
  Reflect.set(env, 'RELAY_URL', 'https://relay.test');
  Reflect.set(env, 'RELAY_TOKEN', 'producer-token');
});
afterEach(() => {
  Reflect.deleteProperty(env, 'RELAY_URL');
  Reflect.deleteProperty(env, 'RELAY_TOKEN');
});

const who = (agentId: string): EligibilityCandidate => ({ agentId, name: agentId, capabilities: ['build'], principalId: null, maxConcurrency: 1 });

async function setup(board: BoardDO, id: string, seconds = 10): Promise<void> {
  await board.init({ id, tenantId: 'tnt_window', name: 'Window', stages: STAGES });
  if (seconds > 0) {
    const set = await board.setPlacementWindow({ placementWindowSeconds: seconds, by: 'svc:prn_dispatch' });
    if (!set.ok) throw new Error(set.message);
  }
}

async function card(board: BoardDO, title: string, stageKey = 'build'): Promise<string> {
  const r = await board.createCard({ title, ownerUserId: 'usr_a', stageKey });
  if (!r.ok) throw new Error(r.message);
  return r.value.id;
}

/** Make the card's window end, as time passing would. */
const lapse = (state: DurableObjectState, cardId: string) => state.storage.sql.exec(`UPDATE cards SET ready_since_ms = 1 WHERE id = ?`, cardId);

/** A queued body as a plain record. */
function record(body: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(body);
  return typeof parsed === 'object' && parsed !== null ? Object.fromEntries(Object.entries(parsed)) : {};
}

const relayed = async (board: BoardDO) => (await board.getPushDeliveries()).filter((d) => d.configId === RELAY_CONFIG_ID).map((d) => record(d.body));

describe('the setting', () => {
  it('is off until set, takes 0 to 30 whole seconds, and 0 turns it off again', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await setup(board, 'brd_window_set', 0);
      expect(await board.schedulingSettings()).toEqual({ placementWindowSeconds: 0 });
      for (const bad of [31, -1, 1.5]) {
        const r = await board.setPlacementWindow({ placementWindowSeconds: bad, by: 'svc:x' });
        expect(r.ok ? 'ok' : r.code).toBe('INVALID_SCHEDULING');
      }
      expect(await board.setPlacementWindow({ placementWindowSeconds: 12, by: 'svc:x' })).toEqual({ ok: true, value: { placementWindowSeconds: 12 } });
      expect(await board.schedulingSettings()).toEqual({ placementWindowSeconds: 12 });
      const set = (await board.getEvents(50)).find((e) => e.type === 'board.placement_window');
      expect(set?.payload).toMatchObject({ placementWindowSeconds: 12, by: 'svc:x' });
      await board.setPlacementWindow({ placementWindowSeconds: 0, by: 'svc:x' });
      expect(await board.schedulingSettings()).toEqual({ placementWindowSeconds: 0 });
    });
  });

  it('answers null for a board that is not initialized', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      expect(await board.schedulingSettings()).toBeNull();
      const r = await board.setPlacementWindow({ placementWindowSeconds: 5, by: 'svc:x' });
      expect(r.ok ? 'ok' : r.code).toBe('NOT_INITIALIZED');
    });
  });
});

describe('a card that just became ready, inside its window', () => {
  it('is passed over by pull, and the claimant is told placement_window', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await setup(board, 'brd_window_pull');
      const id = await card(board, 'new');
      expect(await board.claim({ agentId: 'agt_puller', capabilities: ['build'] })).toEqual({ claimed: false, reason: 'placement_window' });
      // An agent with no lane here is still told there is nothing for it.
      expect(await board.claim({ agentId: 'agt_other', capabilities: ['ship'] })).toEqual({ claimed: false, reason: 'capability_mismatch' });
      const view = await board.getCardView(id);
      if (!view.ok) throw new Error(view.message);
      expect(Date.parse(view.value.placementWindowUntil ?? '') - Date.now()).toBeGreaterThan(8_000);
    });
  });

  it('is reported by the eligibility read without counting against anyone', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await setup(board, 'brd_window_elig');
      const id = await card(board, 'new');
      const r = await board.cardEligibility({ cardId: id, agents: [who('agt_a'), who('agt_b')] });
      if (!r.ok) throw new Error(r.message);
      expect(r.value.reasons).toEqual([]);
      expect(r.value.agents.map((a) => a.eligible)).toEqual([true, true]);
      expect(r.value.placementWindowUntil).not.toBeNull();
    });
  });

  it('goes at once to the agent a placement service holds it for, and to no one else', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await setup(board, 'brd_window_hold');
      const id = await card(board, 'placed');
      const held = await board.reserveCard({ cardId: id, agent: who('agt_chosen'), decisionId: 'dec_w', reservedBy: 'prn_dispatch' });
      if (!held.ok) throw new Error(held.message);
      expect(await board.claim({ agentId: 'agt_puller', capabilities: ['build'] })).toEqual({ claimed: false, reason: 'card_reserved' });
      const c = await board.claim({ agentId: 'agt_chosen', capabilities: ['build'] });
      expect(c.claimed && c.card.id).toBe(id);
      // Claimed: the window is over, and the card view says nothing about one.
      expect(c.claimed && c.card.placementWindowUntil).toBeUndefined();
    });
  });

  it('is claimable by pull once the window ends with no hold', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO, state) => {
      await setup(board, 'brd_window_lapse');
      const id = await card(board, 'unplaced');
      lapse(state, id);
      const c = await board.claim({ agentId: 'agt_puller', capabilities: ['build'] });
      expect(c.claimed && c.card.id).toBe(id);
    });
  });

  it('does not stop pull taking another card that is out of its window', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO, state) => {
      await setup(board, 'brd_window_other');
      const old = await card(board, 'waited');
      lapse(state, old);
      await card(board, 'fresh');
      const c = await board.claim({ agentId: 'agt_puller', capabilities: ['build'] });
      expect(c.claimed && c.card.id).toBe(old);
      expect(await board.claim({ agentId: 'agt_second', capabilities: ['build'] })).toEqual({ claimed: false, reason: 'placement_window' });
    });
  });

  it('opens again when a failed run queues the card again', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO, state) => {
      await setup(board, 'brd_window_fail');
      const id = await card(board, 'flaky');
      lapse(state, id);
      const first = await board.claim({ agentId: 'agt_first', capabilities: ['build'] });
      if (!first.claimed) throw new Error(first.reason);
      const failed = await board.fail({ runId: first.runId, leaseEpoch: first.leaseEpoch, agentId: 'agt_first', reason: 'tool crashed' });
      if (!failed.ok) throw new Error(failed.message);
      expect(await board.claim({ agentId: 'agt_second', capabilities: ['build'] })).toEqual({ claimed: false, reason: 'placement_window' });
    });
  });

  it('opens when a person moves the card into an agent stage, not while it waits on a person', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await setup(board, 'brd_window_move');
      const id = await card(board, 'triaged', 'triage');
      expect(await relayed(board)).toEqual([]);
      const moved = await board.moveCard(id, 'build', 'usr_a');
      if (!moved.ok) throw new Error(moved.message);
      expect(await board.claim({ agentId: 'agt_puller', capabilities: ['build'] })).toEqual({ claimed: false, reason: 'placement_window' });
    });
  });

  it('ends at once when the window is turned off', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await setup(board, 'brd_window_off');
      const id = await card(board, 'new');
      await board.setPlacementWindow({ placementWindowSeconds: 0, by: 'svc:x' });
      const c = await board.claim({ agentId: 'agt_puller', capabilities: ['build'] });
      expect(c.claimed && c.card.id).toBe(id);
    });
  });
});

describe('card.ready', () => {
  it('is queued for the relay when a card becomes ready on a board with a window, and drains at once', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO, state) => {
      await setup(board, 'brd_00000000000000w1');
      const id = await card(board, 'new');
      const [body] = await relayed(board);
      expect(body).toMatchObject({ event: 'card.ready', boardId: 'brd_00000000000000w1', cardId: id, stageKey: 'build' });
      expect(Date.parse(String(body?.placementWindowUntil)) - Date.parse(String(body?.readyAt))).toBe(10_000);
      expect(body?.ts).toBe(body?.readyAt);
      // Not the usual first-try backoff: the alarm is set to now, so the event leaves inside the window.
      await new Promise((resolve) => setTimeout(resolve, 0));
      const alarm = await state.storage.getAlarm();
      expect(alarm).not.toBeNull();
      expect(Number(alarm) - Date.now()).toBeLessThan(1_000);
    });
  });

  it('is not queued for a card that is not ready to claim', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await setup(board, 'brd_window_human');
      await card(board, 'with a person', 'triage');
      expect(await relayed(board)).toEqual([]);
    });
  });

  it('is not queued, and opens no window, when a hold is made or cleared', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO, state) => {
      await setup(board, 'brd_window_nohold');
      const id = await card(board, 'new');
      lapse(state, id);
      await board.reserveCard({ cardId: id, agent: who('agt_chosen'), decisionId: 'dec_x', reservedBy: 'prn_dispatch' });
      board.clearReservation({ cardId: id, by: 'svc:x' });
      expect((await relayed(board)).length).toBe(1);
      const c = await board.claim({ agentId: 'agt_puller', capabilities: ['build'] });
      expect(c.claimed && c.card.id).toBe(id);
    });
  });
});
