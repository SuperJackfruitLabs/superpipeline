import { env, runInDurableObject } from 'cloudflare:test';
import { expect, it } from 'vitest';
import { BoardDO } from '../src/board/board-do';
import { withReporting } from './helpers/superwitness';
import corpus from './fixtures/checkpoint-settlement/cases.json';

const protocol = 'superpipeline.checkpoint-claim.v1';
let serial = 0;
async function fixture(check: (board: BoardDO, cardId: string) => Promise<void>) {
  const id = `brd_claimdiscovery${serial++}`;
  await withReporting(() => runInDurableObject(env.BOARD_DO.get(env.BOARD_DO.idFromName(id)), async (board, state) => {
    if (!(board instanceof BoardDO)) throw new Error('expected BoardDO');
    await board.init({ id, tenantId: 'tnt_discoveryexample', name: 'Discovery', stages: [{
      key: 'test', name: 'Test', order: 0, ownerKind: 'capability', owner: 'code',
      checkpointPolicy: corpus.producerBaseline.policy,
    }] });
    const made = await board.createCard({ title: 'Work', ownerUserId: 'usr_example' });
    if (!made.ok) throw new Error(made.message);
    try { await check(board, made.value.id); }
    finally { await state.storage.deleteAlarm(); }
  }));
}
it('does not hand checkpoint-required work to a legacy claimant', () => fixture(async (board, cardId) => {
  const result = await board.claim({ agentId: 'agt_example', capabilities: ['code'] });
  expect(result).toMatchObject({ claimed: false, reason: 'capability_mismatch' });
  expect((await board.getCard(cardId))?.state).toBe('queued');
}));
it('returns the actual immutable captured policy as an explicit claim discriminator', () => fixture(async (board, cardId) => {
  const input = { agentId: 'agt_example', capabilities: ['code'], checkpointProtocol: protocol };
  const result = await board.claim(input);
  expect(result).toMatchObject({ claimed: true, checkpointClaim: {
    version: protocol, admissionState: 'pending', tenantId: 'tnt_discoveryexample', cardId,
    stageKey: 'test', agentId: 'agt_example', policy: corpus.producerBaseline.policy,
    policyDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
  } });
  if (!result.claimed) throw new Error('expected claim');
  expect(Reflect.get(result, 'checkpointClaim')).toMatchObject({ runId: result.runId, leaseEpoch: result.leaseEpoch });
}));
