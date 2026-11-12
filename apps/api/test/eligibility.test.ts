/**
 * The eligibility read: for one card at its current stage, every agent in the workspace with
 * `eligible` and the reasons it is not — from the claim's own filter, so the read and a claim
 * cannot disagree. A placement service filters its candidates with it; a person reads it to see
 * why a card sits unclaimed.
 */
import { SELF, env, runInDurableObject } from 'cloudflare:test';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { __resetJwksCacheForTests } from '../src/auth/hub-jwt';
import type { BoardDO, BoardInit } from '../src/board/board-do';
import type { CardEligibility, EligibilityCandidate } from '../src/board/claims';
import { boardStub } from '../src/board/stub';
import { createAgent, createAgentToken, recordBoard, setAgentExternalMapping, updateAgent } from '../src/db/catalog';
import { addImplication } from '../src/db/implications';
import { newId } from '../src/ids';
import { freshBoard as fresh } from './helpers/board';
import { withIssuer } from './helpers/hub-issuer';

const STAGES: BoardInit['stages'] = [
  { key: 'build', name: 'Build', order: 0, ownerKind: 'capability', owner: 'build', requires: { all: ['build', 'sign'] } },
  { key: 'review', name: 'Review', order: 1, ownerKind: 'human' },
];
const PRN_A = 'prn_0123456789abcdef0a01';
const PRN_B = 'prn_0123456789abcdef0b02';

const enforce = () => Reflect.set(env, 'ENFORCE_CONTROL_PAIR', 'true');
afterEach(() => Reflect.deleteProperty(env, 'ENFORCE_CONTROL_PAIR'));

const who = (agentId: string, capabilities: string[], principalId: string | null = null, maxConcurrency = 1): EligibilityCandidate => ({
  agentId,
  name: agentId,
  capabilities,
  principalId,
  maxConcurrency,
});

async function cardOn(board: BoardDO, init: Partial<{ queuedGrant: string[] }> = {}): Promise<string> {
  const c = await board.createCard({ title: 'Ship it', ownerUserId: 'usr_a', ...init });
  if (!c.ok) throw new Error(c.message);
  return c.value.id;
}

async function eligibility(board: BoardDO, cardId: string, agents: EligibilityCandidate[]): Promise<CardEligibility> {
  const r = await board.cardEligibility({ cardId, agents });
  if (!r.ok) throw new Error(r.message);
  return r.value;
}

const reasonsOf = (e: CardEligibility) => Object.fromEntries(e.agents.map((a) => [a.agentId, a.reasons]));

describe('cardEligibility (the board)', () => {
  it('names each agent’s reasons from the claim filter: capability with requires, concurrency, grant', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await board.init({ id: 'brd_el', tenantId: 'tnt_el', name: 'E', stages: STAGES });
      const busyCard = await cardOn(board, { queuedGrant: [PRN_A, PRN_B] });
      expect((await board.claim({ agentId: 'agt_busy', capabilities: ['build', 'sign'], principalId: PRN_B })).claimed).toBe(true);
      const cardId = await cardOn(board, { queuedGrant: [PRN_A, PRN_B] });
      expect(cardId).not.toBe(busyCard);
      enforce();
      const e = await eligibility(board, cardId, [
        who('agt_ok', ['build', 'sign'], PRN_A),
        who('agt_half', ['build'], PRN_A),
        who('agt_busy', ['build', 'sign'], PRN_B),
        who('agt_stranger', ['build', 'sign'], 'prn_ffffffffffffffffffff'),
      ]);
      expect(e).toMatchObject({ cardId, stageKey: 'build', reasons: [] });
      expect(reasonsOf(e)).toEqual({
        agt_ok: [],
        agt_half: ['capability_mismatch'],
        agt_busy: ['concurrency_reached'],
        agt_stranger: ['grant_denied'],
      });
      expect(e.agents.map((a) => [a.agentId, a.eligible])).toEqual([
        ['agt_ok', true],
        ['agt_half', false],
        ['agt_busy', false],
        ['agt_stranger', false],
      ]);
      // A read: nothing was parked, and the card is still waiting.
      expect((await board.getState()).cards.find((c) => c.id === cardId)?.state).toBe('submitted');
    });
  });

  it('names the card’s own reasons, and then no agent is eligible', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await board.init({ id: 'brd_el2', tenantId: 'tnt_el', name: 'E', stages: STAGES });
      const agents = [who('agt_ok', ['build', 'sign'])];

      const working = await cardOn(board);
      expect((await board.claim({ agentId: 'agt_other', capabilities: ['build', 'sign'] })).claimed).toBe(true);
      const w = await eligibility(board, working, agents);
      expect(w.reasons).toEqual(['card_not_ready']);
      expect(w.agents[0]).toMatchObject({ eligible: false, reasons: [] });

      const blocker = await cardOn(board);
      const held = await cardOn(board);
      expect((await board.addLink({ fromCardId: blocker, toCardId: held, kind: 'blocks' })).ok).toBe(true);
      expect((await eligibility(board, held, agents)).reasons).toEqual(['card_held_back']);

      const human = await cardOn(board);
      expect((await board.moveCard(human, 'review', 'usr_a')).ok).toBe(true);
      expect((await eligibility(board, human, agents)).reasons).toEqual(expect.arrayContaining(['stage_not_agent_claimable']));
    });
  });

  it('refuses a card it does not hold, and a board that does not exist', async () => {
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      expect(await board.cardEligibility({ cardId: 'card_0000000000000000', agents: [] })).toMatchObject({ ok: false, code: 'NOT_INITIALIZED' });
      await board.init({ id: 'brd_el3', tenantId: 'tnt_el', name: 'E', stages: STAGES });
      expect(await board.cardEligibility({ cardId: 'card_0000000000000000', agents: [] })).toMatchObject({ ok: false, code: 'CARD_NOT_FOUND' });
    });
  });

  it('agrees with claim: eligible exactly when a claim would hand that agent this card', async () => {
    const candidates = [
      who('agt_ok', ['build', 'sign'], PRN_A),
      who('agt_half', ['build'], PRN_A),
      who('agt_stranger', ['build', 'sign'], 'prn_ffffffffffffffffffff'),
      who('agt_capless', [], PRN_A),
    ];
    const eligible = new Map<string, boolean>();
    await runInDurableObject(fresh(), async (board: BoardDO) => {
      await board.init({ id: 'brd_el4', tenantId: 'tnt_el', name: 'E', stages: STAGES });
      const cardId = await cardOn(board, { queuedGrant: [PRN_A] });
      enforce();
      for (const a of (await eligibility(board, cardId, candidates)).agents) eligible.set(a.agentId, a.eligible);
    });
    for (const c of candidates) {
      await runInDurableObject(fresh(), async (board: BoardDO) => {
        await board.init({ id: 'brd_el4', tenantId: 'tnt_el', name: 'E', stages: STAGES });
        await cardOn(board, { queuedGrant: [PRN_A] });
        enforce();
        const claimed = (await board.claim(c)).claimed;
        expect({ agent: c.agentId, claimed }).toEqual({ agent: c.agentId, claimed: eligible.get(c.agentId) });
      });
    }
  });
});

describe('GET /v1/boards/:id/cards/:cardId/eligibility', () => {
  const TENANT = 'tnt_eligibility_rest';
  const FLEET = 'fleet_0000000000000000el01';
  const ISSUER = 'https://issuer-el.test';
  const headers = { 'X-Tenant-Id': TENANT, 'Content-Type': 'application/json' };
  let signingKey: CryptoKey;
  let jwksBody: string;

  beforeAll(async () => {
    const pair = await generateKeyPair('EdDSA', { extractable: true });
    signingKey = pair.privateKey;
    jwksBody = JSON.stringify({ keys: [{ ...(await exportJWK(pair.publicKey)), alg: 'EdDSA', kid: 'el-kid' }] });
    await env.DB.prepare(`INSERT OR IGNORE INTO tenants (id, slug, name) VALUES (?, ?, 'EL')`).bind(TENANT, `slug-${TENANT}`).run();
    await env.DB.prepare(`UPDATE tenants SET external_source='agentpod', external_id=? WHERE id=?`).bind(FLEET, TENANT).run();
  });
  beforeEach(() => __resetJwksCacheForTests());

  const serviceToken = (scope: string, tenant = FLEET) =>
    new SignJWT({ sub: 'prn_0123456789abcdef0e01', principalKind: 'service', tenant, mayDispatch: [], mayGrantReach: false, scope })
      .setProtectedHeader({ alg: 'EdDSA', kid: 'el-kid' })
      .setIssuedAt().setIssuer(ISSUER).setAudience([ISSUER, 'https://api.test']).setExpirationTime('5m')
      .sign(signingKey);

  /** A board in the catalog with one ready card on a `code` stage, and three workspace agents. */
  async function seed(): Promise<{ boardId: string; cardId: string; ids: { reviewer: string; writer: string; idle: string } }> {
    const boardId = newId('brd');
    const stages: BoardInit['stages'] = [{ key: 'code', name: 'Code', order: 0, ownerKind: 'capability', owner: 'code' }];
    const board = boardStub(env, TENANT, boardId);
    await board.init({ id: boardId, tenantId: TENANT, name: 'EL', stages });
    await recordBoard(env.DB, TENANT, { id: boardId, name: 'EL', stagesJson: JSON.stringify(stages) });
    const card = await board.createCard({ title: 'Write it', ownerUserId: 'usr_a' });
    if (!card.ok) throw new Error(card.message);
    await addImplication(env.DB, TENANT, 'code-review', 'code', null);
    const reviewer = await createAgent(env.DB, TENANT, { name: `Reviewer ${boardId}`, capabilities: ['code-review'] });
    await setAgentExternalMapping(env.DB, TENANT, reviewer.id, { externalId: `prn_${boardId.slice(4)}0001`, externalSource: 'org-plane' });
    const writer = await createAgent(env.DB, TENANT, { name: `Writer ${boardId}`, capabilities: ['writing'] });
    const idle = await createAgent(env.DB, TENANT, { name: `Parked ${boardId}`, capabilities: ['code'] });
    await updateAgent(env.DB, TENANT, idle.id, { concurrency: 0 });
    return { boardId, cardId: card.value.id, ids: { reviewer: reviewer.id, writer: writer.id, idle: idle.id } };
  }

  it('lists the workspace’s agents, judged with implication edges and the concurrency column', async () => {
    const { boardId, cardId, ids } = await seed();
    const res = await SELF.fetch(`https://api.test/v1/boards/${boardId}/cards/${cardId}/eligibility`, { headers });
    expect(res.status).toBe(200);
    const body = await res.json<CardEligibility>();
    expect(body).toMatchObject({ cardId, stageKey: 'code', reasons: [] });
    const byId = Object.fromEntries(body.agents.map((a) => [a.agentId, a]));
    expect(byId[ids.reviewer]).toMatchObject({ eligible: true, reasons: [], principalId: `prn_${boardId.slice(4)}0001` });
    expect(byId[ids.writer]).toMatchObject({ eligible: false, reasons: ['capability_mismatch'], principalId: null });
    expect(byId[ids.idle]).toMatchObject({ eligible: false, reasons: ['concurrency_reached'] });
  });

  it('answers 404 for a card the board does not hold', async () => {
    const { boardId } = await seed();
    const res = await SELF.fetch(`https://api.test/v1/boards/${boardId}/cards/card_0000000000000000/eligibility`, { headers });
    expect(res.status).toBe(404);
  });

  it('is not an agent route: an agent token is refused', async () => {
    const { boardId, cardId, ids } = await seed();
    const { token } = await createAgentToken(env.DB, TENANT, ids.reviewer, ['claim', 'run', 'read']);
    const res = await SELF.fetch(`https://api.test/v1/boards/${boardId}/cards/${cardId}/eligibility`, { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(401);
  });

  it('a service reads the same body on dispatch:read, and nothing on any other scope', async () => {
    const { boardId, cardId, ids } = await seed();
    await withIssuer(ISSUER, jwksBody, async () => {
      const path = `https://api.test/v1/boards/${boardId}/cards/${cardId}/eligibility`;
      const ok = await SELF.fetch(path, { headers: { Authorization: `Bearer ${await serviceToken('dispatch:read')}` } });
      expect(ok.status).toBe(200);
      const body = await ok.json<CardEligibility>();
      expect(body.agents.find((a) => a.agentId === ids.reviewer)?.eligible).toBe(true);
      for (const scope of ['', 'cards:read', 'cards:read push:write gates:read']) {
        const r = await SELF.fetch(path, { headers: { Authorization: `Bearer ${await serviceToken(scope)}` } });
        expect({ scope, status: r.status }).toEqual({ scope, status: 403 });
        expect(await r.text()).not.toContain(ids.reviewer);
      }
    });
  });

  it('a service cannot read another workspace’s board', async () => {
    const { boardId, cardId } = await seed();
    const other = 'tnt_eligibility_other';
    const otherFleet = 'fleet_0000000000000000el02';
    await env.DB.prepare(`INSERT OR IGNORE INTO tenants (id, slug, name) VALUES (?, ?, 'EO')`).bind(other, `slug-${other}`).run();
    await env.DB.prepare(`UPDATE tenants SET external_source='agentpod', external_id=? WHERE id=?`).bind(otherFleet, other).run();
    await withIssuer(ISSUER, jwksBody, async () => {
      const r = await SELF.fetch(`https://api.test/v1/boards/${boardId}/cards/${cardId}/eligibility`, {
        headers: { Authorization: `Bearer ${await serviceToken('dispatch:read', otherFleet)}` },
      });
      expect(r.status).toBe(404);
    });
  });
});
