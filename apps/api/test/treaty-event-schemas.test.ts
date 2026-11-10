/**
 * The treaty check in test/setup.ts is live: a body read back here is checked against treaty's
 * schemas, and one that breaks its schema is refused. The gate, question and record tests that read
 * their pushes are what exercise each schema.
 */
import { runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
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

  it('skip an event treaty has no schema for yet', () => {
    expect(() => checkAgainstTreaty(JSON.stringify({ event: 'delivery.pending' }))).not.toThrow();
  });
});
