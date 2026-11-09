/**
 * An approval may wait for its release time (charter: decisions/2026-11-09-an-approval-may-wait-
 * for-its-release-time.md). Operator ruling: the release time is the later of the subject's
 * not-before and the stage's `holdFor`; a held approval may be pulled back as request changes;
 * release runs in the five-minute sweep.
 */
import { env, runInDurableObject, SELF } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { __resetJwksCacheForTests } from '../src/auth/hub-jwt';
import { ensureOrgTenant } from '../src/auth/org-tenancy';
import type { BoardDO, BoardInit } from '../src/board/board-do';
import { internalStageEditor } from '../src/board/model';
import { boardStub as stubFor } from '../src/board/stub';
import { recordBoard } from '../src/db/catalog';
import { newId } from '../src/ids';
import { planeToken, withOrgPlane } from './helpers/org-plane';
import { ACCOUNT, DECIDER, OTHER_HUMAN, PUBLISHER, STAGES, addVariantCard, boardStub, boundDecision, openBoundGate, payload, variants } from './approval-subject-fixtures';

const HOOK = 'https://hub.example/api/bridge/superpipeline/push';
const EVENTS = ['gate.pending', 'delivery.pending', 'decision.released', 'decision.pulled_back'];
const stub = boardStub;
const MIN = 60_000;

/** research (agent) → review (human gate) → publish (agent). */
function reviewPipeline(extra: Partial<BoardInit['stages'][number]> = {}): BoardInit['stages'] {
  return [
    { key: 'research', name: 'Research', order: 0, ownerKind: 'capability', owner: 'research' },
    { key: 'review', name: 'Review', order: 1, ownerKind: 'human', gate: 'approval', ...extra },
    { key: 'publish', name: 'Publish', order: 2, ownerKind: 'capability', owner: 'publish' },
  ];
}

/** The fixture's publishing stages, with `holdFor` on the gate when given. */
function boundStages(holdFor?: number, extra: Record<string, unknown> = {}): BoardInit['stages'] {
  return STAGES.map((s) => (s.key === 'approve' ? { ...s, ...(holdFor !== undefined ? { holdFor } : {}), ...extra } : s));
}

/** A payload that goes out after `notBefore`, valid until `expiresAt`. */
function scheduled(notBefore: string, expiresAt = '2030-01-02T03:04:05Z') {
  return { ...payload(expiresAt), timing: { mode: 'scheduled', notBefore, expiresAt } };
}

async function openPlainGate(board: BoardDO, name: string, extra: Partial<BoardInit['stages'][number]> = {}) {
  await board.init({ id: `brd_${name}`, tenantId: 'tnt_rt', name: 'Release', stages: reviewPipeline(extra) });
  await board.registerPushConfig({ agentId: 'agt_bridge', url: HOOK, token: 's', events: EVENTS });
  const made = await board.createCard({ title: 'Release notes', ownerUserId: 'usr_owner' });
  if (!made.ok) throw new Error(made.message);
  const c = await board.claim({ agentId: 'agt_r', capabilities: ['research'] });
  if (!c.claimed) throw new Error('expected a research claim');
  await board.complete({ runId: c.runId, leaseEpoch: c.leaseEpoch, handoff: { summary: 'drafted' } });
  const gate = (await board.getState()).gates[0];
  if (!gate) throw new Error('no gate opened');
  return { cardId: made.value.id, gateId: gate.id };
}

const cardOf = async (board: BoardDO, cardId: string) => (await board.getState()).cards.find((c) => c.id === cardId);
const pushed = async (board: BoardDO, event: string): Promise<unknown[]> =>
  (await board.getPushDeliveries()).map((d): unknown => JSON.parse(d.body)).filter((b) => b !== null && typeof b === 'object' && 'event' in b && b.event === event);
const text = (v: SqlStorageValue | undefined): string => (typeof v === 'string' ? v : '');
const gateRow = (state: DurableObjectState, gateId: string) => state.storage.sql.exec('SELECT * FROM gates WHERE id = ?', gateId).one();
const plus = (minutes: number) => new Date(Date.now() + minutes * MIN).toISOString();

describe('holdFor is decision policy', () => {
  it.each([
    ['too short', 4],
    ['too long', 10081],
    ['a fraction', 5.5],
    ['a string', '30'],
  ])('refuses %s', async (label, holdFor) => {
    await runInDurableObject(stub(`rt-bad-${label}`), async (board: BoardDO) => {
      await board.init({ id: 'brd_bad', tenantId: 'tnt_rt', name: 'R', stages: reviewPipeline() });
      const r = await board.updateStage('review', JSON.parse(JSON.stringify({ holdFor })), internalStageEditor('test'));
      expect(r).toMatchObject({ ok: false, code: 'INVALID_STAGES' });
      expect(!r.ok && r.message).toMatch(/holdFor must be a whole number of minutes from 5 to 10080/);
    });
  });

  it('only an owner or admin may set, change or remove it', async () => {
    await runInDurableObject(stub('rt-policy'), async (board: BoardDO) => {
      await board.init({ id: 'brd_policy', tenantId: 'tnt_rt', name: 'R', stages: reviewPipeline() });
      const member = { kind: 'person' as const, mayChangeDecisionPolicy: false };
      expect(await board.updateStage('review', { holdFor: 30 }, member)).toMatchObject({ ok: false, code: 'WORKSPACE_ADMIN_REQUIRED' });
      expect((await board.updateStage('review', { holdFor: 30 }, { kind: 'person', mayChangeDecisionPolicy: true })).ok).toBe(true);
      expect((await board.updateStage('review', { holdFor: 30, name: 'Review, then wait' }, member)).ok).toBe(true);
      expect(await board.updateStage('review', { holdFor: 60 }, member)).toMatchObject({ ok: false, code: 'WORKSPACE_ADMIN_REQUIRED' });
      expect(await board.updateStage('review', { holdFor: null }, member)).toMatchObject({ ok: false, code: 'WORKSPACE_ADMIN_REQUIRED' });
      expect((await board.getState()).stages.find((s) => s.key === 'review')?.holdFor).toBe(30);
    });
  });

  it('an open gate keeps the hold it opened with', async () => {
    await runInDurableObject(stub('rt-snapshot'), async (board: BoardDO, state) => {
      const { gateId, cardId } = await openPlainGate(board, 'snapshot', { holdFor: 30 });
      expect(gateRow(state, gateId).hold_for_minutes).toBe(30);
      expect((await board.updateStage('review', { holdFor: null }, internalStageEditor('test'))).ok).toBe(true);
      expect((await board.resolveGate({ gateId, decision: 'approve', decidedBy: 'usr_a' })).ok).toBe(true);
      expect((await cardOf(board, cardId))?.currentStageKey).toBe('review');
      const read = await board.getGate(gateId);
      expect(read.ok && read.value.heldUntil).toEqual(expect.any(String));
    });
  });
});

describe('a held approval is recorded but has not acted', () => {
  it('a plain gate with holdFor: the card stays, the gate says until when, and gate.pending said so first', async () => {
    await runInDurableObject(stub('rt-plain'), async (board: BoardDO, state) => {
      const { gateId, cardId } = await openPlainGate(board, 'plain', { holdFor: 30 });
      const [opened] = await board.pendingGateDeliveries();
      expect(opened?.release).toEqual({ holdForMinutes: 30 });
      const before = Date.now();
      expect((await board.resolveGate({ gateId, decision: 'approve', decidedBy: 'usr_a', comment: 'fine' })).ok).toBe(true);
      const card = await cardOf(board, cardId);
      expect(card).toMatchObject({ currentStageKey: 'review', state: 'input-required', needsHuman: { reason: 'review' } });
      const read = await board.getGate(gateId);
      if (!read.ok) throw new Error(read.message);
      expect(read.value).toMatchObject({ status: 'resolved', decision: 'approve', decidedBy: 'usr_a', release: { holdForMinutes: 30 } });
      const held = Date.parse(read.value.heldUntil ?? '');
      expect(held).toBeGreaterThanOrEqual(before + 30 * MIN);
      expect(held).toBeLessThanOrEqual(Date.now() + 30 * MIN);
      expect(read.value).not.toHaveProperty('releasedAt');
      // Nobody can claim it: the card sits on a human stage.
      expect(await board.claim({ agentId: 'agt_p', capabilities: ['publish'] })).toMatchObject({ claimed: false });
      // The gate's own wait ended at resolve; the hold is no wait on a person.
      expect(state.storage.sql.exec("SELECT closed_at FROM decision_waits WHERE kind = 'delivery'").toArray()).toHaveLength(0);
    });
  });

  it("holds until the subject's own not-before time", async () => {
    await runInDurableObject(stub('rt-not-before'), async (board: BoardDO, state) => {
      const { gate, subject, cardId } = await openBoundGate(board, state, 'rt_nb', { publicationPayload: scheduled('2029-06-01T09:00:00Z') });
      const [opened] = await board.pendingGateDeliveries();
      expect(opened?.release).toEqual({ notBefore: '2029-06-01T09:00:00.000Z' });
      expect((await board.resolveGate(boundDecision(gate, subject))).ok).toBe(true);
      expect((await cardOf(board, cardId))?.currentStageKey).toBe('approve');
      const read = await board.getGate(gate.id);
      expect(read.ok && read.value.heldUntil).toBe('2029-06-01T09:00:00.000Z');
    });
  });

  it('takes the later of the two', async () => {
    await runInDurableObject(stub('rt-later'), async (board: BoardDO, state) => {
      const { gate, subject } = await openBoundGate(board, state, 'rt_later', { stages: boundStages(30), publicationPayload: scheduled('2029-06-01T09:00:00Z') });
      const [opened] = await board.pendingGateDeliveries();
      expect(opened?.release).toEqual({ holdForMinutes: 30, notBefore: '2029-06-01T09:00:00.000Z' });
      expect((await board.resolveGate(boundDecision(gate, subject))).ok).toBe(true);
      const read = await board.getGate(gate.id);
      expect(read.ok && read.value.heldUntil).toBe('2029-06-01T09:00:00.000Z');
    });
  });

  it('a release time already past acts at once, as before', async () => {
    await runInDurableObject(stub('rt-past'), async (board: BoardDO, state) => {
      const { gate, subject, cardId } = await openBoundGate(board, state, 'rt_past', { publicationPayload: scheduled('2020-01-01T00:00:00Z') });
      expect((await board.resolveGate(boundDecision(gate, subject))).ok).toBe(true);
      expect((await cardOf(board, cardId))?.currentStageKey).toBe('publish');
      const read = await board.getGate(gate.id);
      expect(read.ok && read.value).not.toHaveProperty('heldUntil');
      expect(gateRow(state, gate.id).release_at).toBeNull();
    });
  });

  it('a variant gate holds by the chosen variant\'s not-before', async () => {
    await runInDurableObject(stub('rt-variants'), async (board: BoardDO, state) => {
      await board.init({ id: 'brd_rtv', tenantId: 'tnt_fixture', name: 'Fixture board', stages: STAGES });
      const vs = variants(['Now.', 'Later.']).map((v, i) => (i === 1 ? { ...v, publicationPayload: { ...v.publicationPayload, timing: { mode: 'scheduled', notBefore: '2029-03-01T00:00:00Z', expiresAt: '2030-01-02T03:04:05Z' } } } : v));
      const opened = await addVariantCard(board, state, { variants: vs });
      if (!opened.gate) throw new Error('no gate opened');
      const [pending] = await board.pendingGateDeliveries();
      expect(pending?.release).toEqual({ notBefore: '2029-03-01T00:00:00.000Z' });
      const later = opened.subjects[1];
      if (!later) throw new Error('expected two variants');
      expect((await board.resolveGate({ gateId: opened.gate.id, decision: 'approve_automatic', decidedBy: DECIDER, approvalSubjectId: later.id, approvalSubjectDigest: later.digest })).ok).toBe(true);
      const read = await board.getGate(opened.gate.id);
      expect(read.ok && read.value.heldUntil).toBe('2029-03-01T00:00:00.000Z');
    });
  });

  it('a gate nothing holds carries none of the new fields', async () => {
    await runInDurableObject(stub('rt-none'), async (board: BoardDO, state) => {
      const { gate, subject } = await openBoundGate(board, state, 'rt_none');
      const [body] = await board.pendingGateDeliveries();
      expect(body).not.toHaveProperty('release');
      expect((await board.resolveGate(boundDecision(gate, subject))).ok).toBe(true);
      const read = await board.getGate(gate.id);
      for (const key of ['release', 'heldUntil', 'releasedAt', 'pulledBack']) expect(read.ok && read.value).not.toHaveProperty(key);
    });
  });

  it("the approval that reaches a quorum is held", async () => {
    await runInDurableObject(stub('rt-quorum'), async (board: BoardDO) => {
      const { gateId, cardId } = await openPlainGate(board, 'quorum', { holdFor: 30, quorum: { required: 2 } });
      expect((await board.resolveGate({ gateId, decision: 'approve', decidedBy: 'usr_a' })).ok).toBe(true);
      expect((await board.resolveGate({ gateId, decision: 'approve', decidedBy: 'usr_b' })).ok).toBe(true);
      const read = await board.getGate(gateId);
      expect(read.ok && read.value).toMatchObject({ status: 'resolved', heldUntil: expect.any(String) });
      expect((await cardOf(board, cardId))?.currentStageKey).toBe('review');
    });
  });
});

describe('an approval that could never act is not recorded', () => {
  it('refuses a release time after the subject expires', async () => {
    await runInDurableObject(stub('rt-after-expiry'), async (board: BoardDO, state) => {
      const { gate, subject, cardId } = await openBoundGate(board, state, 'rt_exp', { publicationPayload: scheduled('2030-06-01T00:00:00Z', '2030-01-02T03:04:05Z') });
      const refused = await board.resolveGate(boundDecision(gate, subject));
      expect(refused).toMatchObject({ ok: false, code: 'APPROVAL_RELEASE_AFTER_EXPIRY', detail: { releaseAt: '2030-06-01T00:00:00.000Z' } });
      expect(gateRow(state, gate.id)).toMatchObject({ status: 'pending', decision: null, release_at: null });
      expect(state.storage.sql.exec('SELECT 1 FROM approval_delivery_events WHERE gate_id = ?', gate.id).toArray()).toHaveLength(0);
      expect((await cardOf(board, cardId))?.currentStageKey).toBe('approve');
      // Rejecting still works: it binds nothing.
      expect((await board.resolveGate({ ...boundDecision(gate, subject), decision: 'reject' })).ok).toBe(true);
    });
  });

  it('on a quorum gate, before recording the approval', async () => {
    await runInDurableObject(stub('rt-after-expiry-quorum'), async (board: BoardDO, state) => {
      const stages = boundStages(120, { approvalDeciderPrincipalIds: [DECIDER, OTHER_HUMAN], quorum: { required: 2 } });
      const { gate, subject } = await openBoundGate(board, state, 'rt_exp_q', { stages, publicationPayload: payload(plus(60)) });
      expect(await board.resolveGate(boundDecision(gate, subject))).toMatchObject({ ok: false, code: 'APPROVAL_RELEASE_AFTER_EXPIRY' });
      expect(state.storage.sql.exec('SELECT 1 FROM gate_approvals WHERE gate_id = ?', gate.id).toArray()).toHaveLength(0);
    });
  });
});

describe('no executor may act on a held approval', () => {
  it('verifying the subject refuses it with APPROVAL_HELD and the release time', async () => {
    await runInDurableObject(stub('rt-verify'), async (board: BoardDO, state) => {
      const opened = await openBoundGate(board, state, 'rt_verify', { stages: boundStages(30) });
      expect((await board.resolveGate(boundDecision(opened.gate, opened.subject))).ok).toBe(true);
      const releaseAt = gateRow(state, opened.gate.id).release_at;
      // Defense in depth: reproduce an unsafe claimable card independently of routing.
      state.storage.sql.exec(`UPDATE cards SET current_stage_key = 'publish', state = 'submitted' WHERE id = ?`, opened.cardId);
      const claim = await board.claim({ agentId: PUBLISHER, capabilities: ['x-publish'] });
      if (!claim.claimed) throw new Error('forced publisher fixture was not claimable');
      const verified = await board.verifyApprovalSubject({
        runId: claim.runId,
        leaseEpoch: claim.leaseEpoch,
        agentId: PUBLISHER,
        expectedSchema: 'social-publish/v1',
        expectedSubjectId: opened.subject.id,
        expectedDigest: opened.subject.digest,
        expectedAccount: ACCOUNT,
      });
      expect(verified).toMatchObject({ ok: false, code: 'APPROVAL_HELD', detail: { releaseAt } });
    });
  });

  it('switching a held manual approval to automatic is refused, and the card does not move', async () => {
    await runInDurableObject(stub('rt-switch'), async (board: BoardDO, state) => {
      const opened = await openBoundGate(board, state, 'rt_switch', { stages: boundStages(30) });
      expect((await board.resolveGate(boundDecision(opened.gate, opened.subject, DECIDER, 'approve_manual'))).ok).toBe(true);
      expect(await board.updateApprovalDelivery({ gateId: opened.gate.id, actor: DECIDER, mode: 'automatic' })).toMatchObject({ ok: false, code: 'APPROVAL_HELD' });
      expect((await cardOf(board, opened.cardId))?.currentStageKey).toBe('approve');
    });
  });
});

describe('the sweep releases a held approval at its time', () => {
  it('an automatic approval advances, and decision.released says so', async () => {
    await runInDurableObject(stub('rt-release-auto'), async (board: BoardDO, state) => {
      const opened = await openBoundGate(board, state, 'rt_rel_auto', { stages: boundStages(30) });
      await board.registerPushConfig({ agentId: 'agt_bridge', url: HOOK, token: 's', events: EVENTS });
      expect((await board.resolveGate(boundDecision(opened.gate, opened.subject))).ok).toBe(true);
      const releaseAt = text(gateRow(state, opened.gate.id).release_at);
      expect(await board.sweepBoard(plus(20))).toMatchObject({ approvalsReleased: 0 });
      expect((await cardOf(board, opened.cardId))?.currentStageKey).toBe('approve');
      const at = plus(35);
      expect(await board.sweepBoard(at)).toMatchObject({ approvalsReleased: 1 });
      expect((await cardOf(board, opened.cardId))).toMatchObject({ currentStageKey: 'publish', state: 'submitted' });
      expect(await pushed(board, 'decision.released')).toEqual([
        { event: 'decision.released', boardId: 'brd_fixture_rt_rel_auto', cardId: opened.cardId, gateId: opened.gate.id, decision: 'approve_automatic', releaseAt, releasedAt: at, outcome: 'released' },
      ]);
      const read = await board.getGate(opened.gate.id);
      expect(read.ok && read.value).toMatchObject({ releasedAt: at });
      expect(read.ok && read.value).not.toHaveProperty('heldUntil');
      expect(await board.claim({ agentId: PUBLISHER, capabilities: ['x-publish'] })).toMatchObject({ claimed: true });
      // Released once.
      expect(await board.sweepBoard(plus(40))).toMatchObject({ approvalsReleased: 0 });
    });
  });

  it('a manual approval starts its follow-up, and its wait, at release', async () => {
    await runInDurableObject(stub('rt-release-manual'), async (board: BoardDO, state) => {
      // A timeout, so the manual follow-up's wait is recorded and can be seen to start.
      const opened = await openBoundGate(board, state, 'rt_rel_manual', { stages: boundStages(30, { timeout: { remindAfterMinutes: 60 } }) });
      await board.registerPushConfig({ agentId: 'agt_bridge', url: HOOK, token: 's', events: EVENTS });
      expect((await board.resolveGate(boundDecision(opened.gate, opened.subject, DECIDER, 'approve_manual'))).ok).toBe(true);
      expect(await board.pendingDeliveryFollowUps()).toEqual([]);
      expect(await pushed(board, 'delivery.pending')).toEqual([]);
      const deliveryWaits = () => state.storage.sql.exec("SELECT 1 FROM decision_waits WHERE kind = 'delivery' AND decision_id = ?", opened.gate.id).toArray();
      expect(deliveryWaits()).toHaveLength(0);
      // The lapsed-delivery job leaves a held approval alone, even past its subject's expiry (a
      // release time is never after it; forced here to reach the fence).
      const releaseAt = gateRow(state, opened.gate.id).release_at;
      state.storage.sql.exec(`UPDATE gates SET release_at = '2031-01-01T00:00:00.000Z' WHERE id = ?`, opened.gate.id);
      expect(await board.sweepBoard('2030-06-01T00:00:00.000Z')).toMatchObject({ deliveriesExpired: 0, approvalsReleased: 0 });
      state.storage.sql.exec('UPDATE gates SET release_at = ? WHERE id = ?', releaseAt, opened.gate.id);

      expect(await board.sweepBoard(plus(35))).toMatchObject({ approvalsReleased: 1 });
      expect(await board.pendingDeliveryFollowUps()).toHaveLength(1);
      expect(await pushed(board, 'delivery.pending')).toHaveLength(1);
      expect(deliveryWaits()).toHaveLength(1);
      expect(await cardOf(board, opened.cardId)).toMatchObject({ currentStageKey: 'approve', needsHuman: { reason: 'review', detail: 'approved for manual delivery' } });
    });
  });

  it('blocks the card when the subject changed, and says why', async () => {
    await runInDurableObject(stub('rt-release-changed'), async (board: BoardDO, state) => {
      const opened = await openBoundGate(board, state, 'rt_rel_changed', { stages: boundStages(30) });
      await board.registerPushConfig({ agentId: 'agt_bridge', url: HOOK, token: 's', events: EVENTS });
      expect((await board.resolveGate(boundDecision(opened.gate, opened.subject))).ok).toBe(true);
      state.storage.sql.exec(`UPDATE approval_subjects SET status = 'invalidated' WHERE id = ?`, opened.subject.id);
      expect(await board.sweepBoard(plus(35))).toMatchObject({ approvalsReleased: 1 });
      expect(await cardOf(board, opened.cardId)).toMatchObject({ currentStageKey: 'approve', state: 'input-required', needsHuman: { reason: 'blocked' } });
      const [released] = await pushed(board, 'decision.released');
      expect(released).toMatchObject({ outcome: 'blocked', reason: 'the approved subject changed before the release time' });
      expect(gateRow(state, opened.gate.id).released_at).toEqual(expect.any(String));
      expect(await board.sweepBoard(plus(40))).toMatchObject({ approvalsReleased: 0 });
    });
  });

  it('blocks the card when the subject expired before the release time', async () => {
    await runInDurableObject(stub('rt-release-expired'), async (board: BoardDO, state) => {
      const opened = await openBoundGate(board, state, 'rt_rel_expired', { stages: boundStages(30), publicationPayload: payload(plus(40)) });
      await board.registerPushConfig({ agentId: 'agt_bridge', url: HOOK, token: 's', events: EVENTS });
      expect((await board.resolveGate(boundDecision(opened.gate, opened.subject))).ok).toBe(true);
      expect(await board.sweepBoard(plus(45))).toMatchObject({ approvalsReleased: 1 });
      const [released] = await pushed(board, 'decision.released');
      expect(released).toMatchObject({ outcome: 'blocked', reason: 'the approved subject expired before the release time' });
      expect((await cardOf(board, opened.cardId))?.currentStageKey).toBe('approve');
    });
  });
});

describe('a held approval may be pulled back', () => {
  it('by a decider: the card returns with the comment, the subject is invalidated, decision.pulled_back is pushed', async () => {
    await runInDurableObject(stub('rt-pull-decider'), async (board: BoardDO, state) => {
      const opened = await openBoundGate(board, state, 'rt_pull', { stages: boundStages(30) });
      await board.registerPushConfig({ agentId: 'agt_bridge', url: HOOK, token: 's', events: EVENTS });
      expect((await board.resolveGate(boundDecision(opened.gate, opened.subject))).ok).toBe(true);
      const r = await board.pullBackApproval({ gateId: opened.gate.id, by: DECIDER, comment: ' wrong image ' });
      expect(r).toMatchObject({ ok: true, value: { currentStageKey: 'draft', state: 'submitted' } });
      expect(state.storage.sql.exec('SELECT status FROM approval_subjects WHERE id = ?', opened.subject.id).one()).toEqual({ status: 'invalidated' });
      const handoff = state.storage.sql.exec('SELECT handoff_json FROM cards WHERE id = ?', opened.cardId).one();
      expect(JSON.parse(text(handoff.handoff_json))).toMatchObject({ feedback: 'wrong image' });
      const [body] = await pushed(board, 'decision.pulled_back');
      expect(body).toEqual({ event: 'decision.pulled_back', boardId: 'brd_fixture_rt_pull', cardId: opened.cardId, gateId: opened.gate.id, pulledBackBy: DECIDER, at: expect.any(String), comment: 'wrong image' });
      const read = await board.getGate(opened.gate.id);
      expect(read.ok && read.value).toMatchObject({ pulledBack: { by: DECIDER, comment: 'wrong image' } });
      expect(read.ok && read.value).not.toHaveProperty('heldUntil');
      // It never acts.
      expect(await board.sweepBoard(plus(35))).toMatchObject({ approvalsReleased: 0 });
      expect(await board.claim({ agentId: 'agt_w', capabilities: ['writing'] })).toMatchObject({ claimed: true });
    });
  });

  it('by an owner or admin who is not a decider', async () => {
    await runInDurableObject(stub('rt-pull-admin'), async (board: BoardDO, state) => {
      const opened = await openBoundGate(board, state, 'rt_pull_admin', { stages: boundStages(30) });
      expect((await board.resolveGate(boundDecision(opened.gate, opened.subject))).ok).toBe(true);
      expect(await board.pullBackApproval({ gateId: opened.gate.id, by: 'usr_member', comment: 'no', role: 'member' })).toMatchObject({ ok: false, code: 'APPROVAL_DECIDER_NOT_ALLOWED' });
      expect(await board.pullBackApproval({ gateId: opened.gate.id, by: 'agt_any', comment: 'no', role: 'owner' })).toMatchObject({ ok: false, code: 'APPROVAL_DECIDER_NOT_ALLOWED' });
      expect(await board.pullBackApproval({ gateId: opened.gate.id, by: 'usr_admin', comment: '  ', role: 'admin' })).toMatchObject({ ok: false, code: 'INVALID_COMMENT' });
      expect((await board.pullBackApproval({ gateId: opened.gate.id, by: 'usr_admin', comment: 'hold it', role: 'admin' })).ok).toBe(true);
    });
  });

  it('is refused after release, on a gate never held, and twice', async () => {
    await runInDurableObject(stub('rt-pull-refused'), async (board: BoardDO, state) => {
      const opened = await openBoundGate(board, state, 'rt_pull_ref', { stages: boundStages(30) });
      expect((await board.resolveGate(boundDecision(opened.gate, opened.subject))).ok).toBe(true);
      await board.sweepBoard(plus(35));
      expect(await board.pullBackApproval({ gateId: opened.gate.id, by: DECIDER, comment: 'too late' })).toMatchObject({ ok: false, code: 'APPROVAL_RELEASED' });
    });
    await runInDurableObject(stub('rt-pull-never'), async (board: BoardDO, state) => {
      const opened = await openBoundGate(board, state, 'rt_pull_never');
      expect((await board.resolveGate(boundDecision(opened.gate, opened.subject))).ok).toBe(true);
      expect(await board.pullBackApproval({ gateId: opened.gate.id, by: DECIDER, comment: 'stop' })).toMatchObject({ ok: false, code: 'GATE_NOT_HELD' });
    });
    await runInDurableObject(stub('rt-pull-twice'), async (board: BoardDO) => {
      const { gateId } = await openPlainGate(board, 'twice', { holdFor: 30 });
      expect((await board.resolveGate({ gateId, decision: 'approve', decidedBy: 'usr_a' })).ok).toBe(true);
      expect(await board.pullBackApproval({ gateId, by: 'agt_r', comment: 'mine', role: 'owner' })).toMatchObject({ ok: false, code: 'APPROVAL_DECIDER_NOT_ALLOWED' });
      expect((await board.pullBackApproval({ gateId, by: 'usr_b', comment: 'wait' })).ok).toBe(true);
      expect(await board.pullBackApproval({ gateId, by: 'usr_b', comment: 'again' })).toMatchObject({ ok: false, code: 'GATE_NOT_HELD' });
    });
  });
});

describe('over HTTP', () => {
  const TENANT = 'tnt_release_time';
  beforeEach(() => __resetJwksCacheForTests());
  beforeAll(async () => {
    await env.DB.prepare(`INSERT OR IGNORE INTO tenants (id, slug, name) VALUES (?, ?, 'Release')`).bind(TENANT, 'slug-release-time').run();
    for (const [user, role] of [['usr_rt_admin', 'admin'], ['usr_rt_member', 'member']] as const) {
      await env.DB.prepare(`INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)`).bind(user, `${user}@example.test`, user).run();
      await env.DB.prepare(`INSERT OR IGNORE INTO memberships (id, tenant_id, user_id, role) VALUES (?, ?, ?, ?)`).bind(newId('mem'), TENANT, user, role).run();
    }
  });
  const call = (method: string, path: string, userId: string, body?: unknown) =>
    SELF.fetch(`https://api.test${path}`, {
      method,
      headers: { 'content-type': 'application/json', 'X-Tenant-Id': TENANT, 'X-User-Id': userId },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

  it('a member may not create a board that holds approvals, or give one a bad hold', async () => {
    const stages = reviewPipeline({ holdFor: 30 });
    const ORG = 'org_0000000000000000e4d1';
    await withOrgPlane(async () => {
      await ensureOrgTenant(env.DB, ORG);
      // The fresh tenant's first visitor: a local owner (so `manage` admits them) whom Accounts calls a member.
      const token = await planeToken({ sub: 'prn_0000000000000000e4d1', email: 'first-held@example.com', org: ORG, orgRole: 'member' });
      const create = await SELF.fetch('https://api.test/v1/boards', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Held', stages }),
      });
      expect(create.status).toBe(403);
      expect(await create.json()).toMatchObject({ error: { code: 'WORKSPACE_ADMIN_REQUIRED' } });
    });
    expect((await call('POST', '/v1/boards', 'usr_rt_admin', { name: 'Held', stages })).status).toBe(201);
    const bad = await call('POST', '/v1/boards', 'usr_rt_admin', { name: 'Held', stages: reviewPipeline({ holdFor: 3 }) });
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({ error: { code: 'INVALID_STAGES' } });
  });

  it('pull-back: 200 for an admin, then 409; 400 without a comment', async () => {
    const boardId = newId('brd');
    const stages = reviewPipeline({ holdFor: 30 });
    const board = stubFor(env, TENANT, boardId);
    await board.init({ id: boardId, tenantId: TENANT, name: 'Held', stages });
    await recordBoard(env.DB, TENANT, { id: boardId, name: 'Held', stagesJson: JSON.stringify(stages) });
    const made = await board.createCard({ title: 'x', ownerUserId: 'usr_rt_admin' });
    if (!made.ok) throw new Error(made.message);
    const c = await board.claim({ agentId: 'agt_r', capabilities: ['research'] });
    if (!c.claimed) throw new Error('no claim');
    await board.complete({ runId: c.runId, leaseEpoch: c.leaseEpoch, handoff: { summary: 'd' } });
    const gateId = (await board.getState()).gates[0]?.id ?? '';
    expect((await call('POST', `/v1/boards/${boardId}/gates/${gateId}/resolve`, 'usr_rt_member', { decision: 'approve' })).status).toBe(200);
    const read = await call('GET', `/v1/boards/${boardId}/gates/${gateId}`, 'usr_rt_member');
    expect(await read.json()).toMatchObject({ gate: { heldUntil: expect.any(String), release: { holdForMinutes: 30 } } });
    const empty = await call('POST', `/v1/boards/${boardId}/gates/${gateId}/pull-back`, 'usr_rt_admin', { comment: '' });
    expect(empty.status).toBe(400);
    const ok = await call('POST', `/v1/boards/${boardId}/gates/${gateId}/pull-back`, 'usr_rt_admin', { comment: 'not this week' });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ card: { currentStageKey: 'research' } });
    const again = await call('POST', `/v1/boards/${boardId}/gates/${gateId}/pull-back`, 'usr_rt_admin', { comment: 'again' });
    expect(again.status).toBe(409);
    expect(await again.json()).toMatchObject({ error: { code: 'GATE_NOT_HELD' } });
  });
});
