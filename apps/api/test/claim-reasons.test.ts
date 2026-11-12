/**
 * A claim that hands out nothing says why (`ClaimReason`), one code per refusal the claim path
 * makes, and the success shape does not change.
 *
 * Before this, `{claimed: false}` meant an empty queue, an over-budget board and an agent at its
 * cap alike, and a caller could not tell "nothing for you" from "you can never take this".
 */
import { SELF, env, runInDurableObject } from 'cloudflare:test';
import { afterEach, describe, expect, it } from 'vitest';
import type { BoardDO, BoardInit } from '../src/board/board-do';
import { freshBoard as fresh } from './helpers/board';

const STAGES: BoardInit['stages'] = [
  { key: 'build', name: 'Build', order: 0, ownerKind: 'capability', owner: 'build' },
  { key: 'review', name: 'Review', order: 1, ownerKind: 'human' },
];
const PRINCIPAL = 'prn_0123456789abcdef0123';

afterEach(() => {
  Reflect.deleteProperty(env, 'ENFORCE_CONTROL_PAIR');
});

describe('claim reasons', () => {
  it('board_not_initialized: no board here', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      expect(await board.claim({ agentId: 'agt_a', capabilities: ['build'] })).toEqual({ claimed: false, reason: 'board_not_initialized' });
    });
  });

  it('board_over_budget: the board reached its ceiling', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await board.init({ id: 'brd_r_budget', tenantId: 'tnt_r', name: 'R', stages: STAGES });
      await board.setBudget({ boardUsdCap: 1 });
      await board.createCard({ title: 'A', ownerUserId: 'usr_a' });
      const a = await board.claim({ agentId: 'agt_a', capabilities: ['build'] });
      if (!a.claimed) throw new Error('setup claim failed');
      await board.postActivity({ runId: a.runId, leaseEpoch: a.leaseEpoch, type: 'action', usage: { model: 'm', inputTokens: 0, outputTokens: 0, costUsd: 2 } });
      await board.createCard({ title: 'B', ownerUserId: 'usr_a' });
      expect(await board.claim({ agentId: 'agt_b', capabilities: ['build'] })).toEqual({ claimed: false, reason: 'board_over_budget' });
    });
  });

  it('concurrency_reached: the agent already holds its limit here', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await board.init({ id: 'brd_r_conc', tenantId: 'tnt_r', name: 'R', stages: STAGES });
      await board.createCard({ title: 'A', ownerUserId: 'usr_a' });
      await board.createCard({ title: 'B', ownerUserId: 'usr_a' });
      expect((await board.claim({ agentId: 'agt_a', capabilities: ['build'] })).claimed).toBe(true);
      expect(await board.claim({ agentId: 'agt_a', capabilities: ['build'] })).toEqual({ claimed: false, reason: 'concurrency_reached' });
      // Not a board-wide stop: another agent still takes the second card.
      expect((await board.claim({ agentId: 'agt_b', capabilities: ['build'] })).claimed).toBe(true);
    });
  });

  it('capability_mismatch: no stage on this board is one the agent can take', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await board.init({ id: 'brd_r_cap', tenantId: 'tnt_r', name: 'R', stages: STAGES });
      await board.createCard({ title: 'A', ownerUserId: 'usr_a' });
      expect(await board.claim({ agentId: 'agt_a', capabilities: ['publish'] })).toEqual({ claimed: false, reason: 'capability_mismatch' });
    });
  });

  it('capability_mismatch counts a requires stage the agent only half meets', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await board.init({
        id: 'brd_r_req',
        tenantId: 'tnt_r',
        name: 'R',
        stages: [{ key: 'ship', name: 'Ship', order: 0, ownerKind: 'capability', owner: 'build', requires: { all: ['build', 'sign'] } }],
      });
      await board.createCard({ title: 'A', ownerUserId: 'usr_a' });
      expect(await board.claim({ agentId: 'agt_a', capabilities: ['build'] })).toEqual({ claimed: false, reason: 'capability_mismatch' });
      expect((await board.claim({ agentId: 'agt_a', capabilities: ['build', 'sign'] })).claimed).toBe(true);
    });
  });

  it('no_matching_card: the agent fits a stage, but nothing there is ready', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await board.init({ id: 'brd_r_empty', tenantId: 'tnt_r', name: 'R', stages: STAGES });
      expect(await board.claim({ agentId: 'agt_a', capabilities: ['build'] })).toEqual({ claimed: false, reason: 'no_matching_card' });
    });
  });

  it('grant_denied: the queuer may not dispatch this agent, and the card still parks', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await board.init({ id: 'brd_r_grant', tenantId: 'tnt_r', name: 'R', stages: STAGES });
      const c = await board.createCard({ title: 'A', ownerUserId: 'usr_a', queuedGrant: ['prn_ffffffffffffffffffff'] });
      if (!c.ok) throw new Error(c.message);
      Reflect.set(env, 'ENFORCE_CONTROL_PAIR', 'true');
      expect(await board.claim({ agentId: 'agt_a', capabilities: ['build'], principalId: PRINCIPAL })).toEqual({ claimed: false, reason: 'grant_denied' });
      expect((await board.getState()).cards.find((x) => x.id === c.value.id)?.state).toBe('input-required');
    });
  });

  it('the success shape is unchanged: no reason on a claim that hands out work', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await board.init({ id: 'brd_r_ok', tenantId: 'tnt_r', name: 'R', stages: STAGES });
      await board.createCard({ title: 'A', ownerUserId: 'usr_a' });
      const r = await board.claim({ agentId: 'agt_a', capabilities: ['build'] });
      expect(r.claimed).toBe(true);
      expect(r).not.toHaveProperty('reason');
    });
  });
});

describe('claim reasons over REST', () => {
  it('POST /claims answers {claimed:false, reason} and nothing else', async () => {
    const tenant = 'tnt_claim_reasons';
    const headers = { 'X-Tenant-Id': tenant, 'Content-Type': 'application/json' };
    await env.DB.prepare(`INSERT OR IGNORE INTO tenants (id, slug, name) VALUES (?, ?, 'CR')`).bind(tenant, `slug-${tenant}`).run();
    const b = await SELF.fetch('https://api.test/v1/boards', { method: 'POST', headers, body: JSON.stringify({ name: 'CR', stages: STAGES }) });
    const { boardId } = await b.json<{ boardId: string }>();
    const res = await SELF.fetch(`https://api.test/v1/boards/${boardId}/claims`, {
      method: 'POST',
      headers: { ...headers, 'X-Agent-Id': 'agt_cr' },
      body: JSON.stringify({ capabilities: ['publish'] }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ claimed: false, reason: 'capability_mismatch' });
  });
});
