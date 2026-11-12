/**
 * `PUT|DELETE /v1/boards/:id/cards/:cardId/reservation`: a placement service holds a card for the
 * agent it chose, on its own `dispatch:reserve` scope and for its own workspace only; a board admin
 * may clear a hold. Nobody else writes one.
 */
import { SELF, env } from 'cloudflare:test';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { __resetJwksCacheForTests } from '../src/auth/hub-jwt';
import type { BoardInit } from '../src/board/board-do';
import { boardStub } from '../src/board/stub';
import { createAgent, createAgentToken, recordBoard } from '../src/db/catalog';
import { addImplication } from '../src/db/implications';
import { newId } from '../src/ids';
import { withIssuer } from './helpers/hub-issuer';

const TENANT = 'tnt_reservation_rest';
const FLEET = 'fleet_0000000000000000rs01';
const OTHER = 'tnt_reservation_other';
const OTHER_FLEET = 'fleet_0000000000000000rs02';
const ISSUER = 'https://issuer-rs.test';
const SERVICE = 'prn_0123456789abcdef0e09';
let signingKey: CryptoKey;
let jwksBody: string;

beforeAll(async () => {
  const pair = await generateKeyPair('EdDSA', { extractable: true });
  signingKey = pair.privateKey;
  jwksBody = JSON.stringify({ keys: [{ ...(await exportJWK(pair.publicKey)), alg: 'EdDSA', kid: 'rs-kid' }] });
  for (const [t, f] of [[TENANT, FLEET], [OTHER, OTHER_FLEET]]) {
    await env.DB.prepare(`INSERT OR IGNORE INTO tenants (id, slug, name) VALUES (?, ?, 'RS')`).bind(t, `slug-${t}`).run();
    await env.DB.prepare(`UPDATE tenants SET external_source='agentpod', external_id=? WHERE id=?`).bind(f, t).run();
  }
  await env.DB.prepare(`INSERT INTO memberships (id, tenant_id, user_id, role) VALUES (?, ?, ?, ?), (?, ?, ?, ?)`)
    .bind('mem_rs_admin', TENANT, 'usr_rs_admin', 'admin', 'mem_rs_member', TENANT, 'usr_rs_member', 'member')
    .run();
});
beforeEach(() => __resetJwksCacheForTests());

const serviceToken = (scope: string, tenant = FLEET) =>
  new SignJWT({ sub: SERVICE, principalKind: 'service', tenant, mayDispatch: [], mayGrantReach: false, scope })
    .setProtectedHeader({ alg: 'EdDSA', kid: 'rs-kid' })
    .setIssuedAt().setIssuer(ISSUER).setAudience([ISSUER, 'https://api.test']).setExpirationTime('5m')
    .sign(signingKey);

/** A board with one ready card on a `code` stage; a reviewer (code via an implication edge) and a writer. */
async function seed(): Promise<{ boardId: string; cardId: string; reviewer: string; writer: string; url: string }> {
  const boardId = newId('brd');
  const stages: BoardInit['stages'] = [{ key: 'code', name: 'Code', order: 0, ownerKind: 'capability', owner: 'code' }];
  const board = boardStub(env, TENANT, boardId);
  await board.init({ id: boardId, tenantId: TENANT, name: 'RS', stages });
  await recordBoard(env.DB, TENANT, { id: boardId, name: 'RS', stagesJson: JSON.stringify(stages) });
  const card = await board.createCard({ title: 'Write it', ownerUserId: 'usr_rs_admin' });
  if (!card.ok) throw new Error(card.message);
  await addImplication(env.DB, TENANT, 'code-review', 'code', null);
  const reviewer = await createAgent(env.DB, TENANT, { name: `Reviewer ${boardId}`, capabilities: ['code-review'] });
  const writer = await createAgent(env.DB, TENANT, { name: `Writer ${boardId}`, capabilities: ['writing'] });
  return { boardId, cardId: card.value.id, reviewer: reviewer.id, writer: writer.id, url: `https://api.test/v1/boards/${boardId}/cards/${card.value.id}/reservation` };
}

async function put(url: string, body: unknown, scope = 'dispatch:reserve', tenant = FLEET): Promise<Response> {
  return SELF.fetch(url, { method: 'PUT', headers: { Authorization: `Bearer ${await serviceToken(scope, tenant)}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

describe('PUT /v1/boards/:id/cards/:cardId/reservation (a service)', () => {
  it('holds the card for an eligible agent, judged with implication edges, and the card read shows it', async () => {
    const { boardId, cardId, reviewer, url } = await seed();
    await withIssuer(ISSUER, jwksBody, async () => {
      const res = await put(url, { agentId: reviewer, ttlSeconds: 30, decisionId: 'dec_rest' });
      expect(res.status).toBe(200);
      const { reservation } = await res.json<{ reservation: Record<string, string> }>();
      expect(reservation).toMatchObject({ agentId: reviewer, decisionId: 'dec_rest', reservedBy: SERVICE });
      const read = await SELF.fetch(`https://api.test/v1/boards/${boardId}/cards/${cardId}`, { headers: { 'X-Tenant-Id': TENANT, 'X-User-Id': 'usr_rs_member' } });
      expect((await read.json<{ card: { reservation?: unknown } }>()).card.reservation).toEqual(reservation);
    });
  });

  it('refuses on any other scope (403), and for another workspace’s board (404)', async () => {
    const { reviewer, url } = await seed();
    await withIssuer(ISSUER, jwksBody, async () => {
      for (const scope of ['', 'dispatch:read', 'cards:read push:write']) {
        const r = await put(url, { agentId: reviewer, decisionId: 'd' }, scope);
        expect({ scope, status: r.status }).toEqual({ scope, status: 403 });
      }
      expect((await put(url, { agentId: reviewer, decisionId: 'd' }, 'dispatch:reserve', OTHER_FLEET)).status).toBe(404);
    });
  });

  it('answers 400 for a bad body, 404 for an unknown agent or card, 409 for an ineligible agent or a held card', async () => {
    const { boardId, reviewer, writer, url } = await seed();
    const other = await createAgent(env.DB, TENANT, { name: `Other ${boardId}`, capabilities: ['code'] });
    await withIssuer(ISSUER, jwksBody, async () => {
      expect((await put(url, { agentId: reviewer, decisionId: 'd', ttlSeconds: 3600 })).status).toBe(400);
      expect((await put(url, { agentId: reviewer })).status).toBe(400);
      expect((await put(url, { agentId: 'agt_0000000000000000', decisionId: 'd' })).status).toBe(404);
      expect((await put(`https://api.test/v1/boards/${boardId}/cards/card_0000000000000000/reservation`, { agentId: reviewer, decisionId: 'd' })).status).toBe(404);
      const ineligible = await put(url, { agentId: writer, decisionId: 'd' });
      expect(ineligible.status).toBe(409);
      expect(await ineligible.json()).toMatchObject({ error: { code: 'AGENT_NOT_ELIGIBLE', detail: { reasons: ['capability_mismatch'] } } });
      expect((await put(url, { agentId: reviewer, decisionId: 'dec_1' })).status).toBe(200);
      const taken = await put(url, { agentId: other.id, decisionId: 'dec_2' });
      expect(taken.status).toBe(409);
      expect(await taken.json()).toMatchObject({ error: { code: 'CARD_RESERVED' } });
      expect((await put(url, { agentId: other.id, decisionId: 'dec_1' })).status).toBe(200);
    });
  });

  it('is not an agent route: an agent token cannot hold a card', async () => {
    const { reviewer, url } = await seed();
    const { token } = await createAgentToken(env.DB, TENANT, reviewer, ['claim', 'run', 'read', 'plan']);
    const r = await SELF.fetch(url, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ agentId: reviewer, decisionId: 'd' }) });
    expect(r.status).toBe(401);
  });
});

describe('DELETE /v1/boards/:id/cards/:cardId/reservation', () => {
  it('a service on dispatch:reserve clears it (204), and others may claim the card', async () => {
    const { boardId, cardId, reviewer, url } = await seed();
    await withIssuer(ISSUER, jwksBody, async () => {
      expect((await put(url, { agentId: reviewer, decisionId: 'd' })).status).toBe(200);
      const del = await SELF.fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${await serviceToken('dispatch:reserve')}` } });
      expect(del.status).toBe(204);
      const forbidden = await SELF.fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${await serviceToken('dispatch:read')}` } });
      expect(forbidden.status).toBe(403);
    });
    const c = await boardStub(env, TENANT, boardId).claim({ agentId: 'agt_someone', capabilities: ['code'] });
    expect(c.claimed && c.card.id).toBe(cardId);
  });

  it('a board admin may clear it; a member may not', async () => {
    const { boardId, cardId, reviewer, url } = await seed();
    await withIssuer(ISSUER, jwksBody, async () => {
      expect((await put(url, { agentId: reviewer, decisionId: 'd' })).status).toBe(200);
    });
    const as = (user: string) => SELF.fetch(url, { method: 'DELETE', headers: { 'X-Tenant-Id': TENANT, 'X-User-Id': user } });
    expect((await as('usr_rs_member')).status).toBe(403);
    expect((await boardStub(env, TENANT, boardId).claim({ agentId: 'agt_someone', capabilities: ['code'] })).claimed).toBe(false);
    expect((await as('usr_rs_admin')).status).toBe(204);
    const c = await boardStub(env, TENANT, boardId).claim({ agentId: 'agt_someone', capabilities: ['code'] });
    expect(c.claimed && c.card.id).toBe(cardId);
  });

  it('a person cannot make a hold', async () => {
    const { reviewer, url } = await seed();
    const r = await SELF.fetch(url, { method: 'PUT', headers: { 'X-Tenant-Id': TENANT, 'X-User-Id': 'usr_rs_admin', 'Content-Type': 'application/json' }, body: JSON.stringify({ agentId: reviewer, decisionId: 'd' }) });
    expect(r.status).toBe(405);
  });
});
