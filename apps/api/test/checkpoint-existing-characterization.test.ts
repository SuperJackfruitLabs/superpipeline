import { env, runInDurableObject } from 'cloudflare:test';
import { expect, it } from 'vitest';
import { BoardDO } from '../src/board/board-do';

it('characterizes ordinary completion: its owner/epoch guard alone does not expire heartbeat', async () => {
  const stub = env.BOARD_DO.get(env.BOARD_DO.idFromName('checkpoint-existing-heartbeat'));
  await runInDurableObject(stub, async (board, state) => {
    if (!(board instanceof BoardDO)) throw new Error('expected BoardDO');
    await board.init({
      id: 'brd_checkpointcharacterization',
      tenantId: 'tnt_checkpoint',
      name: 'Characterization',
      stages: [
        { key: 'code', name: 'Code', order: 0, ownerKind: 'capability', owner: 'code' },
        { key: 'done', name: 'Done', order: 1, ownerKind: 'human' },
      ],
    });
    await board.createCard({ title: 'Work', ownerUserId: 'usr_example' });
    const claim = await board.claim({ agentId: 'agt_example', capabilities: ['code'] });
    if (!claim.claimed) throw new Error('expected claim');
    state.storage.sql.exec('UPDATE runs SET last_heartbeat_ms=0 WHERE id=?', claim.runId);
    const result = await board.complete({
      runId: claim.runId,
      leaseEpoch: claim.leaseEpoch,
      agentId: 'agt_example',
      handoff: { summary: 'done' },
    });
    expect(result.ok).toBe(true);
    expect(state.storage.sql.exec('SELECT status FROM runs WHERE id=?', claim.runId).toArray()[0]?.status).toBe(
      'ended',
    );
  });
});
