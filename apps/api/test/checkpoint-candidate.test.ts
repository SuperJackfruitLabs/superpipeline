import { env, runInDurableObject } from 'cloudflare:test';
import { expect, it, vi } from 'vitest';
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
      sourceRequestSha256: r.sourceRequestSha256,
      workerContextSha256: '4'.repeat(64),
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
      commit: () => {
        state.storage.sql.exec("UPDATE runs SET status='ended',outcome='completed' WHERE id=?", r.binding.runId);
        return undefined;
      },
    };
    await test(d, snapshot, actor);
  });
}
function beforeTransaction(d: CheckpointCandidateDeps, change: () => void): void {
  const transaction = d.transaction.bind(d);
  d.transaction = (commit) => {
    change();
    return transaction(commit);
  };
}
it('disabled before reading state or accepting a report', () =>
  fixture(async (d) => {
    d.current = () => {
      throw new Error('must not read');
    };
    await expect(settleCheckpointCandidate(d, raw)).rejects.toThrow('DISABLED');
  }));
it('a submitted report cannot replace the admitted source request digest', () =>
  fixture(async (d, snapshot) => {
    snapshot.sourceRequestSha256 = 'a'.repeat(64);
    await expect(settleCheckpointCandidate(d, raw, approved)).rejects.toThrow('INVALID_CHECKPOINT');
    expect(d.current().status).toBe('working');
    expect(d.sql.exec('SELECT * FROM proposed_checkpoint_receipts').toArray()).toHaveLength(0);
  }));
it('settles the selected reporter assertion without an invented host-proof callback', () =>
  fixture(async (d) => {
    // Decision 5 delegates operational observation to the authenticated Hub.
    // This assertion covers the local Board boundary, not the unfinished Hub path.
    Reflect.set(d, 'verifySource', () => {
      throw new Error('SuperPipeline cannot inspect a producer host from report hashes');
    });
    const receipt = await settleCheckpointCandidate(d, raw, approved);
    expect(receipt.reportedBy).toBe(d.reporter().principalId);
    expect(d.current().status).toBe('ended');
    expect(d.sql.exec('SELECT * FROM proposed_checkpoint_receipts').toArray()).toHaveLength(1);
  }));
it('atomic receipt/run and exact historical replay never redispatch', () =>
  fixture(async (d) => {
    const first = await settleCheckpointCandidate(d, raw, approved);
    expect(d.current().status).toBe('ended');
    d.commit = () => {
      throw new Error('must not repeat completion');
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
it('durable receipt cannot be rewritten or deleted after settlement', () =>
  fixture(async (d) => {
    const saved = await settleCheckpointCandidate(d, raw, approved);
    expect(() => d.sql.exec("UPDATE proposed_checkpoint_receipts SET receipt='{}'"))
      .toThrow('immutable checkpoint receipt');
    expect(() => d.sql.exec('DELETE FROM proposed_checkpoint_receipts'))
      .toThrow('immutable checkpoint receipt');
    expect(() => d.sql.exec('INSERT OR REPLACE INTO proposed_checkpoint_receipts SELECT * FROM proposed_checkpoint_receipts'))
      .toThrow('immutable checkpoint receipt');
    expect(await settleCheckpointCandidate(d, raw, approved)).toEqual(saved);
  }));
it('post-await owner, policy, node, expiry and scope changes cannot commit', async () => {
  for (const change of ['epoch', 'policy', 'node', 'expired', 'scope', 'worker-context'])
    await fixture(async (d, s, a) => {
      beforeTransaction(d, () => {
        if (change === 'epoch') s.binding = { ...s.binding, leaseEpoch: s.binding.leaseEpoch + 1 };
        if (change === 'policy') s.policy = { ...s.policy, allowUnchanged: !s.policy.allowUnchanged };
        if (change === 'node') s.policy = { ...s.policy, nodeId: 'foreign' };
        if (change === 'expired') a.expiresAt = d.nowMs();
        if (change === 'scope') a.scopes = [];
        if (change === 'worker-context') s.workerContextSha256 = 'f'.repeat(64);
      });
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
it('expired heartbeat preserves run/receipt', async () => {
  await fixture(async (d) => {
    d.sql.exec('UPDATE runs SET last_heartbeat_ms=0');
    await expect(settleCheckpointCandidate(d, raw, approved)).rejects.toThrow('STALE_LEASE');
    expect(d.current().status).toBe('working');
  });
});

it('freezes stored authority before the actual asynchronous policy digest', () =>
  fixture(async (d, snapshot) => {
    const original = crypto.subtle.digest.bind(crypto.subtle);
    let calls = 0;
    const hash = vi.spyOn(crypto.subtle, 'digest').mockImplementation(async (...args) => {
      const result = await original(...args);
      if (++calls === 3) snapshot.policy.allowUnchanged = !snapshot.policy.allowUnchanged;
      return result;
    });
    try {
      await expect(settleCheckpointCandidate(d, raw, approved)).rejects.toThrow('STALE_LEASE');
      expect(d.current().status).toBe('working');
      expect(d.sql.exec('SELECT * FROM proposed_checkpoint_receipts').toArray()).toHaveLength(0);
    } finally { hash.mockRestore(); }
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
          beforeTransaction(d, corrupt);
        else corrupt();
        await expect(settleCheckpointCandidate(d, raw, approved)).rejects.toThrow('STALE_LEASE');
        expect(read().status).toBe('working');
        expect(d.sql.exec('SELECT * FROM proposed_checkpoint_receipts').toArray()).toHaveLength(0);
      });
  }
});
it.each([false, true])('future heartbeat refuses settlement, including after hashing (%s)', async (late) => {
  await fixture(async (d) => {
    const read = d.current.bind(d);
    const corrupt = () => {
      d.current = () => ({ ...read(), lastHeartbeatMs: d.nowMs() + 1 });
    };
    if (late)
      beforeTransaction(d, corrupt);
    else corrupt();
    await expect(settleCheckpointCandidate(d, raw, approved)).rejects.toThrow('STALE_LEASE');
    expect(read().status).toBe('working');
    expect(d.sql.exec('SELECT * FROM proposed_checkpoint_receipts').toArray()).toHaveLength(0);
  });
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
