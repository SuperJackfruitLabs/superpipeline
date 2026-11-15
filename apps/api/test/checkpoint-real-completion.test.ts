import { env, runInDurableObject } from 'cloudflare:test';
import { expect, it, vi } from 'vitest';
import { BoardDO, type StageDef } from '../src/board/board-do';
import type { BoardContext } from '../src/board/context';
import { checkpointTransaction, commitCheckpointCompletion } from '../src/board/checkpoint-completion';
import {
  settleCheckpointCandidate,
  createProposedCheckpointTables,
  type CheckpointCandidateDeps,
} from '../src/board/checkpoint-candidate';
import { checkpointDigest } from '../src/board/checkpoint-json';
import { parseCheckpointPolicy, parseCheckpointSubmission } from '../src/board/checkpoint-proposal';
import corpus from './fixtures/checkpoint-settlement/cases.json';
import { withReporting } from './helpers/superwitness';
let serial = 0;
it('ignored receipt insertion cannot advance the real run or card', () =>
  fixture(async (d, board, state, body) => {
    const cards = state.storage.sql.exec('SELECT * FROM cards').toArray();
    const runs = state.storage.sql.exec('SELECT * FROM runs').toArray();
    const events = state.storage.sql.exec('SELECT * FROM events').toArray();
    state.storage.sql.exec(`CREATE TRIGGER ignore_checkpoint_receipt BEFORE INSERT ON proposed_checkpoint_receipts
      BEGIN SELECT RAISE(IGNORE); END`);
    await expect(settleCheckpointCandidate(d, body, { privateTestOnly: true }))
      .rejects.toThrow('CHECKPOINT_RECEIPT_NOT_SAVED');
    expect(state.storage.sql.exec('SELECT * FROM proposed_checkpoint_receipts').toArray()).toHaveLength(0);
    expect(state.storage.sql.exec('SELECT * FROM cards').toArray()).toEqual(cards);
    expect(state.storage.sql.exec('SELECT * FROM runs').toArray()).toEqual(runs);
    expect(state.storage.sql.exec('SELECT * FROM events').toArray()).toEqual(events);
    expect(() => board.commitEffects?.requireActive()).toThrow('COMMIT_EFFECTS_REQUIRED');
  }));
async function fixture(
  test: (d: CheckpointCandidateDeps, b: BoardContext, state: DurableObjectState, raw: Uint8Array) => Promise<void>,
  next?: Partial<StageDef>,
  provider: 'forge' | 'github' = 'forge',
): Promise<void> {
  const id = `brd_realcandidate${serial++}`;
  await withReporting(() =>
    runInDurableObject(env.BOARD_DO.get(env.BOARD_DO.idFromName(id)), async (board, state) => {
      if (!(board instanceof BoardDO)) throw new Error('expected BoardDO');
      const policy = parseCheckpointPolicy(new TextEncoder().encode(JSON.stringify(corpus.producerBaseline.policy)));
      for (const repository of policy.repositories) repository.provider = provider;
      await board.init({
        id,
        tenantId: 'tnt_realcandidate',
        name: 'Real candidate',
        stages: [
          { key: 'test', name: 'Test', order: 0, ownerKind: 'capability', owner: 'code', checkpointPolicy: policy },
          { key: 'review', name: 'Review', order: 1, ownerKind: 'human', ...next },
        ],
      });
      const card = await board.createCard({ title: 'Work', ownerUserId: 'usr_example' });
      if (!card.ok) throw new Error(card.message);
      const claim = await board.claim({ agentId: 'agt_example', capabilities: ['code'], checkpointProtocol: 'superpipeline.checkpoint-claim.v1' });
      if (!claim.claimed) throw new Error('expected claim');
      const context: BoardContext = Reflect.get(board, 'board');
      createProposedCheckpointTables(state.storage.sql);
      const body = structuredClone(corpus.producerBaseline.settlementRequest);
      body.checkpoint.policyDigest = await checkpointDigest(policy);
      for (const member of body.checkpoint.checkpoint.members) member.provider = provider;
      body.checkpoint.binding = {
        ...body.checkpoint.binding,
        boardId: id,
        cardId: card.value.id,
        runId: claim.runId,
        leaseEpoch: claim.leaseEpoch,
      };
      body.checkpoint.checkpoint.key = card.value.id;
      body.checkpoint.checkpoint.members[0].branch = `card/${card.value.id}`;
      const raw = new TextEncoder().encode(JSON.stringify(body));
      const input = parseCheckpointSubmission(raw);
      const r = input.checkpoint;
      const d: CheckpointCandidateDeps = {
        sql: state.storage.sql,
        nowMs: () => Date.now(),
        transaction: (fn) => checkpointTransaction(context, fn),
        reporter: () => ({
          kind: 'service',
          principalId: policy.reporterPrincipalId,
          tenantId: 'tnt_realcandidate',
          scopes: ['checkpoints:submit'],
          expiresAt: Date.now() + 60000,
        }),
        current: () => {
          const run = context.getRunRow(claim.runId);
          const current = context.mustGetCard(card.value.id);
          const currentPolicy = context.stages().find((stage) => stage.key === r.binding.stageKey)?.checkpointPolicy;
          if (!currentPolicy) throw new Error('checkpoint policy missing');
          if (
            !run ||
            typeof run.agent_id !== 'string' ||
            typeof run.status !== 'string' ||
            typeof run.lease_epoch !== 'number' ||
            typeof run.last_heartbeat_ms !== 'number'
          )
            throw new Error('invalid authoritative run');
          return {
            tenantId: 'tnt_realcandidate',
            policy: currentPolicy,
            policyDigest: r.policyDigest,
            binding: {
              ...r.binding,
              agentId: run.agent_id,
              leaseEpoch: run.lease_epoch,
              stageKey: current.currentStageKey,
            },
            start: r.start,
            benchKey: r.checkpoint.key,
            benchId: r.checkpoint.benchId,
            requestId: r.checkpoint.requestId,
            sourceRequestSha256: r.sourceRequestSha256,
            workerContextSha256: '4'.repeat(64),
            status: run.status,
            lastHeartbeatMs: run.last_heartbeat_ms,
          };
        },
        // Only source verification is a stub. Every run/card/gate/outbox/effect mutation below is real Board code.
        verifySource: () => Promise.resolve(),
        commit: (submission) => commitCheckpointCompletion(context, submission, { tenantId: 'tnt_realcandidate', forgeHost: provider === 'forge' ? 'forge.example.test' : null, reporterPrincipalId: policy.reporterPrincipalId }),
      };
      try {
        await test(d, context, state, raw);
      } finally {
        await state.storage.deleteAlarm();
      }
    }),
  );
}
it('real completion helper commits run/card/outbox and receipt in one outer transaction', () =>
  fixture(async (d, b, state, raw) => {
    const receipt = await settleCheckpointCandidate(d, raw, { privateTestOnly: true });
    expect(state.storage.sql.exec('SELECT status,outcome FROM runs').one()).toMatchObject({
      status: 'ended',
      outcome: 'completed',
    });
    expect(state.storage.sql.exec('SELECT current_stage_key,state FROM cards').one()).toMatchObject({
      current_stage_key: 'review',
      state: 'completed',
    });
    expect(state.storage.sql.exec('SELECT * FROM run_reports').toArray()).toHaveLength(1);
    expect(state.storage.sql.exec('SELECT * FROM proposed_checkpoint_receipts').toArray()).toHaveLength(1);
    expect(b.getCardRow(receipt.checkpoint.key)?.handoff_json).toBe(
      JSON.stringify(parseCheckpointSubmission(raw).handoff),
    );
  }));
it('late outbox SQL failure rolls back real run/card/events/receipt and publishes no effects', () =>
  fixture(async (d, b, state, raw) => {
    const socket = new WebSocketPair();
    socket[0].accept();
    socket[1].accept();
    const send = vi.spyOn(socket[1], 'send').mockImplementation(() => undefined);
    const sockets = vi.spyOn(state, 'getWebSockets').mockReturnValue([socket[1]]);
    const before = state.storage.sql.exec('SELECT COUNT(*) AS n FROM events').one().n;
    const alarm = vi.spyOn(state.storage, 'setAlarm');
    state.storage.sql.exec(
      "INSERT INTO push_configs (id,agent_id,url,token,events_json,created_at) VALUES ('cfg_example','svc:example','https://example.test/push','synthetic','[\"card.completed\",\"card.advanced\"]','2026-11-15T00:00:00Z')",
    );
    state.storage.sql.exec(
      "CREATE TRIGGER fail_final_report BEFORE UPDATE ON run_reports BEGIN SELECT RAISE(ABORT,'final report failure'); END",
    );
    try {
      await expect(settleCheckpointCandidate(d, raw, { privateTestOnly: true })).rejects.toThrow(
        'final report failure',
      );
      expect(state.storage.sql.exec('SELECT status FROM runs').one().status).toBe('working');
      expect(state.storage.sql.exec('SELECT current_stage_key,state FROM cards').one()).toMatchObject({
        current_stage_key: 'test',
        state: 'working',
      });
      expect(state.storage.sql.exec('SELECT COUNT(*) AS n FROM events').one().n).toBe(before);
      expect(state.storage.sql.exec('SELECT * FROM proposed_checkpoint_receipts').toArray()).toHaveLength(0);
      expect(send).not.toHaveBeenCalled();
      expect(alarm).not.toHaveBeenCalled();
      expect(state.storage.sql.exec('SELECT * FROM push_deliveries').toArray()).toHaveLength(0);
    } finally {
      alarm.mockRestore();
      sockets.mockRestore();
      send.mockRestore();
      socket[0].close(1000);
      socket[1].close(1000);
    }
  }));
it('existing nested gate SQL transactions remain within the settlement effect scope', () =>
  fixture(
    async (d, _b, state, raw) => {
      await settleCheckpointCandidate(d, raw, { privateTestOnly: true });
      expect(state.storage.sql.exec('SELECT status FROM gates').one().status).toBe('pending');
      expect(state.storage.sql.exec('SELECT * FROM proposed_checkpoint_receipts').toArray()).toHaveLength(1);
    },
    { gate: 'approval' },
  ));
it('structured bound-approval transition refuses without guessing a new wire payload', () =>
  fixture(
    async (d, _b, state, raw) => {
      await expect(settleCheckpointCandidate(d, raw, { privateTestOnly: true })).rejects.toThrow(
        'APPROVAL_SUBJECT_REQUIRED',
      );
      expect(state.storage.sql.exec('SELECT status FROM runs').one().status).toBe('working');
      expect(state.storage.sql.exec('SELECT * FROM proposed_checkpoint_receipts').toArray()).toHaveLength(0);
    },
    { gate: 'approval', approvalSubjectSchema: 'social-publish/v1', approvalDeciderPrincipalIds: ['usr_example'] },
  ));

it('actual broadcast payload is snapshotted before deferral and published after commit', () =>
  fixture(async (_d, b, state) => {
    const pair = new WebSocketPair();
    pair[0].accept();
    pair[1].accept();
    const send = vi.spyOn(pair[1], 'send').mockImplementation(() => undefined);
    const sockets = vi.spyOn(state, 'getWebSockets').mockReturnValue([pair[1]]);
    const payload = { detail: { value: 'before' } };
    try {
      if (!b.commitEffects) throw new Error('missing effect scope');
      b.commitEffects.run(state.storage, () => {
        b.emit('fixture.immutable', payload);
        payload.detail.value = 'after';
        expect(send).not.toHaveBeenCalled();
        return undefined;
      });
      expect(send).toHaveBeenCalledTimes(1);
      const message = send.mock.calls[0]?.[0];
      if (typeof message !== 'string') throw new Error('expected immutable serialized message');
      expect(message).toContain('"value":"before"');
      expect(message).not.toContain('"value":"after"');
    } finally {
      sockets.mockRestore();
      send.mockRestore();
      pair[0].close(1000);
      pair[1].close(1000);
    }
  }));

it('post-commit delivery failure retains real settlement and exact replay never redispatches', () =>
  fixture(async (d, b, state, raw) => {
    const commit = d.commit;
    d.commit = (input, receipt) => {
      commit(input, receipt);
      if (!b.commitEffects) throw new Error('missing effect scope');
      b.commitEffects.afterCommit(() => {
        throw new Error('synthetic delivery failure');
      });
      return undefined;
    };
    await expect(settleCheckpointCandidate(d, raw, { privateTestOnly: true })).rejects.toThrow(
      'COMMITTED_EFFECT_DELIVERY_FAILED',
    );
    expect(state.storage.sql.exec('SELECT status FROM runs').one().status).toBe('ended');
    expect(state.storage.sql.exec('SELECT * FROM proposed_checkpoint_receipts').toArray()).toHaveLength(1);
    d.verifySource = () => {
      throw new Error('must not redispatch source');
    };
    d.commit = () => {
      throw new Error('must not repeat completion');
    };
    const replay = await settleCheckpointCandidate(d, raw, { privateTestOnly: true });
    expect(replay.runId).toBe(parseCheckpointSubmission(raw).checkpoint.binding.runId);
  }));
it('settlement writes a tenant-mapped commit reference with separate reporter and executor facts', () =>
  fixture(async (d, _b, state, raw) => {
    const input = parseCheckpointSubmission(raw);
    const receipt = await settleCheckpointCandidate(d, raw, { privateTestOnly: true });
    const member = input.checkpoint.checkpoint.members[0];
    const ref = state.storage.sql.exec('SELECT * FROM card_references').one();
    expect(ref).toMatchObject({ card_id: input.checkpoint.binding.cardId, run_id: input.checkpoint.binding.runId,
      url: `https://forge.example.test/${member.repository}/commit/${member.commit}`, provider: 'forge', source_type: 'commit',
      external_id: `${member.repository}@${member.commit}` });
    if (typeof ref.metadata_json !== 'string') throw new Error('expected reference metadata');
    expect(JSON.parse(ref.metadata_json)).toMatchObject({ checkpointSettlementId: receipt.settlementId,
      reporterPrincipalId: corpus.producerBaseline.policy.reporterPrincipalId, executingAgentId: input.checkpoint.binding.agentId });
    const before = state.storage.sql.exec('SELECT * FROM card_references').toArray();
    expect(await settleCheckpointCandidate(d, raw, { privateTestOnly: true })).toEqual(receipt);
    expect(state.storage.sql.exec('SELECT * FROM card_references').toArray()).toEqual(before);
  }));
it('ignored generated-reference insertion rolls back settlement, ownership, events and all references', () =>
  fixture(async (d, _b, state, raw) => {
    const cards = state.storage.sql.exec('SELECT * FROM cards').toArray();
    const runs = state.storage.sql.exec('SELECT * FROM runs').toArray();
    const events = state.storage.sql.exec('SELECT * FROM events').toArray();
    state.storage.sql.exec('CREATE TRIGGER ignore_generated_reference BEFORE INSERT ON card_references BEGIN SELECT RAISE(IGNORE); END');
    await expect(settleCheckpointCandidate(d, raw, { privateTestOnly: true })).rejects.toThrow('missing immediately after write');
    expect(state.storage.sql.exec('SELECT * FROM proposed_checkpoint_receipts').toArray()).toEqual([]);
    expect(state.storage.sql.exec('SELECT * FROM card_references').toArray()).toEqual([]);
    expect(state.storage.sql.exec('SELECT * FROM cards').toArray()).toEqual(cards);
    expect(state.storage.sql.exec('SELECT * FROM runs').toArray()).toEqual(runs);
    expect(state.storage.sql.exec('SELECT * FROM events').toArray()).toEqual(events);
  }));
it.each([null, 'https://forge.example.test', 'user@forge.example.test', 'forge.example.test:443', 'forge.example.test/path'])('refuses invalid server mapping %s without settlement effects', (forgeHost) =>
  fixture(async (d, b, state, raw) => {
    d.commit = (input) => commitCheckpointCompletion(b, input, { tenantId: 'tnt_realcandidate', forgeHost,
      reporterPrincipalId: corpus.producerBaseline.policy.reporterPrincipalId });
    await expect(settleCheckpointCandidate(d, raw, { privateTestOnly: true })).rejects.toThrow('CHECKPOINT_REFERENCE_MAPPING_REQUIRED');
    expect(state.storage.sql.exec('SELECT * FROM card_references').toArray()).toEqual([]);
    expect(state.storage.sql.exec('SELECT * FROM proposed_checkpoint_receipts').toArray()).toEqual([]);
    expect(state.storage.sql.exec('SELECT status FROM runs').one().status).toBe('working');
  }));
it('ignored existing-reference update cannot acknowledge changed settlement metadata', () =>
  fixture(async (d, b, state, raw) => {
    const input = parseCheckpointSubmission(raw), member = input.checkpoint.checkpoint.members[0];
    const original = await b.addReference({ cardId: input.checkpoint.binding.cardId,
      url: `https://forge.example.test/${member.repository}/commit/${member.commit}`, provider: 'forge', sourceType: 'commit', title: 'Existing', addedBy: 'user' });
    if (!original.ok) throw new Error(original.message);
    const before = state.storage.sql.exec('SELECT * FROM card_references').toArray();
    state.storage.sql.exec('CREATE TRIGGER ignore_generated_update BEFORE UPDATE ON card_references BEGIN SELECT RAISE(IGNORE); END');
    await expect(settleCheckpointCandidate(d, raw, { privateTestOnly: true })).rejects.toThrow('CHECKPOINT_REFERENCE_NOT_SAVED');
    expect(state.storage.sql.exec('SELECT * FROM card_references').toArray()).toEqual(before);
    expect(state.storage.sql.exec('SELECT * FROM proposed_checkpoint_receipts').toArray()).toEqual([]);
    expect(state.storage.sql.exec('SELECT status FROM runs').one().status).toBe('working');
  }));

it('GitHub commit links do not require or use a forge host', () =>
  fixture(async (d, _b, state, raw) => {
    const input = parseCheckpointSubmission(raw), member = input.checkpoint.checkpoint.members[0];
    await settleCheckpointCandidate(d, raw, { privateTestOnly: true });
    expect(state.storage.sql.exec('SELECT provider,url FROM card_references').one()).toEqual({ provider: 'github',
      url: `https://github.com/${member.repository}/commit/${member.commit}` });
  }, undefined, 'github'));
it.each(['tenant', 'reporter'] as const)('foreign %s mapping cannot write checkpoint links', (foreign) =>
  fixture(async (d, b, state, raw) => {
    d.commit = (input) => commitCheckpointCompletion(b, input, { tenantId: foreign === 'tenant' ? 'tnt_foreign' : 'tnt_realcandidate',
      forgeHost: 'forge.example.test', reporterPrincipalId: foreign === 'reporter' ? 'prn_foreign' : corpus.producerBaseline.policy.reporterPrincipalId });
    await expect(settleCheckpointCandidate(d, raw, { privateTestOnly: true })).rejects.toThrow('CHECKPOINT_REFERENCE_MAPPING_REQUIRED');
    expect(state.storage.sql.exec('SELECT * FROM card_references').toArray()).toEqual([]);
    expect(state.storage.sql.exec('SELECT * FROM proposed_checkpoint_receipts').toArray()).toEqual([]);
  }));
