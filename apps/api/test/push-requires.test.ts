/**
 * `work.available` reaches exactly the configs whose agents a claim would hand the card to.
 *
 * The push used to match `stage.owner` alone, so a stage routed by `requires` (`all`/`any`) pushed
 * to nobody, or to configs that could not claim it, and a config staffed through an implication
 * edge (`code-review` implies `code`) was never told of a lane it could claim. Pull still worked;
 * the push was the part that lied. It now asks the claim path's own matcher.
 */
import { SELF, env, runInDurableObject } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import type { BoardDO, BoardInit } from '../src/board/board-do';
import type { PushDeliveryView } from '../src/board/model';
import { createAgent, createAgentToken } from '../src/db/catalog';
import { addImplication } from '../src/db/implications';
import { freshBoard as fresh } from './helpers/board';
import { setupCatalog } from './helpers/catalog';

beforeAll(setupCatalog);

const SHIP_ALL: BoardInit['stages'] = [
  { key: 'ship', name: 'Ship', order: 0, ownerKind: 'capability', owner: 'build', requires: { all: ['build', 'sign'] } },
];
const SHIP_ANY: BoardInit['stages'] = [
  { key: 'ship', name: 'Ship', order: 0, ownerKind: 'capability', owner: 'deploy', requires: { any: ['build', 'sign'] } },
];

/** Register one config per capability set, add a card, and return which agents were pushed to. */
async function pushedTo(board: BoardDO, stages: BoardInit['stages'], configs: Record<string, string[]>): Promise<string[]> {
  await board.init({ id: 'brd_pr', tenantId: 'tnt_pr', name: 'PR', stages });
  const byConfig = new Map<string, string>();
  for (const [agentId, capabilities] of Object.entries(configs)) {
    const r = await board.registerPushConfig({ agentId, url: `https://${agentId}.example/h`, token: 's', capabilities, events: ['work.available'] });
    if (!r.ok) throw new Error(r.message);
    byConfig.set(r.value.configId, agentId);
  }
  await board.createCard({ title: 'Ship it', ownerUserId: 'usr_a' });
  return (await board.getPushDeliveries()).map((d) => byConfig.get(d.configId) ?? d.configId).toSorted();
}

describe('work.available follows requires', () => {
  it('an `all` stage reaches only configs holding every capability', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      expect(await pushedTo(board, SHIP_ALL, { agt_both: ['build', 'sign'], agt_half: ['build'], agt_none: ['publish'] })).toEqual(['agt_both']);
    });
  });

  it('an `any` stage reaches every config holding one, even when owner names none of them', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      expect(await pushedTo(board, SHIP_ANY, { agt_build: ['build'], agt_sign: ['sign'], agt_owner: ['deploy'] })).toEqual(['agt_build', 'agt_sign']);
    });
  });

  it('pushes to exactly the agents a claim would hand the card to', async () => {
    const configs = { agt_both: ['build', 'sign'], agt_half: ['build'], agt_sign: ['sign'], agt_none: [] as string[] };
    for (const stages of [SHIP_ALL, SHIP_ANY]) {
      let pushed: string[] = [];
      await runInDurableObject(fresh(), async (board: BoardDO) => {
        pushed = await pushedTo(board, stages, configs);
      });
      const claimers: string[] = [];
      for (const [agentId, capabilities] of Object.entries(configs)) {
        await runInDurableObject(fresh(), async (board: BoardDO) => {
          await board.init({ id: 'brd_pc', tenantId: 'tnt_pr', name: 'PC', stages });
          await board.createCard({ title: 'Ship it', ownerUserId: 'usr_a' });
          if ((await board.claim({ agentId, capabilities })).claimed) claimers.push(agentId);
        });
      }
      expect(pushed).toEqual(claimers.toSorted());
    }
  });
});

describe('work.available follows implication edges and the agent row', () => {
  const tenant = 'tnt_push_implies';
  const headers = { 'X-Tenant-Id': tenant, 'Content-Type': 'application/json' };

  async function codeBoard(): Promise<string> {
    await env.DB.prepare(`INSERT OR IGNORE INTO tenants (id, slug, name) VALUES (?, ?, 'PI')`).bind(tenant, `slug-${tenant}`).run();
    const b = await SELF.fetch('https://api.test/v1/boards', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'PI', stages: [{ key: 'code', name: 'Code', order: 0, ownerKind: 'capability', owner: 'code' }] }),
    });
    return (await b.json<{ boardId: string }>()).boardId;
  }

  async function deliveriesAfterACard(boardId: string): Promise<PushDeliveryView[]> {
    await SELF.fetch(`https://api.test/v1/boards/${boardId}/cards`, { method: 'POST', headers, body: JSON.stringify({ title: 'C', ownerUserId: 'usr_a' }) });
    const res = await SELF.fetch(`https://api.test/v1/boards/${boardId}/push/deliveries`, { headers });
    return (await res.json<{ deliveries: PushDeliveryView[] }>()).deliveries;
  }

  it('a config staffed through an implication edge is told of the lane it can claim', async () => {
    const boardId = await codeBoard();
    await addImplication(env.DB, tenant, 'code-review', 'code', null);
    const reg = await SELF.fetch(`https://api.test/v1/boards/${boardId}/push-configs`, {
      method: 'POST',
      headers: { ...headers, 'X-Agent-Id': 'agt_reviewer' },
      body: JSON.stringify({ url: 'https://reviewer.example/h', token: 's', capabilities: ['code-review'], events: ['work.available'] }),
    });
    expect(reg.status).toBe(201);
    expect(await deliveriesAfterACard(boardId)).toHaveLength(1);
  });

  it('an agent token is matched on its own catalog row, as its claim is', async () => {
    const boardId = await codeBoard();
    const agent = await createAgent(env.DB, tenant, { name: 'Coder', capabilities: ['code'] });
    const { token } = await createAgentToken(env.DB, tenant, agent.id, ['claim', 'run']);
    const reg = await SELF.fetch(`https://api.test/v1/boards/${boardId}/push-configs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://coder.example/h', token: 's', events: ['work.available'] }),
    });
    expect(reg.status).toBe(201);
    expect(await deliveriesAfterACard(boardId)).toHaveLength(1);
  });
});
