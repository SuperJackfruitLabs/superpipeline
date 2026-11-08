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
import { recordBoard } from '../src/db/catalog';
import { newId } from '../src/ids';
import { PREVIEW_TEXT_MAX } from '../src/approval-subject-kinds/kind';
import { withIssuer } from './helpers/hub-issuer';

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
  new SignJWT({ sub: BROKER, principalKind: 'service', tenant: FLEET, mayDispatch: [], mayGrantReach: false, scope: 'approvals:write', ...over })
    .setProtectedHeader({ alg: 'EdDSA', kid: 'ar-kid' })
    .setIssuedAt().setIssuer(ISSUER).setAudience([ISSUER, PLANE]).setExpirationTime('5m')
    .sign(signingKey);
const reader = () => service({ sub: READER, scope: 'approvals:read' });

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
  await board.registerPushConfig({ agentId: 'agt_bridge', url: HOOK, token: 's', events: ['elicitation.pending'] });
  await recordBoard(env.DB, tenant, { id: boardId, name: 'Broker board', stagesJson: JSON.stringify(STAGES) });
  return boardId;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
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

  it('creates only on approvals:write, reads on approvals:read or write, and never across workspaces', async () => {
    await legacy(async () => {
      const boardId = await seedBoard();
      const created = await create(boardId);
      const path = `/v1/boards/${boardId}/approval-requests`;
      expect((await call('POST', path, bearer(await service({ scope: 'approvals:read' })), createBody())).status).toBe(403);
      expect((await call('POST', path, bearer(await service({ scope: 'cards:read' })), createBody())).status).toBe(403);
      expect((await call('GET', `${path}/${String(created.json.approvalRequestId)}`, bearer(await service({ scope: 'cards:read' })))).status).toBe(403);
      expect((await call('GET', `${path}/${String(created.json.approvalRequestId)}`, bearer(await service()))).status).toBe(200);
      expect((await call('GET', `${path}/apr_0000000000000000`, bearer(await reader()))).status).toBe(404);
      // Another workspace's service sees no such board.
      const foreign = await call('GET', `${path}/${String(created.json.approvalRequestId)}`, bearer(await service({ tenant: OTHER_FLEET, scope: 'approvals:read' })));
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
      const pushed = (await board.getPushDeliveries()).map((d) => JSON.parse(d.body));
      expect(pushed).toEqual([expected]);

      const pending = await call('GET', `/v1/boards/${boardId}/elicitations/pending`, person('usr_apr_member'));
      expect(await pending.json()).toEqual({ elicitations: [expected] });

      // A replay does not push it again.
      await create(boardId, body);
      expect(await board.getPushDeliveries()).toHaveLength(1);

      expect((await answer(boardId, id, 'usr_apr_admin', { option: 'deny' })).status).toBe(200);
      const after = await call('GET', `/v1/boards/${boardId}/elicitations/pending`, person('usr_apr_member'));
      expect(await after.json()).toEqual({ elicitations: [] });
    });
  });

  it('marks a preview cut to its bounds as incomplete', async () => {
    await legacy(async () => {
      const boardId = await seedBoard();
      await create(boardId, createBody({ subject: subject({ preview: [{ type: 'text', text: 'a'.repeat(PREVIEW_TEXT_MAX + 1) }] }) }));
      const [body] = await boardStub(env, TENANT, boardId).pendingElicitationDeliveries();
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
      expect(await boardStub(env, TENANT, boardId).pendingElicitationDeliveries()).toEqual([]);
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
