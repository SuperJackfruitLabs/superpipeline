import { env, runInDurableObject } from 'cloudflare:test';
import { describe, expect, it, vi } from 'vitest';
import { BoardDO } from '../src/board/board-do';
import { CHECKPOINT_CLAIM_PROTOCOL } from '../src/board/checkpoint-claims';
import type { BoardContext } from '../src/board/context';
import { withReporting } from './helpers/superwitness';

const NOW_MS = 1_800_000_000_000;
const NOW = new Date(NOW_MS).toISOString();
const AGENT = 'agt_parity';
const PRINCIPAL = 'prn_0123456789abcdef0123';
const HANDOFF = { summary: 'Keep the previous findings', checks: ['one', 'two'] };
const CASES = [
  { name: 'ordinary retry', result: 'claimed' },
  { name: 'own live reservation', result: 'claimed' },
  { name: 'expired reservation and placement window', result: 'claimed' },
  { name: 'another agent reservation', result: 'card_reserved' },
  { name: 'open placement window', result: 'placement_window' },
  { name: 'denied control pair', result: 'grant_denied' },
] as const;
type Scenario = (typeof CASES)[number];

// Only generated card/context/run/wait IDs differ between the two real DOs. Preserve every other
// value, including JSON bytes, clocks, epochs, report generations and event order.
function normalized(value: unknown, ids: Map<string, string>): unknown {
  if (typeof value === 'string') {
    let result = value;
    for (const [id, replacement] of ids) result = result.replaceAll(id, replacement);
    return result;
  }
  if (Array.isArray(value)) return value.map((item) => normalized(item, ids));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalized(item, ids)]));
  }
  return value;
}

async function exercise(scenario: Scenario, negotiated: boolean): Promise<unknown> {
  const stub = env.BOARD_DO.get(env.BOARD_DO.newUniqueId());
  return runInDurableObject(stub, async (board, state) => {
    if (!(board instanceof BoardDO)) throw new Error('expected BoardDO');
    const context: BoardContext = Reflect.get(board, 'board');
    const clock = vi.spyOn(context, 'now').mockReturnValue(NOW);
    const millis = vi.spyOn(context, 'nowMs').mockReturnValue(NOW_MS);
    const observers: Array<{ mockRestore(): void }> = [];
    try {
      await board.init({
        id: 'brd_parity', tenantId: 'tnt_parity', name: 'Parity',
        stages: [{ key: 'code', name: 'Code', order: 0, ownerKind: 'capability', owner: 'code' }],
      });
      const created = await board.createCard({
        title: 'Retain claim semantics', ownerUserId: 'usr_owner', queuedBy: 'prn_queuer',
        queuedGrant: [PRINCIPAL], queuedGrantOwner: 'prn_queuer',
      });
      if (!created.ok) throw new Error(created.message);
      const cardId = created.value.id;
      const claimant = { agentId: AGENT, capabilities: ['code'], principalId: PRINCIPAL, profileKey: 'profile_parity' };
      // A real ended attempt makes lastFailure, claim_seq and reporting history
      // observable; neither branch may quietly reset them on the retry.
      if (scenario.result === 'claimed') {
        const previous = await board.claim(claimant);
        if (!previous.claimed) throw new Error(previous.reason);
        const failed = await board.fail({ runId: previous.runId, leaseEpoch: previous.leaseEpoch, agentId: AGENT, reason: 'previous tool failure' });
        if (!failed.ok) throw new Error(failed.message);
      }
      state.storage.sql.exec('UPDATE cards SET handoff_json=? WHERE id=?', JSON.stringify(HANDOFF), cardId);
      if (scenario.name !== 'ordinary retry' && scenario.name !== 'denied control pair') {
        const window = await board.setPlacementWindow({ placementWindowSeconds: 10, by: 'svc:placement' });
        if (!window.ok) throw new Error(window.message);
        state.storage.sql.exec('UPDATE cards SET ready_since_ms=? WHERE id=?', NOW_MS, cardId);
      }
      if (scenario.name.includes('reservation')) {
        const heldAgent = scenario.name === 'another agent reservation' ? 'agt_other' : AGENT;
        const held = await board.reserveCard({
          cardId, agent: { agentId: heldAgent, name: heldAgent, capabilities: ['code'], principalId: PRINCIPAL, maxConcurrency: 1 },
          decisionId: 'dec_parity', reservedBy: 'prn_placement',
        });
        if (!held.ok) throw new Error(held.message);
        if (scenario.name === 'expired reservation and placement window') {
          state.storage.sql.exec('UPDATE cards SET reserved_until_ms=?,ready_since_ms=? WHERE id=?', NOW_MS - 1, NOW_MS - 11_000, cardId);
        }
      }
      if (scenario.name === 'denied control pair') {
        state.storage.sql.exec('UPDATE cards SET queued_grant=? WHERE id=?', JSON.stringify(['prn_someone_else']), cardId);
      }
      const before = state.storage.sql.exec('SELECT * FROM cards WHERE id=?', cardId).one();

      const trace: unknown[] = [];
      const report = context.reportRun.bind(context), emit = context.emit.bind(context);
      const schedule = context.scheduleReclaim.bind(context), notify = context.notify.bind(context);
      observers.push(vi.spyOn(context, 'reportRun').mockImplementation((id) => {
        // Capture full readbacks at publication time, not just the final state.
        trace.push({ report: {
          run: state.storage.sql.exec('SELECT * FROM runs WHERE id=?', id).one(),
          card: state.storage.sql.exec('SELECT * FROM cards WHERE id=?', cardId).one(),
        } });
        report(id);
      }));
      observers.push(vi.spyOn(context, 'emit').mockImplementation((type, payload) => {
        trace.push({ event: type, payload }); emit(type, payload);
      }));
      observers.push(vi.spyOn(context, 'notify').mockImplementation((kind, id, body) => {
        trace.push({ notification: kind, cardId: id, body }); notify(kind, id, body);
      }));
      observers.push(vi.spyOn(context, 'scheduleReclaim').mockImplementation(() => {
        trace.push('alarm'); return schedule();
      }));

      // On this policyless stage this is the sole request difference: absence
      // chooses claimOrdinarySelected; negotiation chooses the guarded path.
      const result = await board.claim({ ...claimant, ...(negotiated ? { checkpointProtocol: CHECKPOINT_CLAIM_PROTOCOL } : {}) });
      const card = state.storage.sql.exec('SELECT * FROM cards WHERE id=?', cardId).one();
      const runs = state.storage.sql.exec('SELECT * FROM runs ORDER BY rowid').toArray();
      const checkpointSchema = state.storage.sql.exec("SELECT name FROM sqlite_master WHERE name LIKE 'proposed_checkpoint_%' OR name LIKE 'checkpoint_claim_%' ORDER BY name").toArray();
      expect(checkpointSchema).toEqual([]);
      expect(result).not.toHaveProperty('checkpointClaim');
      let ownership: unknown = null;
      const successfulClaim = async () => {
        if (!result.claimed) throw new Error(result.reason);
        expect(scenario.result).toBe('claimed');
        expect(result.leaseEpoch, 'claim lease epoch').toBe(2);
        expect(result).toMatchObject({ leaseEpoch: 2, handoff: HANDOFF, lastFailure: { reason: 'previous tool failure', agentId: AGENT, stageKey: 'code', endedAt: NOW } });
        expect(result.stage).not.toHaveProperty('checkpointPolicy');
        expect(card).toMatchObject({ state: 'working', current_run_id: result.runId, delegate_agent_id: AGENT, claim_seq: 2, ready_since_ms: null, reserved_for: null, reserved_until_ms: null, reserved_stage_key: null, reserved_decision_id: null, reserved_by: null });
        expect(runs).toHaveLength(2);
        expect(runs[1]).toMatchObject({ id: result.runId, card_id: cardId, agent_id: AGENT, lease_epoch: 2, status: 'working', profile_key: 'profile_parity', queued_by: 'prn_queuer', last_heartbeat_ms: NOW_MS, started_at: NOW });
        expect(trace).toHaveLength(3);
        expect(trace[0]).toHaveProperty('report');
        expect(trace[1]).toEqual({ event: 'card.claimed', payload: { cardId, agentId: AGENT, runId: result.runId, ...(scenario.name === 'own live reservation' ? { reservationDecisionId: 'dec_parity' } : {}) } });
        expect(trace[2]).toBe('alarm');
        const owner = await board.getRunContext({ runId: result.runId, agentId: AGENT });
        if (!owner.ok) throw new Error(owner.message);
        expect(owner.value.stage).not.toHaveProperty('checkpointPolicy');
        expect(owner.value.handoff).toEqual(HANDOFF);
        const foreign = await board.getRunContext({ runId: result.runId, agentId: 'agt_foreign' });
        expect(foreign).toMatchObject({ ok: false, code: 'NOT_RUN_OWNER' });
        const stale = context.authorizeRun({ runId: result.runId, leaseEpoch: 1, agentId: AGENT });
        expect(stale).toMatchObject({ ok: false, code: 'STALE_LEASE' });
        const current = context.authorizeRun({ runId: result.runId, leaseEpoch: 2, agentId: AGENT });
        expect(current).toMatchObject({ ok: true, run: { id: result.runId, agent_id: AGENT, lease_epoch: 2 } });
        const reports = state.storage.sql.exec('SELECT * FROM run_reports ORDER BY rowid').toArray();
        expect(reports).toHaveLength(2);
        expect(reports[1]).toMatchObject({ run_id: result.runId, gen: 1, status: 'pending', next_attempt_at: NOW_MS });
        expect(await state.storage.getAlarm()).toBe(NOW_MS);
        return { owner, foreign, stale, current };
      };
      const deniedClaim = () => {
        expect(card.state).toBe('input-required');
        expect(state.storage.sql.exec("SELECT * FROM notifications WHERE kind='control-pair'").toArray()).toHaveLength(1);
        expect(trace).toContainEqual(expect.objectContaining({ event: 'card.blocked' }));
      };
      const unselectedClaim = () => {
        expect(card.state).toBe('submitted');
        expect(card).toEqual(before);
        expect(trace).toEqual([]);
      };
      const refusedClaim = () => {
        if (result.claimed) throw new Error('expected refusal');
        expect(result.reason).toBe(scenario.result);
        expect(runs).toEqual([]);
        expect(card.current_run_id).toBeNull();
        if (scenario.result === 'grant_denied') deniedClaim();
        else unselectedClaim();
      };
      if (result.claimed) ownership = await successfulClaim();
      else refusedClaim();
      expect(card.context_id).toBe(created.value.contextId);
      const ids = new Map([[cardId, '<card>'], [created.value.contextId, '<context>']]);
      if (scenario.result === 'grant_denied') {
        expect(card.needs_human_id).toEqual(expect.stringMatching(/^wait_/));
        if (typeof card.needs_human_id !== 'string') throw new Error('expected wait ID');
        ids.set(card.needs_human_id, '<wait>');
      }
      for (const [index, row] of runs.entries()) {
        if (typeof row.id !== 'string') throw new Error('expected run ID');
        ids.set(row.id, `<run:${index}>`);
      }
      return normalized({ result, before, card, runs, checkpointSchema, trace, ownership,
        reports: state.storage.sql.exec('SELECT * FROM run_reports ORDER BY rowid').toArray(),
        events: state.storage.sql.exec('SELECT * FROM events ORDER BY seq').toArray(),
        notifications: state.storage.sql.exec('SELECT * FROM notifications ORDER BY seq').toArray(),
        alarm: await state.storage.getAlarm(),
      }, ids);
    } finally {
      for (const observer of observers) observer.mockRestore();
      clock.mockRestore(); millis.mockRestore();
      await state.storage.deleteAlarm();
    }
  });
}

describe('ordinary claim parity across protocol negotiation', () => {
  it.each(CASES)('$name keeps ordinary state, effects and context', async (scenario) => {
    const knobs = ['ENFORCE_CONTROL_PAIR', 'PROPOSED_CHECKPOINT_POLICY', 'PROPOSED_CHECKPOINT_SOURCE', 'PROPOSED_CHECKPOINT_SETTLEMENT'];
    const saved = knobs.map((key) => ({ key, had: Reflect.has(env, key), value: Reflect.get(env, key) }));
    for (const key of knobs) Reflect.deleteProperty(env, key);
    Reflect.set(env, 'ENFORCE_CONTROL_PAIR', 'true');
    try {
      await withReporting(async () => {
        const ordinary = await exercise(scenario, false);
        const negotiated = await exercise(scenario, true);
        expect(negotiated).toEqual(ordinary);
      });
    } finally {
      for (const { key, had, value } of saved) {
        if (had) Reflect.set(env, key, value);
        else Reflect.deleteProperty(env, key);
      }
    }
  });
});
