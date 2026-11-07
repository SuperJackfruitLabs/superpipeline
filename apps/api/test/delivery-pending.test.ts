/**
 * The decision envelope covers follow-ups (charter: decisions/2026-11-07-the-decision-envelope-
 * covers-questions-and-follow-ups.md).
 *
 * A person who approves a post with "I'll post it myself" still owes the board the link. The
 * board says so: it pushes `delivery.pending`, offering to record the live link or, when the
 * person saw the whole post, to post it automatically instead. A sweep reads the same body back
 * until a link is recorded or the mode is switched, and never once the approval has expired.
 */
import { env, runInDurableObject, SELF } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import { createAgent, createAgentToken } from '../src/db/catalog';
import { PREVIEW_TEXT_MAX } from '../src/approval-subject-kinds/kind';
import type { BoardDO } from '../src/board/board-do';
import { addBoundCard, boardStub, boundDecision, DECIDER, payload, STAGES } from './approval-subject-fixtures';
import { setupCatalog } from './helpers/catalog';

beforeAll(setupCatalog);

const HOOK = 'https://hub.example/api/bridge/superpipeline/push';

const RECORD_LIVE_URL = {
  id: 'record_live_url',
  label: 'I posted it — add the link',
  meaning: 'defer',
  needsComment: false,
  input: { kind: 'url', label: 'Live link', required: true, maxLength: 2000 },
};
const SWITCH_TO_AUTOMATIC = {
  id: 'switch_to_automatic',
  label: 'Post it automatically instead',
  meaning: 'approve',
  needsComment: false,
  delivery: 'automatic',
};

async function setUp(board: BoardDO, id: string, events = ['delivery.pending']) {
  await board.init({ id, tenantId: 'tnt_fixture', name: 'Fixture board', stages: STAGES });
  await board.registerPushConfig({ agentId: 'agt_bridge', url: HOOK, token: 's', events });
}

async function deliveryPushes(board: BoardDO): Promise<unknown[]> {
  const bodies: unknown[] = (await board.getPushDeliveries()).map((d) => JSON.parse(d.body));
  return bodies.filter((b) => typeof b === 'object' && b !== null && 'event' in b && b.event === 'delivery.pending');
}

describe('delivery.pending — a manual approval asks for the link', () => {
  it('is pushed when a bound gate is approved for manual delivery, with both options when the preview was complete', async () => {
    await runInDurableObject(boardStub('dp-manual'), async (board: BoardDO, state) => {
      await setUp(board, 'brd_dp_manual');
      const opened = await addBoundCard(board, state);
      const resolved = await board.resolveGate(boundDecision(opened.gate, opened.subject, DECIDER, 'approve_manual'));
      expect(resolved.ok).toBe(true);

      const pushes = await deliveryPushes(board);
      expect(pushes).toHaveLength(1);
      const [push] = pushes;
      expect(push).toMatchObject({
        event: 'delivery.pending',
        boardId: 'brd_dp_manual',
        boardName: 'Fixture board',
        cardId: opened.cardId,
        cardTitle: 'Sanitized approval fixture',
        gateId: opened.gate.id,
        stageKey: 'approve',
        approvalSubject: {
          id: opened.subject.id,
          digest: opened.subject.digest,
          schema: 'social-publish/v1',
          revision: expect.any(Number),
          expiresAt: '2030-01-02T03:04:05Z',
          previewComplete: true,
          preview: expect.arrayContaining([{ type: 'text', label: 'Post', text: payload().items[0]?.text }]),
        },
        ts: expect.any(String),
      });
      expect(push).toHaveProperty('options', [RECORD_LIVE_URL, SWITCH_TO_AUTOMATIC]);
      // The sweep reads back exactly what the push carried.
      expect(await board.pendingDeliveryFollowUps()).toEqual(pushes);
    });
  });

  it('offers only to record the link when the preview had to be cut', async () => {
    await runInDurableObject(boardStub('dp-cut'), async (board: BoardDO, state) => {
      await setUp(board, 'brd_dp_cut');
      const base = payload();
      const [item] = base.items;
      const opened = await addBoundCard(board, state, { publicationPayload: { ...base, items: [{ ...item, text: 'y'.repeat(PREVIEW_TEXT_MAX + 10) }] } });
      await board.resolveGate(boundDecision(opened.gate, opened.subject, DECIDER, 'approve_manual'));

      const [push] = await deliveryPushes(board);
      expect(push).toMatchObject({ approvalSubject: { previewComplete: false } });
      expect(push).toHaveProperty('options', [RECORD_LIVE_URL]);
    });
  });

  it('is not pushed for an automatic approval or an ordinary decision', async () => {
    await runInDurableObject(boardStub('dp-none'), async (board: BoardDO, state) => {
      await setUp(board, 'brd_dp_none', ['delivery.pending', 'gate.pending']);
      const automatic = await addBoundCard(board, state);
      await board.resolveGate(boundDecision(automatic.gate, automatic.subject, DECIDER, 'approve_automatic'));
      const rejected = await addBoundCard(board, state);
      await board.resolveGate(boundDecision(rejected.gate, rejected.subject, DECIDER, 'reject'));

      expect(await deliveryPushes(board)).toEqual([]);
      expect(await board.pendingDeliveryFollowUps()).toEqual([]);
    });
  });

  it('is not pushed to a config that did not subscribe to it', async () => {
    await runInDurableObject(boardStub('dp-unsub'), async (board: BoardDO, state) => {
      await setUp(board, 'brd_dp_unsub', ['gate.pending']);
      const opened = await addBoundCard(board, state);
      await board.resolveGate(boundDecision(opened.gate, opened.subject, DECIDER, 'approve_manual'));

      expect(await deliveryPushes(board)).toEqual([]);
      // The sweep does not depend on a subscription.
      expect(await board.pendingDeliveryFollowUps()).toHaveLength(1);
    });
  });
});

describe('pendingDeliveryFollowUps — the floor beneath the push', () => {
  it('stops naming a delivery once a live link is recorded', async () => {
    await runInDurableObject(boardStub('dp-recorded'), async (board: BoardDO, state) => {
      await setUp(board, 'brd_dp_recorded');
      const opened = await addBoundCard(board, state);
      await board.resolveGate(boundDecision(opened.gate, opened.subject, DECIDER, 'approve_manual'));
      expect(await board.pendingDeliveryFollowUps()).toHaveLength(1);

      const recorded = await board.updateApprovalDelivery({ gateId: opened.gate.id, actor: DECIDER, liveUrl: 'https://x.example.invalid/fixture/status/1' });
      expect(recorded.ok).toBe(true);
      expect(await board.pendingDeliveryFollowUps()).toEqual([]);
    });
  });

  it('stops naming a delivery once it is switched to automatic', async () => {
    await runInDurableObject(boardStub('dp-switched'), async (board: BoardDO, state) => {
      await setUp(board, 'brd_dp_switched');
      const opened = await addBoundCard(board, state);
      await board.resolveGate(boundDecision(opened.gate, opened.subject, DECIDER, 'approve_manual'));

      const switched = await board.updateApprovalDelivery({ gateId: opened.gate.id, actor: DECIDER, mode: 'automatic' });
      expect(switched.ok).toBe(true);
      expect(await board.pendingDeliveryFollowUps()).toEqual([]);
    });
  });

  it('does not name, or push, a delivery whose approval has expired', async () => {
    await runInDurableObject(boardStub('dp-expired'), async (board: BoardDO, state) => {
      await setUp(board, 'brd_dp_expired');
      const opened = await addBoundCard(board, state, { publicationPayload: payload('2020-01-01T00:00:00Z') });
      await board.resolveGate(boundDecision(opened.gate, opened.subject, DECIDER, 'approve_manual'));

      expect(await deliveryPushes(board)).toEqual([]);
      expect(await board.pendingDeliveryFollowUps()).toEqual([]);
    });
  });

  it('keeps every delivery that is still owed, oldest first', async () => {
    await runInDurableObject(boardStub('dp-two'), async (board: BoardDO, state) => {
      await setUp(board, 'brd_dp_two');
      const first = await addBoundCard(board, state);
      const second = await addBoundCard(board, state);
      await board.resolveGate(boundDecision(first.gate, first.subject, DECIDER, 'approve_manual'));
      await board.resolveGate(boundDecision(second.gate, second.subject, DECIDER, 'approve_manual'));

      const pending = await board.pendingDeliveryFollowUps();
      expect(pending.map((p) => p.gateId)).toEqual([first.gate.id, second.gate.id]);
    });
  });
});

async function boardFor(tenantId: string): Promise<string> {
  const res = await SELF.fetch('https://api.test/v1/boards', {
    method: 'POST',
    headers: { 'X-Tenant-Id': tenantId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Deliveries', stages: [{ key: 'review', name: 'Review', order: 0, ownerKind: 'human' }] }),
  });
  const body: unknown = await res.json();
  if (typeof body !== 'object' || body === null || !('boardId' in body) || typeof body.boardId !== 'string') throw new Error('no board');
  return body.boardId;
}

describe('GET /v1/boards/:id/deliveries/pending', () => {
  it('answers a bridge holding only its own agent token, as gates/pending does', async () => {
    const tenantId = 'tnt_dp_route1';
    const boardId = await boardFor(tenantId);
    const agent = await createAgent(env.DB, tenantId, { name: 'The bridge', capabilities: [] });
    const { token } = await createAgentToken(env.DB, tenantId, agent.id, ['claim']);

    const res = await SELF.fetch(`https://api.test/v1/boards/${boardId}/deliveries/pending`, { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deliveries: [] });
  });

  it('answers a person', async () => {
    const tenantId = 'tnt_dp_route2';
    const boardId = await boardFor(tenantId);
    const res = await SELF.fetch(`https://api.test/v1/boards/${boardId}/deliveries/pending`, { headers: { 'X-Tenant-Id': tenantId } });
    expect(res.status).toBe(200);
  });

  it('refuses a request carrying no credential at all', async () => {
    const boardId = await boardFor('tnt_dp_route3');
    const res = await SELF.fetch(`https://api.test/v1/boards/${boardId}/deliveries/pending`);
    expect(res.status).toBe(401);
  });
});
