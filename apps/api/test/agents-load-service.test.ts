/**
 * `GET /v1/agents/load` (treaty placement.v1, phase 3 ruling 1): every agent of the service's
 * workspace with the runs it works now over every board, its capacity and its latest heartbeat —
 * what a placement service reads once a pass. Review focus: a capacity of 0, an agent that never
 * ran, and an agent working on two boards each read exactly as they are.
 */
import { SELF, env, runInDurableObject } from 'cloudflare:test';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetJwksCacheForTests } from '../src/auth/hub-jwt';
import { BoardDO, type BoardInit } from '../src/board/board-do';
import { boardStub } from '../src/board/stub';
import { createAgent, createAgentToken, recordBoard, setAgentExternalMapping, updateAgent } from '../src/db/catalog';
import { newId } from '../src/ids';
import { withIssuer } from './helpers/hub-issuer';

const TENANT = 'tnt_agents_load_svc';
const FLEET = 'fleet_0000000000000000al01';
const OTHER = 'tnt_agents_load_other';
const OTHER_FLEET = 'fleet_0000000000000000al02';
const ISSUER = 'https://issuer-al.test';
const LOAD_URL = 'https://api.test/v1/agents/load';

interface AgentLoad { agentId: string; principalId: string | null; inFlight: number; capacity: number; lastHeartbeatAt: string | null }

let signingKey: CryptoKey;
let jwksBody: string;

beforeAll(async () => {
  const pair = await generateKeyPair('EdDSA', { extractable: true });
  signingKey = pair.privateKey;
  jwksBody = JSON.stringify({ keys: [{ ...(await exportJWK(pair.publicKey)), alg: 'EdDSA', kid: 'al-kid' }] });
  for (const [t, f] of [[TENANT, FLEET], [OTHER, OTHER_FLEET]]) {
    await env.DB.prepare(`INSERT OR IGNORE INTO tenants (id, slug, name) VALUES (?, ?, 'AL')`).bind(t, `slug-${t}`).run();
    await env.DB.prepare(`UPDATE tenants SET external_source='agentpod', external_id=? WHERE id=?`).bind(f, t).run();
  }
});
beforeEach(() => __resetJwksCacheForTests());

const serviceToken = (scope: string, tenant = FLEET) =>
  new SignJWT({ sub: 'prn_0123456789abcdef0e01', principalKind: 'service', tenant, mayDispatch: [], mayGrantReach: false, scope })
    .setProtectedHeader({ alg: 'EdDSA', kid: 'al-kid' })
    .setIssuedAt().setIssuer(ISSUER).setAudience([ISSUER, 'https://api.test']).setExpirationTime('5m')
    .sign(signingKey);

const STAGES: BoardInit['stages'] = [{ key: 'code', name: 'Code', order: 0, ownerKind: 'capability', owner: 'code' }];

async function board(tenant = TENANT): Promise<string> {
  const boardId = newId('brd');
  await boardStub(env, tenant, boardId).init({ id: boardId, tenantId: tenant, name: 'AL', stages: STAGES });
  await recordBoard(env.DB, tenant, { id: boardId, name: 'AL', stagesJson: JSON.stringify(STAGES) });
  return boardId;
}

/** Runs written straight into a board: `[agentId, status, lastHeartbeatMs]`. */
async function runs(boardId: string, rows: Array<[string, 'working' | 'completed' | 'failed', number]>, tenant = TENANT): Promise<void> {
  const stub = env.BOARD_DO.get(env.BOARD_DO.idFromName(`${tenant}:${boardId}`)) as unknown as DurableObjectStub<BoardDO>;
  await runInDurableObject(stub, async (_b: BoardDO, state) => {
    for (const [agentId, status, ms] of rows) {
      const id = newId('run');
      state.storage.sql.exec(
        `INSERT INTO runs (id, card_id, stage_key, agent_id, lease_epoch, status, outcome, last_heartbeat_ms, started_at, ended_at)
         VALUES (?, ?, 'code', ?, 1, ?, ?, ?, '2026-11-24T00:00:00Z', ?)`,
        id, newId('card'), agentId, status, status === 'working' ? null : status, ms, status === 'working' ? null : '2026-11-24T00:01:00Z',
      );
    }
  });
}

async function read(scope = 'dispatch:read', fleet = FLEET): Promise<Response> {
  return withIssuer(ISSUER, jwksBody, async () => SELF.fetch(LOAD_URL, { headers: { Authorization: `Bearer ${await serviceToken(scope, fleet)}` } }));
}

async function loads(): Promise<Map<string, AgentLoad>> {
  const res = await read();
  expect(res.status).toBe(200);
  const body = await res.json<{ agents: AgentLoad[] }>();
  return new Map(body.agents.map((a) => [a.agentId, a]));
}

describe('GET /v1/agents/load', () => {
  it('lists an agent that never ran, with nothing in flight, the default capacity and no heartbeat', async () => {
    const idle = await createAgent(env.DB, TENANT, { name: 'never-ran', capabilities: ['code'] });
    expect((await loads()).get(idle.id)).toEqual({ agentId: idle.id, principalId: null, inFlight: 0, capacity: 1, lastHeartbeatAt: null });
  });

  it('lists an agent with capacity 0 as it is: 0, never a default', async () => {
    const parked = await createAgent(env.DB, TENANT, { name: 'parked', capabilities: ['code'] });
    await updateAgent(env.DB, TENANT, parked.id, { concurrency: 0 });
    const b = await board();
    await runs(b, [[parked.id, 'working', Date.parse('2026-11-24T02:00:00Z')]]);
    expect((await loads()).get(parked.id)).toMatchObject({ capacity: 0, inFlight: 1 });
  });

  it('sums an agent’s working runs over every board, and its heartbeat is the latest on any', async () => {
    const busy = await createAgent(env.DB, TENANT, { name: 'two-boards', capabilities: ['code'] });
    await updateAgent(env.DB, TENANT, busy.id, { concurrency: 3 });
    await setAgentExternalMapping(env.DB, TENANT, busy.id, { externalId: 'prn_0123456789abcdef0a11', externalSource: 'org-plane' });
    const [one, two] = [await board(), await board()];
    await runs(one, [[busy.id, 'working', Date.parse('2026-11-24T01:00:00Z')], [busy.id, 'completed', Date.parse('2026-11-24T03:00:00Z')]]);
    await runs(two, [[busy.id, 'working', Date.parse('2026-11-24T02:00:00Z')], [busy.id, 'failed', Date.parse('2026-11-24T00:30:00Z')]]);
    expect((await loads()).get(busy.id)).toEqual({
      agentId: busy.id,
      principalId: 'prn_0123456789abcdef0a11',
      // The two working runs; the completed and failed ones hold nothing.
      inFlight: 2,
      capacity: 3,
      // The ended run's heartbeat is still the latest the agent sent.
      lastHeartbeatAt: '2026-11-24T03:00:00.000Z',
    });
  });

  it('an agent whose runs all ended holds nothing but keeps its last heartbeat', async () => {
    const done = await createAgent(env.DB, TENANT, { name: 'finished', capabilities: ['code'] });
    const b = await board();
    await runs(b, [[done.id, 'completed', Date.parse('2026-11-23T10:00:00Z')]]);
    expect((await loads()).get(done.id)).toMatchObject({ inFlight: 0, lastHeartbeatAt: '2026-11-23T10:00:00.000Z' });
  });

  it('never lists another workspace’s agents or counts its runs', async () => {
    const mine = await createAgent(env.DB, TENANT, { name: 'mine', capabilities: ['code'] });
    const theirs = await createAgent(env.DB, OTHER, { name: 'theirs', capabilities: ['code'] });
    const b = await board(OTHER);
    // The same agent id on another workspace's board does not count for mine.
    await runs(b, [[mine.id, 'working', Date.now()], [theirs.id, 'working', Date.now()]], OTHER);
    const seen = await loads();
    expect(seen.has(theirs.id)).toBe(false);
    expect(seen.get(mine.id)).toMatchObject({ inFlight: 0, lastHeartbeatAt: null });
  });

  it('a board that does not answer fails the read (500 UNEXPECTED) rather than under-count', async () => {
    const held = await createAgent(env.DB, TENANT, { name: 'holds-two', capabilities: ['code'] });
    const [one, two] = [await board(), await board()];
    await runs(one, [[held.id, 'working', Date.now()]]);
    await runs(two, [[held.id, 'working', Date.now()]]);
    // One board's answer fails: the agent would read one in flight where it holds two.
    const failing = vi.spyOn(BoardDO.prototype, 'runLoad').mockRejectedValueOnce(new Error('board unavailable'));
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const r = await read();
      expect(r.status).toBe(500);
      expect(await r.json()).toMatchObject({ error: { code: 'UNEXPECTED' } });
      expect(logged).toHaveBeenCalledWith(expect.objectContaining({ msg: 'agents load failed', error: 'board unavailable' }));
    } finally {
      failing.mockRestore();
      logged.mockRestore();
    }
    expect((await loads()).get(held.id)).toMatchObject({ inFlight: 2 });
  });

  it('needs dispatch:read', async () => {
    for (const scope of ['', 'cards:read', 'dispatch:reserve', 'cards:read push:write gates:read']) {
      const r = await read(scope);
      expect({ scope, status: r.status }).toEqual({ scope, status: 403 });
      expect(await r.json()).toMatchObject({ error: { code: 'FORBIDDEN' } });
    }
  });

  it('is a service route: a person or an agent token is refused 401', async () => {
    const person = await SELF.fetch(LOAD_URL, { headers: { 'X-Tenant-Id': TENANT, 'X-User-Id': 'usr_al' } });
    expect(person.status).toBe(401);
    expect(await person.json()).toMatchObject({ error: { code: 'UNAUTHORIZED' } });
    const a = await createAgent(env.DB, TENANT, { name: 'token-holder', capabilities: ['code'] });
    const { token } = await createAgentToken(env.DB, TENANT, a.id, ['claim', 'run', 'read']);
    const agent = await SELF.fetch(LOAD_URL, { headers: { Authorization: `Bearer ${token}` } });
    expect(agent.status).toBe(401);
    const none = await SELF.fetch(LOAD_URL);
    expect(none.status).toBe(401);
  });

  it('answers only GET', async () => {
    const r = await withIssuer(ISSUER, jwksBody, async () =>
      SELF.fetch(LOAD_URL, { method: 'POST', headers: { Authorization: `Bearer ${await serviceToken('dispatch:read')}` } }));
    expect(r.status).toBe(405);
  });
});
