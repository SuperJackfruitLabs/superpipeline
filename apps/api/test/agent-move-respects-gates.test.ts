import { SELF, env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import { createAgent, createAgentToken, updateAgent } from '../src/db/catalog';
import { withIssuer as withHubIssuer } from './helpers/hub-issuer';

/**
 * An agent's move never gets a card past a gate.
 *
 * `plan` lets an agent move a card, and deciding a gate is refused to every agent token. Before
 * this, a move did what a person's move does: it cancelled the pending review and, into a last
 * stage nobody works, completed the card. So an agent could carry its own work past the review a
 * person was meant to give it. Every refusal here is that hole; the passes are what must keep
 * working: queueing into a stage, and moves that cross no gate in either direction.
 *
 * A person's move is untouched (it still overrides a review, by design; see `board-gates`).
 */

const PIPELINE = [
  { key: 'intake', name: 'Intake', order: 0, ownerKind: 'human' },
  { key: 'research', name: 'Research', order: 1, ownerKind: 'capability', owner: 'research' },
  { key: 'review', name: 'Review', order: 2, ownerKind: 'human', gate: 'approval' },
  { key: 'build', name: 'Build', order: 3, ownerKind: 'capability', owner: 'code' },
  { key: 'ship', name: 'Ship', order: 4, ownerKind: 'capability', owner: 'ship' },
  { key: 'done', name: 'Done', order: 5, ownerKind: 'human' },
];

/** Checks are a gate too: here a stage decided by them alone. */
const CHECKS_PIPELINE = [
  { key: 'intake', name: 'Intake', order: 0, ownerKind: 'human' },
  { key: 'research', name: 'Research', order: 1, ownerKind: 'capability', owner: 'research' },
  { key: 'verify', name: 'Verify', order: 2, ownerKind: 'human', gate: 'checks', returnStage: 'research', checks: [{ name: 'build', provider: 'ci', contexts: ['build'] }] },
  { key: 'ship', name: 'Ship', order: 3, ownerKind: 'capability', owner: 'ship' },
];

const ISSUER = 'https://issuer.test';
const PLANE = 'https://api.test';
const FLEET = 'fleet_00000000000000000123';
const OWNER = 'usr_gate_owner';
let signingKey: CryptoKey;
let jwksBody: string;

beforeAll(async () => {
  const pair = await generateKeyPair('EdDSA', { extractable: true });
  signingKey = pair.privateKey;
  jwksBody = JSON.stringify({ keys: [{ ...(await exportJWK(pair.publicKey)), alg: 'EdDSA', kid: 'mg-kid' }] });
  await env.DB.prepare(`INSERT OR IGNORE INTO users (id, email, name) VALUES (?, 'owner@example.test', 'Owner')`).bind(OWNER).run();
});

const dev = (tenant: string) => ({ 'X-Tenant-Id': tenant, 'X-User-Id': OWNER, 'Content-Type': 'application/json' });
const auth = (t: string) => ({ Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' });

interface Card { id: string; currentStageKey: string; state: string; queuedByAgentId: string | null; queuedGrant: string[] | null }

/** A board and one card in `intake`, set up by a person. */
async function boardWithCard(tenant: string, stages: unknown[] = PIPELINE): Promise<{ boardId: string; cardId: string }> {
  const b = await SELF.fetch(`${PLANE}/v1/boards`, { method: 'POST', headers: dev(tenant), body: JSON.stringify({ name: 'Gated', stages }) });
  expect(b.status).toBe(201);
  const { boardId } = await b.json<{ boardId: string }>();
  const c = await SELF.fetch(`${PLANE}/v1/boards/${boardId}/cards`, { method: 'POST', headers: dev(tenant), body: JSON.stringify({ title: 'Ship the fix', ownerUserId: OWNER }) });
  expect(c.status).toBe(201);
  return { boardId, cardId: (await c.json<{ card: { id: string } }>()).card.id };
}

/** A coordinator the operator let queue onto this board: a hub token carrying its own grant. */
async function coordinator(tenant: string, boardId: string): Promise<string> {
  const agentId = `agt_mg_${tenant}`;
  const principal = `prn_mg_${tenant}`;
  await env.DB.prepare(`INSERT OR IGNORE INTO agents (id, tenant_id, name) VALUES (?, ?, 'Coordinator')`).bind(agentId, tenant).run();
  await env.DB.prepare(`UPDATE agents SET external_id = ?, external_source = 'org-plane' WHERE id = ?`).bind(principal, agentId).run();
  await updateAgent(env.DB, tenant, agentId, { ownerUserId: OWNER, mayQueueTo: [boardId] });
  return new SignJWT({ sub: principal, principalKind: 'agent', tenant: FLEET, mayDispatch: ['prn_worker'] })
    .setProtectedHeader({ alg: 'EdDSA', kid: 'mg-kid' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience([ISSUER, PLANE])
    .setExpirationTime('5m')
    .sign(signingKey);
}

async function withIssuer(tenant: string, fn: () => Promise<void>) {
  await env.DB.prepare(`INSERT OR IGNORE INTO tenants (id, slug, name) VALUES (?, ?, 'MG')`).bind(tenant, `slug-${tenant}`).run();
  await env.DB.prepare(`UPDATE tenants SET external_source='agentpod', external_id=? WHERE id=?`).bind(FLEET, tenant).run();
  try {
    await withHubIssuer(ISSUER, jwksBody, fn);
  } finally {
    await env.DB.prepare(`UPDATE tenants SET external_source=NULL, external_id=NULL WHERE id=?`).bind(tenant).run();
  }
}

function move(boardId: string, cardId: string, toStageKey: string, headers: Record<string, string>) {
  return SELF.fetch(`${PLANE}/v1/boards/${boardId}/cards/${cardId}/move`, { method: 'POST', headers, body: JSON.stringify({ toStageKey }) });
}

/** The card and the board's pending gates, as a person reads them. */
async function read(tenant: string, boardId: string, cardId: string): Promise<{ card: Card; pendingGates: number }> {
  const res = await SELF.fetch(`${PLANE}/v1/boards/${boardId}`, { headers: dev(tenant) });
  const s = await res.json<{ cards: Card[]; gates: Array<{ status: string }> }>();
  const card = s.cards.find((c) => c.id === cardId);
  if (!card) throw new Error(`card ${cardId} is not on the board`);
  return { card, pendingGates: s.gates.filter((g) => g.status === 'pending').length };
}

/** A person puts the card in research and a worker does it, so the card arrives at the next stage. */
async function researched(tenant: string, boardId: string, cardId: string): Promise<void> {
  expect((await move(boardId, cardId, 'research', dev(tenant))).status).toBe(200);
  const worker = await createAgent(env.DB, tenant, { name: 'Researcher', capabilities: ['research'] });
  const { token } = await createAgentToken(env.DB, tenant, worker.id, ['claim', 'run']);
  const claim = await SELF.fetch(`${PLANE}/v1/boards/${boardId}/claims`, { method: 'POST', headers: auth(token), body: '{}' });
  const work = await claim.json<{ claimed: boolean; runId: string; leaseEpoch: number }>();
  expect(work.claimed).toBe(true);
  const done = await SELF.fetch(`${PLANE}/v1/boards/${boardId}/runs/${work.runId}/complete`, {
    method: 'POST',
    headers: auth(token),
    body: JSON.stringify({ leaseEpoch: work.leaseEpoch, handoff: { summary: 'researched' } }),
  });
  expect(done.status).toBe(200);
}

async function expectGatePending(res: Response, label: string): Promise<void> {
  const body = await res.json<{ error: { code?: string; message?: string } }>();
  // The label rides in the compared object, so a failure names the move that got through.
  expect({ label, status: res.status, code: body.error.code, message: body.error.message }).toMatchObject({
    label,
    status: 409,
    code: 'GATE_PENDING',
    message: expect.stringMatching(/person/),
  });
}

describe('an agent move is refused where it would get past a gate', () => {
  it('(a) an agent with `plan` cannot move a card off a pending review, forward, to done or back', async () => {
    const t = 'tnt_mg_a';
    const { boardId, cardId } = await boardWithCard(t);
    await researched(t, boardId, cardId);
    const before = await read(t, boardId, cardId);
    expect(before.card.currentStageKey).toBe('review');
    expect(before.pendingGates).toBe(1);
    await withIssuer(t, async () => {
      const token = await coordinator(t, boardId);
      for (const to of ['build', 'done', 'research']) await expectGatePending(await move(boardId, cardId, to, auth(token)), `move to ${to}`);
    });
    // Nothing moved and the review is still a person's to decide.
    const after = await read(t, boardId, cardId);
    expect(after.card.currentStageKey).toBe('review');
    expect(after.card.state).toBe('input-required');
    expect(after.pendingGates).toBe(1);
  });

  it('an agent cannot skip past a review stage, even with no review open yet', async () => {
    const t = 'tnt_mg_skip';
    const { boardId, cardId } = await boardWithCard(t);
    await withIssuer(t, async () => {
      const token = await coordinator(t, boardId);
      await expectGatePending(await move(boardId, cardId, 'build', auth(token)), 'skip the review');
    });
    expect((await read(t, boardId, cardId)).card.currentStageKey).toBe('intake');
  });

  it('an agent cannot complete a card by moving it to a terminal stage', async () => {
    const t = 'tnt_mg_done';
    const { boardId, cardId } = await boardWithCard(t);
    // A person puts it in ship, past the review: from there, done is the very next stage.
    expect((await move(boardId, cardId, 'ship', dev(t))).status).toBe(200);
    await withIssuer(t, async () => {
      const token = await coordinator(t, boardId);
      await expectGatePending(await move(boardId, cardId, 'done', auth(token)), 'finish it');
    });
    const { card } = await read(t, boardId, cardId);
    expect(card.currentStageKey).toBe('ship');
    expect(card.state).not.toBe('completed');
  });

  it('an agent cannot skip past a stage decided by checks', async () => {
    const t = 'tnt_mg_cskip';
    const { boardId, cardId } = await boardWithCard(t, CHECKS_PIPELINE);
    await withIssuer(t, async () => {
      const token = await coordinator(t, boardId);
      await expectGatePending(await move(boardId, cardId, 'ship', auth(token)), 'skip the checks');
    });
    expect((await read(t, boardId, cardId)).card.currentStageKey).toBe('intake');
  });

  it('an agent cannot move a card off checks that are still deciding it, either way', async () => {
    const t = 'tnt_mg_copen';
    const { boardId, cardId } = await boardWithCard(t, CHECKS_PIPELINE);
    await researched(t, boardId, cardId);
    expect((await read(t, boardId, cardId)).card.currentStageKey).toBe('verify');
    await withIssuer(t, async () => {
      const token = await coordinator(t, boardId);
      // Forward past the checks, and back off them while they run: both leave them deciding nothing.
      for (const to of ['ship', 'research']) await expectGatePending(await move(boardId, cardId, to, auth(token)), `move to ${to}`);
    });
    expect((await read(t, boardId, cardId)).card.currentStageKey).toBe('verify');
  });
});

describe('an agent move that crosses no gate works as before', () => {
  it('(f) queueing: an agent moves a card into a stage it may queue to, under its own grant', async () => {
    const t = 'tnt_mg_queue';
    const { boardId, cardId } = await boardWithCard(t);
    await withIssuer(t, async () => {
      const token = await coordinator(t, boardId);
      const res = await move(boardId, cardId, 'research', auth(token));
      expect(res.status).toBe(200);
      const { card } = await res.json<{ card: Card }>();
      expect(card.currentStageKey).toBe('research');
      expect(card.state).toBe('submitted');
      expect(card.queuedByAgentId).toBe(`agt_mg_${t}`);
      expect(card.queuedGrant).toEqual(['prn_worker']);
    });
  });

  it('(g) a forward move between two ungated stages, and a move back across a review nobody opened', async () => {
    const t = 'tnt_mg_free';
    const { boardId, cardId } = await boardWithCard(t);
    expect((await move(boardId, cardId, 'build', dev(t))).status).toBe(200);
    await withIssuer(t, async () => {
      const token = await coordinator(t, boardId);
      expect((await move(boardId, cardId, 'ship', auth(token))).status).toBe(200);
      // Backward passes no gate: the review stands between research and build again on the way
      // forward, so sending work back for rework cannot skip it.
      expect((await move(boardId, cardId, 'research', auth(token))).status).toBe(200);
    });
    expect((await read(t, boardId, cardId)).card.currentStageKey).toBe('research');
  });
});

describe('a person\'s move is unchanged', () => {
  it('a person still moves a card off a pending review (it cancels the review, by design)', async () => {
    const t = 'tnt_mg_person';
    const { boardId, cardId } = await boardWithCard(t);
    await researched(t, boardId, cardId);
    expect((await move(boardId, cardId, 'build', dev(t))).status).toBe(200);
    const { card, pendingGates } = await read(t, boardId, cardId);
    expect(card.currentStageKey).toBe('build');
    expect(pendingGates).toBe(0);
  });
});
