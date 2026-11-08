/**
 * A broker approval is hosted on the board (charter: decisions/2026-11-08-waiting-cards-and-
 * broker-approvals-reach-chat.md, decisions 3–5).
 *
 * SuperToolkit creates an approval request with a `stk-capability/v1` subject on a service
 * credential, waits, and reads the decision back with its own. The request reaches chat as a
 * subject-bound question on `elicitation.pending` and is answered through the question answer
 * route; only a workspace owner or admin approves, the binding is required and must match, and
 * nothing is taken after expiry.
 */
import { SELF, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import { __resetJwksCacheForTests } from '../src/auth/hub-jwt';
import { boardStub } from '../src/board/stub';
import type { BoardInit } from '../src/board/board-do';
import { createAgent, createAgentToken, recordBoard } from '../src/db/catalog';
import { newId } from '../src/ids';
import { PREVIEW_TEXT_MAX } from '../src/approval-subject-kinds/kind';
import { withIssuer } from './helpers/hub-issuer';
import { planeToken, SERVICE, withOrgPlane } from './helpers/org-plane';
import { ensureOrgTenant } from '../src/auth/org-tenancy';

const STAGES: BoardInit['stages'] = [{ key: 'build', name: 'Build', order: 0, ownerKind: 'capability', owner: 'build' }];
const ISSUER = 'https://issuer-apr.test';
const PLANE = 'https://api.test';
const FLEET = 'fleet_0000000000000000ar01';
const TENANT = 'tnt_approval_requests';
const OTHER_TENANT = 'tnt_approval_requests_other';
const OTHER_FLEET = 'fleet_0000000000000000ar02';
const BROKER = 'prn_0123456789abcdef0a01';
const READER = 'prn_0123456789abcdef0a02';
const HOOK = 'https://hub.example/api/bridge/superpipeline/push';
const AGENT_HOOK = 'https://agent.example/hook';

let signingKey: CryptoKey;
let jwksBody: string;
beforeAll(async () => {
  const pair = await generateKeyPair('EdDSA', { extractable: true });
  signingKey = pair.privateKey;
  jwksBody = JSON.stringify({ keys: [{ ...(await exportJWK(pair.publicKey)), alg: 'EdDSA', kid: 'ar-kid' }] });
  for (const [t, f] of [[TENANT, FLEET], [OTHER_TENANT, OTHER_FLEET]] as const) {
    await env.DB.prepare(`INSERT OR IGNORE INTO tenants (id, slug, name) VALUES (?, ?, 'S')`).bind(t, `slug-${t}`).run();
    await env.DB.prepare(`UPDATE tenants SET external_source='agentpod', external_id=? WHERE id=?`).bind(f, t).run();
  }
  for (const [user, role] of [['usr_apr_owner', 'owner'], ['usr_apr_admin', 'admin'], ['usr_apr_member', 'member'], ['usr_apr_viewer', 'viewer']] as const) {
    await env.DB.prepare(`INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)`).bind(user, `${user}@example.test`, `Person ${role}`).run();
    await env.DB.prepare(`INSERT OR IGNORE INTO memberships (id, tenant_id, user_id, role) VALUES (?, ?, ?, ?)`).bind(newId('mem'), TENANT, user, role).run();
  }
});
beforeEach(() => __resetJwksCacheForTests());

const service = (over: Record<string, unknown> = {}) =>
  new SignJWT({ sub: BROKER, principalKind: 'service', tenant: FLEET, mayDispatch: [], mayGrantReach: false, scope: 'approval-requests:write', ...over })
    .setProtectedHeader({ alg: 'EdDSA', kid: 'ar-kid' })
    .setIssuedAt().setIssuer(ISSUER).setAudience([ISSUER, PLANE]).setExpirationTime('5m')
    .sign(signingKey);
const reader = () => service({ sub: READER, scope: 'approval-requests:read' });
const RELAY = 'prn_0123456789abcdef0a03';
/** A person holding a hub token: an either-route resolves dev headers as an agent, so a person reads with this. */
const personToken = () => service({ sub: 'usr_hub_person', principalKind: 'human', scope: undefined });
const relay = (scope = 'approval-requests:relay') => service({ sub: RELAY, scope });

const legacy = <T>(fn: () => Promise<T>) => withIssuer(ISSUER, jwksBody, fn);
const call = (method: string, path: string, headers: Record<string, string>, body?: unknown) =>
  SELF.fetch(`https://api.test${path}`, { method, headers: { 'content-type': 'application/json', ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
const person = (userId: string) => ({ 'X-Tenant-Id': TENANT, 'X-User-Id': userId });

function subject(over: Record<string, unknown> = {}) {
  return {
    schema: 'stk-capability/v1',
    id: `stk_${crypto.randomUUID()}`,
    digest: 'sha256:' + 'c'.repeat(64),
    revision: 1,
    expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
    preview: [
      { type: 'field', label: 'Service', value: 'github' },
      { type: 'field', label: 'Capability', value: 'issues.create' },
      { type: 'text', label: 'Arguments', text: '{"title":"Fix the build"}' },
    ],
    preview_complete: true,
    ...over,
  };
}

function createBody(over: Record<string, unknown> = {}) {
  return { requestId: crypto.randomUUID(), question: 'Let the agent create a GitHub issue?', subject: subject(), ...over };
}

async function seedBoard(tenant = TENANT): Promise<string> {
  const boardId = newId('brd');
  const board = boardStub(env, tenant, boardId);
  await board.init({ id: boardId, tenantId: tenant, name: 'Broker board', stages: STAGES });
  // An agent on the board subscribes to questions; the carrier subscribes as a relay service.
  await board.registerPushConfig({ agentId: 'agt_worker', url: AGENT_HOOK, token: 's', events: ['elicitation.pending'] });
  await recordBoard(env.DB, tenant, { id: boardId, name: 'Broker board', stagesJson: JSON.stringify(STAGES) });
  if (tenant === TENANT) {
    const sub = await call('POST', `/v1/boards/${boardId}/push-configs`, bearer(await relay()), { url: HOOK, token: 's', events: ['elicitation.pending', 'gate.pending', 'delivery.pending', 'attention.pending'] });
    if (sub.status !== 201) throw new Error(`the relay could not subscribe: ${sub.status}`);
  }
  return boardId;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function textOf(v: unknown, key: string): string {
  const at = isRecord(v) ? v[key] : undefined;
  if (typeof at !== 'string') throw new Error(`expected a string at ${key}`);
  return at;
}

async function create(boardId: string, body: unknown = createBody()): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await call('POST', `/v1/boards/${boardId}/approval-requests`, bearer(await service()), body);
  const json: unknown = await res.json();
  return { status: res.status, json: isRecord(json) ? json : {} };
}

async function readBack(boardId: string, id: unknown): Promise<Record<string, unknown>> {
  const res = await call('GET', `/v1/boards/${boardId}/approval-requests/${String(id)}`, bearer(await reader()));
  expect(res.status).toBe(200);
  const json: unknown = await res.json();
  return isRecord(json) ? json : {};
}

async function answer(boardId: string, id: unknown, userId: string, body: unknown): Promise<Response> {
  return call('POST', `/v1/boards/${boardId}/elicitations/${String(id)}/answer`, person(userId), body);
}

describe('creating and reading an approval request', () => {
  it('creates a pending request (201), replays the same requestId to the same record (200), and reads it back', async () => {
    await legacy(async () => {
      const boardId = await seedBoard();
      const body = createBody();
      const first = await create(boardId, body);
      expect(first.status).toBe(201);
      expect(first.json).toEqual({ approvalRequestId: expect.stringMatching(/^apr_[0-9a-f]{16}$/), state: 'pending' });
      const again = await create(boardId, body);
      expect(again.status).toBe(200);
      expect(again.json).toEqual(first.json);

      expect(await readBack(boardId, first.json.approvalRequestId)).toEqual({
        approvalRequestId: first.json.approvalRequestId,
        requestId: body.requestId,
        state: 'pending',
        option: null,
        decidedBy: null,
        decidedAt: null,
        subject: { id: body.subject.id, digest: body.subject.digest },
        expiresAt: body.subject.expires_at,
      });
    });
  });

  it('refuses the same requestId for a different subject, a malformed body, and an expired subject', async () => {
    await legacy(async () => {
      const boardId = await seedBoard();
      const body = createBody();
      expect((await create(boardId, body)).status).toBe(201);
      const conflict = await create(boardId, { ...body, subject: { ...body.subject, digest: 'sha256:other' } });
      expect(conflict.status).toBe(409);
      expect(conflict.json).toMatchObject({ error: { code: 'REQUEST_ID_CONFLICT' } });

      for (const bad of [
        createBody({ requestId: '' }),
        createBody({ requestId: 'x'.repeat(129) }),
        createBody({ question: 'q'.repeat(1001) }),
        createBody({ subject: subject({ schema: 'harness-permission/v1' }) }),
        createBody({ subject: subject({ revision: 2 }) }),
        createBody({ subject: subject({ digest: '' }) }),
        createBody({ subject: subject({ extra: true }) }),
        createBody({ subject: subject({ expires_at: new Date(Date.now() - 1000).toISOString() }) }),
        null,
      ]) {
        const refused = await create(boardId, bad);
        expect(refused.status).toBe(400);
        expect(refused.json).toMatchObject({ error: { code: 'INVALID_APPROVAL_REQUEST' } });
      }
    });
  });

  it('creates only on approval-requests:write, reads on approval-requests:read or write, and never across workspaces', async () => {
    await legacy(async () => {
      const boardId = await seedBoard();
      const created = await create(boardId);
      const path = `/v1/boards/${boardId}/approval-requests`;
      expect((await call('POST', path, bearer(await service({ scope: 'approval-requests:read' })), createBody())).status).toBe(403);
      // A publisher's approvals scopes raise and read nothing here.
      expect((await call('POST', path, bearer(await service({ scope: 'approvals:write' })), createBody())).status).toBe(403);
      expect((await call('GET', `${path}/${String(created.json.approvalRequestId)}`, bearer(await service({ scope: 'approvals:read approvals:write' })))).status).toBe(403);
      expect((await call('POST', path, bearer(await service({ scope: 'cards:read' })), createBody())).status).toBe(403);
      expect((await call('GET', `${path}/${String(created.json.approvalRequestId)}`, bearer(await service({ scope: 'cards:read' })))).status).toBe(403);
      expect((await call('GET', `${path}/${String(created.json.approvalRequestId)}`, bearer(await service()))).status).toBe(200);
      expect((await call('GET', `${path}/apr_0000000000000000`, bearer(await reader()))).status).toBe(404);
      // Another workspace's service sees no such board.
      const foreign = await call('GET', `${path}/${String(created.json.approvalRequestId)}`, bearer(await service({ tenant: OTHER_FLEET, scope: 'approval-requests:read' })));
      expect(foreign.status).toBe(404);
      expect(await foreign.json()).toEqual({ error: 'board not found' });
      const foreignCreate = await call('POST', path, bearer(await service({ tenant: OTHER_FLEET })), createBody());
      expect(await foreignCreate.json()).toEqual({ error: 'board not found' });
    });
  });
});

describe('it reaches chat as a subject-bound question', () => {
  it('is pushed on elicitation.pending with the fixed options and the subject, and listed by the pending read until decided', async () => {
    await legacy(async () => {
      const boardId = await seedBoard();
      const body = createBody();
      const created = await create(boardId, body);
      const id = created.json.approvalRequestId;
      const expected = {
        event: 'elicitation.pending',
        boardId,
        boardName: 'Broker board',
        cardId: '',
        cardTitle: 'Approval request',
        elicitationId: id,
        runId: '',
        stageKey: '',
        agentId: BROKER,
        question: body.question,
        options: [
          { id: 'allow_once', label: 'Allow once', meaning: 'approve', needsComment: false, scope: 'once', requires: 'workspace-admin' },
          { id: 'deny', label: 'Deny', meaning: 'reject', needsComment: false, scope: 'once' },
        ],
        approvalSubject: {
          id: body.subject.id,
          digest: body.subject.digest,
          schema: 'stk-capability/v1',
          revision: 1,
          expiresAt: body.subject.expires_at,
          preview: body.subject.preview,
          previewComplete: true,
        },
        approvalRequestId: id,
        ts: expect.any(String),
      };
      const board = boardStub(env, TENANT, boardId);
      // To the relay's config only: the agent subscribed to questions receives nothing.
      const deliveries = await board.getPushDeliveries();
      expect(deliveries.map((d) => d.url)).toEqual([HOOK]);
      expect(deliveries.map((d) => JSON.parse(d.body))).toEqual([expected]);

      const pending = await call('GET', `/v1/boards/${boardId}/elicitations/pending`, bearer(await personToken()));
      expect(await pending.json()).toEqual({ elicitations: [expected] });
      const byRelay = await call('GET', `/v1/boards/${boardId}/elicitations/pending`, bearer(await relay()));
      expect(await byRelay.json()).toEqual({ elicitations: [expected] });

      // A replay does not push it again.
      await create(boardId, body);
      expect(await board.getPushDeliveries()).toHaveLength(1);

      expect((await answer(boardId, id, 'usr_apr_admin', { option: 'deny' })).status).toBe(200);
      const after = await call('GET', `/v1/boards/${boardId}/elicitations/pending`, bearer(await personToken()));
      expect(await after.json()).toEqual({ elicitations: [] });
    });
  });

  it('is never shown to an agent: not on its pending read, its push, the board snapshot or its run read', async () => {
    await legacy(async () => {
      const boardId = await seedBoard();
      const created = await create(boardId);
      const agent = await createAgent(env.DB, TENANT, { name: 'worker', capabilities: ['build'] });
      const { token } = await createAgentToken(env.DB, TENANT, agent.id, ['claim', 'run', 'read']);
      const asAgent = await call('GET', `/v1/boards/${boardId}/elicitations/pending`, bearer(token));
      expect(asAgent.status).toBe(200);
      expect(await asAgent.json()).toEqual({ elicitations: [] });
      const snapshot = await call('GET', `/v1/boards/${boardId}`, bearer(token));
      expect(JSON.stringify(await snapshot.json())).not.toContain(String(created.json.approvalRequestId));
      expect((await boardStub(env, TENANT, boardId).getPushDeliveries()).filter((d) => d.url === AGENT_HOOK)).toEqual([]);
      // Nor to a service without the relay scope, which cannot subscribe to it either.
      expect((await call('GET', `/v1/boards/${boardId}/elicitations/pending`, bearer(await relay('push:write cards:read')))).status).toBe(403);
      const unscoped = await call('POST', `/v1/boards/${boardId}/push-configs`, bearer(await relay('push:write')), { url: 'https://other.example/hook', token: 's', events: ['elicitation.pending'] });
      expect(unscoped.status).toBe(403);
      // The relay scope does not stand in for push:write on record events.
      const records = await call('POST', `/v1/boards/${boardId}/push-configs`, bearer(await relay()), { url: 'https://other.example/hook', token: 's', events: ['card.created'] });
      expect(records.status).toBe(403);
    });
  });

  it('marks a preview cut to its bounds as incomplete', async () => {
    await legacy(async () => {
      const boardId = await seedBoard();
      await create(boardId, createBody({ subject: subject({ preview: [{ type: 'text', text: 'a'.repeat(PREVIEW_TEXT_MAX + 1) }] }) }));
      const [body] = await boardStub(env, TENANT, boardId).pendingElicitationDeliveries({ approvalRequests: true });
      expect(body?.approvalSubject?.previewComplete).toBe(false);
    });
  });
});

describe('answering it', () => {
  it('an owner or admin approves with the binding; the broker reads back who decided', async () => {
    await legacy(async () => {
      const boardId = await seedBoard();
      const body = createBody();
      const id = (await create(boardId, body)).json.approvalRequestId;
      const approved = await answer(boardId, id, 'usr_apr_owner', { option: 'allow_once', subject: { id: body.subject.id, digest: body.subject.digest } });
      expect(approved.status).toBe(200);
      expect(await approved.json()).toMatchObject({ approvalRequest: { state: 'approved', option: 'allow_once' } });
      expect(await readBack(boardId, id)).toMatchObject({
        state: 'approved',
        option: 'allow_once',
        decidedBy: { principalId: 'usr_apr_owner', label: 'Person owner' },
        decidedAt: expect.any(String),
      });
      // Decided once.
      const twice = await answer(boardId, id, 'usr_apr_admin', { option: 'deny' });
      expect(twice.status).toBe(409);
      expect(await twice.json()).toMatchObject({ error: { code: 'ELICITATION_NOT_PENDING' } });
    });
  });

  it('refuses approval from a member (WORKSPACE_ADMIN_REQUIRED), and lets a member deny', async () => {
    await legacy(async () => {
      const boardId = await seedBoard();
      const body = createBody();
      const id = (await create(boardId, body)).json.approvalRequestId;
      const binding = { id: body.subject.id, digest: body.subject.digest };
      const byMember = await answer(boardId, id, 'usr_apr_member', { option: 'allow_once', subject: binding });
      expect(byMember.status).toBe(403);
      expect(await byMember.json()).toMatchObject({ error: { code: 'WORKSPACE_ADMIN_REQUIRED' } });
      // A viewer may not answer at all.
      expect((await answer(boardId, id, 'usr_apr_viewer', { option: 'deny' })).status).toBe(403);
      expect((await readBack(boardId, id)).state).toBe('pending');

      const denied = await answer(boardId, id, 'usr_apr_member', { option: 'deny' });
      expect(denied.status).toBe(200);
      expect(await readBack(boardId, id)).toMatchObject({ state: 'denied', option: 'deny', decidedBy: { principalId: 'usr_apr_member' } });
    });
  });

  it('refuses an approval without the binding, with a different one, and an option never offered', async () => {
    await legacy(async () => {
      const boardId = await seedBoard();
      const body = createBody();
      const id = (await create(boardId, body)).json.approvalRequestId;
      const cases: Array<[Record<string, unknown>, string]> = [
        [{ option: 'allow_once' }, 'APPROVAL_SUBJECT_MISMATCH'],
        [{ option: 'allow_once', subject: { id: body.subject.id, digest: 'sha256:other' } }, 'APPROVAL_SUBJECT_MISMATCH'],
        [{ option: 'allow_once', subject: { id: 'stk_other', digest: body.subject.digest } }, 'APPROVAL_SUBJECT_MISMATCH'],
        [{ option: 'deny', subject: { id: 'stk_other', digest: body.subject.digest } }, 'APPROVAL_SUBJECT_MISMATCH'],
        [{ option: 'always' }, 'INVALID_ANSWER'],
        [{}, 'INVALID_ANSWER'],
      ];
      for (const [ans, code] of cases) {
        const res = await answer(boardId, id, 'usr_apr_admin', ans);
        expect(await res.json()).toMatchObject({ error: { code } });
      }
      expect((await readBack(boardId, id)).state).toBe('pending');
    });
  });

  it('takes no answer after expiry, and reads back as expired', async () => {
    await legacy(async () => {
      const boardId = await seedBoard();
      const body = createBody({ subject: subject({ expires_at: new Date(Date.now() + 1500).toISOString() }) });
      const id = (await create(boardId, body)).json.approvalRequestId;
      await new Promise((resolve) => setTimeout(resolve, 1600));
      const refused = await answer(boardId, id, 'usr_apr_owner', { option: 'allow_once', subject: { id: body.subject.id, digest: body.subject.digest } });
      expect(refused.status).toBe(409);
      expect(await refused.json()).toMatchObject({ error: { code: 'DECISION_EXPIRED' } });
      expect(await readBack(boardId, id)).toMatchObject({ state: 'expired', option: null, decidedBy: null });
      expect(await boardStub(env, TENANT, boardId).pendingElicitationDeliveries({ approvalRequests: true })).toEqual([]);
    });
  });

  it('refuses the requesting principal answering its own request', async () => {
    await legacy(async () => {
      const boardId = await seedBoard();
      const id = String((await create(boardId)).json.approvalRequestId);
      const refused = await boardStub(env, TENANT, boardId).answerApprovalRequest({
        approvalRequestId: id,
        decider: { id: BROKER, principalId: BROKER, label: 'Broker' },
        answererRole: 'owner',
        option: 'deny',
      });
      expect(refused).toMatchObject({ ok: false, code: 'SEPARATION_OF_DUTIES' });
    });
  });
});

describe('on the Organization plane, the Accounts workspace role decides', () => {
  const PLANE_ORG = 'org_0000000000000000ab03';
  const human = (sub: string, email: string, orgRole?: string) => planeToken({ sub, email, org: PLANE_ORG, ...(orgRole ? { orgRole } : {}) });

  it('refuses approval from the local owner whom Accounts calls a member, and takes it from an Accounts admin', async () => {
    await withOrgPlane(async () => {
      const tenantId = await ensureOrgTenant(env.DB, PLANE_ORG);
      const boardId = await seedBoard(tenantId);
      const svc = await planeToken({ sub: SERVICE, principalKind: 'service', org: PLANE_ORG, scope: 'approval-requests:write', email: undefined, email_verified: undefined });
      const body = createBody();
      const res = await call('POST', `/v1/boards/${boardId}/approval-requests`, bearer(svc), body);
      expect(res.status).toBe(201);
      const id = textOf(await res.json(), 'approvalRequestId');
      const binding = { id: body.subject.id, digest: body.subject.digest };
      const path = `/v1/boards/${boardId}/elicitations/${id}/answer`;

      // The first person to reach the fresh tenant is its local owner; Accounts says member.
      const first = await call('POST', path, bearer(await human('prn_0000000000000000ab01', 'first@example.com', 'member')), { option: 'allow_once', subject: binding });
      expect(first.status).toBe(403);
      expect(await first.json()).toMatchObject({ error: { code: 'WORKSPACE_ADMIN_REQUIRED' } });
      expect(await env.DB.prepare(`SELECT m.role FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.tenant_id = ? AND u.email = ?`).bind(tenantId, 'first@example.com').first('role')).toBe('owner');
      // A token naming no role is a member too.
      expect((await call('POST', path, bearer(await human('prn_0000000000000000ab02', 'norole@example.com')), { option: 'allow_once', subject: binding })).status).toBe(403);

      const admin = await call('POST', path, bearer(await human('prn_0000000000000000ab04', 'admin@example.com', 'admin')), { option: 'allow_once', subject: binding });
      expect(admin.status).toBe(200);
      expect(await admin.json()).toMatchObject({ approvalRequest: { state: 'approved', option: 'allow_once' } });
    });
  });
});
