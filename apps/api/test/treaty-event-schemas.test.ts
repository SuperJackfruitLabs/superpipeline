/**
 * The treaty check in test/setup.ts is live: a body read back here is checked against treaty's
 * schemas, and one that breaks its schema is refused. The gate, question and record tests that read
 * their pushes are what exercise each schema.
 */
import { runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import catalog from '@superjackfruitlabs/treaty-event-schemas/catalog.json';
import type { BoardDO } from '../src/board/board-do';
import { boardStub, STAGES } from './approval-subject-fixtures';
import { checkAgainstTreaty, treatyChecked } from './helpers/treaty-schemas';

describe("treaty's event schemas", () => {
  it('check every push body a test reads back', async () => {
    await runInDurableObject(boardStub('treaty-schemas'), async (board: BoardDO) => {
      await board.init({ id: 'brd_00000000000000e4', tenantId: 'tnt_a', name: 'Treaty', stages: STAGES });
      await board.registerPushConfig({ agentId: 'svc:prn_0000000000000000c0b3', url: 'https://library.example.com/events', token: 's', events: ['card.created'] });
      await board.createCard({ title: 'x', ownerUserId: 'usr_a' });
      const before = treatyChecked.count;
      const rows = await board.getPushDeliveries();
      expect(rows).toHaveLength(1);
      expect(treatyChecked.count).toBe(before + 1);
    });
  });

  it('refuse a body that breaks its schema', () => {
    const body = { event: 'card.created', boardId: 'brd_00000000000000e4', seq: 1, ts: '2026-11-10T00:00:00.000Z', cardIds: ['crd_1'] };
    expect(() => checkAgainstTreaty(JSON.stringify(body))).not.toThrow();
    expect(() => checkAgainstTreaty(JSON.stringify({ ...body, seq: 'one' }))).toThrow(/card.created does not validate/);
    expect(() => checkAgainstTreaty(JSON.stringify({ event: 'gate.pending', boardId: null }))).toThrow(/gate.pending does not validate/);
  });

  it("check every SuperPipeline event in treaty's catalog against its schema", () => {
    const events = catalog.events.filter((e) => e.producer === 'superpipeline').map((e) => e.pushName);
    expect(events).toEqual(expect.arrayContaining(['delivery.pending', 'attention.pending', 'decision.reminded', 'decision.escalated', 'gate.approval_recorded', 'decision.released', 'decision.pulled_back', 'check.failed', 'check.overridden']));
    // An empty body fails every schema, so a throw here proves the helper holds that event's schema.
    const refused = events.filter((event) => {
      try {
        checkAgainstTreaty(JSON.stringify({ event }));
        return false;
      } catch (err) {
        return err instanceof Error && err.message.startsWith(`${event} does not validate`);
      }
    });
    expect(refused).toEqual(events);
  });

  it('check work.available and cards.stale, which every push config can receive', () => {
    const work = { event: 'work.available', boardId: 'brd_00000000000000e4', cardId: 'crd_1', stageKey: 'a', ts: '2026-11-23T00:00:00.000Z' };
    expect(() => checkAgainstTreaty(JSON.stringify(work))).not.toThrow();
    expect(() => checkAgainstTreaty(JSON.stringify({ ...work, boardId: null }))).toThrow(/work.available does not validate/);
    expect(() => checkAgainstTreaty(JSON.stringify({ event: 'cards.stale', boardId: 'brd_00000000000000e4', boardName: '', cards: [], ts: work.ts }))).toThrow(/cards.stale does not validate/);
  });

  it('refuse a body whose event treaty has no schema for: every pushed body is typed', () => {
    expect(() => checkAgainstTreaty(JSON.stringify({ event: 'made.up' }))).toThrow(/made.up has no treaty schema/);
    expect(() => checkAgainstTreaty(JSON.stringify({ cardId: 'crd_1' }))).toThrow(/has no treaty schema/);
  });

  it('check the work.available and cards.stale bodies the board builds', async () => {
    await runInDurableObject(boardStub('treaty-schemas-work'), async (board: BoardDO) => {
      await board.init({ id: 'brd_00000000000000e5', tenantId: 'tnt_a', name: 'Treaty', stages: STAGES });
      await board.registerPushConfig({ agentId: 'agt_treaty', url: 'https://agent.example.com/push', token: 's', capabilities: ['writing'], events: ['work.available', 'cards.stale'] });
      await board.createCard({ title: 'x', ownerUserId: 'usr_a' });
      const before = treatyChecked.count;
      const rows = (await board.getPushDeliveries()).filter((r) => JSON.parse(r.body).event === 'work.available');
      expect(rows.length).toBeGreaterThan(0);
      expect(treatyChecked.count).toBeGreaterThan(before);
    });
  });
});
