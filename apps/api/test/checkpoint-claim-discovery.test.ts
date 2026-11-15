import { env, runInDurableObject } from 'cloudflare:test';
import { expect, it } from 'vitest';
import { BoardDO } from '../src/board/board-do';
import { withReporting } from './helpers/superwitness';
import { parseCheckpointPolicy } from '../src/board/checkpoint-proposal';
import corpus from './fixtures/checkpoint-settlement/cases.json';

const protocol = 'superpipeline.checkpoint-claim.v1';
let serial = 0;
async function fixture(check: (board: BoardDO, cardId: string, state: DurableObjectState) => Promise<void>) {
  const id = `brd_claimdiscovery${serial++}`;
  await withReporting(() => runInDurableObject(env.BOARD_DO.get(env.BOARD_DO.idFromName(id)), async (board, state) => {
    if (!(board instanceof BoardDO)) throw new Error('expected BoardDO');
    await board.init({ id, tenantId: 'tnt_discoveryexample', name: 'Discovery', stages: [{
      key: 'test', name: 'Test', order: 0, ownerKind: 'capability', owner: 'code',
      checkpointPolicy: parseCheckpointPolicy(new TextEncoder().encode(JSON.stringify(corpus.producerBaseline.policy))),
    }] });
    const made = await board.createCard({ title: 'Work', ownerUserId: 'usr_example' });
    if (!made.ok) throw new Error(made.message);
    try { await check(board, made.value.id, state); }
    finally { await state.storage.deleteAlarm(); }
  }));
}
it('does not hand checkpoint-required work to a legacy claimant', () => fixture(async (board, cardId, state) => {
  const result = await board.claim({ agentId: 'agt_example', capabilities: ['code'] });
  expect(result).toMatchObject({ claimed: false, reason: 'capability_mismatch' });
  expect(state.storage.sql.exec('SELECT state,current_run_id FROM cards WHERE id=?', cardId).one()).toEqual({ state: 'submitted', current_run_id: null });
  expect(state.storage.sql.exec('SELECT * FROM runs').toArray()).toEqual([]);
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

it.each(['superpipeline.checkpoint-claim.v2', '', 'other'])('unsupported RPC protocol %s cannot claim required work', (checkpointProtocol) => fixture(async (board) => {
  expect(await board.claim({ agentId: 'agt_example', capabilities: ['code'], checkpointProtocol })).toMatchObject({ claimed: false, reason: 'capability_mismatch' });
}));
it('legacy clients can still claim an ordinary lane on a mixed board', () => fixture(async (board, cardId, state) => {
  const raw = state.storage.sql.exec("SELECT v FROM meta WHERE k='stages'").one().v;
  if (typeof raw !== 'string') throw new Error('expected stages');
  const stages: unknown[] = JSON.parse(raw);
  state.storage.sql.exec("UPDATE meta SET v=? WHERE k='stages'", JSON.stringify([...stages, { key: 'plain', name: 'Plain', order: 1, ownerKind: 'capability', owner: 'code' }]));
  const made = await board.createCard({ title: 'Ordinary', ownerUserId: 'usr_example' });
  if (!made.ok) throw new Error(made.message);
  state.storage.sql.exec("UPDATE cards SET current_stage_key='plain' WHERE id=?", made.value.id);
  const result = await board.claim({ agentId: 'agt_example', capabilities: ['code'] });
  expect(result).toMatchObject({ claimed: true, card: { id: made.value.id } });
  expect(result).not.toHaveProperty('checkpointClaim');
  expect(state.storage.sql.exec('SELECT state,current_run_id FROM cards WHERE id=?', cardId).one()).toEqual({ state: 'submitted', current_run_id: null });
  expect(state.storage.sql.exec('SELECT * FROM proposed_checkpoint_claims').toArray()).toEqual([]);
}));
