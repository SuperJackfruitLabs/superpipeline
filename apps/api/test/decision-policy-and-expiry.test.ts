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
import { env, SELF } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { __resetJwksCacheForTests } from '../src/auth/hub-jwt';
import { ensureOrgTenant } from '../src/auth/org-tenancy';
import type { BoardInit, StageDef } from '../src/board/board-do';
import { boardStub as stubFor } from '../src/board/stub';
import { recordBoard } from '../src/db/catalog';
import { newId } from '../src/ids';
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
