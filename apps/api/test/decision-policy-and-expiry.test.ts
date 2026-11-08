/**
 * Charter: unanswered decisions remind, then escalate (decisions/2026-11-08), decisions 6 and 7.
 *
 * 6. Only a workspace owner or admin — by the Accounts workspace role on the Organization plane,
 *    by the local membership without it — changes a stage's decision policy: its gate, approval
 *    subject schema or deciders. A member keeps every other stage edit. "Always allow" is judged
 *    by the same role.
 * 7. An approval subject that expired closes its gate as `expired` (resolved, no decider), so the
 *    gate neither records a stale approval nor waits forever; an owed manual delivery whose subject
 *    expired ends visibly on the card.
 */
import { env, runInDurableObject, SELF } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { __resetJwksCacheForTests } from '../src/auth/hub-jwt';
import { ensureOrgTenant } from '../src/auth/org-tenancy';
import type { BoardDO, BoardInit, StageDef } from '../src/board/board-do';
import { boardStub as stubFor } from '../src/board/stub';
import { internalStageEditor } from '../src/board/model';
import { recordBoard } from '../src/db/catalog';
import { newId } from '../src/ids';
import { addBoundCard, boardStub, boundDecision, DECIDER, payload, STAGES } from './approval-subject-fixtures';
import { planeToken, withOrgPlane } from './helpers/org-plane';

const TENANT = 'tnt_decision_policy';
const POLICY_STAGES: BoardInit['stages'] = [
  { key: 'draft', name: 'Draft', order: 0, ownerKind: 'capability', owner: 'writing' },
  { key: 'review', name: 'Review', order: 1, ownerKind: 'human', gate: 'approval' },
  { key: 'done', name: 'Done', order: 2, ownerKind: 'human' },
];

beforeAll(async () => {
  await env.DB.prepare(`INSERT OR IGNORE INTO tenants (id, slug, name) VALUES (?, ?, 'Policy')`).bind(TENANT, 'slug-decision-policy').run();
  for (const [user, role] of [['usr_dp_admin', 'admin'], ['usr_dp_member', 'member']] as const) {
    await env.DB.prepare(`INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)`).bind(user, `${user}@example.test`, user).run();
    await env.DB.prepare(`INSERT OR IGNORE INTO memberships (id, tenant_id, user_id, role) VALUES (?, ?, ?, ?)`).bind(newId('mem'), TENANT, user, role).run();
  }
});
beforeEach(() => __resetJwksCacheForTests());

const call = (method: string, path: string, headers: Record<string, string>, body?: unknown) =>
  SELF.fetch(`https://api.test${path}`, { method, headers: { 'content-type': 'application/json', ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const person = (userId: string) => ({ 'X-Tenant-Id': TENANT, 'X-User-Id': userId });
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

async function seedBoard(tenantId: string): Promise<string> {
  const boardId = newId('brd');
  await stubFor(env, tenantId, boardId).init({ id: boardId, tenantId, name: 'Policy board', stages: POLICY_STAGES });
  await recordBoard(env.DB, tenantId, { id: boardId, name: 'Policy board', stagesJson: JSON.stringify(POLICY_STAGES) });
  return boardId;
}

async function stagesOf(tenantId: string, boardId: string): Promise<StageDef[]> {
  return (await stubFor(env, tenantId, boardId).getState()).stages;
}

describe('decision 6: a stage\'s decision policy is a workspace admin\'s to change', () => {
  it('refuses a member changing a stage gate, and keeps the member\'s other stage edits', async () => {
    const boardId = await seedBoard(TENANT);
    const refused = await call('PATCH', `/v1/boards/${boardId}/stages/review`, person('usr_dp_member'), { gate: 'none' });
    expect(refused.status).toBe(403);
    expect(await refused.json()).toMatchObject({ error: { code: 'WORKSPACE_ADMIN_REQUIRED' } });
    // Opening a gate where there was none is a policy change too.
    const opening = await call('PATCH', `/v1/boards/${boardId}/stages/draft`, person('usr_dp_member'), { gate: 'approval' });
    expect(opening.status).toBe(403);
    expect((await stagesOf(TENANT, boardId)).map((s) => s.gate ?? 'none')).toEqual(['none', 'approval', 'none']);

    // Restating the gate it already has, beside a rename and a WIP limit, changes no policy.
    const edited = await call('PATCH', `/v1/boards/${boardId}/stages/review`, person('usr_dp_member'), { name: 'Editor review', wipLimit: 3, gate: 'approval' });
    expect(edited.status).toBe(200);
    expect((await stagesOf(TENANT, boardId))[1]).toMatchObject({ name: 'Editor review', wipLimit: 3, gate: 'approval' });

    const byAdmin = await call('PATCH', `/v1/boards/${boardId}/stages/review`, person('usr_dp_admin'), { gate: 'none' });
    expect(byAdmin.status).toBe(200);
    expect((await stagesOf(TENANT, boardId))[1]?.gate).toBe('none');
  });

  it('lets only a workspace admin create a board whose stages name deciders; a plain gate is anyone\'s who may create', async () => {
    const DECIDING: BoardInit['stages'] = [
      { key: 'draft', name: 'Draft', order: 0, ownerKind: 'capability', owner: 'writing' },
      { key: 'approve', name: 'Approve', order: 1, ownerKind: 'human', gate: 'approval', approvalSubjectSchema: 'social-publish/v1', approvalDeciderPrincipalIds: ['usr_dp_member'] },
    ];
    const ORG = 'org_0000000000000000d003';
    await withOrgPlane(async () => {
      await ensureOrgTenant(env.DB, ORG);
      const human = (sub: string, email: string, orgRole: string) => planeToken({ sub, email, org: ORG, orgRole });
      // The fresh tenant's first visitor: a local owner (so `manage` admits them) whom Accounts calls a member.
      const member = bearer(await human('prn_0000000000000000d005', 'first-create@example.com', 'member'));
      const refused = await call('POST', '/v1/boards', member, { name: 'Publishing', stages: DECIDING });
      expect(refused.status).toBe(403);
      expect(await refused.json()).toMatchObject({ error: { code: 'WORKSPACE_ADMIN_REQUIRED' } });
      expect((await call('POST', '/v1/boards', member, { name: 'Reviewed', stages: POLICY_STAGES })).status).toBe(201);
    });
    // Without the plane, a local admin may.
    expect((await call('POST', '/v1/boards', person('usr_dp_admin'), { name: 'Publishing', stages: DECIDING })).status).toBe(201);
  });

  it('every stage write names its editor: a person the route judged, or an internal caller that says why', async () => {
    const boardId = await seedBoard(TENANT);
    const board = stubFor(env, TENANT, boardId);
    const ungate = { gate: 'none' as const };
    expect(await board.updateStage('review', ungate, { kind: 'person', mayChangeDecisionPolicy: false })).toMatchObject({ ok: false, code: 'WORKSPACE_ADMIN_REQUIRED' });
    expect(await board.setStages(POLICY_STAGES.map((s) => ({ ...s, gate: 'none' as const })), { kind: 'person', mayChangeDecisionPolicy: false })).toMatchObject({ ok: false, code: 'WORKSPACE_ADMIN_REQUIRED' });
    expect(await board.updateStage('review', ungate, internalStageEditor('test: a trusted caller'))).toMatchObject({ ok: true });
    // A caller that forgets its editor does not compile, so no call site skips the check by omission.
    // Never run; pinned for `pnpm typecheck`, which fails if either line stops being an error.
    const forgets = () => {
      // @ts-expect-error the editor is required
      void board.updateStage('review', ungate);
      // @ts-expect-error the editor is required
      void board.setStages(POLICY_STAGES);
    };
    expect(typeof forgets).toBe('function');
  });

  it('on the Organization plane, judges by the Accounts role: a local owner whom Accounts calls a member is refused', async () => {
    const ORG = 'org_0000000000000000d001';
    await withOrgPlane(async () => {
      const tenantId = await ensureOrgTenant(env.DB, ORG);
      const boardId = await seedBoard(tenantId);
      const human = (sub: string, email: string, orgRole?: string) => planeToken({ sub, email, org: ORG, ...(orgRole ? { orgRole } : {}) });
      const member = bearer(await human('prn_0000000000000000d001', 'first-dp@example.com', 'member'));

      // The whole-pipeline write: `manage` admits the local owner; the gate change is refused.
      const current = await stagesOf(tenantId, boardId);
      const ungated = current.map((s) => (s.key === 'review' ? { ...s, gate: 'none' as const } : s));
      const put = await call('PUT', `/v1/boards/${boardId}/stages`, member, { stages: ungated });
      expect(put.status).toBe(403);
      expect(await put.json()).toMatchObject({ error: { code: 'WORKSPACE_ADMIN_REQUIRED' } });
      expect(await env.DB.prepare(`SELECT m.role FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.tenant_id = ? AND u.email = ?`).bind(tenantId, 'first-dp@example.com').first('role')).toBe('owner');
      // Adding a gated stage, and removing one, are policy changes as well.
      const added = [...current, { key: 'check', name: 'Check', order: 3, ownerKind: 'human' as const, gate: 'approval' as const }];
      expect((await call('PUT', `/v1/boards/${boardId}/stages`, member, { stages: added })).status).toBe(403);
      expect((await call('PUT', `/v1/boards/${boardId}/stages`, member, { stages: current.filter((s) => s.key !== 'review') })).status).toBe(403);
      // A rename through the same write is not.
      const renamed = current.map((s) => (s.key === 'done' ? { ...s, name: 'Shipped' } : s));
      expect((await call('PUT', `/v1/boards/${boardId}/stages`, member, { stages: renamed })).status).toBe(200);
      expect((await call('PATCH', `/v1/boards/${boardId}/stages/review`, member, { gate: 'none' })).status).toBe(403);

      const admin = bearer(await human('prn_0000000000000000d002', 'admin-dp@example.com', 'admin'));
      // An Accounts admin is a local member here (the second visitor): the stage PATCH, a `work`
      // route, lets them change the gate; the whole-pipeline PUT stays `manage` by the local role.
      const byAdmin = await call('PATCH', `/v1/boards/${boardId}/stages/review`, admin, { gate: 'none' });
      expect(byAdmin.status).toBe(200);
      expect((await stagesOf(tenantId, boardId)).find((s) => s.key === 'review')?.gate).toBe('none');
    });
  });

  it('on the Organization plane, "Always allow" is judged by the Accounts role too', async () => {
    const ORG = 'org_0000000000000000d002';
    await withOrgPlane(async () => {
      const tenantId = await ensureOrgTenant(env.DB, ORG);
      const boardId = await seedBoard(tenantId);
      const board = stubFor(env, tenantId, boardId);
      const card = await board.createCard({ title: 'Write a file', ownerUserId: 'usr_owner' });
      if (!card.ok) throw new Error(card.message);
      const claim = await board.claim({ agentId: 'agt_dp_writer', capabilities: ['writing'] });
      if (!claim.claimed) throw new Error('not claimable');
      const asked = await board.postActivity({
        runId: claim.runId, leaseEpoch: claim.leaseEpoch, type: 'elicitation', body: 'Write it?', signal: 'select',
        parameter: { options: [{ name: 'approve', title: 'Approve once' }, { name: 'always', title: 'Always allow', requires: 'workspace-admin' }] },
      });
      expect(asked.ok).toBe(true);
      const elicitationId = (await board.getState()).elicitations[0]?.id;
      if (!elicitationId) throw new Error('no question');
      const path = `/v1/boards/${boardId}/elicitations/${elicitationId}/answer`;
      const human = (sub: string, email: string, orgRole: string) => planeToken({ sub, email, org: ORG, orgRole });

      // The first visitor is the fresh tenant's local owner; Accounts says member.
      const refused = await call('POST', path, bearer(await human('prn_0000000000000000d003', 'first-always@example.com', 'member')), { option: 'always' });
      expect(refused.status).toBe(403);
      expect(await refused.json()).toMatchObject({ error: { code: 'WORKSPACE_ADMIN_REQUIRED' } });
      const accepted = await call('POST', path, bearer(await human('prn_0000000000000000d004', 'admin-always@example.com', 'admin')), { option: 'always' });
      expect(accepted.status).toBe(200);
    });
  });
});

describe('decision 7: an expired subject closes its gate', () => {
  it('refuses an approval after the subject expired, and closes the gate as expired, settled for the hub', async () => {
    await runInDurableObject(boardStub('dx-refuse'), async (board: BoardDO, state) => {
      await board.init({ id: 'brd_dx_refuse', tenantId: 'tnt_fixture', name: 'Fixture board', stages: STAGES });
      const opened = await addBoundCard(board, state, { publicationPayload: payload('2020-01-01T00:00:00Z') });

      const refused = await board.resolveGate(boundDecision(opened.gate, opened.subject, DECIDER, 'approve_automatic'));
      expect(refused).toMatchObject({ ok: false, code: 'DECISION_EXPIRED' });

      // What the hub reads: gone from the pending list, and one gate resolved `expired` with no decider.
      expect((await board.pendingGateDeliveries()).map((g) => g.gateId)).not.toContain(opened.gate.id);
      const read = await board.getGate(opened.gate.id);
      expect(read).toMatchObject({ ok: true, value: { status: 'resolved', decision: 'expired', decidedBy: null, resolvedAt: expect.any(String) } });
      // Nothing was approved, and the bytes can no longer be.
      expect(state.storage.sql.exec(`SELECT COUNT(*) AS n FROM approval_delivery_events WHERE gate_id = ?`, opened.gate.id).one().n).toBe(0);
      expect(state.storage.sql.exec(`SELECT status, invalidation_reason FROM approval_subjects WHERE id = ?`, opened.subject.id).one()).toMatchObject({ status: 'invalidated', invalidation_reason: 'gate.expired' });
      // The card stays, says why, and its history keeps the outcome.
      const card = await board.getCardView(opened.cardId);
      expect(card).toMatchObject({ ok: true, value: { state: 'input-required', currentStageKey: 'approve', needsHuman: { reason: 'blocked' } } });
      expect((await board.getCardActivities(opened.cardId)).gates).toEqual([expect.objectContaining({ id: opened.gate.id, decision: 'expired' })]);

      const again = await board.resolveGate(boundDecision(opened.gate, opened.subject, DECIDER, 'reject'));
      expect(again).toMatchObject({ ok: false, code: 'GATE_NOT_PENDING', detail: { reason: 'expired' } });
    });
  });

  it('still takes a rejection of an expired subject before the gate is closed: rejecting binds nothing', async () => {
    await runInDurableObject(boardStub('dx-reject'), async (board: BoardDO, state) => {
      await board.init({ id: 'brd_dx_reject', tenantId: 'tnt_fixture', name: 'Fixture board', stages: STAGES });
      const opened = await addBoundCard(board, state, { publicationPayload: payload('2020-01-01T00:00:00Z') });
      const rejected = await board.resolveGate(boundDecision(opened.gate, opened.subject, DECIDER, 'reject'));
      expect(rejected.ok).toBe(true);
      expect(await board.getGate(opened.gate.id)).toMatchObject({ value: { status: 'resolved', decision: 'reject' } });
    });
  });

  it('closes a pending gate in the sweep once its subject expires, once, and leaves a live one alone', async () => {
    await runInDurableObject(boardStub('dx-sweep'), async (board: BoardDO, state) => {
      await board.init({ id: 'brd_dx_sweep', tenantId: 'tnt_fixture', name: 'Fixture board', stages: STAGES });
      const lapsing = await addBoundCard(board, state); // expires 2030-01-02T03:04:05Z
      const live = await addBoundCard(board, state, { publicationPayload: payload('2040-01-01T00:00:00Z') });

      expect(await board.sweepBoard('2029-12-31T00:00:00.000Z')).toMatchObject({ gatesExpired: 0 });
      expect(await board.getGate(lapsing.gate.id)).toMatchObject({ value: { status: 'pending' } });

      expect(await board.sweepBoard('2030-06-01T00:00:00.000Z')).toMatchObject({ gatesExpired: 1 });
      expect(await board.getGate(lapsing.gate.id)).toMatchObject({ value: { status: 'resolved', decision: 'expired', decidedBy: null } });
      expect(await board.getGate(live.gate.id)).toMatchObject({ value: { status: 'pending' } });
      expect((await board.pendingGateDeliveries()).map((g) => g.gateId)).toEqual([live.gate.id]);
      expect((await board.getNotifications()).map((n) => n.body)).toContainEqual(expect.stringContaining('expired before anyone decided'));
      const events = await board.getEvents(200);
      expect(events.filter((e) => e.type === 'gate.resolved').map((e) => e.payload)).toContainEqual({ gateId: lapsing.gate.id, cardId: lapsing.cardId, decision: 'expired', decidedBy: null });

      expect(await board.sweepBoard('2030-06-01T00:05:00.000Z')).toMatchObject({ gatesExpired: 0 });
    });
  });

  it('ends an owed manual delivery whose approval expired, visibly and once', async () => {
    await runInDurableObject(boardStub('dx-delivery'), async (board: BoardDO, state) => {
      await board.init({ id: 'brd_dx_delivery', tenantId: 'tnt_fixture', name: 'Fixture board', stages: STAGES });
      const opened = await addBoundCard(board, state); // expires 2030-01-02T03:04:05Z
      expect((await board.resolveGate(boundDecision(opened.gate, opened.subject, DECIDER, 'approve_manual'))).ok).toBe(true);

      expect(await board.sweepBoard('2029-12-31T00:00:00.000Z')).toMatchObject({ deliveriesExpired: 0 });
      expect(await board.sweepBoard('2030-06-01T00:00:00.000Z')).toMatchObject({ deliveriesExpired: 1 });
      const recorded = state.storage.sql.exec(`SELECT event, actor FROM approval_delivery_events WHERE gate_id = ? ORDER BY created_at, rowid`, opened.gate.id).toArray();
      expect(recorded.map((r) => r.event)).toEqual(['approved', 'expired']);
      expect(await board.getCardView(opened.cardId)).toMatchObject({ value: { needsHuman: { reason: 'blocked', detail: expect.stringContaining('expired before a live link') } } });
      expect((await board.getNotifications()).map((n) => n.kind)).toContain('approval-delivery-expired');

      expect(await board.sweepBoard('2030-06-01T00:05:00.000Z')).toMatchObject({ deliveriesExpired: 0 });
    });
  });
});
