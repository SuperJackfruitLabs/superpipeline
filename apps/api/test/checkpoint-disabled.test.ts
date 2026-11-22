import { env, runInDurableObject } from 'cloudflare:test';
import { expect, it } from 'vitest';
import { BoardDO } from '../src/board/board-do';
import type { BoardContext } from '../src/board/context';

it('leaves ordinary boards free of checkpoint schema and effect scopes with every flag unset', async () => {
  const stub = env.BOARD_DO.get(env.BOARD_DO.idFromName('checkpoint-disabled-schema'));
  await runInDurableObject(stub, async (board, state) => {
    if (!(board instanceof BoardDO)) throw new Error('expected BoardDO');
    const context: BoardContext = Reflect.get(board, 'board');
    expect(context.env.PROPOSED_CHECKPOINT_POLICY ?? '').toBe('');
    expect(context.env.PROPOSED_CHECKPOINT_SOURCE ?? '').toBe('');
    expect(context.env.PROPOSED_CHECKPOINT_SETTLEMENT ?? '').toBe('');
    await board.init({ id: 'brd_disabled', tenantId: 'tnt_disabled', name: 'Ordinary', stages: [
      { key: 'code', name: 'Code', order: 0, ownerKind: 'capability', owner: 'code' },
      { key: 'done', name: 'Done', order: 1, ownerKind: 'human' },
    ] });
    expect(state.storage.sql.exec("SELECT name FROM sqlite_master WHERE name LIKE 'proposed_checkpoint_%' OR name LIKE 'checkpoint_claim_%'").toArray()).toEqual([]);
    expect(context.commitEffects).toBeUndefined();
    const made = await board.createCard({ title: 'Ordinary work', ownerUserId: 'usr_example' });
    expect(made.ok).toBe(true);
    const claim = await board.claim({ agentId: 'agt_example', capabilities: ['code'] });
    if (!claim.claimed) throw new Error('expected ordinary claim');
    expect(claim).not.toHaveProperty('checkpointClaim');
    expect(JSON.parse(JSON.stringify(claim.stage))).not.toHaveProperty('checkpointPolicy');
    const run = await board.getRunContext({ runId: claim.runId, agentId: 'agt_example' });
    expect(run.ok).toBe(true);
    if (!run.ok) throw new Error(run.code);
    expect(JSON.parse(JSON.stringify(run.value.stage))).not.toHaveProperty('checkpointPolicy');
    expect((await board.complete({ runId: claim.runId, leaseEpoch: claim.leaseEpoch, agentId: 'agt_example', handoff: { summary: 'done' } })).ok).toBe(true);
    expect(context.commitEffects).toBeUndefined();
    expect(state.storage.sql.exec("SELECT name FROM sqlite_master WHERE name LIKE 'proposed_checkpoint_%' OR name LIKE 'checkpoint_claim_%'").toArray()).toEqual([]);
    await state.storage.deleteAlarm();
  });
});

it('omits a legacy empty checkpoint policy from claim and run-context JSON', async () => {
  const stub = env.BOARD_DO.get(env.BOARD_DO.idFromName('checkpoint-disabled-null'));
  await runInDurableObject(stub, async (board, state) => {
    if (!(board instanceof BoardDO)) throw new Error('expected BoardDO');
    await board.init({ id: 'brd_disablednull', tenantId: 'tnt_disabled', name: 'Ordinary', stages: [
      { key: 'code', name: 'Code', order: 0, ownerKind: 'capability', owner: 'code' },
    ] });
    // Characterize an old empty value at the durable read boundary, not an enabled policy.
    const saved = state.storage.sql.exec("SELECT v FROM meta WHERE k='stages'").one().v;
    if (typeof saved !== 'string') throw new Error('expected stage metadata');
    const stages: Array<Record<string, unknown>> = JSON.parse(saved);
    stages[0] = { ...stages[0], checkpointPolicy: null };
    state.storage.sql.exec("UPDATE meta SET v=? WHERE k='stages'", JSON.stringify(stages));
    await board.createCard({ title: 'Ordinary work', ownerUserId: 'usr_example' });
    const claim = await board.claim({ agentId: 'agt_example', capabilities: ['code'] });
    expect(claim.claimed).toBe(true);
    if (!claim.claimed) throw new Error('expected ordinary claim');
    expect(JSON.parse(JSON.stringify(claim.stage))).not.toHaveProperty('checkpointPolicy');
    const run = await board.getRunContext({ runId: claim.runId, agentId: 'agt_example' });
    if (!run.ok) throw new Error(run.code);
    expect(JSON.parse(JSON.stringify(run.value.stage))).not.toHaveProperty('checkpointPolicy');
    await state.storage.deleteAlarm();
  });
});
