/**
 * One id per event (treaty phase 2, ruling 2): every delivery row of one event carries the same id,
 * `<boardId>:<seq>`, where `seq` is the board's own event sequence. A consumer that receives the
 * event by the relay and by the direct push can then apply it once, keyed on that id.
 */
import { env as testEnv, runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import type { BoardDO } from '../src/board/board-do';
import { dispatchPushDeliveries, queuePush, type PushDeps } from '../src/board/push';
import { RELAY_CONFIG_ID } from '../src/push/relay';
import type { PushSender } from '../src/push/deliver';
import { boardStub, STAGES } from './approval-subject-fixtures';

const BOARD = 'brd_00000000000000d1';
const RELAY = { RELAY_URL: 'https://relay.test', RELAY_TOKEN: 'producer-token' };
const gate = {
  event: 'gate.pending',
  boardId: BOARD,
  boardName: 'Ids',
  cardId: 'crd_0000000000000001',
  gateId: 'gte_1',
  stageKey: 'approve',
  returnStageKey: 'draft',
  cardTitle: 'A post',
  producedBy: 'agt_0000000000000001',
  handoffSummary: 'Ready to post.',
  options: [{ id: 'approve', label: 'Approve', meaning: 'approve', needsComment: false }],
  ts: '2026-11-23T09:00:00.000Z',
};

async function withBoard(name: string, extraEnv: Record<string, string>, fn: (deps: PushDeps, board: BoardDO) => Promise<void>) {
  await runInDurableObject(boardStub(name), async (board: BoardDO, state) => {
    await board.init({ id: BOARD, tenantId: 'tnt_ids', name: 'Ids', stages: STAGES });
    const meta: Record<string, string> = { boardId: BOARD, tenantId: 'tnt_ids' };
    const deps: PushDeps = {
      env: { ...testEnv, ...extraEnv },
      sql: state.storage.sql,
      now: () => '2026-11-23T09:00:00.000Z',
      getMeta: (k: string) => meta[k] ?? null,
    };
    await fn(deps, board);
  });
}

const capture = () => {
  const sent: Array<{ url: string; headers: Record<string, string> }> = [];
  const sender: PushSender = async (url, init) => {
    sent.push({ url, headers: init.headers });
    return { status: 202 };
  };
  return { sent, sender };
};

describe('one id per event, shared by every delivery of it', () => {
  it("a record event's id is <boardId>:<seq>, the seq its body carries, on every config's row", async () => {
    await withBoard('event-ids-record', {}, async (_deps, board) => {
      await board.registerPushConfig({ agentId: 'svc:prn_0000000000000000c0b3', url: 'https://library.example.com/events', token: 'a', events: ['card.created'] });
      await board.registerPushConfig({ agentId: 'svc:prn_0000000000000000c0b4', url: 'https://other.example.com/events', token: 'b', events: ['card.created'] });
      await board.createCard({ title: 'one', ownerUserId: 'usr_a' });
      await board.createCard({ title: 'two', ownerUserId: 'usr_a' });
      const rows = (await board.getPushDeliveries()).filter((r) => JSON.parse(r.body).event === 'card.created');
      expect(rows).toHaveLength(4);
      for (const row of rows) expect(row.eventId).toBe(`${BOARD}:${JSON.parse(row.body).seq}`);
      expect(new Set(rows.map((r) => r.eventId)).size).toBe(2);
    });
  });

  it('a decision event has one id on the direct push and the relay, and the relay sends it as ce-id', async () => {
    await withBoard('event-ids-gate', RELAY, async (deps, board) => {
      await board.registerPushConfig({ agentId: 'svc:prn_0000000000000000c0b3', url: 'https://hub.example.com/push', token: 's', events: ['gate.pending'] });
      queuePush(deps, gate);
      queuePush(deps, gate);
      const rows = await board.getPushDeliveries();
      expect(rows.filter((r) => r.configId === RELAY_CONFIG_ID)).toHaveLength(2);
      expect(rows.filter((r) => r.configId.startsWith('push_'))).toHaveLength(2);
      const ids = [...new Set(rows.map((r) => r.eventId))];
      expect(ids).toHaveLength(2);
      for (const id of ids) expect(id).toMatch(new RegExp(`^${BOARD}:[0-9]+$`));
      // The seq is the board's own: the event log holds it, under the event's name.
      const logged = (await board.getEvents(500)).filter((e) => e.type === 'gate.pending').map((e) => `${BOARD}:${e.seq}`);
      expect(new Set(logged)).toEqual(new Set(ids));

      const { sent, sender } = capture();
      await dispatchPushDeliveries(deps, sender);
      const relayed = sent.filter((s) => s.url.startsWith('https://relay.test/')).map((s) => s.headers['ce-id']);
      expect(new Set(relayed)).toEqual(new Set(ids));
      expect(relayed).toHaveLength(2);
    });
  });

  it('a work.available sent to two agents is one event, with one id', async () => {
    await withBoard('event-ids-work', {}, async (_deps, board) => {
      await board.registerPushConfig({ agentId: 'agt_one', url: 'https://one.example.com/push', token: 'a', capabilities: ['writing'], events: ['work.available'] });
      await board.registerPushConfig({ agentId: 'agt_two', url: 'https://two.example.com/push', token: 'b', capabilities: ['writing'], events: ['work.available'] });
      await board.createCard({ title: 'x', ownerUserId: 'usr_a' });
      const rows = (await board.getPushDeliveries()).filter((r) => JSON.parse(r.body).event === 'work.available');
      expect(rows).toHaveLength(2);
      const [first, second] = rows.map((r) => r.eventId);
      expect(first).toMatch(new RegExp(`^${BOARD}:[0-9]+$`));
      expect(second).toBe(first);
    });
  });

  it('a record event and a work.available never share an id: one sequence names both', async () => {
    await withBoard('event-ids-namespace', {}, async (_deps, board) => {
      await board.registerPushConfig({ agentId: 'agt_one', url: 'https://one.example.com/push', token: 'a', capabilities: ['writing'], events: ['work.available', 'card.created'] });
      await board.createCard({ title: 'x', ownerUserId: 'usr_a' });
      const rows = await board.getPushDeliveries();
      expect(new Set(rows.map((r) => JSON.parse(r.body).event))).toEqual(new Set(['card.created', 'work.available']));
      expect(rows).toHaveLength(2);
      expect(new Set(rows.map((r) => r.eventId)).size).toBe(2);
    });
  });

  it('writes nothing to the event log for an event nobody receives', async () => {
    await withBoard('event-ids-nobody', {}, async (deps, board) => {
      const before = (await board.getEvents(500)).length;
      queuePush(deps, gate);
      expect(await board.getPushDeliveries()).toEqual([]);
      expect((await board.getEvents(500)).length).toBe(before);
    });
  });
});
