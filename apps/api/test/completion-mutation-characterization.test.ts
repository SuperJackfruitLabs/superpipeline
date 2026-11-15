import { env, runInDurableObject } from 'cloudflare:test';
import { expect, it, vi } from 'vitest';
import { BoardDO, type StageDef, type CompleteVerbInput } from '../src/board/board-do';
import { withReporting } from './helpers/superwitness';

let next = 0;
const initial: StageDef = { key: 'code', name: 'Code', order: 0, ownerKind: 'capability', owner: 'code' };
async function fixture(
  stages: StageDef[],
  verify: (b: BoardDO, state: DurableObjectState, input: CompleteVerbInput, cardId: string) => Promise<void>,
): Promise<void> {
  const id = `brd_completionmutation${next++}`;
  await withReporting(() =>
    runInDurableObject(env.BOARD_DO.get(env.BOARD_DO.idFromName(id)), async (b, state) => {
      if (!(b instanceof BoardDO)) throw new Error('expected BoardDO');
      await b.init({ id, tenantId: 'tnt_completionmutation', name: 'Mutation characterization', stages });
      const card = await b.createCard({ title: 'Work', ownerUserId: 'usr_example' });
      if (!card.ok) throw new Error(card.message);
      const claim = await b.claim({ agentId: 'agt_example', capabilities: ['code'] });
      if (!claim.claimed) throw new Error('expected claim');
      state.storage.sql.exec(
        "INSERT INTO card_references (id,card_id,url,provider,source_type,added_by,created_at) VALUES ('ref_existing',?,'https://example.test/old','forge','commit','agent','2026-11-15T00:00:00Z')",
        card.value.id,
      );
      try {
        await verify(
          b,
          state,
          {
            runId: claim.runId,
            leaseEpoch: claim.leaseEpoch,
            agentId: 'agt_example',
            handoff: { summary: 'exact handoff' },
            outcome: 'pass',
          },
          card.value.id,
        );
      } finally {
        await state.storage.deleteAlarm();
      }
    }),
  );
}
it('ordinary success preserves exact handoff/references and reports the advanced run', () =>
  fixture(
    [initial, { key: 'review', name: 'Review', order: 1, ownerKind: 'capability', owner: 'review' }],
    async (b, state, input, cardId) => {
      const refs = state.storage.sql.exec('SELECT * FROM card_references').toArray();
      expect((await b.complete(input)).ok).toBe(true);
      const run = state.storage.sql.exec('SELECT * FROM runs WHERE id=?', input.runId).one();
      expect(run).toMatchObject({ status: 'ended', outcome: 'completed', handoff_json: JSON.stringify(input.handoff) });
      expect(
        state.storage.sql.exec('SELECT current_stage_key,state,handoff_json FROM cards WHERE id=?', cardId).one(),
      ).toMatchObject({ current_stage_key: 'review', state: 'submitted', handoff_json: JSON.stringify(input.handoff) });
      expect(state.storage.sql.exec('SELECT * FROM card_references').toArray()).toEqual(refs);
      const report = (await b.getRunReportOutbox()).find((r) => r.runId === input.runId);
      expect(report?.draft).toMatchObject({ status: 'succeeded', sourceStatus: 'completed' });
      expect((await b.getEvents()).some((e) => e.type === 'card.advanced')).toBe(true);
    },
  ));
it('ordinary unmet completion ends blocked and records one rework/error/outbox', () =>
  fixture([{ ...initial, completion: { handoff: ['missing'] } }], async (b, state, input, cardId) => {
    expect((await b.complete(input)).ok).toBe(true);
    const run = state.storage.sql.exec('SELECT * FROM runs WHERE id=?', input.runId).one();
    expect(run).toMatchObject({ status: 'ended', outcome: 'blocked', handoff_json: JSON.stringify(input.handoff) });
    expect(
      state.storage.sql.exec('SELECT current_stage_key,state,failure_count FROM cards WHERE id=?', cardId).one(),
    ).toMatchObject({ current_stage_key: 'code', state: 'submitted', failure_count: 1 });
    expect(
      state.storage.sql.exec("SELECT * FROM activities WHERE run_id=? AND type='error'", input.runId).toArray(),
    ).toHaveLength(1);
    expect((await b.getRunReportOutbox()).find((r) => r.runId === input.runId)?.draft.sourceStatus).toBe('blocked');
  }));
it('ordinary advancement failure leaves its earlier run end committed', () =>
  fixture(
    [initial, { key: 'review', name: 'Review', order: 1, ownerKind: 'capability', owner: 'review' }],
    async (b, state, input, cardId) => {
      state.storage.sql.exec(
        "CREATE TRIGGER fail_advance BEFORE UPDATE OF current_stage_key ON cards BEGIN SELECT RAISE(ABORT,'characterized advance failure'); END",
      );
      await expect(b.complete(input)).rejects.toThrow('characterized advance failure');
      expect(
        state.storage.sql.exec('SELECT status,outcome,handoff_json FROM runs WHERE id=?', input.runId).one(),
      ).toMatchObject({ status: 'ended', outcome: 'completed', handoff_json: JSON.stringify(input.handoff) });
      expect(
        state.storage.sql.exec('SELECT current_stage_key,state FROM cards WHERE id=?', cardId).one(),
      ).toMatchObject({ current_stage_key: 'code', state: 'working' });
    },
  ));
it('ordinary emit broadcasts and arms queued pushes before an outer rollback', () =>
  fixture([initial], async (b, state, _input, cardId) => {
    const pair = new WebSocketPair();
    const socket = pair[1];
    pair[0].accept();
    socket.accept();
    const send = vi.spyOn(socket, 'send').mockImplementation(() => undefined);
    const sockets = vi.spyOn(state, 'getWebSockets').mockReturnValue([socket]);
    let alarms = 0;
    const prior = Reflect.get(b, 'scheduleReclaim');
    Reflect.set(b, 'scheduleReclaim', () => {
      alarms++;
      return Promise.resolve();
    });
    state.storage.sql.exec(
      "INSERT INTO push_configs (id,agent_id,url,token,events_json,created_at) VALUES ('cfg_example','svc:example','https://example.test/push','synthetic','[\"card.completed\"]','2026-11-15T00:00:00Z')",
    );
    const before = state.storage.sql.exec('SELECT COUNT(*) AS n FROM events').one().n;
    try {
      expect(() =>
        state.storage.transactionSync(() => {
          const context: { emit: (type: string, payload: Record<string, unknown>) => void } = Reflect.get(b, 'board');
          context.emit('card.completed', { cardId });
          throw new Error('outer rollback');
        }),
      ).toThrow('outer rollback');
      expect(state.storage.sql.exec('SELECT COUNT(*) AS n FROM events').one().n).toBe(before);
      expect(state.storage.sql.exec('SELECT * FROM push_deliveries').toArray()).toHaveLength(0);
      expect(send).toHaveBeenCalledTimes(1);
      expect(alarms).toBe(1);
    } finally {
      sockets.mockRestore();
      send.mockRestore();
      pair[0].close(1000);
      socket.close(1000);
      Reflect.set(b, 'scheduleReclaim', prior);
    }
  }));
