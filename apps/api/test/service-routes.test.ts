/**
 * A service (Superlibrary) reading boards and cards and registering a record push config.
 */
import { SELF, env, runInDurableObject } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import { __resetJwksCacheForTests } from '../src/auth/hub-jwt';
import { boardStub } from '../src/board/stub';
import type { BoardInit } from '../src/board/board-do';
import { recordBoard } from '../src/db/catalog';
import { newId } from '../src/ids';
import { ensureOrgTenant } from '../src/auth/org-tenancy';
import { payload } from './approval-subject-fixtures';
import { withIssuer } from './helpers/hub-issuer';
import { withOrgPlane, planeToken, ORG, OTHER_ORG, SERVICE, AGENT } from './helpers/org-plane';

const PIPELINE: BoardInit['stages'] = [
  { key: 'research', name: 'Research', order: 0, ownerKind: 'capability', owner: 'research' },
  { key: 'review', name: 'Review', order: 1, ownerKind: 'human', gate: 'approval' },
  { key: 'publish', name: 'Publish', order: 2, ownerKind: 'capability', owner: 'publish' },
];
const APPROVAL_DECIDER = 'usr_fixture_decider';
const APPROVAL_PIPELINE: BoardInit['stages'] = [
  { key: 'draft', name: 'Draft', order: 0, ownerKind: 'capability', owner: 'writing' },
  {
    key: 'approve',
    name: 'Approve exact payload',
    order: 1,
    ownerKind: 'human',
    gate: 'approval',
    approvalSubjectSchema: 'social-publish/v1',
    approvalDeciderPrincipalIds: [APPROVAL_DECIDER],
  },
  { key: 'publish', name: 'Publish', order: 2, ownerKind: 'capability', owner: 'x-publish' },
];
const ISSUER = 'https://issuer-svc.test';
const PLANE = 'https://api.test';
const FLEET = 'fleet_0000000000000000sv01';
const OTHER_FLEET = 'fleet_0000000000000000sv02';
const TENANT = 'tnt_service_routes';
const OTHER_TENANT = 'tnt_service_routes_other';

let signingKey: CryptoKey;
let jwksBody: string;
beforeAll(async () => {
  const pair = await generateKeyPair('EdDSA', { extractable: true });
  signingKey = pair.privateKey;
  jwksBody = JSON.stringify({ keys: [{ ...(await exportJWK(pair.publicKey)), alg: 'EdDSA', kid: 'sv-kid' }] });
  for (const [t, f] of [[TENANT, FLEET], [OTHER_TENANT, OTHER_FLEET]] as const) {
    await env.DB.prepare(`INSERT OR IGNORE INTO tenants (id, slug, name) VALUES (?, ?, 'S')`).bind(t, `slug-${t}`).run();
    await env.DB.prepare(`UPDATE tenants SET external_source='agentpod', external_id=? WHERE id=?`).bind(f, t).run();
  }
});
beforeEach(() => __resetJwksCacheForTests());

const hubToken = (over: Record<string, unknown> = {}) =>
  new SignJWT({ sub: 'prn_0123456789abcdef0f01', principalKind: 'service', tenant: FLEET, mayDispatch: [], mayGrantReach: false, scope: 'cards:read', ...over })
    .setProtectedHeader({ alg: 'EdDSA', kid: 'sv-kid' })
    .setIssuedAt().setIssuer(ISSUER).setAudience([ISSUER, PLANE]).setExpirationTime('5m')
    .sign(signingKey);

const legacy = <T>(fn: () => Promise<T>) => withIssuer(ISSUER, jwksBody, fn);
const get = (path: string, token: string) => SELF.fetch(`https://api.test${path}`, { headers: { Authorization: `Bearer ${token}` } });
const post = (path: string, token: string, body: unknown) =>
  SELF.fetch(`https://api.test${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body),
  });

/** A board in `tenant` with one card whose review gate was opened and approved. */
async function seedBoardWithResolvedGate(o: { archive?: boolean; tenant?: string } = {}): Promise<{ boardId: string; cardId: string }> {
  const tenant = o.tenant ?? TENANT;
  const boardId = newId('brd');
  const board = boardStub(env, tenant, boardId);
  await board.init({ id: boardId, tenantId: tenant, name: 'Svc board', stages: PIPELINE });
  await recordBoard(env.DB, tenant, { id: boardId, name: 'Svc board', stagesJson: JSON.stringify(PIPELINE) });
  const card = await board.createCard({ title: 'Add OAuth login', ownerUserId: 'usr_a' });
  if (!card.ok) throw new Error(card.message);
  const claim = await board.claim({ agentId: 'agt_r', capabilities: ['research'] });
  if (!claim.claimed) throw new Error('expected a research claim');
  await board.complete({ runId: claim.runId, leaseEpoch: claim.leaseEpoch, handoff: { summary: 'drafted' } });
  const pending = (await board.getState()).gates[0];
  if (!pending) throw new Error('expected a pending gate');
  const resolved = await board.resolveGate({ gateId: pending.id, decision: 'approve', decidedBy: 'usr_a' });
  if (!resolved.ok) throw new Error(resolved.message);
  if (o.archive) await board.updateCard(card.value.id, { archivedAt: new Date().toISOString() });
  return { boardId, cardId: card.value.id };
}

describe('a service reading cards (hub issuer)', () => {
  it('lists boards and reads a board, a card, its attempts, comments, links and gates with cards:read', async () => {
    await legacy(async () => {
      const { boardId, cardId } = await seedBoardWithResolvedGate();
      const t = await hubToken();
      const base = `/v1/boards/${boardId}/cards/${cardId}`;
      for (const path of ['/v1/boards', `/v1/boards/${boardId}`, base, `${base}/attempts`, `${base}/comments`, `${base}/links`, `${base}/activities`]) {
        expect((await get(path, t)).status, path).toBe(200);
      }
      const boards = (await (await get('/v1/boards', t)).json()) as { boards: Array<{ id: string }> };
      expect(boards.boards.map((b) => b.id)).toContain(boardId);
      const links = (await (await get(`${base}/links`, t)).json()) as Record<string, unknown>;
      expect(Object.keys(links).sort()).toEqual(['externalLinks', 'links']);
      const act = (await (await get(`${base}/activities`, t)).json()) as { gates: Array<{ status: string; decision: string }> };
      expect(act.gates).toContainEqual(expect.objectContaining({ status: 'resolved', decision: 'approve' }));
    });
  });

  it('the snapshot includes archived cards', async () => {
    await legacy(async () => {
      const { boardId, cardId } = await seedBoardWithResolvedGate({ archive: true });
      const r = await get(`/v1/boards/${boardId}`, await hubToken());
      const body = (await r.json()) as { cards: Array<{ id: string; archivedAt: string | null }> };
      expect(body.cards).toContainEqual(expect.objectContaining({ id: cardId, archivedAt: expect.any(String) }));
    });
  });

  it('without the scope it is refused', async () => {
    await legacy(async () => {
      const { boardId } = await seedBoardWithResolvedGate();
      expect((await get(`/v1/boards/${boardId}`, await hubToken({ scope: '' }))).status).toBe(403);
      expect((await get(`/v1/boards/${boardId}`, await hubToken({ scope: 'push:write' }))).status).toBe(403);
      expect((await get('/v1/boards', await hubToken({ scope: 'evidence:read' }))).status).toBe(403);
    });
  });

  it('an agent token is refused (it is not a service route)', async () => {
    await legacy(async () => {
      const { boardId } = await seedBoardWithResolvedGate();
      const agentToken = await hubToken({ principalKind: 'agent' });
      const r = await get(`/v1/boards/${boardId}`, agentToken);
      expect([401, 403]).toContain(r.status);
      expect(await r.text()).not.toContain('Svc board');
    });
  });

  it('a missing board is not found, as it is for a person', async () => {
    await legacy(async () => {
      const r = await get('/v1/boards/brd_00000000000000ff', await hubToken());
      expect(r.status).toBe(404);
      expect((await get('/v1/boards/brd_00000000000000ff/cards/card_00000000000000ff/links', await hubToken())).status).toBe(404);
    });
  });

  it('a board in another tenant is not found, whatever the route', async () => {
    await legacy(async () => {
      const { boardId, cardId } = await seedBoardWithResolvedGate({ tenant: OTHER_TENANT });
      const t = await hubToken();
      const base = `/v1/boards/${boardId}`;
      for (const path of [base, `${base}/cards/${cardId}`, `${base}/cards/${cardId}/attempts`, `${base}/cards/${cardId}/comments`, `${base}/cards/${cardId}/links`, `${base}/cards/${cardId}/activities`]) {
        expect((await get(path, t)).status, path).toBe(404);
      }
      const boards = (await (await get('/v1/boards', t)).json()) as { boards: Array<{ id: string }> };
      expect(boards.boards.map((b) => b.id)).not.toContain(boardId);
      const pushed = await post(`${base}/push-configs`, await hubToken({ scope: 'push:write' }), {
        url: 'https://library.example.com/events', token: 'd', events: ['card.updated'],
      });
      expect(pushed.status).toBe(404);
    });
  });
});

describe('a publisher service confirming automatic-delivery authority', () => {
  /**
   * Regression target: removing the service-only approval confirmation route (or making it depend
   * on an agent-held run credential) must stop stk before it can treat a shell caller's assertion
   * as authority. The read-scoped service token is the trust boundary; the request digest is only
   * a comparison value, never proof of approval.
   */
  it('lets only an approvals:read service confirm the stored automatic decision and exact digest', async () => {
    await legacy(async () => {
      const boardId = newId('brd');
      const board = boardStub(env, TENANT, boardId);
      await board.init({ id: boardId, tenantId: TENANT, name: 'Automatic publishing fixture', stages: APPROVAL_PIPELINE });
      await recordBoard(env.DB, TENANT, { id: boardId, name: 'Automatic publishing fixture', stagesJson: JSON.stringify(APPROVAL_PIPELINE) });
      const card = await board.createCard({ title: 'Publish exact fixture', ownerUserId: 'usr_fixture_owner', projectId: 'prj_fixture' });
      if (!card.ok) throw new Error(card.message);
      const claim = await board.claim({ agentId: 'agt_fixture_writer', capabilities: ['writing'] });
      if (!claim.claimed) throw new Error('expected the fixture draft to be claimable');
      const completed = await board.complete({
        runId: claim.runId,
        leaseEpoch: claim.leaseEpoch,
        handoff: {
          publicationPayload: {
            channel: 'x',
            account: { platform: 'x', userId: 'acct_fixture_1', username: 'fixture_account' },
            items: [{ index: 0, text: 'Exact approved fixture text.', media: [], replyToPostId: null, quotePostId: null }],
            outboundRequest: {
              method: 'POST',
              url: 'https://api.x.com/2/tweets',
              bodyBase64: btoa('{"text":"Exact approved fixture text."}'),
              mediaSha256: [],
            },
            timing: { mode: 'immediate', notBefore: null, expiresAt: '2030-01-02T03:04:05Z' },
            evidenceRefs: ['https://example.invalid/evidence/fixture-1'],
            policy: { allowThread: false, duplicatePolicyId: 'fixture-duplicate-policy', floodPolicyId: 'fixture-flood-policy' },
          },
        },
      });
      if (!completed.ok) throw new Error(completed.message);
      const state = await board.getState();
      const gate = state.gates[0];
      if (!gate?.approvalSubject) throw new Error('expected a bound approval gate');
      const approvalSubjectId = gate.approvalSubject.id;
      const canonical = gate.approvalSubject.canonical;
      const outboundRequest = canonical && typeof canonical === 'object' && !Array.isArray(canonical) ? canonical.outboundRequest : null;
      const requestDigest = outboundRequest && typeof outboundRequest === 'object' && !Array.isArray(outboundRequest) && typeof outboundRequest.digest === 'string'
        ? outboundRequest.digest
        : null;
      if (!requestDigest) throw new Error('expected a complete request digest');
      expect(requestDigest).toBe('sha256:1c9763d267117f796b38ee41266eb01ebc2ece548dc13ef9b96ac6ffd8aed7ca');
      const approved = await board.resolveGate({
        gateId: gate.id,
        decision: 'approve_automatic',
        decidedBy: APPROVAL_DECIDER,
        approvalSubjectId: gate.approvalSubject.id,
        approvalSubjectDigest: gate.approvalSubject.digest,
      });
      if (!approved.ok) throw new Error(approved.message);

      const response = await post(
        `/v1/boards/${boardId}/approval-subjects/${gate.approvalSubject.id}/verify`,
        await hubToken({ scope: 'approvals:read' }),
        { expectedDigest: requestDigest },
      );
      const body = await response.text();
      if (response.status !== 200) throw new Error(body);
      expect(response.status).toBe(200);
      expect(JSON.parse(body)).toEqual({
        approved: true,
        deliveryMode: 'automatic',
        subjectId: gate.approvalSubject.id,
        digest: requestDigest,
        gateId: gate.id,
        expiresAt: '2030-01-02T03:04:05Z',
        gateStatus: 'resolved',
      });
      const mismatch = await post(
        `/v1/boards/${boardId}/approval-subjects/${gate.approvalSubject.id}/verify`,
        await hubToken({ scope: 'approvals:read' }),
        { expectedDigest: `sha256:${'0'.repeat(64)}` },
      );
      expect(mismatch.status).toBe(200);
      expect(await mismatch.json()).toMatchObject({ approved: false, digest: requestDigest, gateId: gate.id });

      const deliveryPath = `/v1/boards/${boardId}/approval-subjects/${gate.approvalSubject.id}/delivery`;
      expect((await post(deliveryPath, await hubToken({ scope: 'approvals:read' }), {
        expectedDigest: requestDigest,
        liveUrl: 'https://x.com/fixture_account/status/123',
      })).status).toBe(403);
      const delivered = await post(deliveryPath, await hubToken({ scope: 'approvals:write' }), {
        expectedDigest: requestDigest,
        liveUrl: 'https://x.com/fixture_account/status/123',
      });
      expect(delivered.status).toBe(200);
      expect(await delivered.json()).toMatchObject({
        deliveryMode: 'automatic',
        digest: requestDigest,
        gateId: gate.id,
        liveUrl: 'https://x.com/fixture_account/status/123',
      });
      const after = await board.getGate(gate.id);
      if (!after.ok) throw new Error(after.message);
      expect(after.value.delivery).toMatchObject({
        mode: 'automatic',
        liveUrl: 'https://x.com/fixture_account/status/123',
        readBackStatus: 'service_reported',
      });
      // Repeating the same report is idempotent; a conflicting URL cannot
      // replace the first delivery or add another audit event.
      expect((await post(deliveryPath, await hubToken({ scope: 'approvals:write' }), {
        expectedDigest: requestDigest,
        liveUrl: 'https://x.com/fixture_account/status/123',
      })).status).toBe(200);
      const conflict = await post(deliveryPath, await hubToken({ scope: 'approvals:write' }), {
        expectedDigest: requestDigest,
        liveUrl: 'https://x.com/fixture_account/status/456',
      });
      expect(conflict.status).toBe(403);
      const events = await runInDurableObject(
        env.BOARD_DO.get(env.BOARD_DO.idFromName(`${TENANT}:${boardId}`)),
        async (_board, storageState) => storageState.storage.sql.exec(
          `SELECT COUNT(*) AS n FROM approval_delivery_events WHERE gate_id = ? AND event = 'live_url_recorded'`, gate.id,
        ).one(),
      );
      expect(events).toEqual({ n: 1 });

      // Expiry is re-checked inside the recording transaction, including for
      // an otherwise-idempotent repeat after approval has elapsed.
      await runInDurableObject(
        env.BOARD_DO.get(env.BOARD_DO.idFromName(`${TENANT}:${boardId}`)),
        async (_board, storageState) => storageState.storage.sql.exec(
          `UPDATE approval_subjects
              SET canonical_bytes = CAST(json_set(CAST(canonical_bytes AS TEXT), '$.timing.expiresAt', '2000-01-01T00:00:00Z') AS BLOB)
            WHERE id = ? RETURNING id`, approvalSubjectId,
        ).one(),
      );
      expect((await post(deliveryPath, await hubToken({ scope: 'approvals:write' }), {
        expectedDigest: requestDigest,
        liveUrl: 'https://x.com/fixture_account/status/123',
      })).status).toBe(403);
    });
  });
});

describe('a service registering a push config (hub issuer)', () => {
  it('registers a record-event config with push:write, under svc:<prn>', async () => {
    await legacy(async () => {
      const { boardId } = await seedBoardWithResolvedGate();
      const t = await hubToken({ scope: 'push:write' });
      const r = await post(`/v1/boards/${boardId}/push-configs`, t, {
        url: `https://library.example.com/api/v1/sources/superpipeline/events?board=${boardId}`, token: 'derived', events: ['card.updated'],
      });
      expect(r.status).toBe(201);
      // Stored under the service's principal: the same call again answers the same config (agent_id + url).
      const again = await post(`/v1/boards/${boardId}/push-configs`, t, {
        url: `https://library.example.com/api/v1/sources/superpipeline/events?board=${boardId}`, token: 'derived', events: ['card.updated'],
      });
      expect(((await again.json()) as { configId: string }).configId).toBe(((await r.json()) as { configId: string }).configId);
      const agentIds = await runInDurableObject(
        env.BOARD_DO.get(env.BOARD_DO.idFromName(`${TENANT}:${boardId}`)),
        async (_i, state) => state.storage.sql.exec(`SELECT agent_id FROM push_configs`).toArray().map((r) => r.agent_id),
      );
      expect(agentIds).toEqual(['svc:prn_0123456789abcdef0f01']);
    });
  });

  it('refuses events that are not record events, and a body without a token', async () => {
    await legacy(async () => {
      const { boardId } = await seedBoardWithResolvedGate();
      const t = await hubToken({ scope: 'push:write' });
      const p = `/v1/boards/${boardId}/push-configs`;
      const known = await post(p, t, { url: 'https://library.example.com/x', token: 'd', events: ['work.available'] });
      expect(known.status).toBe(400);
      expect(((await known.json()) as { error: { code: string } }).error.code).toBe('INVALID_BODY');
      const unknown = await post(p, t, { url: 'https://library.example.com/x', token: 'd', events: ['card.nonsense'] });
      expect(unknown.status).toBe(400);
      expect(((await unknown.json()) as { error: { code: string } }).error.code).toBe('UNKNOWN_EVENT');
      expect((await post(p, t, { url: 'https://library.example.com/x', token: 'd', events: [] })).status).toBe(400);
      expect((await post(p, t, { url: 'https://library.example.com/x', events: ['card.updated'] })).status).toBe(400);
    });
  });

  it('needs push:write, not cards:read', async () => {
    await legacy(async () => {
      const { boardId } = await seedBoardWithResolvedGate();
      const r = await post(`/v1/boards/${boardId}/push-configs`, await hubToken({ scope: 'cards:read' }), {
        url: 'https://library.example.com/x', token: 'd', events: ['card.updated'],
      });
      expect(r.status).toBe(403);
    });
  });
});

describe('the same routes in Organization-plane mode (the production path)', () => {
  const svcToken = (over: Record<string, unknown> = {}) =>
    planeToken({ sub: SERVICE, principalKind: 'service', scope: 'cards:read push:write', email: undefined, email_verified: undefined, ...over });

  it('a service token with the superpipeline entitlement reads its own org board and pushes', async () => {
    await withOrgPlane(async () => {
      const tenant = await ensureOrgTenant(env.DB, ORG);
      const { boardId, cardId } = await seedBoardWithResolvedGate({ tenant });
      const t = await svcToken();
      expect((await get(`/v1/boards/${boardId}/cards/${cardId}`, t)).status).toBe(200);
      const reg = await post(`/v1/boards/${boardId}/push-configs`, t, { url: 'https://library.example.com/e', token: 'd', events: ['card.updated'] });
      expect(reg.status).toBe(201);
    });
  });

  it('refuses without the entitlement, for an agent, for a human, and for another org', async () => {
    await withOrgPlane(async () => {
      const tenant = await ensureOrgTenant(env.DB, ORG);
      const other = await ensureOrgTenant(env.DB, OTHER_ORG);
      const { boardId } = await seedBoardWithResolvedGate({ tenant });
      const path = `/v1/boards/${boardId}`;
      expect([401, 403]).toContain((await get(path, await svcToken({ ent: [] }))).status);
      expect([401, 403]).toContain((await get(path, await svcToken({ principalKind: 'agent', sub: AGENT }))).status);
      expect([401, 403]).toContain((await get(path, await svcToken({ principalKind: 'human' }))).status);
      expect((await get(path, await svcToken({ scope: '' }))).status).toBe(403);
      // Another org's service cannot see this org's board.
      expect(other).not.toBe(tenant);
      expect((await get(path, await svcToken({ org: OTHER_ORG }))).status).toBe(404);
    });
  });
});

describe('a bearer that is not a service stays on the existing routes', () => {
  it('a person with a plane bearer reads the board as before (200), not as a service', async () => {
    await withOrgPlane(async () => {
      const tenant = await ensureOrgTenant(env.DB, ORG);
      const { boardId, cardId } = await seedBoardWithResolvedGate({ tenant });
      const human = await planeToken();
      expect((await get(`/v1/boards/${boardId}`, human)).status).toBe(200);
      expect((await get(`/v1/boards/${boardId}/cards/${cardId}`, human)).status).toBe(200);
    });
  });
});

describe('a person cannot name a service as the subscriber', () => {
  it('refuses X-Agent-Id svc:<prn> on the human push-config route and leaves the service config alone', async () => {
    await legacy(async () => {
      const { boardId } = await seedBoardWithResolvedGate();
      const url = 'https://library.example.com/own';
      const svc = await post(`/v1/boards/${boardId}/push-configs`, await hubToken({ scope: 'push:write' }), { url, token: 'service-token', events: ['card.updated'] });
      expect(svc.status).toBe(201);
      const r = await SELF.fetch(`https://api.test/v1/boards/${boardId}/push-configs`, {
        method: 'POST',
        headers: { 'X-Tenant-Id': TENANT, 'X-User-Id': 'usr_owner', 'X-Agent-Id': 'svc:prn_0123456789abcdef0f01', 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, token: 'attacker-token', events: ['card.updated'] }),
      });
      expect(r.status).toBe(400);
      const tokens = await runInDurableObject(
        env.BOARD_DO.get(env.BOARD_DO.idFromName(`${TENANT}:${boardId}`)),
        async (_i, state) => state.storage.sql.exec(`SELECT token FROM push_configs WHERE agent_id LIKE 'svc:%'`).toArray().map((x) => x.token),
      );
      expect(tokens).toEqual(['service-token']);
    });
  });
});

/** A board in `tenant` with one card whose review gate is open (pending). */
async function seedBoardWithPendingGate(tenant: string): Promise<{ boardId: string; gateId: string }> {
  const boardId = newId('brd');
  const board = boardStub(env, tenant, boardId);
  await board.init({ id: boardId, tenantId: tenant, name: 'Gate board', stages: PIPELINE });
  await recordBoard(env.DB, tenant, { id: boardId, name: 'Gate board', stagesJson: JSON.stringify(PIPELINE) });
  const card = await board.createCard({ title: 'Ship the release notes', ownerUserId: 'usr_a' });
  if (!card.ok) throw new Error(card.message);
  const claim = await board.claim({ agentId: 'agt_r', capabilities: ['research'] });
  if (!claim.claimed) throw new Error('expected a research claim');
  await board.complete({ runId: claim.runId, leaseEpoch: claim.leaseEpoch, handoff: { summary: 'drafted' } });
  const gate = (await board.getState()).gates[0];
  if (!gate) throw new Error('expected a pending gate');
  return { boardId, gateId: gate.id };
}

/**
 * The chat carrier's gate sweep: a service holding `gates:read` reads a board's pending gates and
 * one gate, in its own workspace only, and decides nothing.
 */
const gateReader = (over: Record<string, unknown> = {}) =>
  planeToken({ sub: SERVICE, principalKind: 'service', scope: 'gates:read', email: undefined, email_verified: undefined, ...over });

describe('a service reading gates with gates:read (Organization plane)', () => {
  it('reads its own board\'s pending gates and one gate, in the shape a person reads, and sees a decision made elsewhere', async () => {
    await withOrgPlane(async () => {
      const tenant = await ensureOrgTenant(env.DB, ORG);
      const { boardId, gateId } = await seedBoardWithPendingGate(tenant);
      const t = await gateReader();
      const pending = await get(`/v1/boards/${boardId}/gates/pending`, t);
      expect(pending.status).toBe(200);
      const listed: unknown = await pending.json();
      expect(listed).toEqual({ gates: [expect.objectContaining({ gateId })] });
      const one = await get(`/v1/boards/${boardId}/gates/${gateId}`, t);
      expect(one.status).toBe(200);
      const body: unknown = await one.json();
      expect(body).toMatchObject({ gate: { id: gateId, status: 'pending' } });
      // The same JSON a person gets from the human route.
      const human = await planeToken();
      expect(await (await get(`/v1/boards/${boardId}/gates/${gateId}`, human)).json()).toEqual(body);

      // Decided on the web: the service sees how, and the gate leaves the pending list.
      const decided = await boardStub(env, tenant, boardId).resolveGate({ gateId, decision: 'approve', decidedBy: 'usr_a' });
      if (!decided.ok) throw new Error(decided.message);
      const after: unknown = await (await get(`/v1/boards/${boardId}/gates/${gateId}`, t)).json();
      expect(after).toMatchObject({ gate: { status: 'resolved', decision: 'approve' } });
      const none: unknown = await (await get(`/v1/boards/${boardId}/gates/pending`, t)).json();
      expect(none).toEqual({ gates: [] });
      // A gate that does not exist on the board is not found.
      expect((await get(`/v1/boards/${boardId}/gates/gate_00000000000000ff`, t)).status).toBe(404);
    });
  });

  it('is refused without gates:read, whatever else the service holds', async () => {
    await withOrgPlane(async () => {
      const tenant = await ensureOrgTenant(env.DB, ORG);
      const { boardId, gateId } = await seedBoardWithPendingGate(tenant);
      for (const scope of ['', 'cards:read push:write approval-requests:relay', 'gates:write']) {
        const t = await gateReader({ scope });
        for (const path of [`/v1/boards/${boardId}/gates/pending`, `/v1/boards/${boardId}/gates/${gateId}`]) {
          const r = await get(path, t);
          expect({ scope, path, status: r.status }).toEqual({ scope, path, status: 403 });
          expect(await r.text()).not.toContain(gateId);
        }
      }
    });
  });

  it('cannot read another workspace\'s board', async () => {
    await withOrgPlane(async () => {
      const tenant = await ensureOrgTenant(env.DB, ORG);
      const other = await ensureOrgTenant(env.DB, OTHER_ORG);
      expect(other).not.toBe(tenant);
      const { boardId, gateId } = await seedBoardWithPendingGate(tenant);
      const t = await gateReader({ org: OTHER_ORG });
      for (const path of [`/v1/boards/${boardId}/gates/pending`, `/v1/boards/${boardId}/gates/${gateId}`]) {
        const r = await get(path, t);
        expect({ path, status: r.status }).toEqual({ path, status: 404 });
        expect(await r.text()).not.toContain(gateId);
      }
    });
  });

  it('decides nothing: resolve, pull-back and delivery are refused and the gate stays open', async () => {
    await withOrgPlane(async () => {
      const tenant = await ensureOrgTenant(env.DB, ORG);
      const { boardId, gateId } = await seedBoardWithPendingGate(tenant);
      const t = await gateReader({ scope: 'gates:read cards:read' });
      const writes: Array<[string, unknown]> = [
        [`/v1/boards/${boardId}/gates/${gateId}/resolve`, { decision: 'approve' }],
        [`/v1/boards/${boardId}/gates/${gateId}/pull-back`, { comment: 'wait' }],
        [`/v1/boards/${boardId}/gates/${gateId}/delivery`, { mode: 'manual' }],
        [`/v1/boards/${boardId}/gates/${gateId}`, { decision: 'approve' }],
        [`/v1/boards/${boardId}/gates/pending`, {}],
      ];
      for (const [path, body] of writes) {
        const r = await post(path, t, body);
        expect({ path, refused: r.status >= 400 }).toEqual({ path, refused: true });
      }
      const gate = await boardStub(env, tenant, boardId).getGate(gateId);
      if (!gate.ok) throw new Error(gate.message);
      expect(gate.value.status).toBe('pending');
    });
  });
});

describe('a service reading gates with gates:read (hub issuer)', () => {
  it('reads its own tenant\'s gates and not another tenant\'s', async () => {
    await legacy(async () => {
      const own = await seedBoardWithPendingGate(TENANT);
      const foreign = await seedBoardWithPendingGate(OTHER_TENANT);
      const t = await hubToken({ scope: 'gates:read' });
      expect((await get(`/v1/boards/${own.boardId}/gates/pending`, t)).status).toBe(200);
      expect((await get(`/v1/boards/${own.boardId}/gates/${own.gateId}`, t)).status).toBe(200);
      expect((await get(`/v1/boards/${foreign.boardId}/gates/pending`, t)).status).toBe(404);
      expect((await get(`/v1/boards/${foreign.boardId}/gates/${foreign.gateId}`, t)).status).toBe(404);
      expect((await get(`/v1/boards/${own.boardId}/gates/pending`, await hubToken())).status).toBe(403);
    });
  });
});

/**
 * A board in `tenant` with a manual delivery still owed its live link (one card approved
 * `approve_manual`) and a card waiting on a person (a second card its agent blocked).
 */
async function seedBoardWithFollowUps(tenant: string): Promise<{ boardId: string; gateId: string; blockedCardId: string }> {
  const boardId = newId('brd');
  const board = boardStub(env, tenant, boardId);
  await board.init({ id: boardId, tenantId: tenant, name: 'Follow-up board', stages: APPROVAL_PIPELINE });
  await recordBoard(env.DB, tenant, { id: boardId, name: 'Follow-up board', stagesJson: JSON.stringify(APPROVAL_PIPELINE) });
  const manual = await board.createCard({ title: 'Post the fixture by hand', ownerUserId: 'usr_fixture_owner', projectId: 'prj_fixture' });
  if (!manual.ok) throw new Error(manual.message);
  const draft = await board.claim({ agentId: 'agt_fixture_writer', capabilities: ['writing'] });
  if (!draft.claimed) throw new Error('expected the fixture draft to be claimable');
  const completed = await board.complete({ runId: draft.runId, leaseEpoch: draft.leaseEpoch, handoff: { publicationPayload: payload() } });
  if (!completed.ok) throw new Error(completed.message);
  const gate = (await board.getState()).gates[0];
  if (!gate?.approvalSubject) throw new Error('expected a bound approval gate');
  const approved = await board.resolveGate({
    gateId: gate.id,
    decision: 'approve_manual',
    decidedBy: APPROVAL_DECIDER,
    approvalSubjectId: gate.approvalSubject.id,
    approvalSubjectDigest: gate.approvalSubject.digest,
  });
  if (!approved.ok) throw new Error(approved.message);
  const blocked = await board.createCard({ title: 'Draft without credentials', ownerUserId: 'usr_fixture_owner' });
  if (!blocked.ok) throw new Error(blocked.message);
  const run = await board.claim({ agentId: 'agt_fixture_writer', capabilities: ['writing'] });
  if (!run.claimed) throw new Error('expected the second draft to be claimable');
  await board.block({ runId: run.runId, leaseEpoch: run.leaseEpoch, reason: 'no credentials' });
  return { boardId, gateId: gate.id, blockedCardId: blocked.value.id };
}

const followUpPaths = (boardId: string) => [`/v1/boards/${boardId}/deliveries/pending`, `/v1/boards/${boardId}/attention/pending`];

/**
 * The rest of the carrier's sweep: on the same `gates:read`, a service reads the manual deliveries
 * still owed a link and the cards waiting on a person, in its own workspace only, and changes nothing.
 */
describe('a service reading the follow-up sweep with gates:read (Organization plane)', () => {
  it('reads its own board\'s owed deliveries and waiting cards, in the body a person reads', async () => {
    await withOrgPlane(async () => {
      const tenant = await ensureOrgTenant(env.DB, ORG);
      const { boardId, gateId, blockedCardId } = await seedBoardWithFollowUps(tenant);
      const t = await gateReader();
      const human = await planeToken();

      const deliveries = await get(`/v1/boards/${boardId}/deliveries/pending`, t);
      expect(deliveries.status).toBe(200);
      const owed: unknown = await deliveries.json();
      expect(owed).toEqual({ deliveries: [expect.objectContaining({ gateId })] });
      expect(await (await get(`/v1/boards/${boardId}/deliveries/pending`, human)).json()).toEqual(owed);

      const attention = await get(`/v1/boards/${boardId}/attention/pending`, t);
      expect(attention.status).toBe(200);
      const waiting: unknown = await attention.json();
      expect(waiting).toEqual({ attention: [expect.objectContaining({ cardId: blockedCardId, reason: 'blocked' })] });
      expect(await (await get(`/v1/boards/${boardId}/attention/pending`, human)).json()).toEqual(waiting);
    });
  });

  it('is refused without gates:read, whatever else the service holds', async () => {
    await withOrgPlane(async () => {
      const tenant = await ensureOrgTenant(env.DB, ORG);
      const { boardId, gateId, blockedCardId } = await seedBoardWithFollowUps(tenant);
      for (const scope of ['', 'cards:read push:write approval-requests:relay', 'gates:write']) {
        const t = await gateReader({ scope });
        for (const path of followUpPaths(boardId)) {
          const r = await get(path, t);
          expect({ scope, path, status: r.status }).toEqual({ scope, path, status: 403 });
          const text = await r.text();
          expect(text).not.toContain(gateId);
          expect(text).not.toContain(blockedCardId);
        }
      }
    });
  });

  it('cannot read another workspace\'s board', async () => {
    await withOrgPlane(async () => {
      const tenant = await ensureOrgTenant(env.DB, ORG);
      expect(await ensureOrgTenant(env.DB, OTHER_ORG)).not.toBe(tenant);
      const { boardId, gateId, blockedCardId } = await seedBoardWithFollowUps(tenant);
      const t = await gateReader({ org: OTHER_ORG });
      for (const path of followUpPaths(boardId)) {
        const r = await get(path, t);
        expect({ path, status: r.status }).toEqual({ path, status: 404 });
        const text = await r.text();
        expect(text).not.toContain(gateId);
        expect(text).not.toContain(blockedCardId);
      }
    });
  });

  it('changes nothing: writes are refused, the delivery stays owed and the card stays waiting', async () => {
    await withOrgPlane(async () => {
      const tenant = await ensureOrgTenant(env.DB, ORG);
      const { boardId, gateId, blockedCardId } = await seedBoardWithFollowUps(tenant);
      const t = await gateReader({ scope: 'gates:read cards:read' });
      const writes: Array<[string, unknown]> = [
        [`/v1/boards/${boardId}/deliveries/pending`, {}],
        [`/v1/boards/${boardId}/attention/pending`, {}],
        [`/v1/boards/${boardId}/gates/${gateId}/delivery`, { liveUrl: 'https://x.com/fixture_account/status/1' }],
        [`/v1/boards/${boardId}/cards/${blockedCardId}/resume`, { comment: 'go' }],
        [`/v1/boards/${boardId}/cards/${blockedCardId}/archive`, {}],
      ];
      for (const [path, body] of writes) {
        const r = await post(path, t, body);
        expect({ path, refused: r.status >= 400 }).toEqual({ path, refused: true });
      }
      const board = boardStub(env, tenant, boardId);
      expect(await board.pendingDeliveryFollowUps()).toEqual([expect.objectContaining({ gateId })]);
      expect(await board.pendingAttention()).toEqual([expect.objectContaining({ cardId: blockedCardId })]);
    });
  });
});

describe('a service reading the follow-up sweep with gates:read (hub issuer)', () => {
  it('reads its own tenant\'s follow-ups and not another tenant\'s', async () => {
    await legacy(async () => {
      const own = await seedBoardWithFollowUps(TENANT);
      const foreign = await seedBoardWithFollowUps(OTHER_TENANT);
      const t = await hubToken({ scope: 'gates:read' });
      for (const path of followUpPaths(own.boardId)) expect({ path, status: (await get(path, t)).status }).toEqual({ path, status: 200 });
      for (const path of followUpPaths(foreign.boardId)) expect({ path, status: (await get(path, t)).status }).toEqual({ path, status: 404 });
      for (const path of followUpPaths(own.boardId)) expect({ path, status: (await get(path, await hubToken())).status }).toEqual({ path, status: 403 });
    });
  });
});

const CHECKS_PIPELINE: BoardInit['stages'] = [
  { key: 'build', name: 'Build', order: 0, ownerKind: 'capability', owner: 'build' },
  { key: 'verify', name: 'Verify', order: 1, ownerKind: 'human', gate: 'checks', returnStage: 'build', checks: [{ name: 'build', provider: 'ci', contexts: ['build'] }] },
  { key: 'ship', name: 'Ship', order: 2, ownerKind: 'capability', owner: 'ship' },
];

/** A board in `tenant` with one card that arrived at a stage with checks, which are still open. */
async function seedBoardWithChecks(tenant: string): Promise<{ boardId: string; cardId: string }> {
  const boardId = newId('brd');
  const board = boardStub(env, tenant, boardId);
  await board.init({ id: boardId, tenantId: tenant, name: 'Checks board', stages: CHECKS_PIPELINE });
  await recordBoard(env.DB, tenant, { id: boardId, name: 'Checks board', stagesJson: JSON.stringify(CHECKS_PIPELINE) });
  const card = await board.createCard({ title: 'Fix the build', ownerUserId: 'usr_owner' });
  if (!card.ok) throw new Error(card.message);
  const run = await board.claim({ agentId: 'agt_b', capabilities: ['build'] });
  if (!run.claimed) throw new Error('expected a build claim');
  const done = await board.complete({ runId: run.runId, leaseEpoch: run.leaseEpoch, handoff: { summary: 'fixed' } });
  if (!done.ok) throw new Error(done.message);
  return { boardId, cardId: card.value.id };
}

/**
 * A card's checks: on the same `gates:read`, a service reads them (to escalate a check left open
 * too long), in its own workspace only, and overrides nothing.
 */
describe('a service reading a card\'s checks with gates:read (Organization plane)', () => {
  it('reads its own board\'s card checks, in the body a person reads', async () => {
    await withOrgPlane(async () => {
      const tenant = await ensureOrgTenant(env.DB, ORG);
      const { boardId, cardId } = await seedBoardWithChecks(tenant);
      const t = await gateReader();
      const r = await get(`/v1/boards/${boardId}/cards/${cardId}/checks`, t);
      expect(r.status).toBe(200);
      const body: unknown = await r.json();
      expect(body).toMatchObject({ checks: { cardId, stageKey: 'verify', status: 'open', checks: [expect.objectContaining({ name: 'build' })] } });
      expect(await (await get(`/v1/boards/${boardId}/cards/${cardId}/checks`, await planeToken())).json()).toEqual(body);
      // A card that is not on the board answers as the human route does.
      const missing = `/v1/boards/${boardId}/cards/card_00000000000000ff/checks`;
      const asService = await get(missing, t);
      const asPerson = await get(missing, await planeToken());
      expect({ status: asService.status, body: await asService.json() }).toEqual({ status: asPerson.status, body: await asPerson.json() });
    });
  });

  it('is refused without gates:read, whatever else the service holds', async () => {
    await withOrgPlane(async () => {
      const tenant = await ensureOrgTenant(env.DB, ORG);
      const { boardId, cardId } = await seedBoardWithChecks(tenant);
      for (const scope of ['', 'cards:read push:write approval-requests:relay', 'gates:write']) {
        const r = await get(`/v1/boards/${boardId}/cards/${cardId}/checks`, await gateReader({ scope }));
        expect({ scope, status: r.status }).toEqual({ scope, status: 403 });
        expect(await r.text()).not.toContain('verify');
      }
    });
  });

  it('cannot read another workspace\'s board', async () => {
    await withOrgPlane(async () => {
      const tenant = await ensureOrgTenant(env.DB, ORG);
      expect(await ensureOrgTenant(env.DB, OTHER_ORG)).not.toBe(tenant);
      const { boardId, cardId } = await seedBoardWithChecks(tenant);
      const r = await get(`/v1/boards/${boardId}/cards/${cardId}/checks`, await gateReader({ org: OTHER_ORG }));
      // The board is not found in the caller's workspace: refused before its board is asked at all.
      expect({ status: r.status, body: await r.json() }).toEqual({ status: 404, body: { error: 'board not found' } });
    });
  });

  it('overrides nothing: writes are refused and the checks stay open', async () => {
    await withOrgPlane(async () => {
      const tenant = await ensureOrgTenant(env.DB, ORG);
      const { boardId, cardId } = await seedBoardWithChecks(tenant);
      const t = await gateReader({ scope: 'gates:read cards:read' });
      for (const path of [`/v1/boards/${boardId}/cards/${cardId}/checks`, `/v1/boards/${boardId}/cards/${cardId}/checks/build/override`]) {
        const r = await post(path, t, { comment: 'ship it' });
        expect({ path, refused: r.status >= 400 }).toEqual({ path, refused: true });
      }
      const after = await boardStub(env, tenant, boardId).cardChecks(cardId);
      if (!after.ok) throw new Error(after.message);
      expect(after.value).toMatchObject({ status: 'open' });
    });
  });
});

describe('a service reading a card\'s checks with gates:read (hub issuer)', () => {
  it('reads its own tenant\'s card checks and not another tenant\'s', async () => {
    await legacy(async () => {
      const own = await seedBoardWithChecks(TENANT);
      const foreign = await seedBoardWithChecks(OTHER_TENANT);
      const t = await hubToken({ scope: 'gates:read' });
      expect((await get(`/v1/boards/${own.boardId}/cards/${own.cardId}/checks`, t)).status).toBe(200);
      const foreignRead = await get(`/v1/boards/${foreign.boardId}/cards/${foreign.cardId}/checks`, t);
      expect({ status: foreignRead.status, body: await foreignRead.json() }).toEqual({ status: 404, body: { error: 'board not found' } });
      expect((await get(`/v1/boards/${own.boardId}/cards/${own.cardId}/checks`, await hubToken())).status).toBe(403);
    });
  });
});
