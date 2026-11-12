/**
 * The reservation (a hold): a placement service keeps a ready card for the agent it chose, for a
 * short while. The claim enforces it — every other claimant passes the card over, and the agent it
 * is held for gets it ahead of priority — and it lapses on its own. Readers see it; push announces a
 * held card to its agent only.
 */
import { runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import type { BoardDO, BoardInit } from '../src/board/board-do';
import type { EligibilityCandidate } from '../src/board/claims';
import { freshBoard as fresh } from './helpers/board';

const STAGES: BoardInit['stages'] = [
  { key: 'build', name: 'Build', order: 0, ownerKind: 'capability', owner: 'build' },
  { key: 'ship', name: 'Ship', order: 1, ownerKind: 'capability', owner: 'ship' },
  { key: 'review', name: 'Review', order: 2, ownerKind: 'human' },
];

const who = (agentId: string, capabilities = ['build']): EligibilityCandidate => ({ agentId, name: agentId, capabilities, principalId: null, maxConcurrency: 1 });

async function setup(board: BoardDO, id = 'brd_hold'): Promise<void> {
  await board.init({ id, tenantId: 'tnt_hold', name: 'H', stages: STAGES });
}

async function card(board: BoardDO, title: string, priority = 0): Promise<string> {
  const r = await board.createCard({ title, ownerUserId: 'usr_a', priority });
  if (!r.ok) throw new Error(r.message);
  return r.value.id;
}

async function hold(board: BoardDO, cardId: string, agentId: string, decisionId = 'dec_1', ttlSeconds?: number) {
  return board.reserveCard({ cardId, agent: who(agentId), decisionId, reservedBy: 'prn_dispatch', ...(ttlSeconds !== undefined ? { ttlSeconds } : {}) });
}

async function must(board: BoardDO, cardId: string, agentId: string, decisionId = 'dec_1') {
  const r = await hold(board, cardId, agentId, decisionId);
  if (!r.ok) throw new Error(`${r.code}: ${r.message}`);
  return r.value;
}

/** Make the card's hold lapse, as time passing would. */
const lapse = (state: DurableObjectState, cardId: string) => state.storage.sql.exec(`UPDATE cards SET reserved_until_ms = 1 WHERE id = ?`, cardId);

describe('a held card and the claim', () => {
  it('goes to the agent it is held for, ahead of a higher-priority card with no hold', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await setup(board);
      await card(board, 'urgent', 9);
      const held = await card(board, 'held', 0);
      await must(board, held, 'agt_chosen', 'dec_pick');
      const c = await board.claim({ agentId: 'agt_chosen', capabilities: ['build'] });
      if (!c.claimed) throw new Error(`expected a claim, got ${c.reason}`);
      expect(c.card.title).toBe('held');
      // Claiming clears the hold, and the claim event names the decision it fulfilled.
      expect(c.card.reservation).toBeUndefined();
      const claimed = (await board.getEvents(50)).find((e) => e.type === 'card.claimed');
      expect(claimed?.payload).toMatchObject({ cardId: held, agentId: 'agt_chosen', reservationDecisionId: 'dec_pick' });
    });
  });

  it('is passed over by everyone else, who take the next card', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await setup(board);
      const held = await card(board, 'held', 9);
      await card(board, 'free', 0);
      await must(board, held, 'agt_chosen');
      const c = await board.claim({ agentId: 'agt_other', capabilities: ['build'] });
      if (!c.claimed) throw new Error(`expected a claim, got ${c.reason}`);
      expect(c.card.title).toBe('free');
    });
  });

  it('answers card_reserved when the only claimable card is held for someone else', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await setup(board);
      const held = await card(board, 'held');
      await must(board, held, 'agt_chosen');
      expect(await board.claim({ agentId: 'agt_other', capabilities: ['build'] })).toEqual({ claimed: false, reason: 'card_reserved' });
      // And still no_matching_card for an agent whose lanes are simply empty.
      expect(await board.claim({ agentId: 'agt_shipper', capabilities: ['ship'] })).toEqual({ claimed: false, reason: 'no_matching_card' });
      // The agent it is held for still takes it.
      expect((await board.claim({ agentId: 'agt_chosen', capabilities: ['build'] })).claimed).toBe(true);
    });
  });

  it('lapses on its own: an expired hold is no hold, to the claim and to readers', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO, state) => {
      await setup(board);
      const held = await card(board, 'held');
      await must(board, held, 'agt_chosen');
      lapse(state, held);
      const view = await board.getCardView(held);
      expect(view.ok && view.value.reservation).toBeUndefined();
      const c = await board.claim({ agentId: 'agt_other', capabilities: ['build'] });
      if (!c.claimed) throw new Error(`expected a claim, got ${c.reason}`);
      expect(c.card.id).toBe(held);
      // The dead hold is cleared with the claim and does not come back on release.
      const columns = state.storage.sql.exec(`SELECT reserved_for FROM cards WHERE id = ?`, held).one();
      expect(columns.reserved_for).toBeNull();
    });
  });

  it('applies only at the stage it was made for', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await setup(board);
      const held = await card(board, 'held');
      await must(board, held, 'agt_chosen');
      expect((await board.moveCard(held, 'ship', 'usr_a')).ok).toBe(true);
      const view = await board.getCardView(held);
      expect(view.ok && view.value.reservation).toBeUndefined();
      const c = await board.claim({ agentId: 'agt_shipper', capabilities: ['ship'] });
      expect(c.claimed && c.card.id).toBe(held);
    });
  });

  it('once cleared, anyone may claim the card again', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await setup(board);
      const held = await card(board, 'held');
      await must(board, held, 'agt_chosen');
      expect(board.clearReservation({ cardId: held, by: 'usr_admin' })).toEqual({ ok: true, value: { cleared: true } });
      expect(board.clearReservation({ cardId: held, by: 'usr_admin' })).toEqual({ ok: true, value: { cleared: false } });
      expect((await board.claim({ agentId: 'agt_other', capabilities: ['build'] })).claimed).toBe(true);
    });
  });
});

describe('making a hold', () => {
  it('is shown on the card read and the board read, with agent, time and decision', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await setup(board);
      const held = await card(board, 'held');
      const before = Date.now();
      const r = await must(board, held, 'agt_chosen', 'dec_show');
      expect(r).toMatchObject({ agentId: 'agt_chosen', decisionId: 'dec_show', reservedBy: 'prn_dispatch' });
      const until = Date.parse(r.reservedUntil) - before;
      expect(until).toBeGreaterThanOrEqual(59_000);
      expect(until).toBeLessThanOrEqual(61_000);
      const view = await board.getCardView(held);
      expect(view.ok && view.value.reservation).toEqual(r);
      expect((await board.getState()).cards.find((c) => c.id === held)?.reservation).toEqual(r);
    });
  });

  it('is refused for a card nobody may claim now, and for an agent that may not', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await setup(board);
      const working = await card(board, 'working');
      expect((await board.claim({ agentId: 'agt_busy', capabilities: ['build'] })).claimed).toBe(true);
      expect(await hold(board, working, 'agt_chosen')).toMatchObject({ ok: false, code: 'CARD_NOT_CLAIMABLE', detail: { reasons: ['card_not_ready'] } });
      const ready = await card(board, 'ready');
      const r = await board.reserveCard({ cardId: ready, agent: who('agt_shipper', ['ship']), decisionId: 'd', reservedBy: 'prn_dispatch' });
      expect(r).toMatchObject({ ok: false, code: 'AGENT_NOT_ELIGIBLE', detail: { reasons: ['capability_mismatch'] } });
      // An agent at its ceiling is not eligible either.
      expect(await hold(board, ready, 'agt_busy')).toMatchObject({ ok: false, code: 'AGENT_NOT_ELIGIBLE', detail: { reasons: ['concurrency_reached'] } });
      expect(await hold(board, 'card_0000000000000000', 'agt_chosen')).toMatchObject({ ok: false, code: 'CARD_NOT_FOUND' });
    });
  });

  it('is refused while another decision holds the card for another agent', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO, state) => {
      await setup(board);
      const held = await card(board, 'held');
      await must(board, held, 'agt_a', 'dec_1');
      expect(await hold(board, held, 'agt_b', 'dec_2')).toMatchObject({ ok: false, code: 'CARD_RESERVED', detail: { reservation: { agentId: 'agt_a', decisionId: 'dec_1' } } });
      // The same decision may move its own hold, and a hold for the same agent is renewed.
      expect(await hold(board, held, 'agt_b', 'dec_1')).toMatchObject({ ok: true, value: { agentId: 'agt_b', decisionId: 'dec_1' } });
      expect(await hold(board, held, 'agt_b', 'dec_3')).toMatchObject({ ok: true, value: { agentId: 'agt_b', decisionId: 'dec_3' } });
      // Once it lapses, any decision may hold it.
      lapse(state, held);
      expect(await hold(board, held, 'agt_c', 'dec_4')).toMatchObject({ ok: true, value: { agentId: 'agt_c' } });
    });
  });

  it('bounds the window and requires a decision id', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await setup(board);
      const held = await card(board, 'held');
      for (const ttl of [9, 301, 1.5]) expect(await hold(board, held, 'agt_a', 'd', ttl)).toMatchObject({ ok: false, code: 'INVALID_RESERVATION' });
      expect(await hold(board, held, 'agt_a', '')).toMatchObject({ ok: false, code: 'INVALID_RESERVATION' });
      const r = await hold(board, held, 'agt_a', 'd', 10);
      expect(r.ok).toBe(true);
    });
  });

  it('the eligibility read says card_reserved for everyone but the agent it is held for', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await setup(board);
      const held = await card(board, 'held');
      await must(board, held, 'agt_a');
      const e = await board.cardEligibility({ cardId: held, agents: [who('agt_a'), who('agt_b')] });
      if (!e.ok) throw new Error(e.message);
      expect(e.value.reasons).toEqual([]);
      expect(e.value.agents.map((a) => [a.agentId, a.eligible, a.reasons])).toEqual([
        ['agt_a', true, []],
        ['agt_b', false, ['card_reserved']],
      ]);
    });
  });
});

/** Two agents subscribed to `work.available` on this board; returns config id to agent id. */
async function configs(board: BoardDO): Promise<Map<string, string>> {
  const byConfig = new Map<string, string>();
  for (const agentId of ['agt_a', 'agt_b']) {
    const r = await board.registerPushConfig({ agentId, url: `https://${agentId}.example/h`, token: 's', capabilities: ['build'], events: ['work.available'] });
    if (!r.ok) throw new Error(r.message);
    byConfig.set(r.value.configId, agentId);
  }
  return byConfig;
}

describe('work.available and a hold', () => {
  it('without a hold, a ready card is announced to every agent that could claim it', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await setup(board);
      const byConfig = await configs(board);
      await card(board, 'free');
      expect((await board.getPushDeliveries()).map((d) => byConfig.get(d.configId) ?? '').toSorted((x, y) => x.localeCompare(y))).toEqual(['agt_a', 'agt_b']);
    });
  });

  it('a hold announces the card to the agent it is held for, and only to it', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await setup(board);
      const held = await card(board, 'held');
      const byConfig = await configs(board);
      await must(board, held, 'agt_b');
      expect((await board.getPushDeliveries()).map((d) => byConfig.get(d.configId))).toEqual(['agt_b']);
    });
  });
});
