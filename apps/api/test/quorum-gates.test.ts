/**
 * A gate may need more than one approver (charter: decisions/2026-11-09-a-gate-may-need-more-than-
 * one-approver.md). Operator ruling: n of the stage's deciders, or of the workspace's owners and
 * admins; one reject or request for changes ends the gate; delivery is manual unless every approver
 * chose automatic.
 */
import { env, runInDurableObject, SELF } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { __resetJwksCacheForTests } from '../src/auth/hub-jwt';
import { ensureOrgTenant } from '../src/auth/org-tenancy';
import { boardStub as stubFor } from '../src/board/stub';
import { recordBoard } from '../src/db/catalog';
import { newId } from '../src/ids';
import { planeToken, withOrgPlane } from './helpers/org-plane';
import type { BoardDO, BoardInit } from '../src/board/board-do';
import type { QuorumInput } from '../src/board/gate-quorum';
import { internalStageEditor } from '../src/board/model';
import { DECIDER, OTHER_HUMAN, STAGES, addVariantCard, boardStub, boundDecision, openBoundGate, variants } from './approval-subject-fixtures';

const HOOK = 'https://hub.example/api/bridge/superpipeline/push';
const THIRD = 'usr_fixture_third';

const stub = boardStub;

/** research (agent) → review (human gate, with `quorum`) → publish (agent). */
function reviewPipeline(quorum: QuorumInput | undefined): BoardInit['stages'] {
  return [
    { key: 'research', name: 'Research', order: 0, ownerKind: 'capability', owner: 'research' },
    { key: 'review', name: 'Review', order: 1, ownerKind: 'human', gate: 'approval', ...(quorum ? { quorum } : {}) },
    { key: 'publish', name: 'Publish', order: 2, ownerKind: 'capability', owner: 'publish' },
  ];
}

/** The fixture's publishing stages, with two named deciders and `quorum` on the gate. */
function boundStages(quorum: QuorumInput, deciders = [DECIDER, OTHER_HUMAN]): BoardInit['stages'] {
  return STAGES.map((s) => (s.key === 'approve' ? { ...s, approvalDeciderPrincipalIds: deciders, quorum } : s));
}

async function openPlainGate(board: BoardDO, name: string, quorum: QuorumInput = { required: 2 }, events?: string[]) {
  await board.init({ id: `brd_${name}`, tenantId: 'tnt_q', name: 'Quorum', stages: reviewPipeline(quorum) });
  if (events) await board.registerPushConfig({ agentId: 'agt_bridge', url: HOOK, token: 's', events });
  const made = await board.createCard({ title: 'Release notes', ownerUserId: 'usr_owner' });
  if (!made.ok) throw new Error(made.message);
  const c = await board.claim({ agentId: 'agt_r', capabilities: ['research'] });
  if (!c.claimed) throw new Error('expected a research claim');
  await board.complete({ runId: c.runId, leaseEpoch: c.leaseEpoch, handoff: { summary: 'drafted' } });
  const gate = (await board.getState()).gates[0];
  if (!gate) throw new Error('no gate opened');
  return { cardId: made.value.id, gateId: gate.id };
}

/** The board's only gate, which the test opened. */
async function onlyGate(board: Pick<BoardDO, 'getState'>): Promise<string> {
  const gate = (await board.getState()).gates[0];
  if (!gate) throw new Error('no gate opened');
  return gate.id;
}

const approvals = (state: DurableObjectState, gateId: string) =>
  state.storage.sql.exec('SELECT principal_id, decision, variant_id FROM gate_approvals WHERE gate_id = ? ORDER BY created_at, principal_id', gateId).toArray();

describe('counting approvals', () => {
  it('records an approval short of the quorum and keeps the gate open; the one that reaches it resolves', async () => {
    await runInDurableObject(stub('quorum-count'), async (board: BoardDO, state) => {
      const { cardId, gateId } = await openPlainGate(board, 'count');
      const first = await board.resolveGate({ gateId, decision: 'approve', decidedBy: 'usr_a' });
      expect(first.ok).toBe(true);
      const pending = await board.getGate(gateId);
      expect(pending.ok && pending.value).toMatchObject({ status: 'pending', quorum: { required: 2, from: 'deciders', approvals: [{ principalId: 'usr_a' }] } });
      expect((await board.getState()).cards.find((c) => c.id === cardId)?.currentStageKey).toBe('review');

      const second = await board.resolveGate({ gateId, decision: 'approve', decidedBy: 'usr_b' });
      expect(second.ok).toBe(true);
      const done = await board.getGate(gateId);
      expect(done.ok && done.value).toMatchObject({ status: 'resolved', decision: 'approve', decidedBy: 'usr_b' });
      expect((await board.getState()).cards.find((c) => c.id === cardId)?.currentStageKey).toBe('publish');
      expect(approvals(state, gateId)).toEqual([
        { principal_id: 'usr_a', decision: 'approve', variant_id: null },
        { principal_id: 'usr_b', decision: 'approve', variant_id: null },
      ]);
    });
  });

  it('refuses the same person approving twice, and counts nothing for it', async () => {
    await runInDurableObject(stub('quorum-twice'), async (board: BoardDO, state) => {
      const { gateId } = await openPlainGate(board, 'twice');
      expect((await board.resolveGate({ gateId, decision: 'approve', decidedBy: 'usr_a' })).ok).toBe(true);
      const again = await board.resolveGate({ gateId, decision: 'approve', decidedBy: 'usr_a' });
      expect(again).toMatchObject({ ok: false, code: 'QUORUM_ALREADY_APPROVED' });
      expect(approvals(state, gateId)).toHaveLength(1);
      expect((await board.getGate(gateId)).ok && (await board.getGate(gateId))).toMatchObject({ value: { status: 'pending' } });
    });
  });

  it('never counts an agent', async () => {
    await runInDurableObject(stub('quorum-agent'), async (board: BoardDO, state) => {
      const { gateId } = await openPlainGate(board, 'agent');
      expect(await board.resolveGate({ gateId, decision: 'approve', decidedBy: 'agt_other' })).toMatchObject({ ok: false, code: 'APPROVAL_DECIDER_NOT_ALLOWED' });
      expect(approvals(state, gateId)).toHaveLength(0);
    });
  });

  it('a gate without a quorum still passes on one approval', async () => {
    await runInDurableObject(stub('quorum-none'), async (board: BoardDO, state) => {
      await board.init({ id: 'brd_none', tenantId: 'tnt_q', name: 'Q', stages: reviewPipeline(undefined) });
      const made = await board.createCard({ title: 'x', ownerUserId: 'usr_owner' });
      if (!made.ok) throw new Error(made.message);
      const c = await board.claim({ agentId: 'agt_r', capabilities: ['research'] });
      if (!c.claimed) throw new Error('no claim');
      await board.complete({ runId: c.runId, leaseEpoch: c.leaseEpoch, handoff: { summary: 'd' } });
      const gateId = await onlyGate(board);
      expect((await board.resolveGate({ gateId, decision: 'approve', decidedBy: 'usr_a' })).ok).toBe(true);
      const read = await board.getGate(gateId);
      expect(read.ok && read.value.status).toBe('resolved');
      expect(read.ok && read.value).not.toHaveProperty('quorum');
      expect(approvals(state, gateId)).toHaveLength(0);
    });
  });
});

describe('one reject or request for changes ends it', () => {
  it.each(['reject', 'request_changes'] as const)('%s after an approval closes the gate at once', async (decision) => {
    await runInDurableObject(stub(`quorum-${decision}`), async (board: BoardDO, state) => {
      const { cardId, gateId } = await openPlainGate(board, decision);
      expect((await board.resolveGate({ gateId, decision: 'approve', decidedBy: 'usr_a' })).ok).toBe(true);
      expect((await board.resolveGate({ gateId, decision, decidedBy: 'usr_b', comment: 'not yet' })).ok).toBe(true);
      const read = await board.getGate(gateId);
      expect(read.ok && read.value).toMatchObject({ status: 'resolved', decision });
      const card = (await board.getState()).cards.find((c) => c.id === cardId);
      expect(decision === 'reject' ? card?.state : card?.currentStageKey).toBe(decision === 'reject' ? 'rejected' : 'research');
      // The approval stays in the gate's history.
      expect(approvals(state, gateId)).toEqual([{ principal_id: 'usr_a', decision: 'approve', variant_id: null }]);
    });
  });

  it('someone who approved may still reject', async () => {
    await runInDurableObject(stub('quorum-change-mind'), async (board: BoardDO) => {
      const { gateId } = await openPlainGate(board, 'mind');
      expect((await board.resolveGate({ gateId, decision: 'approve', decidedBy: 'usr_a' })).ok).toBe(true);
      expect((await board.resolveGate({ gateId, decision: 'reject', decidedBy: 'usr_a' })).ok).toBe(true);
      const read = await board.getGate(gateId);
      expect(read.ok && read.value.decision).toBe('reject');
    });
  });
});

describe('a quorum of owners and admins', () => {
  it('counts only an owner or admin, by the role the answer carried', async () => {
    await runInDurableObject(stub('quorum-admins'), async (board: BoardDO, state) => {
      const { gateId } = await openPlainGate(board, 'admins', { required: 2, from: 'admins' });
      for (const deciderRole of ['member', 'viewer', null, undefined] as const) {
        expect(await board.resolveGate({ gateId, decision: 'approve', decidedBy: 'usr_m', deciderRole })).toMatchObject({ ok: false, code: 'APPROVAL_DECIDER_NOT_ALLOWED' });
      }
      expect(approvals(state, gateId)).toHaveLength(0);
      expect((await board.resolveGate({ gateId, decision: 'approve', decidedBy: 'usr_admin', deciderRole: 'admin' })).ok).toBe(true);
      expect((await board.resolveGate({ gateId, decision: 'approve', decidedBy: 'usr_owner2', deciderRole: 'owner' })).ok).toBe(true);
      const read = await board.getGate(gateId);
      expect(read.ok && read.value.status).toBe('resolved');
    });
  });

  it('lets a member reject: only approvals need the role', async () => {
    await runInDurableObject(stub('quorum-admins-reject'), async (board: BoardDO) => {
      const { gateId } = await openPlainGate(board, 'admins_reject', { required: 2, from: 'admins' });
      expect((await board.resolveGate({ gateId, decision: 'reject', decidedBy: 'usr_m', deciderRole: 'member' })).ok).toBe(true);
    });
  });
});

describe('a quorum on a subject-bound gate', () => {
  it('resolves for manual delivery when any approver chose manual', async () => {
    await runInDurableObject(stub('quorum-manual'), async (board: BoardDO, state) => {
      const { gate, subject } = await openBoundGate(board, state, 'q_manual', { stages: boundStages({ required: 2 }) });
      expect((await board.resolveGate(boundDecision(gate, subject, DECIDER, 'approve_manual'))).ok).toBe(true);
      expect((await board.resolveGate(boundDecision(gate, subject, OTHER_HUMAN, 'approve_automatic'))).ok).toBe(true);
      const read = await board.getGate(gate.id);
      expect(read.ok && read.value).toMatchObject({ status: 'resolved', decision: 'approve_manual', delivery: { mode: 'manual' } });
    });
  });

  it('resolves for automatic delivery only when every approver chose it', async () => {
    await runInDurableObject(stub('quorum-auto'), async (board: BoardDO, state) => {
      const { gate, subject } = await openBoundGate(board, state, 'q_auto', { stages: boundStages({ required: 2 }) });
      expect((await board.resolveGate(boundDecision(gate, subject, DECIDER, 'approve_automatic'))).ok).toBe(true);
      expect((await board.resolveGate(boundDecision(gate, subject, OTHER_HUMAN, 'approve_automatic'))).ok).toBe(true);
      const read = await board.getGate(gate.id);
      expect(read.ok && read.value).toMatchObject({ decision: 'approve_automatic', delivery: { mode: 'automatic' } });
    });
  });

  it('still requires each approval to carry the binding and come from a named decider', async () => {
    await runInDurableObject(stub('quorum-binding'), async (board: BoardDO, state) => {
      const { gate, subject } = await openBoundGate(board, state, 'q_bind', { stages: boundStages({ required: 2 }) });
      expect(await board.resolveGate({ ...boundDecision(gate, subject, DECIDER), approvalSubjectDigest: 'sha256:nope' })).toMatchObject({ ok: false, code: 'APPROVAL_SUBJECT_MISMATCH' });
      expect(await board.resolveGate(boundDecision(gate, subject, THIRD))).toMatchObject({ ok: false, code: 'APPROVAL_DECIDER_NOT_ALLOWED' });
      expect(approvals(state, gate.id)).toHaveLength(0);
    });
  });
});

describe('variants under a quorum', () => {
  it('counts approvals per variant; the first variant to reach the quorum is chosen', async () => {
    await runInDurableObject(stub('quorum-variants'), async (board: BoardDO, state) => {
      await board.init({ id: 'brd_qv', tenantId: 'tnt_fixture', name: 'Fixture board', stages: boundStages({ required: 2 }, [DECIDER, OTHER_HUMAN, THIRD]) });
      const opened = await addVariantCard(board, state, { variants: variants(['One.', 'Two.']) });
      if (!opened.gate) throw new Error('no gate opened');
      const gateId = opened.gate.id;
      const [one, two] = opened.subjects;
      if (!one || !two) throw new Error('expected two variants');
      const pick = (s: typeof one, by: string) => ({ gateId, decision: 'approve_automatic' as const, decidedBy: by, approvalSubjectId: s.id, approvalSubjectDigest: s.digest });
      expect((await board.resolveGate(pick(one, DECIDER))).ok).toBe(true);
      // An approval of the other variant is not counted for the first.
      expect((await board.resolveGate(pick(two, OTHER_HUMAN))).ok).toBe(true);
      expect((await board.getGate(gateId)).ok && (await board.getGate(gateId))).toMatchObject({ value: { status: 'pending' } });
      expect((await board.resolveGate(pick(two, THIRD))).ok).toBe(true);
      const read = await board.getGate(gateId);
      expect(read.ok && read.value).toMatchObject({ status: 'resolved', approvalSubject: { id: two.id } });
      expect(approvals(state, gateId).map((a) => a.variant_id)).toEqual(['v1', 'v2', 'v2']);
    });
  });
});

describe('progress on the push', () => {
  it('pushes gate.approval_recorded with who approved and how many are needed, and the pending read carries the same list', async () => {
    await runInDurableObject(stub('quorum-push'), async (board: BoardDO) => {
      const { gateId, cardId } = await openPlainGate(board, 'push', { required: 2 }, ['gate.pending', 'gate.approval_recorded']);
      const [opened] = await board.pendingGateDeliveries();
      expect(opened).toMatchObject({ gateId, quorum: { required: 2, from: 'deciders', approvals: [] } });
      expect((await board.resolveGate({ gateId, decision: 'approve', decidedBy: 'usr_a' })).ok).toBe(true);
      const recorded = (await board.getPushDeliveries()).map((d) => d.body).find((b) => b.includes('"gate.approval_recorded"'));
      expect(JSON.parse(recorded ?? '{}')).toMatchObject({
        event: 'gate.approval_recorded',
        boardId: 'brd_push',
        cardId,
        gateId,
        approval: { principalId: 'usr_a', at: expect.any(String) },
        quorum: { required: 2, from: 'deciders', approvals: [{ principalId: 'usr_a' }] },
      });
      const [swept] = await board.pendingGateDeliveries();
      expect(swept?.quorum?.approvals.map((a) => a.principalId)).toEqual(['usr_a']);
    });
  });

  it('a gate without a quorum carries no quorum field', async () => {
    await runInDurableObject(stub('quorum-push-none'), async (board: BoardDO, state) => {
      await openBoundGate(board, state, 'q_none');
      const [body] = await board.pendingGateDeliveries();
      expect(body).not.toHaveProperty('quorum');
    });
  });
});

describe('a quorum is decision policy', () => {
  it.each([
    ['one', { required: 1 }, /2 to 5/],
    ['six', { required: 6 }, /2 to 5/],
    ['a fraction', { required: 2.5 }, /2 to 5/],
    ['an unknown from', { required: 2, from: 'everyone' }, /deciders" or "admins/],
    ['an extra field', { required: 2, order: 'sequential' }, /not order/],
    ['not an object', 2, /must be an object/],
  ])('refuses %s', async (_label, quorum, message) => {
    await runInDurableObject(stub(`quorum-bad-${_label}`), async (board: BoardDO) => {
      await board.init({ id: 'brd_bad', tenantId: 'tnt_q', name: 'Q', stages: reviewPipeline(undefined) });
      // Through JSON, as a client's body arrives: the type says nothing about what is sent.
      const r = await board.updateStage('review', JSON.parse(JSON.stringify({ quorum })), internalStageEditor('test'));
      expect(r).toMatchObject({ ok: false, code: 'INVALID_STAGES' });
      expect(!r.ok && r.message).toMatch(message);
    });
  });

  it('refuses asking more of the named deciders than there are', async () => {
    await runInDurableObject(stub('quorum-too-many'), async (board: BoardDO) => {
      await board.init({ id: 'brd_many', tenantId: 'tnt_fixture', name: 'Q', stages: STAGES });
      const r = await board.updateStage('approve', { quorum: { required: 2 } }, internalStageEditor('test'));
      expect(!r.ok && r.message).toMatch(/names only 1 decider/);
      // Of owners and admins too: the named deciders bound who may approve either way.
      const admins = await board.updateStage('approve', { quorum: { required: 2, from: 'admins' } }, internalStageEditor('test'));
      expect(!admins.ok && admins.message).toMatch(/names only 1 decider/);
    });
  });

  it('only an owner or admin may set, change or remove it', async () => {
    await runInDurableObject(stub('quorum-policy'), async (board: BoardDO) => {
      await board.init({ id: 'brd_policy', tenantId: 'tnt_q', name: 'Q', stages: reviewPipeline(undefined) });
      const member = { kind: 'person' as const, mayChangeDecisionPolicy: false };
      expect(await board.updateStage('review', { quorum: { required: 2 } }, member)).toMatchObject({ ok: false, code: 'WORKSPACE_ADMIN_REQUIRED' });
      expect((await board.updateStage('review', { quorum: { required: 2 } }, { kind: 'person', mayChangeDecisionPolicy: true })).ok).toBe(true);
      // The same quorum in another spelling is no change.
      expect((await board.updateStage('review', { quorum: { required: 2, from: 'deciders' }, name: 'Review twice' }, member)).ok).toBe(true);
      expect(await board.updateStage('review', { quorum: null }, member)).toMatchObject({ ok: false, code: 'WORKSPACE_ADMIN_REQUIRED' });
      const stages = (await board.getState()).stages;
      expect(stages.find((s) => s.key === 'review')?.quorum).toEqual({ required: 2, from: 'deciders' });
    });
  });

  it('an open gate keeps the quorum it opened with', async () => {
    await runInDurableObject(stub('quorum-snapshot'), async (board: BoardDO) => {
      const { gateId } = await openPlainGate(board, 'snapshot', { required: 3 });
      expect((await board.updateStage('review', { quorum: null }, internalStageEditor('test'))).ok).toBe(true);
      expect((await board.resolveGate({ gateId, decision: 'approve', decidedBy: 'usr_a' })).ok).toBe(true);
      const read = await board.getGate(gateId);
      expect(read.ok && read.value).toMatchObject({ status: 'pending', quorum: { required: 3 } });
    });
  });
});

describe('over HTTP on the Organization plane', () => {
  beforeEach(() => __resetJwksCacheForTests());

  it("counts an approval by the Accounts role in the answer's token, never the local one", async () => {
    const ORG = 'org_0000000000000000c0a1';
    await withOrgPlane(async () => {
      const tenantId = await ensureOrgTenant(env.DB, ORG);
      const boardId = newId('brd');
      const stages = reviewPipeline({ required: 2, from: 'admins' });
      const board = stubFor(env, tenantId, boardId);
      await board.init({ id: boardId, tenantId, name: 'Plane', stages });
      await recordBoard(env.DB, tenantId, { id: boardId, name: 'Plane', stagesJson: JSON.stringify(stages) });
      const made = await board.createCard({ title: 'Release', ownerUserId: 'usr_owner' });
      if (!made.ok) throw new Error(made.message);
      const c = await board.claim({ agentId: 'agt_r', capabilities: ['research'] });
      if (!c.claimed) throw new Error('no claim');
      await board.complete({ runId: c.runId, leaseEpoch: c.leaseEpoch, handoff: { summary: 'd' } });
      const gateId = await onlyGate(board);
      const resolve = async (sub: string, email: string, orgRole: string) =>
        SELF.fetch(`https://api.test/v1/boards/${boardId}/gates/${gateId}/resolve`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${await planeToken({ sub, email, org: ORG, orgRole })}`, 'content-type': 'application/json' },
          body: JSON.stringify({ decision: 'approve' }),
        });
      // The first visitor is the fresh tenant's local owner; Accounts says member, and member does not count.
      const member = await resolve('prn_0000000000000000c0a1', 'first-quorum@example.com', 'member');
      expect(member.status).toBe(403);
      expect(await member.json()).toMatchObject({ error: { code: 'APPROVAL_DECIDER_NOT_ALLOWED' } });
      const admin = await resolve('prn_0000000000000000c0a2', 'admin-quorum@example.com', 'admin');
      expect(admin.status).toBe(200);
      const again = await resolve('prn_0000000000000000c0a2', 'admin-quorum@example.com', 'admin');
      expect(again.status).toBe(409);
      expect(await again.json()).toMatchObject({ error: { code: 'QUORUM_ALREADY_APPROVED' } });
      const read = await board.getGate(gateId);
      // Counted by principal, the id every surface shares.
      expect(read.ok && read.value.quorum?.approvals.map((a) => a.principalId)).toEqual(['prn_0000000000000000c0a2']);
      expect((await resolve('prn_0000000000000000c0a3', 'owner-quorum@example.com', 'owner')).status).toBe(200);
      const done = await board.getGate(gateId);
      expect(done.ok && done.value.status).toBe('resolved');

      // Creating a board that requires a quorum is decision policy too.
      const create = await SELF.fetch('https://api.test/v1/boards', {
        method: 'POST',
        headers: { Authorization: `Bearer ${await planeToken({ sub: 'prn_0000000000000000c0a1', email: 'first-quorum@example.com', org: ORG, orgRole: 'member' })}`, 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Two keys', stages }),
      });
      expect(create.status).toBe(403);
      expect(await create.json()).toMatchObject({ error: { code: 'WORKSPACE_ADMIN_REQUIRED' } });
    });
  });
});

describe('named deciders on a gate with no frozen subject', () => {
  it('counts only the stage\'s named deciders', async () => {
    await runInDurableObject(stub('quorum-named-plain'), async (board: BoardDO, state) => {
      const stages = reviewPipeline({ required: 2 }).map((s) => (s.key === 'review' ? { ...s, approvalDeciderPrincipalIds: ['usr_a', 'usr_b'] } : s));
      await board.init({ id: 'brd_named', tenantId: 'tnt_q', name: 'Q', stages });
      const made = await board.createCard({ title: 'x', ownerUserId: 'usr_owner' });
      if (!made.ok) throw new Error(made.message);
      const c = await board.claim({ agentId: 'agt_r', capabilities: ['research'] });
      if (!c.claimed) throw new Error('no claim');
      await board.complete({ runId: c.runId, leaseEpoch: c.leaseEpoch, handoff: { summary: 'd' } });
      const gateId = await onlyGate(board);
      expect(await board.resolveGate({ gateId, decision: 'approve', decidedBy: 'usr_d' })).toMatchObject({ ok: false, code: 'APPROVAL_DECIDER_NOT_ALLOWED' });
      expect(approvals(state, gateId)).toHaveLength(0);
      expect((await board.resolveGate({ gateId, decision: 'approve', decidedBy: 'usr_a', comment: 'looks right' })).ok).toBe(true);
      expect((await board.resolveGate({ gateId, decision: 'approve', decidedBy: 'usr_b' })).ok).toBe(true);
      const read = await board.getGate(gateId);
      expect(read.ok && read.value.status).toBe('resolved');
      // Who may approve stays on the board; the wire says how many and from whom.
      expect(read.ok && read.value.quorum).toEqual({ required: 2, from: 'deciders', approvals: expect.any(Array) });
      // An earlier approver's comment is kept with their approval.
      expect(state.storage.sql.exec("SELECT comment FROM gate_approvals WHERE principal_id = 'usr_a'").one()).toEqual({ comment: 'looks right' });
    });
  });
});

describe('an unreadable quorum fails closed', () => {
  it.each(['not json', '{"required":1}', '{"required":2,"deciders":"usr_a"}'])('%s: no approval passes the gate, and a reject still ends it', async (stored) => {
    await runInDurableObject(stub(`quorum-corrupt-${stored.length}`), async (board: BoardDO, state) => {
      const { gateId } = await openPlainGate(board, `corrupt_${stored.length}`);
      state.storage.sql.exec('UPDATE gates SET quorum_json = ? WHERE id = ?', stored, gateId);
      for (const by of ['usr_a', 'usr_b', 'usr_c']) await board.resolveGate({ gateId, decision: 'approve', decidedBy: by, deciderRole: 'owner' });
      const read = await board.getGate(gateId);
      expect(read.ok && read.value.status).toBe('pending');
      expect((await board.resolveGate({ gateId, decision: 'reject', decidedBy: 'usr_d' })).ok).toBe(true);
    });
  });
});
