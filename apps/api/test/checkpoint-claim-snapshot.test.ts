import { initPrivateCheckpointBoard } from './helpers/checkpoint-policy';
import { env, runInDurableObject } from 'cloudflare:test';
import { expect, it, vi } from 'vitest';
import { BoardDO, type StageDef } from '../src/board/board-do';
import { parseCheckpointPolicy } from '../src/board/checkpoint-proposal';
import { readCheckpointClaim } from '../src/board/checkpoint-claims';
import type { BoardContext } from '../src/board/context';
import corpus from './fixtures/checkpoint-settlement/cases.json';

const policy = parseCheckpointPolicy(new TextEncoder().encode(JSON.stringify(corpus.producerBaseline.policy)));
const stage: StageDef = { key: 'code', name: 'Code', order: 0, ownerKind: 'capability', owner: 'code' };
let serial = 0;
async function fixture(stages: StageDef[], check: (board: BoardDO, state: DurableObjectState, cardId: string) => Promise<void>) {
  const id = `brd_claimsnapshot${serial++}`;
  await runInDurableObject(env.BOARD_DO.get(env.BOARD_DO.idFromName(id)), async (board, state) => {
    if (!(board instanceof BoardDO)) throw new Error('expected BoardDO');
    await initPrivateCheckpointBoard(board, { id, tenantId: 'tnt_claimsnapshot', name: 'Claim', stages });
    const made = await board.createCard({ title: 'Work', ownerUserId: 'usr_example' });
    if (!made.ok) throw new Error(made.message);
    try { await check(board, state, made.value.id); }
    finally { await state.storage.deleteAlarm(); }
  });
}
it('persists server-owned pending policy with the actual claimed run, without invented source facts', () =>
  fixture([{ ...stage, checkpointPolicy: policy }], async (board, state, cardId) => {
    const result = await board.claim({ agentId: 'agt_example', capabilities: ['code'], checkpointProtocol: 'superpipeline.checkpoint-claim.v1' });
    if (!result.claimed) throw new Error('expected claim');
    const row = state.storage.sql.exec('SELECT * FROM proposed_checkpoint_claims WHERE run_id=?', result.runId).one();
    expect(row).toMatchObject({ tenant_id: 'tnt_claimsnapshot', card_id: cardId, stage_key: 'code', agent_id: 'agt_example', epoch: result.leaseEpoch, admission_state: 'pending' });
    if (typeof row.policy_json !== 'string') throw new Error('expected policy JSON');
    expect(JSON.parse(row.policy_json)).toEqual(policy);
    expect(row.policy_digest).toMatch(/^[0-9a-f]{64}$/);
    expect(Object.keys(row).toSorted()).toEqual(['admission_state', 'agent_id', 'board_id', 'card_id', 'epoch', 'policy_digest', 'policy_json', 'run_id', 'stage_key', 'tenant_id']);
  }));
it('SQL failure after run insertion rolls back run, card, and pending snapshot together', () =>
  fixture([{ ...stage, checkpointPolicy: policy }], async (board, state, cardId) => {
    const before = state.storage.sql.exec('SELECT * FROM cards WHERE id=?', cardId).one();
    const events = state.storage.sql.exec('SELECT * FROM events').toArray();
    state.storage.sql.exec(`CREATE TRIGGER refuse_claim BEFORE UPDATE OF current_run_id ON cards WHEN NEW.current_run_id IS NOT NULL BEGIN SELECT RAISE(ABORT, 'injected claim save failure'); END`);
    await expect(board.claim({ agentId: 'agt_example', capabilities: ['code'], checkpointProtocol: 'superpipeline.checkpoint-claim.v1' })).rejects.toThrow('injected claim save failure');
    expect(state.storage.sql.exec('SELECT * FROM runs').toArray()).toHaveLength(0);
    expect(state.storage.sql.exec('SELECT * FROM proposed_checkpoint_claims').toArray()).toHaveLength(0);
    expect(state.storage.sql.exec('SELECT * FROM cards WHERE id=?', cardId).one()).toEqual(before);
    expect(state.storage.sql.exec('SELECT * FROM events').toArray()).toEqual(events);
  }));
it.each(['state', 'claim_seq', 'queued_grant', 'policy'] as const)('refuses changed %s after the authorization await before any claim writes', (field) =>
  fixture([stage], async (board, state, cardId) => {
    const events = state.storage.sql.exec('SELECT * FROM events').toArray();
    const result = board.claim({ agentId: 'agt_example', capabilities: ['code'], checkpointProtocol: 'superpipeline.checkpoint-claim.v1' });
    if (field === 'policy') state.storage.sql.exec("UPDATE meta SET v=? WHERE k='stages'", JSON.stringify([{ ...stage, checkpointPolicy: policy }]));
    else if (field === 'queued_grant') state.storage.sql.exec('UPDATE cards SET queued_grant=? WHERE id=?', JSON.stringify(['prn_changed']), cardId);
    else if (field === 'state') state.storage.sql.exec("UPDATE cards SET state='input-required' WHERE id=?", cardId);
    else state.storage.sql.exec('UPDATE cards SET claim_seq=99 WHERE id=?', cardId);
    expect(await result).toMatchObject({ claimed: false });
    expect(state.storage.sql.exec('SELECT * FROM runs').toArray()).toHaveLength(0);
    expect(state.storage.sql.exec('SELECT current_run_id FROM cards WHERE id=?', cardId).one().current_run_id).toBeNull();
    expect(state.storage.sql.exec('SELECT * FROM events').toArray()).toEqual(events);
  }));

it('ordinary claims leave source admission absent; missing records never mean verified source', () =>
  fixture([stage], async (board, state) => {
    const result = await board.claim({ agentId: 'agt_example', capabilities: ['code'], checkpointProtocol: 'superpipeline.checkpoint-claim.v1' });
    if (!result.claimed) throw new Error('expected claim');
    expect(readCheckpointClaim(state.storage.sql, result.runId)).toBeNull();
    expect(readCheckpointClaim(state.storage.sql, 'run_missing')).toBeNull();
  }));
it('same-card concurrent claims commit exactly one run and one pending identity', () =>
  fixture([{ ...stage, checkpointPolicy: policy }], async (board, state) => {
    const claims = await Promise.all([
      board.claim({ agentId: 'agt_example', capabilities: ['code'], checkpointProtocol: 'superpipeline.checkpoint-claim.v1' }),
      board.claim({ agentId: 'agt_other', capabilities: ['code'], checkpointProtocol: 'superpipeline.checkpoint-claim.v1' }),
    ]);
    expect(claims.filter((r) => r.claimed)).toHaveLength(1);
    expect(state.storage.sql.exec('SELECT * FROM runs').toArray()).toHaveLength(1);
    expect(state.storage.sql.exec('SELECT * FROM proposed_checkpoint_claims').toArray()).toHaveLength(1);
  }));
it('policy identity is rechecked after its asynchronous digest before claiming', () =>
  fixture([{ ...stage, checkpointPolicy: policy }], async (board, state) => {
    const original = crypto.subtle.digest.bind(crypto.subtle);
    const hash = vi.spyOn(crypto.subtle, 'digest').mockImplementation(async (...args) => {
      const digest = await original(...args);
      state.storage.sql.exec("UPDATE meta SET v=? WHERE k='stages'", JSON.stringify([{ ...stage, checkpointPolicy: { ...policy, allowUnchanged: !policy.allowUnchanged } }]));
      return digest;
    });
    try {
      expect(await board.claim({ agentId: 'agt_example', capabilities: ['code'], checkpointProtocol: 'superpipeline.checkpoint-claim.v1' })).toMatchObject({ claimed: false });
      expect(hash).toHaveBeenCalledOnce();
      expect(state.storage.sql.exec('SELECT * FROM runs').toArray()).toHaveLength(0);
      expect(state.storage.sql.exec('SELECT * FROM proposed_checkpoint_claims').toArray()).toHaveLength(0);
    } finally { hash.mockRestore(); }
  }));
it('pending identity cannot be rewritten or deleted, and corrupt restored rows are refused', () =>
  fixture([{ ...stage, checkpointPolicy: policy }], async (board, state) => {
    const result = await board.claim({ agentId: 'agt_example', capabilities: ['code'], checkpointProtocol: 'superpipeline.checkpoint-claim.v1' });
    if (!result.claimed) throw new Error('expected claim');
    const saved = readCheckpointClaim(state.storage.sql, result.runId);
    expect(saved).toMatchObject({ runId: result.runId, admissionState: 'pending', policy });
    expect(() => state.storage.sql.exec("UPDATE proposed_checkpoint_claims SET policy_digest=?", 'a'.repeat(64))).toThrow('immutable checkpoint claim');
    expect(() => state.storage.sql.exec('DELETE FROM proposed_checkpoint_claims')).toThrow('immutable checkpoint claim');
    expect(readCheckpointClaim(state.storage.sql, result.runId)).toEqual(saved);
    state.storage.sql.exec('DROP TRIGGER checkpoint_claim_no_update');
    state.storage.sql.exec("UPDATE proposed_checkpoint_claims SET policy_json='null'");
    expect(() => readCheckpointClaim(state.storage.sql, result.runId)).toThrow('INVALID_CHECKPOINT');
  }));
it('failure after claimed event rolls back SQL and discards websocket and alarm effects', () =>
  fixture([{ ...stage, checkpointPolicy: policy }], async (board, state) => {
    const context: BoardContext = Reflect.get(board, 'board');
    const pair = new WebSocketPair(); pair[0].accept(); pair[1].accept();
    const send = vi.spyOn(pair[1], 'send').mockImplementation(() => undefined);
    const sockets = vi.spyOn(state, 'getWebSockets').mockReturnValue([pair[1]]);
    const alarm = vi.spyOn(state.storage, 'setAlarm');
    const before = state.storage.sql.exec('SELECT * FROM events').toArray();
    const emit = context.emit.bind(context);
    const failed = vi.spyOn(context, 'emit').mockImplementation((type, payload) => {
      emit(type, payload);
      if (type === 'card.claimed') throw new Error('after claimed event');
    });
    try {
      await expect(board.claim({ agentId: 'agt_example', capabilities: ['code'], checkpointProtocol: 'superpipeline.checkpoint-claim.v1' })).rejects.toThrow('after claimed event');
      expect(state.storage.sql.exec('SELECT * FROM runs').toArray()).toHaveLength(0);
      expect(state.storage.sql.exec('SELECT * FROM proposed_checkpoint_claims').toArray()).toHaveLength(0);
      expect(state.storage.sql.exec('SELECT * FROM events').toArray()).toEqual(before);
      expect(send).not.toHaveBeenCalled(); expect(alarm).not.toHaveBeenCalled();
    } finally {
      failed.mockRestore(); alarm.mockRestore(); sockets.mockRestore(); send.mockRestore();
      pair[0].close(1000); pair[1].close(1000);
    }
  }));
it('a silently ignored pending insertion rolls back the actual run and card ownership', () =>
  fixture([{ ...stage, checkpointPolicy: policy }], async (board, state, cardId) => {
    const before = state.storage.sql.exec('SELECT * FROM cards WHERE id=?', cardId).one();
    state.storage.sql.exec('CREATE TRIGGER ignore_pending BEFORE INSERT ON proposed_checkpoint_claims BEGIN SELECT RAISE(IGNORE); END');
    await expect(board.claim({ agentId: 'agt_example', capabilities: ['code'], checkpointProtocol: 'superpipeline.checkpoint-claim.v1' })).rejects.toThrow('INVALID_CHECKPOINT_CLAIM');
    expect(state.storage.sql.exec('SELECT * FROM runs').toArray()).toHaveLength(0);
    expect(state.storage.sql.exec('SELECT * FROM proposed_checkpoint_claims').toArray()).toHaveLength(0);
    expect(state.storage.sql.exec('SELECT * FROM cards WHERE id=?', cardId).one()).toEqual(before);
  }));
it.each(['run', 'card'] as const)('a silently ignored %s write never returns an ordinary owner', (ignored) =>
  fixture([stage], async (board, state, cardId) => {
    const before = state.storage.sql.exec('SELECT * FROM cards WHERE id=?', cardId).one();
    const events = state.storage.sql.exec('SELECT * FROM events').toArray();
    state.storage.sql.exec(ignored === 'run'
      ? 'CREATE TRIGGER ignore_run BEFORE INSERT ON runs BEGIN SELECT RAISE(IGNORE); END'
      : 'CREATE TRIGGER ignore_card BEFORE UPDATE OF current_run_id ON cards BEGIN SELECT RAISE(IGNORE); END');
    await expect(board.claim({ agentId: 'agt_example', capabilities: ['code'], checkpointProtocol: 'superpipeline.checkpoint-claim.v1' })).rejects.toThrow('INVALID_CLAIM_STATE');
    expect(state.storage.sql.exec('SELECT * FROM runs').toArray()).toHaveLength(0);
    expect(state.storage.sql.exec('SELECT * FROM cards WHERE id=?', cardId).one()).toEqual(before);
    expect(state.storage.sql.exec('SELECT * FROM events').toArray()).toEqual(events);
  }));
