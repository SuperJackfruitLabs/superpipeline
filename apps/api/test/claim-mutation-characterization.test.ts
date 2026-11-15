import { env, runInDurableObject } from 'cloudflare:test';
import { expect, it, vi } from 'vitest';
import { BoardDO } from '../src/board/board-do';
import type { BoardContext } from '../src/board/context';

it('ordinary claim reports the new working run before emitting claimed and scheduling reclaim', async () => {
  const stub = env.BOARD_DO.get(env.BOARD_DO.idFromName('claim-mutation-characterization'));
  await runInDurableObject(stub, async (board, state) => {
    if (!(board instanceof BoardDO)) throw new Error('expected BoardDO');
    await board.init({ id: 'brd_claimcharacterization', tenantId: 'tnt_claim', name: 'Claim', stages: [
      { key: 'code', name: 'Code', order: 0, ownerKind: 'capability', owner: 'code' },
    ] });
    const card = await board.createCard({ title: 'Work', ownerUserId: 'usr_example' });
    if (!card.ok) throw new Error(card.message);
    const context: BoardContext = Reflect.get(board, 'board');
    const order: string[] = [];
    const report = context.reportRun.bind(context), emit = context.emit.bind(context);
    const reportSpy = vi.spyOn(context, 'reportRun').mockImplementation((id) => {
      expect(state.storage.sql.exec('SELECT status FROM runs WHERE id=?', id).one().status).toBe('working');
      expect(state.storage.sql.exec('SELECT state,current_run_id FROM cards WHERE id=?', card.value.id).one())
        .toMatchObject({ state: 'working', current_run_id: id });
      order.push('report'); report(id);
    });
    const emitSpy = vi.spyOn(context, 'emit').mockImplementation((type, payload) => {
      order.push(type); emit(type, payload);
    });
    const alarmSpy = vi.spyOn(context, 'scheduleReclaim').mockImplementation(() => {
      order.push('alarm'); return Promise.resolve();
    });
    try {
      const result = await board.claim({ agentId: 'agt_example', capabilities: ['code'] });
      expect(result.claimed).toBe(true);
      expect(order).toEqual(['report', 'card.claimed', 'alarm']);
      expect(state.storage.sql.exec('SELECT * FROM runs').toArray()).toHaveLength(1);
    } finally {
      reportSpy.mockRestore(); emitSpy.mockRestore(); alarmSpy.mockRestore();
      await state.storage.deleteAlarm();
    }
  });
});
