/**
 * Charter: unanswered decisions remind, then escalate (decisions/2026-11-08), decisions 1, 2, 4, 5.
 *
 * A stage may declare `timeout: { remindAfterMinutes?, escalateAfterMinutes? }`, and a board a
 * default. A decision that starts waiting on the stage records its deadlines; every pending push
 * and read carries them as `deadline`. The board sweep reminds once, then escalates once
 * (`decision.reminded`, `decision.escalated`), and never decides anything.
 */
import { env, runInDurableObject, SELF } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { __resetJwksCacheForTests } from '../src/auth/hub-jwt';
import type { BoardDO, BoardInit } from '../src/board/board-do';
import { boardStub as stubFor } from '../src/board/stub';
import { recordBoard } from '../src/db/catalog';
import { newId } from '../src/ids';
import { ensureOrgTenant } from '../src/auth/org-tenancy';
import { planeToken, withOrgPlane } from './helpers/org-plane';
import { addBoundCard, boardStub, boundDecision, DECIDER, STAGES as BOUND_STAGES } from './approval-subject-fixtures';

const HOOK = 'https://hub.example/api/bridge/superpipeline/push';
const EVENTS = ['gate.pending', 'elicitation.pending', 'delivery.pending', 'attention.pending', 'decision.reminded', 'decision.escalated'];
const TIMEOUT = { remindAfterMinutes: 60, escalateAfterMinutes: 240 };
const STAGES: BoardInit['stages'] = [
  { key: 'plan', name: 'Plan', order: 0, ownerKind: 'capability', owner: 'plan' },
  { key: 'build', name: 'Build', order: 1, ownerKind: 'capability', owner: 'build' },
  { key: 'review', name: 'Review', order: 2, ownerKind: 'human', gate: 'approval', timeout: TIMEOUT },
  { key: 'done', name: 'Done', order: 3, ownerKind: 'human' },
];
const PLANNER = { agentId: 'agt_p', capabilities: ['plan'] };
const BUILDER = { agentId: 'agt_b', capabilities: ['build'] };

beforeEach(() => __resetJwksCacheForTests());

const plus = (iso: string, minutes: number) => new Date(Date.parse(iso) + minutes * 60_000).toISOString();

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

async function pushes(b: BoardDO, event: string): Promise<Record<string, unknown>[]> {
  const bodies: unknown[] = (await b.getPushDeliveries()).map((d) => JSON.parse(d.body));
  return bodies.filter(isRecord).filter((x) => x.event === event);
}

function text(v: unknown, key: string): string {
  const at = isRecord(v) ? v[key] : undefined;
  if (typeof at !== 'string') throw new Error(`expected a string at ${key}`);
  return at;
}

async function setUp(b: BoardDO, id: string, stages = STAGES): Promise<string> {
  await b.init({ id, tenantId: 'tnt_timeouts', name: 'Timeout board', stages });
  await b.registerPushConfig({ agentId: 'agt_bridge', url: HOOK, token: 's', events: EVENTS });
  const created = await b.createCard({ title: 'Add login', ownerUserId: 'usr_owner' });
  if (!created.ok) throw new Error(created.message);
  return created.value.id;
}

/** Plan, then build, done: the card reaches the review gate. */
async function toReview(b: BoardDO): Promise<void> {
  for (const agent of [PLANNER, BUILDER]) {
    const c = await b.claim(agent);
    if (!c.claimed) throw new Error(`expected a claim for ${agent.agentId}`);
    const done = await b.complete({ runId: c.runId, leaseEpoch: c.leaseEpoch, handoff: { note: agent.agentId } });
    if (!done.ok) throw new Error(done.message);
  }
}

describe('a gate waits with deadlines, is reminded once, then escalated once, and nothing is decided', () => {
  it('records the deadlines, carries them on the push and the read, and acts once per deadline', async () => {
    await runInDurableObject(boardStub('dt-gate'), async (b: BoardDO) => {
      const cardId = await setUp(b, 'brd_dt_gate');
      await toReview(b);
      const [opened] = await pushes(b, 'gate.pending');
      const since = text(opened, 'ts');
      const deadline = { remindAt: plus(since, 60), escalateAt: plus(since, 240) };
      expect(opened).toMatchObject({ deadline });
      const gateId = text(opened, 'gateId');
      expect((await b.pendingGateDeliveries())[0]?.deadline).toEqual(deadline);

      expect(await b.sweepBoard(plus(since, 30))).toMatchObject({ decisionsReminded: 0, decisionsEscalated: 0 });
      expect(await b.sweepBoard(plus(since, 61))).toMatchObject({ decisionsReminded: 1, decisionsEscalated: 0 });
      const [reminded] = await pushes(b, 'decision.reminded');
      expect(reminded).toEqual({
        event: 'decision.reminded',
        boardId: 'brd_dt_gate',
        boardName: 'Timeout board',
        cardId,
        cardTitle: 'Add login',
        stageKey: 'review',
        stageName: 'Review',
        decisionKind: 'gate',
        decisionId: gateId,
        waitingSince: since,
        remindedAt: plus(since, 61),
        ts: plus(since, 61),
      });
      expect((await b.getNotifications()).map((n) => n.kind)).toContain('decision-reminder');
      expect(await b.sweepBoard(plus(since, 62))).toMatchObject({ decisionsReminded: 0, decisionsEscalated: 0 });

      const before = await b.getCardView(cardId);
      expect(await b.sweepBoard(plus(since, 241))).toMatchObject({ decisionsReminded: 0, decisionsEscalated: 1 });
      const escalations = await pushes(b, 'decision.escalated');
      expect(escalations).toEqual([
        {
          event: 'decision.escalated',
          boardId: 'brd_dt_gate',
          boardName: 'Timeout board',
          cardId,
          cardTitle: 'Add login',
          stageKey: 'review',
          stageName: 'Review',
          decisionKind: 'gate',
          decisionId: gateId,
          waitingSince: since,
          escalatedAt: plus(since, 241),
          ts: plus(since, 241),
        },
      ]);
      // Decision 4: a passed escalate deadline decides nothing.
      expect(await b.getGate(gateId)).toMatchObject({ ok: true, value: { status: 'pending', decision: null } });
      const after = await b.getCardView(cardId);
      expect(after.ok && before.ok && { state: after.value.state, stage: after.value.currentStageKey }).toEqual({ state: 'input-required', stage: 'review' });
      expect((await b.pendingGateDeliveries()).map((g) => g.gateId)).toEqual([gateId]);

      expect(await b.sweepBoard(plus(since, 600))).toMatchObject({ decisionsReminded: 0, decisionsEscalated: 0 });
      expect(await pushes(b, 'decision.escalated')).toHaveLength(1);
    });
  });

  it('claims each deadline as it acts, so a wait picked up again does not escalate twice', async () => {
    await runInDurableObject(boardStub('dt-claim'), async (b: BoardDO, state) => {
      await setUp(b, 'brd_dt_claim');
      await toReview(b);
      const since = text((await pushes(b, 'gate.pending'))[0], 'ts');
      expect(await b.sweepBoard(plus(since, 241))).toMatchObject({ decisionsReminded: 1, decisionsEscalated: 1 });
      // As if a second sweep had read the row before the first one's reminder was recorded.
      state.storage.sql.exec(`UPDATE decision_waits SET reminded_at = NULL`);
      expect(await b.sweepBoard(plus(since, 242))).toMatchObject({ decisionsReminded: 1, decisionsEscalated: 0 });
      expect(await pushes(b, 'decision.escalated')).toHaveLength(1);
    });
  });

  it('carries no deadline, and records no wait, when neither the stage nor the board sets a timeout', async () => {
    await runInDurableObject(boardStub('dt-none'), async (b: BoardDO, state) => {
      await setUp(b, 'brd_dt_none', STAGES.map(({ timeout: _unused, ...s }) => s));
      await toReview(b);
      const [opened] = await pushes(b, 'gate.pending');
      expect(opened).not.toHaveProperty('deadline');
      expect(state.storage.sql.exec(`SELECT COUNT(*) AS n FROM decision_waits`).one().n).toBe(0);
    });
  });

  it('does not remind about a gate decided before its deadline, and a new gate starts its own clock', async () => {
    await runInDurableObject(boardStub('dt-closed'), async (b: BoardDO) => {
      await setUp(b, 'brd_dt_closed');
      await toReview(b);
      const [first] = await pushes(b, 'gate.pending');
      const since = text(first, 'ts');
      expect((await b.resolveGate({ gateId: text(first, 'gateId'), decision: 'request_changes', decidedBy: 'usr_reviewer', comment: 'again' })).ok).toBe(true);
      expect(await b.sweepBoard(plus(since, 61))).toMatchObject({ decisionsReminded: 0 });

      const rework = await b.claim(BUILDER);
      if (!rework.claimed) throw new Error('expected the rework claim');
      await b.complete({ runId: rework.runId, leaseEpoch: rework.leaseEpoch, handoff: { note: 'fixed' } });
      const second = (await pushes(b, 'gate.pending')).find((p) => p.gateId !== first.gateId);
      const secondSince = text(second, 'ts');
      expect(second).toMatchObject({ deadline: { remindAt: plus(secondSince, 60), escalateAt: plus(secondSince, 240) } });
      expect(await b.sweepBoard(plus(secondSince, 61))).toMatchObject({ decisionsReminded: 1 });
      expect((await pushes(b, 'decision.reminded')).map((p) => p.decisionId)).toEqual([second?.gateId]);
    });
  });
});

describe('every kind of waiting decision', () => {
  it('a question on a stage without its own timeout takes the board default', async () => {
    await runInDurableObject(boardStub('dt-question'), async (b: BoardDO) => {
      await setUp(b, 'brd_dt_question');
      expect(await b.setDecisionTimeout({ escalateAfterMinutes: 30 })).toMatchObject({ ok: true, value: { decisionTimeout: { escalateAfterMinutes: 30 } } });
      expect((await b.getState()).decisionTimeout).toEqual({ escalateAfterMinutes: 30 });
      const c = await b.claim(PLANNER);
      if (!c.claimed) throw new Error('expected a claim');
      await b.postActivity({ runId: c.runId, leaseEpoch: c.leaseEpoch, type: 'elicitation', body: 'Which table?', signal: 'select', parameter: { options: [{ name: 'a', title: 'A' }] } });
      const [asked] = await pushes(b, 'elicitation.pending');
      const since = text(asked, 'ts');
      expect(asked).toMatchObject({ deadline: { escalateAt: plus(since, 30) } });
      expect(isRecord(asked) && isRecord(asked.deadline) && 'remindAt' in asked.deadline).toBe(false);
      expect((await b.pendingElicitationDeliveries())[0]?.deadline).toEqual({ escalateAt: plus(since, 30) });
      expect(await b.sweepBoard(plus(since, 31))).toMatchObject({ decisionsReminded: 0, decisionsEscalated: 1 });
      expect((await pushes(b, 'decision.escalated'))[0]).toMatchObject({ decisionKind: 'question', decisionId: text(asked, 'elicitationId'), stageKey: 'plan', stageName: 'Plan' });
      expect((await b.pendingElicitationDeliveries()).map((e) => e.elicitationId)).toEqual([text(asked, 'elicitationId')]);
    });
  });

  it('a waiting card is keyed by its wait id', async () => {
    await runInDurableObject(boardStub('dt-attention'), async (b: BoardDO) => {
      await setUp(b, 'brd_dt_attention', STAGES.map((s) => (s.key === 'build' ? { ...s, timeout: { remindAfterMinutes: 5 } } : s)));
      const p = await b.claim(PLANNER);
      if (!p.claimed) throw new Error('expected plan claim');
      await b.complete({ runId: p.runId, leaseEpoch: p.leaseEpoch, handoff: { plan: 'x' } });
      const c = await b.claim(BUILDER);
      if (!c.claimed) throw new Error('expected build claim');
      await b.block({ runId: c.runId, leaseEpoch: c.leaseEpoch, reason: 'the database is down' });
      const [waiting] = await pushes(b, 'attention.pending');
      const since = text(waiting, 'ts');
      expect(waiting).toMatchObject({ deadline: { remindAt: plus(since, 5) } });
      expect((await b.pendingAttention())[0]?.deadline).toEqual({ remindAt: plus(since, 5) });
      expect(await b.sweepBoard(plus(since, 6))).toMatchObject({ decisionsReminded: 1 });
      expect((await pushes(b, 'decision.reminded'))[0]).toMatchObject({ decisionKind: 'attention', decisionId: text(waiting, 'waitId'), stageKey: 'build' });
    });
  });

  it('a manual delivery follow-up is keyed by its gate', async () => {
    await runInDurableObject(boardStub('dt-delivery'), async (b: BoardDO, state) => {
      const stages = BOUND_STAGES.map((s) => (s.key === 'approve' ? { ...s, timeout: { remindAfterMinutes: 10, escalateAfterMinutes: 20 } } : s));
      await b.init({ id: 'brd_dt_delivery', tenantId: 'tnt_fixture', name: 'Fixture board', stages });
      await b.registerPushConfig({ agentId: 'agt_bridge', url: HOOK, token: 's', events: EVENTS });
      const opened = await addBoundCard(b, state);
      expect((await b.resolveGate(boundDecision(opened.gate, opened.subject, DECIDER, 'approve_manual'))).ok).toBe(true);
      const [owed] = await pushes(b, 'delivery.pending');
      const since = text(owed, 'ts');
      expect(owed).toMatchObject({ deadline: { remindAt: plus(since, 10), escalateAt: plus(since, 20) } });
      expect((await b.pendingDeliveryFollowUps())[0]?.deadline).toEqual({ remindAt: plus(since, 10), escalateAt: plus(since, 20) });
      // Both deadlines passed by one sweep: each acts, once.
      expect(await b.sweepBoard(plus(since, 21))).toMatchObject({ decisionsReminded: 1, decisionsEscalated: 1 });
      expect((await pushes(b, 'decision.escalated'))[0]).toMatchObject({ decisionKind: 'delivery', decisionId: opened.gate.id, stageKey: 'approve' });
      expect(state.storage.sql.exec(`SELECT reminded_at, escalated_at FROM decision_waits WHERE kind = 'delivery'`).one()).toEqual({ reminded_at: plus(since, 21), escalated_at: plus(since, 21) });
      // Still owed: the escalation recorded no link and changed no mode.
      expect((await b.pendingDeliveryFollowUps()).map((d) => d.gateId)).toEqual([opened.gate.id]);
    });
  });
});

describe('setting a timeout', () => {
  const TENANT = 'tnt_decision_timeouts';
  const person = (userId: string) => ({ 'X-Tenant-Id': TENANT, 'X-User-Id': userId, 'content-type': 'application/json' });
  const call = (method: string, path: string, userId: string, body: unknown) =>
    SELF.fetch(`https://api.test${path}`, { method, headers: person(userId), body: JSON.stringify(body) });

  beforeAll(async () => {
    await env.DB.prepare(`INSERT OR IGNORE INTO tenants (id, slug, name) VALUES (?, ?, 'T')`).bind(TENANT, 'slug-decision-timeouts').run();
    for (const [user, role] of [['usr_dt_admin', 'admin'], ['usr_dt_member', 'member']] as const) {
      await env.DB.prepare(`INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)`).bind(user, `${user}@example.test`, user).run();
      await env.DB.prepare(`INSERT OR IGNORE INTO memberships (id, tenant_id, user_id, role) VALUES (?, ?, ?, ?)`).bind(newId('mem'), TENANT, user, role).run();
    }
  });

  async function seed(): Promise<string> {
    const boardId = newId('brd');
    await stubFor(env, TENANT, boardId).init({ id: boardId, tenantId: TENANT, name: 'Settings', stages: STAGES });
    await recordBoard(env.DB, TENANT, { id: boardId, name: 'Settings', stagesJson: JSON.stringify(STAGES) });
    return boardId;
  }

  it('validates a stage timeout and lets only a workspace admin change it', async () => {
    const boardId = await seed();
    const path = `/v1/boards/${boardId}/stages/build`;
    for (const bad of [
      { remindAfterMinutes: 0 },
      { remindAfterMinutes: 1.5 },
      { escalateAfterMinutes: 30 * 24 * 60 + 1 },
      { remindAfterMinutes: 60, escalateAfterMinutes: 60 },
      {},
      { remindAfterMinutes: 5, after: 10 },
    ]) {
      const res = await call('PATCH', path, 'usr_dt_admin', { timeout: bad });
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: { code: 'INVALID_STAGES' } });
    }
    const byMember = await call('PATCH', path, 'usr_dt_member', { timeout: { remindAfterMinutes: 5 } });
    expect(byMember.status).toBe(403);
    expect(await byMember.json()).toMatchObject({ error: { code: 'WORKSPACE_ADMIN_REQUIRED' } });
    // A member's other edits to a stage with a timeout still go through.
    expect((await call('PATCH', `/v1/boards/${boardId}/stages/review`, 'usr_dt_member', { name: 'Final review' })).status).toBe(200);

    const set = await call('PATCH', path, 'usr_dt_admin', { timeout: { remindAfterMinutes: 5, escalateAfterMinutes: 30 * 24 * 60 } });
    expect(set.status).toBe(200);
    expect(await set.json()).toMatchObject({ stage: { key: 'build', timeout: { remindAfterMinutes: 5, escalateAfterMinutes: 43200 } } });
    expect((await call('PATCH', path, 'usr_dt_admin', { timeout: null })).status).toBe(200);
    expect((await stubFor(env, TENANT, boardId).getState()).stages.find((s) => s.key === 'build')).not.toHaveProperty('timeout');
  });

  it('sets the board default: manage, a workspace admin, validated, and null clears it', async () => {
    const boardId = await seed();
    const path = `/v1/boards/${boardId}/decision-timeout`;
    expect((await call('PUT', path, 'usr_dt_member', { remindAfterMinutes: 30 })).status).toBe(403);
    const bad = await call('PUT', path, 'usr_dt_admin', { remindAfterMinutes: 30, escalateAfterMinutes: 10 });
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({ error: { code: 'INVALID_TIMEOUT' } });
    const ok = await call('PUT', path, 'usr_dt_admin', { remindAfterMinutes: 30, escalateAfterMinutes: 120 });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ decisionTimeout: { remindAfterMinutes: 30, escalateAfterMinutes: 120 } });
    expect((await stubFor(env, TENANT, boardId).getState()).decisionTimeout).toEqual({ remindAfterMinutes: 30, escalateAfterMinutes: 120 });
    expect(await (await call('PUT', path, 'usr_dt_admin', null)).json()).toEqual({ decisionTimeout: null });
    expect(await stubFor(env, TENANT, boardId).getState()).not.toHaveProperty('decisionTimeout');
  });

  it('on the Organization plane, the board default needs an Accounts owner or admin, not a local owner', async () => {
    const ORG = 'org_0000000000000000d0a1';
    await withOrgPlane(async () => {
      const tenantId = await ensureOrgTenant(env.DB, ORG);
      const boardId = newId('brd');
      await stubFor(env, tenantId, boardId).init({ id: boardId, tenantId, name: 'Plane', stages: STAGES });
      await recordBoard(env.DB, tenantId, { id: boardId, name: 'Plane', stagesJson: JSON.stringify(STAGES) });
      const token = (sub: string, email: string, orgRole: string) => planeToken({ sub, email, org: ORG, orgRole });
      const put = async (t: string) =>
        SELF.fetch(`https://api.test/v1/boards/${boardId}/decision-timeout`, { method: 'PUT', headers: { Authorization: `Bearer ${t}`, 'content-type': 'application/json' }, body: JSON.stringify({ remindAfterMinutes: 30 }) });
      // The first visitor is the fresh tenant's local owner (so `manage` admits them); Accounts says member.
      const refused = await put(await token('prn_0000000000000000d0a1', 'first-timeout@example.com', 'member'));
      expect(refused.status).toBe(403);
      expect(await refused.json()).toMatchObject({ error: { code: 'WORKSPACE_ADMIN_REQUIRED' } });
      expect(await stubFor(env, tenantId, boardId).getState()).not.toHaveProperty('decisionTimeout');
    });
  });

  it('refuses a malformed timeout when a board is created', async () => {
    const res = await SELF.fetch('https://api.test/v1/boards', {
      method: 'POST',
      headers: { ...person('usr_dt_admin') },
      body: JSON.stringify({ name: 'Bad', stages: [{ key: 'a', name: 'A', order: 0, timeout: { remindAfterMinutes: -1 } }] }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: 'INVALID_STAGES' } });
  });
});
