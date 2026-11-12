/**
 * `GET /v1/agents/load`: every agent of the workspace with the cards it holds over every board
 * (`inFlight`), its `capacity` and its latest run heartbeat, for a placement service on
 * `dispatch:read`. It is how a scheduler judges the load and health of an agent that claims with
 * its own token and is on no fleet roster.
 */
import { SELF, env, runInDurableObject } from 'cloudflare:test';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AgentLoadEntry } from '../src/agent-load';
import { __resetJwksCacheForTests } from '../src/auth/hub-jwt';
import type { BoardDO, BoardInit } from '../src/board/board-do';
import { boardStub } from '../src/board/stub';
import { createAgent, createAgentToken, recordBoard, setAgentExternalMapping, updateAgent } from '../src/db/catalog';
import { newId } from '../src/ids';
import { freshBoard } from './helpers/board';
import { withIssuer } from './helpers/hub-issuer';

const STAGES: BoardInit['stages'] = [{ key: 'code', name: 'Code', order: 0, ownerKind: 'capability', owner: 'code' }];

describe('agentLoad (the board)', () => {
  it('names each agent’s cards in hand and its latest run heartbeat, ended runs included', async () => {
    await runInDurableObject(freshBoard(), async (board: BoardDO, state) => {
      await board.init({ id: 'brd_ld', tenantId: 'tnt_ld', name: 'L', stages: STAGES });
      for (let i = 0; i < 2; i++) {
        const c = await board.createCard({ title: `Card ${i}`, ownerUserId: 'usr_a' });
        if (!c.ok) throw new Error(c.message);
      }
      expect((await board.claim({ agentId: 'agt_busy', capabilities: ['code'] })).claimed).toBe(true);
      expect((await board.claim({ agentId: 'agt_done', capabilities: ['code'] })).claimed).toBe(true);
      state.storage.sql.exec(`UPDATE runs SET last_heartbeat_ms = 1000 WHERE agent_id = 'agt_busy'`);
      state.storage.sql.exec(`UPDATE runs SET last_heartbeat_ms = 2000, status = 'ended' WHERE agent_id = 'agt_done'`);
      state.storage.sql.exec(`UPDATE cards SET state = 'completed' WHERE delegate_agent_id = 'agt_done'`);
      expect(await board.agentLoad()).toEqual({
        agt_busy: { claimed: 1, working: 1, lastHeartbeatMs: 1000 },
        agt_done: { claimed: 0, working: 0, lastHeartbeatMs: 2000 },
      });
    });
  });
});

describe('GET /v1/agents/load', () => {
  const TENANT = 'tnt_agent_load';
  const FLEET = 'fleet_0000000000000000ld01';
  const ISSUER = 'https://issuer-ld.test';
  let signingKey: CryptoKey;
  let jwksBody: string;

  beforeAll(async () => {
    const pair = await generateKeyPair('EdDSA', { extractable: true });
    signingKey = pair.privateKey;
    jwksBody = JSON.stringify({ keys: [{ ...(await exportJWK(pair.publicKey)), alg: 'EdDSA', kid: 'ld-kid' }] });
    await env.DB.prepare(`INSERT OR IGNORE INTO tenants (id, slug, name) VALUES (?, ?, 'LD')`).bind(TENANT, `slug-${TENANT}`).run();
    await env.DB.prepare(`UPDATE tenants SET external_source='agentpod', external_id=? WHERE id=?`).bind(FLEET, TENANT).run();
  });
  beforeEach(() => __resetJwksCacheForTests());

  const serviceToken = (scope: string, tenant = FLEET) =>
    new SignJWT({ sub: 'prn_0123456789abcdef0e02', principalKind: 'service', tenant, mayDispatch: [], mayGrantReach: false, scope })
      .setProtectedHeader({ alg: 'EdDSA', kid: 'ld-kid' })
      .setIssuedAt().setIssuer(ISSUER).setAudience([ISSUER, 'https://api.test']).setExpirationTime('5m')
      .sign(signingKey);

  /** Two boards; `busy` holds a card on each, `idle` never ran, `wide` may hold three. */
  async function seed() {
    const busy = await createAgent(env.DB, TENANT, { name: `Busy ${newId('x')}`, capabilities: ['code'] });
    await setAgentExternalMapping(env.DB, TENANT, busy.id, { externalId: `prn_${newId('x').slice(2, 18)}0b01`, externalSource: 'org-plane' });
    const idle = await createAgent(env.DB, TENANT, { name: `Idle ${newId('x')}`, capabilities: ['code'] });
    const wide = await createAgent(env.DB, TENANT, { name: `Wide ${newId('x')}`, capabilities: ['writing'] });
    await updateAgent(env.DB, TENANT, wide.id, { concurrency: 3 });
    const beats: number[] = [];
    for (const name of ['One', 'Two']) {
      const boardId = newId('brd');
      const board = boardStub(env, TENANT, boardId);
      await board.init({ id: boardId, tenantId: TENANT, name, stages: STAGES });
      await recordBoard(env.DB, TENANT, { id: boardId, name, stagesJson: JSON.stringify(STAGES) });
      const card = await board.createCard({ title: 'Write it', ownerUserId: 'usr_a' });
      if (!card.ok) throw new Error(card.message);
      const before = Date.now();
      expect((await board.claim({ agentId: busy.id, capabilities: ['code'] })).claimed).toBe(true);
      beats.push(before);
    }
    return { busy, idle, wide, earliestBeat: Math.min(...beats) };
  }

  it('sums cards in hand over every board, with capacity and the latest heartbeat', async () => {
    const { busy, idle, wide, earliestBeat } = await seed();
    await withIssuer(ISSUER, jwksBody, async () => {
      const res = await SELF.fetch('https://api.test/v1/agents/load', { headers: { Authorization: `Bearer ${await serviceToken('dispatch:read')}` } });
      expect(res.status).toBe(200);
      const { agents } = await res.json<{ agents: AgentLoadEntry[] }>();
      const byId = Object.fromEntries(agents.map((a) => [a.agentId, a]));
      expect(byId[busy.id]).toMatchObject({ inFlight: 2, capacity: 1, principalId: expect.stringMatching(/^prn_/) });
      expect(Date.parse(byId[busy.id]?.lastHeartbeatAt ?? '')).toBeGreaterThanOrEqual(earliestBeat);
      expect(byId[idle.id]).toEqual({ agentId: idle.id, principalId: null, inFlight: 0, capacity: 1, lastHeartbeatAt: null });
      expect(byId[wide.id]).toMatchObject({ inFlight: 0, capacity: 3, lastHeartbeatAt: null });
    });
  });

  it('is refused on any scope but dispatch:read, and names no agent', async () => {
    const { busy } = await seed();
    await withIssuer(ISSUER, jwksBody, async () => {
      for (const scope of ['', 'cards:read', 'dispatch:reserve']) {
        const r = await SELF.fetch('https://api.test/v1/agents/load', { headers: { Authorization: `Bearer ${await serviceToken(scope)}` } });
        expect({ scope, status: r.status }).toEqual({ scope, status: 403 });
        expect(await r.text()).not.toContain(busy.id);
      }
    });
  });

  it('a service of another workspace sees none of these agents', async () => {
    const { busy } = await seed();
    const other = 'tnt_agent_load_other';
    const otherFleet = 'fleet_0000000000000000ld02';
    await env.DB.prepare(`INSERT OR IGNORE INTO tenants (id, slug, name) VALUES (?, ?, 'LO')`).bind(other, `slug-${other}`).run();
    await env.DB.prepare(`UPDATE tenants SET external_source='agentpod', external_id=? WHERE id=?`).bind(otherFleet, other).run();
    await withIssuer(ISSUER, jwksBody, async () => {
      const r = await SELF.fetch('https://api.test/v1/agents/load', { headers: { Authorization: `Bearer ${await serviceToken('dispatch:read', otherFleet)}` } });
      expect(r.status).toBe(200);
      expect(await r.text()).not.toContain(busy.id);
    });
  });

  it('only a service gets the load: an agent or a person falls through to the registry, as before', async () => {
    const { busy } = await seed();
    const { token } = await createAgentToken(env.DB, TENANT, busy.id, ['claim', 'run', 'read']);
    const asAgent = await SELF.fetch('https://api.test/v1/agents/load', { headers: { Authorization: `Bearer ${token}` } });
    const asPerson = await SELF.fetch('https://api.test/v1/agents/load', { headers: { 'X-Tenant-Id': TENANT, 'X-User-Id': 'usr_ld' } });
    for (const r of [asAgent, asPerson]) {
      const text = await r.text();
      expect(text).not.toContain('inFlight');
      expect(text).not.toContain('lastHeartbeatAt');
    }
  });
});
