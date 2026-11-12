/**
 * `GET|PUT /v1/boards/:id/scheduling`: a placement service opts a board into a placement window on
 * its own `dispatch:reserve` scope, for its own workspace only, and reads it back. Nobody else sets
 * one.
 */
import { SELF, env } from 'cloudflare:test';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { __resetJwksCacheForTests } from '../src/auth/hub-jwt';
import type { BoardInit } from '../src/board/board-do';
import { boardStub } from '../src/board/stub';
import { recordBoard } from '../src/db/catalog';
import { newId } from '../src/ids';
import { withIssuer } from './helpers/hub-issuer';

const TENANT = 'tnt_scheduling_rest';
const FLEET = 'fleet_0000000000000000sc01';
const OTHER = 'tnt_scheduling_other';
const OTHER_FLEET = 'fleet_0000000000000000sc02';
const ISSUER = 'https://issuer-sc.test';
const SERVICE = 'prn_0123456789abcdef0e0a';
let signingKey: CryptoKey;
let jwksBody: string;

beforeAll(async () => {
  const pair = await generateKeyPair('EdDSA', { extractable: true });
  signingKey = pair.privateKey;
  jwksBody = JSON.stringify({ keys: [{ ...(await exportJWK(pair.publicKey)), alg: 'EdDSA', kid: 'sc-kid' }] });
  for (const [t, f] of [[TENANT, FLEET], [OTHER, OTHER_FLEET]]) {
    await env.DB.prepare(`INSERT OR IGNORE INTO tenants (id, slug, name) VALUES (?, ?, 'SC')`).bind(t, `slug-${t}`).run();
    await env.DB.prepare(`UPDATE tenants SET external_source='agentpod', external_id=? WHERE id=?`).bind(f, t).run();
  }
});
beforeEach(() => __resetJwksCacheForTests());

const serviceToken = (scope: string, tenant = FLEET) =>
  new SignJWT({ sub: SERVICE, principalKind: 'service', tenant, mayDispatch: [], mayGrantReach: false, scope })
    .setProtectedHeader({ alg: 'EdDSA', kid: 'sc-kid' })
    .setIssuedAt().setIssuer(ISSUER).setAudience([ISSUER, 'https://api.test']).setExpirationTime('5m')
    .sign(signingKey);

async function seed(): Promise<{ boardId: string; url: string }> {
  const boardId = newId('brd');
  const stages: BoardInit['stages'] = [{ key: 'code', name: 'Code', order: 0, ownerKind: 'capability', owner: 'code' }];
  await boardStub(env, TENANT, boardId).init({ id: boardId, tenantId: TENANT, name: 'SC', stages });
  await recordBoard(env.DB, TENANT, { id: boardId, name: 'SC', stagesJson: JSON.stringify(stages) });
  return { boardId, url: `https://api.test/v1/boards/${boardId}/scheduling` };
}

async function call(url: string, method: string, body?: unknown, scope = 'dispatch:reserve', tenant = FLEET): Promise<Response> {
  return SELF.fetch(url, {
    method,
    headers: { Authorization: `Bearer ${await serviceToken(scope, tenant)}`, 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

describe('/v1/boards/:id/scheduling (a service)', () => {
  it('sets the placement window, reads it back, and the board holds new cards back from pull', async () => {
    const { boardId, url } = await seed();
    await withIssuer(ISSUER, jwksBody, async () => {
      expect(await (await call(url, 'GET', undefined, 'dispatch:read')).json()).toEqual({ scheduling: { placementWindowSeconds: 0 } });
      const set = await call(url, 'PUT', { placementWindowSeconds: 10 });
      expect(set.status).toBe(200);
      expect(await set.json()).toEqual({ scheduling: { placementWindowSeconds: 10 } });
      expect(await (await call(url, 'GET')).json()).toEqual({ scheduling: { placementWindowSeconds: 10 } });
    });
    const board = boardStub(env, TENANT, boardId);
    await board.createCard({ title: 'Write it', ownerUserId: 'usr_sc' });
    expect(await board.claim({ agentId: 'agt_someone', capabilities: ['code'] })).toEqual({ claimed: false, reason: 'placement_window' });
  });

  it('answers 400 for a window out of range, 403 without dispatch:reserve, 404 for another workspace’s board', async () => {
    const { url } = await seed();
    await withIssuer(ISSUER, jwksBody, async () => {
      for (const body of [{ placementWindowSeconds: 31 }, { placementWindowSeconds: -1 }, { placementWindowSeconds: '10' }, {}]) {
        const r = await call(url, 'PUT', body);
        expect({ body, status: r.status }).toEqual({ body, status: 400 });
      }
      for (const scope of ['', 'dispatch:read', 'cards:read']) {
        const r = await call(url, 'PUT', { placementWindowSeconds: 5 }, scope);
        expect({ scope, status: r.status }).toEqual({ scope, status: 403 });
      }
      expect((await call(url, 'GET', undefined, 'cards:read')).status).toBe(403);
      expect((await call(url, 'PUT', { placementWindowSeconds: 5 }, 'dispatch:reserve', OTHER_FLEET)).status).toBe(404);
    });
  });
});
