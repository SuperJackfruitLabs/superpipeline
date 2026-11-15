import { env, runInDurableObject } from 'cloudflare:test';
import { expect, it, vi } from 'vitest';
import { BoardDO } from '../src/board/board-do';
import type { BoardContext } from '../src/board/context';
import { STAGES, PRODUCER, payload } from './approval-subject-fixtures';
import { refuseDecisionPolicyChange, stageFieldError } from '../src/board/pipeline';
import { parseCheckpointPolicy } from '../src/board/checkpoint-proposal';
import corpus from './fixtures/checkpoint-settlement/cases.json';
const policy = parseCheckpointPolicy(new TextEncoder().encode(JSON.stringify(corpus.producerBaseline.policy)));
const stage = {
  key: 'code',
  name: 'Code',
  order: 0,
  ownerKind: 'capability' as const,
  owner: 'code',
  checkpointPolicy: policy,
};
it('policy addition/removal is admin-only and enabling remains disabled even for admins', () => {
  const plain = { ...stage, checkpointPolicy: undefined };
  expect(
    refuseDecisionPolicyChange([plain], [stage], { kind: 'person', mayChangeDecisionPolicy: false }),
  ).toMatchObject({ ok: false, code: 'WORKSPACE_ADMIN_REQUIRED' });
  expect(
    refuseDecisionPolicyChange([stage], [plain], { kind: 'person', mayChangeDecisionPolicy: false }),
  ).toMatchObject({ ok: false, code: 'WORKSPACE_ADMIN_REQUIRED' });
  expect(refuseDecisionPolicyChange([stage], [plain], { kind: 'person', mayChangeDecisionPolicy: true })).toBeNull();
  expect(stageFieldError(stage)).toContain('not enabled');
});
it('restored policy cannot be bypassed by ordinary completion or an empty card override', async () => {
  const stub = env.BOARD_DO.get(env.BOARD_DO.idFromName('checkpoint-policy-floor'));
  await runInDurableObject(stub, async (board, state) => {
    if (!(board instanceof BoardDO)) throw new Error('expected BoardDO');
    await board.init({
      id: 'brd_checkpointfloor',
      tenantId: 'tnt_checkpoint',
      name: 'Floor',
      stages: [stage, { key: 'done', name: 'Done', order: 1, ownerKind: 'human' }],
    });
    await board.createCard({ title: 'Work', ownerUserId: 'usr_example', spec: { completion: {} } });
    const claim = await board.claim({ agentId: 'agt_example', capabilities: ['code'] });
    if (!claim.claimed) throw new Error('expected claim');
    expect(
      await board.complete({
        runId: claim.runId,
        leaseEpoch: claim.leaseEpoch,
        agentId: 'agt_example',
        handoff: { summary: 'done' },
      }),
    ).toMatchObject({ ok: false, code: 'CHECKPOINT_REQUIRED' });
    expect(state.storage.sql.exec('SELECT status FROM runs WHERE id=?', claim.runId).toArray()[0]?.status).toBe(
      'working',
    );
  });
});
it('rechecks restored policy after asynchronous approval preparation before ending the run', async () => {
  const stub = env.BOARD_DO.get(env.BOARD_DO.idFromName('checkpoint-policy-after-approval'));
  await runInDurableObject(stub, async (board, state) => {
    if (!(board instanceof BoardDO)) throw new Error('expected BoardDO');
    await board.init({ id: 'brd_checkpointawait', tenantId: 'tnt_checkpoint', name: 'Await floor', stages: STAGES });
    const made = await board.createCard({ title: 'Work', ownerUserId: 'usr_example', projectId: 'prj_fixture' });
    if (!made.ok) throw new Error(made.message);
    const claim = await board.claim({ agentId: PRODUCER, capabilities: ['writing'] });
    if (!claim.claimed) throw new Error('expected claim');
    const context: BoardContext = Reflect.get(board, 'board');
    const original = context.prepareApprovalSubject.bind(context);
    const prepare = vi.spyOn(context, 'prepareApprovalSubject').mockImplementation(async (...args) => {
      const prepared = await original(...args);
      if (!prepared.ok) throw new Error(prepared.message);
      // Model a restored policy becoming current while hashing is awaited. Public
      // enabling writes remain disabled; restored state still must fail closed.
      const stages = STAGES.map((s) => s.key === claim.card.currentStageKey ? { ...s, checkpointPolicy: policy } : s);
      state.storage.sql.exec("UPDATE meta SET v = ? WHERE k = 'stages'", JSON.stringify(stages));
      return prepared;
    });
    const events = state.storage.sql.exec('SELECT COUNT(*) AS n FROM events').one().n;
    try {
      expect(await board.complete({
        runId: claim.runId, leaseEpoch: claim.leaseEpoch, agentId: PRODUCER,
        handoff: { publicationPayload: payload() },
      })).toMatchObject({ ok: false, code: 'CHECKPOINT_REQUIRED' });
      expect(prepare).toHaveBeenCalledOnce();
      expect(state.storage.sql.exec('SELECT status FROM runs WHERE id = ?', claim.runId).one().status).toBe('working');
      expect(state.storage.sql.exec('SELECT current_stage_key,state FROM cards WHERE id = ?', made.value.id).one()).toMatchObject({ current_stage_key: claim.card.currentStageKey, state: 'working' });
      expect(state.storage.sql.exec('SELECT id FROM approval_subjects').toArray()).toHaveLength(0);
      expect(state.storage.sql.exec('SELECT id FROM gates').toArray()).toHaveLength(0);
      expect(state.storage.sql.exec('SELECT COUNT(*) AS n FROM events').one().n).toBe(events);
    } finally {
      prepare.mockRestore();
      await state.storage.deleteAlarm();
    }
  });
});
