import { env, runInDurableObject } from 'cloudflare:test';
import { expect, it } from 'vitest';
import {
  settleCheckpointCandidate,
  createProposedCheckpointTables,
  type CheckpointCandidateDeps,
  type CheckpointClaimSnapshot,
  type VerifiedCheckpointReporter,
} from '../src/board/checkpoint-candidate';
import { parseCheckpointSubmission, parseCheckpointPolicy } from '../src/board/checkpoint-proposal';
import corpus from './fixtures/checkpoint-settlement/cases.json';
const raw = new TextEncoder().encode(JSON.stringify(corpus.producerBaseline.settlementRequest));
const approved = { privateTestOnly: true } as const;
let serial = 0;
async function fixture(
  test: (d: CheckpointCandidateDeps, s: CheckpointClaimSnapshot, actor: VerifiedCheckpointReporter) => Promise<void>,
): Promise<void> {
  const stub = env.BOARD_DO.get(env.BOARD_DO.idFromName(`checkpoint-candidate-${serial++}`));
  await runInDurableObject(stub, async (_board, state) => {
    const input = parseCheckpointSubmission(raw);
    const r = input.checkpoint;
    createProposedCheckpointTables(state.storage.sql);
    const clock = Date.parse('2026-11-15T12:00:00Z');
    state.storage.sql.exec(
      'INSERT INTO runs (id,card_id,stage_key,agent_id,lease_epoch,status,last_heartbeat_ms,started_at) VALUES (?,?,?,?,?,?,?,?)',
      r.binding.runId,
      r.binding.cardId,
      r.binding.stageKey,
      r.binding.agentId,
      r.binding.leaseEpoch,
      'working',
      clock,
      new Date(clock).toISOString(),
    );
    const snapshot: CheckpointClaimSnapshot = {
      tenantId: 'tnt_example1',
      policy: parseCheckpointPolicy(new TextEncoder().encode(JSON.stringify(corpus.producerBaseline.policy))),
      policyDigest: r.policyDigest,
      binding: r.binding,
      start: r.start,
      benchKey: r.checkpoint.key,
      benchId: r.checkpoint.benchId,
      requestId: r.checkpoint.requestId,
      status: 'working',
      lastHeartbeatMs: clock,
    };
    const actor: VerifiedCheckpointReporter = {
      tenantId: snapshot.tenantId,
      principalId: snapshot.policy.reporterPrincipalId,
      kind: 'service',
      scopes: ['checkpoints:submit'],
      expiresAt: clock + 60000,
    };
    const d: CheckpointCandidateDeps = {
      sql: state.storage.sql,
      transaction: (fn) => state.storage.transactionSync(fn),
      nowMs: () => clock,
      reporter: () => actor,
      current: () => {
        const row = state.storage.sql
          .exec('SELECT status,last_heartbeat_ms FROM runs WHERE id=?', r.binding.runId)
          .toArray()[0];
        if (!row || typeof row.status !== 'string' || typeof row.last_heartbeat_ms !== 'number')
          throw new Error('missing run');
        return { ...snapshot, status: row.status, lastHeartbeatMs: row.last_heartbeat_ms };
      },
      verifySource: () => Promise.resolve(),
      commit: () => {
        state.storage.sql.exec("UPDATE runs SET status='ended',outcome='completed' WHERE id=?", r.binding.runId);
        return undefined;
      },
    };
    await test(d, snapshot, actor);
  });
}
it('disabled before reading state or verifying source', () =>
  fixture(async (d) => {
    d.current = () => {
      throw new Error('must not read');
    };
    await expect(settleCheckpointCandidate(d, raw)).rejects.toThrow('DISABLED');
  }));
it('atomic receipt/run and exact historical replay never redispatch', () =>
  fixture(async (d) => {
    const first = await settleCheckpointCandidate(d, raw, approved);
    expect(d.current().status).toBe('ended');
    d.verifySource = () => {
      throw new Error('no redispatch');
    };
    expect(await settleCheckpointCandidate(d, raw, approved)).toEqual(first);
    expect(d.sql.exec('SELECT * FROM proposed_checkpoint_receipts').toArray()).toHaveLength(1);
  }));
it('commit failure rolls back receipt and run together', () =>
  fixture(async (d) => {
    const commit = d.commit;
    d.commit = (input, receipt) => {
      commit(input, receipt);
      throw new Error('final commit failed');
    };
    await expect(settleCheckpointCandidate(d, raw, approved)).rejects.toThrow('final commit failed');
    expect(d.current().status).toBe('working');
    expect(d.sql.exec('SELECT * FROM proposed_checkpoint_receipts').toArray()).toHaveLength(0);
  }));
it('post-await owner, policy, node, expiry and scope changes cannot commit', async () => {
  for (const change of ['epoch', 'policy', 'node', 'expired', 'scope'])
    await fixture(async (d, s, a) => {
      d.verifySource = () => {
        if (change === 'epoch') s.binding = { ...s.binding, leaseEpoch: s.binding.leaseEpoch + 1 };
        if (change === 'policy') s.policy = { ...s.policy, allowUnchanged: !s.policy.allowUnchanged };
        if (change === 'node') s.policy = { ...s.policy, nodeId: 'foreign' };
        if (change === 'expired') a.expiresAt = d.nowMs();
        if (change === 'scope') a.scopes = [];
        return Promise.resolve();
      };
      await expect(settleCheckpointCandidate(d, raw, approved)).rejects.toThrow(/STALE_LEASE|NOT_CHECKPOINT_REPORTER/);
      expect(d.current().status).toBe('working');
      expect(d.sql.exec('SELECT * FROM proposed_checkpoint_receipts').toArray()).toHaveLength(0);
    });
});
it('historical replay still requires current reporter authorization', () =>
  fixture(async (d, _s, a) => {
    await settleCheckpointCandidate(d, raw, approved);
    a.expiresAt = d.nowMs();
    await expect(settleCheckpointCandidate(d, raw, approved)).rejects.toThrow('NOT_CHECKPOINT_REPORTER');
  }));
it('same report with changed handoff is a conflict', () =>
  fixture(async (d) => {
    await settleCheckpointCandidate(d, raw, approved);
    const changed = structuredClone(corpus.producerBaseline.settlementRequest);
    changed.handoff.fails = 'different';
    await expect(
      settleCheckpointCandidate(d, new TextEncoder().encode(JSON.stringify(changed)), approved),
    ).rejects.toThrow('CHECKPOINT_CONFLICT');
  }));
it('source refusal and expired heartbeat preserve run/receipt', async () => {
  await fixture(async (d) => {
    d.verifySource = () => Promise.reject(new Error('host unavailable'));
    await expect(settleCheckpointCandidate(d, raw, approved)).rejects.toThrow('host unavailable');
    expect(d.current().status).toBe('working');
  });
  await fixture(async (d) => {
    d.sql.exec('UPDATE runs SET last_heartbeat_ms=0');
    await expect(settleCheckpointCandidate(d, raw, approved)).rejects.toThrow('STALE_LEASE');
    expect(d.current().status).toBe('working');
  });
});

it('source verifier cannot mutate the submission after its digest was bound', () =>
  fixture(async (d) => {
    d.verifySource = (input) => {
      input.handoff.summary = 'changed during verification';
      return Promise.resolve();
    };
    await expect(settleCheckpointCandidate(d, raw, approved)).rejects.toThrow('INVALID_CHECKPOINT');
    expect(d.current().status).toBe('working');
    expect(d.sql.exec('SELECT * FROM proposed_checkpoint_receipts').toArray()).toHaveLength(0);
  }));

it('runtime Promise callback rolls back receipt and its synchronous SQL prefix', () =>
  fixture(async (d) => {
    Reflect.set(d, 'commit', () => {
      d.sql.exec("UPDATE runs SET status='ended'");
      return Promise.resolve();
    });
    await expect(settleCheckpointCandidate(d, raw, approved)).rejects.toThrow('ASYNC_CHECKPOINT_COMMIT');
    expect(d.current().status).toBe('working');
    expect(d.sql.exec('SELECT * FROM proposed_checkpoint_receipts').toArray()).toHaveLength(0);
  }));
it('invalid restored heartbeat values never pass admission or post-await checks', async () => {
  for (const heartbeat of [NaN, Infinity, -Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    for (const late of [false, true])
      await fixture(async (d) => {
        const read = d.current.bind(d);
        const corrupt = () => {
          d.current = () => ({ ...read(), lastHeartbeatMs: heartbeat });
        };
        if (late)
          d.verifySource = () => {
            corrupt();
            return Promise.resolve();
          };
        else corrupt();
        await expect(settleCheckpointCandidate(d, raw, approved)).rejects.toThrow('STALE_LEASE');
        expect(read().status).toBe('working');
        expect(d.sql.exec('SELECT * FROM proposed_checkpoint_receipts').toArray()).toHaveLength(0);
      });
  }
});
it('invalid clocks cannot bypass reporter expiry', async () => {
  for (const now of [NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])
    await fixture(async (d) => {
      d.nowMs = () => now;
      await expect(settleCheckpointCandidate(d, raw, approved)).rejects.toThrow('INVALID_CHECKPOINT_STATE');
      expect(d.current().status).toBe('working');
      expect(d.sql.exec('SELECT * FROM proposed_checkpoint_receipts').toArray()).toHaveLength(0);
    });
});
