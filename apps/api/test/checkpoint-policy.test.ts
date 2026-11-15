import { env, runInDurableObject } from 'cloudflare:test';
import { expect, it } from 'vitest';
import { BoardDO } from '../src/board/board-do';
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
