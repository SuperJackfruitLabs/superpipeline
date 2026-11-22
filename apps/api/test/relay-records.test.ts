/**
 * Treaty phase 2, ruling 3: record events and `work.available` are relayed when the deployment
 * names a relay, under the same event id as their direct push. `work.available` stays per-agent on
 * the direct push. With no relay named, every event still reaches the push configs subscribed to
 * it, signed `x-treaty-signature`: a standalone SuperPipeline notifies its subscribers alone.
 */
import { env, runInDurableObject } from 'cloudflare:test';
import { afterEach, describe, expect, it } from 'vitest';
import { SIGNATURE_HEADER, verifyDelivery } from '@superjackfruitlabs/treaty-cloudevents';
import catalog from '@superjackfruitlabs/treaty-event-schemas/catalog.json';
import examples from '@superjackfruitlabs/treaty-contracts/data/fixtures/superpipeline-events/examples.json';
import type { BoardDO } from '../src/board/board-do';
import { dispatchPushDeliveries, queuePush, type PushDeps } from '../src/board/push';
import type { PushSender } from '../src/push/deliver';
import { RECORD_EVENTS, SUBSCRIBABLE_EVENTS } from '../src/push/events';
import { RELAY_CONFIG_ID } from '../src/push/relay';
import { boardStub, STAGES } from './approval-subject-fixtures';

const RELAY_URL = 'https://relay.test';
const TENANT = 'tnt_relay_records';
const UTF8 = new TextEncoder();

function nameRelay(): void {
  Reflect.set(env, 'RELAY_URL', RELAY_URL);
  Reflect.set(env, 'RELAY_TOKEN', 'producer-token');
}
afterEach(() => {
  Reflect.deleteProperty(env, 'RELAY_URL');
  Reflect.deleteProperty(env, 'RELAY_TOKEN');
});

function capture() {
  const sent: Array<{ url: string; headers: Record<string, string>; body: string }> = [];
  const sender: PushSender = async (url, init) => {
    sent.push({ url, headers: init.headers, body: init.body });
    return { status: 202 };
  };
  return { sent, sender };
}

function fieldOf(body: string, key: string): unknown {
  const parsed: unknown = JSON.parse(body);
  return typeof parsed === 'object' && parsed !== null && key in parsed ? Reflect.get(parsed, key) : undefined;
}
const eventOf = (body: string): unknown => fieldOf(body, 'event');

describe('record events and work.available on the relay', () => {
  it('a record event is relayed with no push config at all, under its seq', async () => {
    nameRelay();
    await runInDurableObject(boardStub('relay-records-alone'), async (board: BoardDO) => {
      await board.init({ id: 'brd_00000000000000a1', tenantId: TENANT, name: 'R', stages: STAGES });
      await board.createCard({ title: 'x', ownerUserId: 'usr_a' });
      const rows = await board.getPushDeliveries();
      const created = rows.filter((r) => eventOf(r.body) === 'card.created');
      expect(created.map((r) => r.configId)).toEqual([RELAY_CONFIG_ID]);
      expect(created[0]?.eventId).toBe(`brd_00000000000000a1:${String(fieldOf(created[0]?.body ?? '{}', 'seq'))}`);
      const { sent, sender } = capture();
      await board.dispatchPushDeliveries(sender);
      const relayed = sent.find((s) => eventOf(s.body) === 'card.created');
      expect(relayed?.url).toBe(`${RELAY_URL}/v1/events/evt.${TENANT}.superpipeline.card.created`);
      expect(relayed?.headers['ce-id']).toBe(created[0]?.eventId);
    });
  });

  it('a record event on both paths is one event: the relay and the direct push share its id', async () => {
    nameRelay();
    await runInDurableObject(boardStub('relay-records-both'), async (board: BoardDO) => {
      await board.init({ id: 'brd_00000000000000a2', tenantId: TENANT, name: 'R', stages: STAGES });
      await board.registerPushConfig({ agentId: 'svc:prn_0000000000000000c0b3', url: 'https://library.example.com/events', token: 'lib', events: [...RECORD_EVENTS] });
      await board.createCard({ title: 'x', ownerUserId: 'usr_a' });
      const created = (await board.getPushDeliveries()).filter((r) => eventOf(r.body) === 'card.created');
      expect(created.filter((r) => r.configId === RELAY_CONFIG_ID)).toHaveLength(1);
      expect(created).toHaveLength(2);
      expect(new Set(created.map((r) => r.eventId)).size).toBe(1);
      const { sent, sender } = capture();
      await board.dispatchPushDeliveries(sender);
      const ids = sent.filter((s) => eventOf(s.body) === 'card.created').map((s) => s.headers['ce-id']);
      expect(ids).toHaveLength(2);
      expect(new Set(ids)).toEqual(new Set([created[0]?.eventId]));
    });
  });

  it('work.available is relayed once, and pushed only to the agents that could claim it', async () => {
    nameRelay();
    await runInDurableObject(boardStub('relay-records-work'), async (board: BoardDO) => {
      await board.init({ id: 'brd_00000000000000a3', tenantId: TENANT, name: 'R', stages: STAGES });
      await board.registerPushConfig({ agentId: 'agt_writer', url: 'https://writer.example.com/push', token: 'a', capabilities: ['writing'], events: ['work.available'] });
      await board.registerPushConfig({ agentId: 'agt_painter', url: 'https://painter.example.com/push', token: 'b', capabilities: ['painting'], events: ['work.available'] });
      await board.createCard({ title: 'x', ownerUserId: 'usr_a' });
      const work = (await board.getPushDeliveries()).filter((r) => eventOf(r.body) === 'work.available');
      expect(new Set(work.map((r) => (r.configId === RELAY_CONFIG_ID ? 'relay' : r.url)))).toEqual(new Set(['https://writer.example.com/push', 'relay']));
      expect(work).toHaveLength(2);
      expect(new Set(work.map((r) => r.eventId)).size).toBe(1);
    });
  });

  it('nothing is relayed with no relay named', async () => {
    await runInDurableObject(boardStub('relay-records-none'), async (board: BoardDO) => {
      await board.init({ id: 'brd_00000000000000a4', tenantId: TENANT, name: 'R', stages: STAGES });
      await board.createCard({ title: 'x', ownerUserId: 'usr_a' });
      expect(await board.getPushDeliveries()).toEqual([]);
    });
  });
});

/** A valid body for each pushed event, from treaty's own examples. */
function exampleFor(event: string, boardId: string): Record<string, unknown> & { event: string } {
  const entry = catalog.events.find((e) => e.producer === 'superpipeline' && e.pushName === event);
  if (!entry) throw new Error(`treaty's catalog has no ${event}`);
  const file = entry.dataschema.split('/').pop()?.replace(/\.json$/, '') ?? '';
  const schemas: Record<string, { valid?: Record<string, unknown> }> = examples.schemas;
  const valid = Object.values(schemas[file]?.valid ?? {});
  const first = valid.find((v) => typeof v === 'object' && v !== null && 'event' in v && v.event === event) ?? valid[0];
  if (typeof first !== 'object' || first === null) throw new Error(`no example for ${event}`);
  return { ...first, event, boardId };
}

describe('a standalone SuperPipeline, with no relay', () => {
  it('pushes every event a config can subscribe to, each signed x-treaty-signature', async () => {
    await runInDurableObject(boardStub('relay-records-standalone'), async (board: BoardDO, state) => {
      const boardId = 'brd_00000000000000a5';
      await board.init({ id: boardId, tenantId: TENANT, name: 'R', stages: STAGES });
      const events = [...SUBSCRIBABLE_EVENTS];
      await board.registerPushConfig({ agentId: 'svc:prn_0000000000000000c0b3', url: 'https://subscriber.example.com/events', token: 'standalone', events });
      const meta: Record<string, string> = { boardId, tenantId: TENANT };
      const deps: PushDeps = { env, sql: state.storage.sql, now: () => '2026-11-23T09:00:00.000Z', getMeta: (k) => meta[k] ?? null };
      for (const event of events) queuePush(deps, exampleFor(event, boardId));
      const rows = await board.getPushDeliveries();
      expect(rows.filter((r) => r.configId === RELAY_CONFIG_ID)).toEqual([]);
      expect(new Set(rows.map((r) => eventOf(r.body)))).toEqual(new Set(events));

      const { sent, sender } = capture();
      // One config takes at most ten deliveries a drain, so it takes a few.
      for (let i = 0; i < 4; i++) await dispatchPushDeliveries(deps, sender);
      expect(sent).toHaveLength(events.length);
      const refused: string[] = [];
      for (const s of sent) {
        const id = s.headers['ce-id'] ?? '';
        await verifyDelivery('standalone', s.headers[SIGNATURE_HEADER] ?? null, id, UTF8.encode(s.body)).catch(() => refused.push(String(eventOf(s.body))));
        expect(id).toMatch(new RegExp(`^${boardId}:[0-9]+$`));
      }
      expect(refused).toEqual([]);
    });
  });
});
