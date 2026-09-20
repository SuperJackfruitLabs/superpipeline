import { SELF, env, runInDurableObject } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { createAgent, createAgentToken, setAgentExternalMapping, updateAgent } from '../src/db/catalog';
import { __resetJwksCacheForTests } from '../src/auth/hub-jwt';
import type { BoardDO } from '../src/board/board-do';

const TENANT = 'tnt_concurrency';
const FLEET = 'fleet_concurrency';
const ISSUER = 'https://concurrency-issuer.test';

/**
 * The origin this Worker answers on in these tests, and therefore the audience a hub token
 * must name (`auth/hub-jwt.ts`, `planeAudience`). Before 2026-09-20 the check asked for the
 * issuer, which every token carries, so `aud` was decoration here.
 */
const PLANE = 'https://api.test';
const stages = [{ key: 'research', name: 'Research', order: 0, ownerKind: 'capability' as const, owner: 'research' }];
const dev = { 'X-Tenant-Id': TENANT, 'Content-Type': 'application/json' };
let signingKey: CryptoKey;
let jwks: string;

beforeAll(async () => {
  const pair = await generateKeyPair('EdDSA', { extractable: true });
  signingKey = pair.privateKey;
  jwks = JSON.stringify({ keys: [{ ...(await exportJWK(pair.publicKey)), alg: 'EdDSA', kid: 'concurrency' }] });
  await env.DB.prepare(`INSERT INTO tenants (id, slug, name, external_source, external_id) VALUES (?, ?, 'Concurrency', 'agentpod', ?)`)
    .bind(TENANT, TENANT, FLEET).run();
});

async function boardWithCards() {
  const res = await SELF.fetch('https://api.test/v1/boards', {
    method: 'POST', headers: dev, body: JSON.stringify({ name: 'Concurrency', stages }),
  });
  expect(res.status).toBe(201);
  const { boardId } = await res.json<{ boardId: string }>();
  for (const title of ['A', 'B', 'C']) {
    const card = await SELF.fetch(`https://api.test/v1/boards/${boardId}/cards`, {
      method: 'POST', headers: dev, body: JSON.stringify({ title }),
    });
    expect(card.status).toBe(201);
  }
  return boardId;
}

function claim(boardId: string, token: string, body: string) {
  return SELF.fetch(`https://api.test/v1/boards/${boardId}/claims`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body,
  });
}

async function withAgent(kind: 'native' | 'hub', concurrency: number, fn: (token: string) => Promise<void>) {
  const agent = await createAgent(env.DB, TENANT, { name: kind, capabilities: ['research'] });
  await updateAgent(env.DB, TENANT, agent.id, { concurrency });
  if (kind === 'native') {
    const { token } = await createAgentToken(env.DB, TENANT, agent.id, ['claim', 'run']);
    return fn(token);
  }
  const principal = `prn_${agent.id}`;
  await setAgentExternalMapping(env.DB, TENANT, agent.id, { externalId: principal, externalSource: 'org-plane' });
  const token = await new SignJWT({ sub: principal, tenant: FLEET, principalKind: 'agent' })
    .setProtectedHeader({ alg: 'EdDSA', kid: 'concurrency' }).setIssuedAt()
    .setIssuer(ISSUER).setAudience([ISSUER, PLANE]).setExpirationTime('5m').sign(signingKey);
  const originalFetch = globalThis.fetch;
  const originalIssuer = env.HUB_ISSUER;
  env.HUB_ISSUER = ISSUER;
  __resetJwksCacheForTests();
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    return url === `${ISSUER}/api/auth/jwks`
      ? new Response(jwks, { headers: { 'Content-Type': 'application/json' } })
      : originalFetch(input, init);
  }) as typeof fetch;
  try { await fn(token); }
  finally {
    globalThis.fetch = originalFetch;
    env.HUB_ISSUER = originalIssuer;
    __resetJwksCacheForTests();
  }
}

describe.each(['native', 'hub'] as const)('%s agent claim concurrency', (kind) => {
  it.each([
    { requested: undefined, expected: 2 },
    { requested: 100, expected: 2 },
    { requested: 1, expected: 1 },
  ])('uses the catalog ceiling or a smaller preference: $requested', async ({ requested, expected }) => {
    const boardId = await boardWithCards();
    await withAgent(kind, 2, async (token) => {
      for (let i = 0; i < expected + 1; i++) {
        const res = await claim(boardId, token, JSON.stringify({ maxConcurrency: requested }));
        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({ claimed: i < expected });
      }
    });
  });
});

describe('claim input validation', () => {
  it.each([
    '{}broken', 'null', '[]', '"hello"',
    ...['invalid', '2', null, true, 0, -1, 1.5, {}, []].map((maxConcurrency) => JSON.stringify({ maxConcurrency })),
    '{"maxConcurrency":1e309}',
    '{"capabilities":"research"}', '{"capabilities":[42]}', '{"profileKey":42}',
  ])('rejects malformed input without claiming work: %s', async (body) => {
    const boardId = await boardWithCards();
    await withAgent('native', 1, async (token) => {
      const res = await claim(boardId, token, body);
      expect(res.status).toBe(400);
      // A rejected request cannot consume a card or create an active run.
      expect(await (await claim(boardId, token, '{}')).json()).toMatchObject({ claimed: true });
      expect(await (await claim(boardId, token, '{}')).json()).toMatchObject({ claimed: false });
    });
  });
});

describe('Durable Object claim validation', () => {
  it.each([NaN, Infinity, -Infinity, 0, -1, 1.5, null, 'invalid', '2', true])('fails closed for an invalid RPC ceiling: %s', async (maxConcurrency) => {
    const stub = env.BOARD_DO.get(env.BOARD_DO.newUniqueId()) as unknown as DurableObjectStub<BoardDO>;
    await runInDurableObject(stub, async (board: BoardDO) => {
      await board.init({ id: 'brd_invalid', tenantId: TENANT, name: 'Invalid', stages });
      expect((await board.createCard({ title: 'A', ownerUserId: 'usr_a' })).ok).toBe(true);
      const agent = { agentId: 'agt_invalid', capabilities: ['research'] };
      // Deliberately bypass TypeScript: RPC callers can send malformed runtime values.
      expect(await board.claim({ ...agent, maxConcurrency: maxConcurrency as number })).toEqual({ claimed: false });
      expect((await board.claim(agent)).claimed).toBe(true);
    });
  });
});
