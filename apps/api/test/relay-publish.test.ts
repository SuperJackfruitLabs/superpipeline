/**
 * Treaty plan step 7: a deployment with RELAY_URL and RELAY_TOKEN also publishes each relayed event
 * (gate.pending here; every board-chat event in relay-board-chat.test.ts) to the suite's event
 * relay, as a CloudEvent, through the board's own push queue. The direct push is untouched.
 */
import { env as testEnv, runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { fromBinary, parseSubject, parseType } from '@superjackfruitlabs/treaty-cloudevents';
import type { BoardDO } from '../src/board/board-do';
import { dispatchPushDeliveries, queueRelay, queueSubscribedPush, type PushDeps } from '../src/board/push';
import { RELAY_CONFIG_ID, relayRequest, relaySettings } from '../src/push/relay';
import type { PushSender } from '../src/push/deliver';
import { boardStub, STAGES } from './approval-subject-fixtures';

const RELAY = { RELAY_URL: 'https://relay.test/', RELAY_TOKEN: 'producer-token' };
/** A complete gate.pending body, as treaty's schema requires (test/setup.ts checks every pushed body). */
const gate = {
  event: 'gate.pending',
  boardId: 'brd_00000000000000r1',
  boardName: 'Relay',
  cardId: 'crd_0000000000000001',
  gateId: 'gte_1',
  stageKey: 'approve',
  returnStageKey: 'draft',
  cardTitle: 'A post',
  producedBy: 'agt_0000000000000001',
  handoffSummary: 'Ready to post.',
  options: [{ id: 'approve', label: 'Approve', meaning: 'approve', needsComment: false }],
  ts: '2026-11-11T09:00:00.000Z',
};

async function withBoard(name: string, env: Record<string, string>, fn: (deps: PushDeps, board: BoardDO) => Promise<void>) {
  await runInDurableObject(boardStub(name), async (board: BoardDO, state) => {
    await board.init({ id: 'brd_00000000000000r1', tenantId: 'tnt_relay', name: 'Relay', stages: STAGES });
    const meta: Record<string, string> = { boardId: 'brd_00000000000000r1', tenantId: 'tnt_relay' };
    const deps: PushDeps = {
      env: { ...testEnv, ...env },
      sql: state.storage.sql,
      now: () => '2026-11-11T09:00:00.000Z',
      getMeta: (k: string) => meta[k] ?? null,
    };
    await fn(deps, board);
  });
}

function capture(status = 202) {
  const sent: Array<{ url: string; headers: Record<string, string>; body: string }> = [];
  const sender: PushSender = async (url, init) => {
    sent.push({ url, headers: init.headers, body: init.body });
    return { status };
  };
  return { sent, sender };
}

describe('relaySettings', () => {
  it('is on only with both the URL and the token', () => {
    expect(relaySettings(RELAY)).toEqual({ url: 'https://relay.test', token: 'producer-token' });
    expect(relaySettings({ RELAY_URL: 'https://relay.test' })).toBeNull();
    expect(relaySettings({ RELAY_TOKEN: 't' })).toBeNull();
    expect(relaySettings(undefined)).toBeNull();
  });
});

describe('relayRequest', () => {
  it("names the board's tenant in the subject, and the treaty type and schema", () => {
    const body = JSON.stringify(gate);
    const request = relayRequest({ id: 7, body }, { boardId: gate.boardId, tenantId: 'tnt_relay' }, { url: 'https://relay.test', token: 'producer-token' });
    expect(request.url).toBe('https://relay.test/v1/events/evt.tnt_relay.superpipeline.gate.pending');
    expect(parseSubject(request.url.split('/v1/events/')[1] ?? '')).toMatchObject({ workspace: 'tnt_relay', entity: 'gate', verb: 'pending' });
    expect(request.headers.Authorization).toBe('Bearer producer-token');
    const event = fromBinary({ headers: request.headers, body: new TextEncoder().encode(body) }, 'http');
    expect(event.attributes).toMatchObject({
      id: 'brd_00000000000000r1:7',
      source: '/superpipeline/boards/brd_00000000000000r1',
      type: 'com.superjackfruit.superpipeline.gate.pending.v1',
      datacontenttype: 'application/json',
      time: gate.ts,
      dataschema: 'https://raw.githubusercontent.com/SuperJackfruitLabs/treaty/main/schemas/superpipeline/gate.pending.v1.json',
    });
    expect(parseType(event.attributes.type ?? '').version).toBe(1);
  });

  it('refuses an event treaty has no schema for', () => {
    expect(() => relayRequest({ id: 1, body: '{"event":"work.available"}' }, { boardId: 'b', tenantId: 't' }, { url: 'https://r', token: 't' })).toThrow(/no treaty schema for work.available/);
  });
});

describe('publishing through the relay', () => {
  it('queues a gate.pending for the relay beside the direct push, and sends it as a CloudEvent', async () => {
    await withBoard('relay-publish-1', RELAY, async (deps, board) => {
      await board.registerPushConfig({ agentId: 'svc:prn_0000000000000000c0b3', url: 'https://hub.test/push', token: 's', events: ['gate.pending'] });
      queueSubscribedPush(deps, gate);
      queueRelay(deps, gate);
      const rows = await board.getPushDeliveries();
      expect(rows.map((r) => r.configId)).toContain(RELAY_CONFIG_ID);
      expect(rows).toHaveLength(2);

      const { sent, sender } = capture();
      expect(await dispatchPushDeliveries(deps, sender)).toEqual({ sent: 2, failed: 0 });
      const toRelay = sent.find((s) => s.url.startsWith('https://relay.test/'));
      const toHub = sent.find((s) => s.url === 'https://hub.test/push');
      expect(toRelay?.url).toBe('https://relay.test/v1/events/evt.tnt_relay.superpipeline.gate.pending');
      expect(toRelay?.body).toBe(JSON.stringify(gate));
      expect(toRelay?.headers['ce-type']).toBe('com.superjackfruit.superpipeline.gate.pending.v1');
      expect(toRelay?.headers.Authorization).toBe('Bearer producer-token');
      expect(toHub?.headers['X-Superpipeline-Signature']).toMatch(/^sha256=/);
      expect(toHub?.body).toBe(toRelay?.body);
    });
  });

  it('retries a relay that fails, with the same CloudEvent id', async () => {
    await withBoard('relay-publish-2', RELAY, async (deps) => {
      queueRelay(deps, gate);
      const first = capture(503);
      expect(await dispatchPushDeliveries(deps, first.sender)).toEqual({ sent: 0, failed: 1 });
      const second = capture(202);
      expect(await dispatchPushDeliveries(deps, second.sender)).toEqual({ sent: 1, failed: 0 });
      expect(second.sent[0]?.headers['ce-id']).toBe(first.sent[0]?.headers['ce-id']);
    });
  });

  it('publishes nothing when the deployment names no relay', async () => {
    await withBoard('relay-publish-3', {}, async (deps, board) => {
      queueRelay(deps, gate);
      expect(await board.getPushDeliveries()).toEqual([]);
    });
  });

  it('publishes no record event and no work.available (relay-board-chat.test.ts covers what it does publish)', async () => {
    await withBoard('relay-publish-4', RELAY, async (deps, board) => {
      queueRelay(deps, { event: 'work.available' });
      queueRelay(deps, { event: 'card.created' });
      queueRelay(deps, { event: 'gate.resolved' });
      expect(await board.getPushDeliveries()).toEqual([]);
    });
  });
});
