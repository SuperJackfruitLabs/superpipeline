import { env, runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import type { BoardDO, BoardInit } from '../src/board/board-do';

const STAGES: BoardInit['stages'] = [
  { key: 'reported', name: 'Reported', order: 0, ownerKind: 'human' },
  { key: 'reproduce', name: 'Reproduce', order: 1, ownerKind: 'capability', owner: 'diagnostics' },
];
const stub = (n: string) => env.BOARD_DO.get(env.BOARD_DO.idFromName(n)) as unknown as DurableObjectStub<BoardDO>;

describe('card provenance fields', () => {
  it('lastAgentId is the agent of the most recent run, and survives the run ending', async () => {
    await runInDurableObject(stub('prov-1'), async (b: BoardDO) => {
      await b.init({ id: 'brd_p', tenantId: 'tnt_p', name: 'P', stages: STAGES });
      const c = await b.createCard({ title: 'T', ownerUserId: 'usr_p' });
      if (!c.ok) throw new Error('card');
      expect(c.value.lastAgentId).toBeNull();
      await b.moveCard(c.value.id, 'reproduce', 'usr_p');
      const claim = await b.claim({ agentId: 'agt_eric', capabilities: ['diagnostics'] });
      if (!claim.claimed) throw new Error('claim');
      await b.block({ runId: claim.runId, leaseEpoch: claim.leaseEpoch, agentId: 'agt_eric', reason: 'not reproduced', summary: 'Needs one fresh DM per agent.' });
      const snap = await b.getState();
      const card = snap.cards.find((x) => x.id === c.value.id)!;
      expect(card.delegateAgentId).toBeNull();
      expect(card.lastAgentId).toBe('agt_eric');
      expect(card.needsHuman).toEqual({ reason: 'blocked', detail: 'not reproduced', summary: 'Needs one fresh DM per agent.' });
    });
  });

  it('stageSince moves on a stage change only; stateSince moves on either', async () => {
    await runInDurableObject(stub('prov-2'), async (b: BoardDO, state) => {
      await b.init({ id: 'brd_q', tenantId: 'tnt_q', name: 'Q', stages: STAGES });
      const c = await b.createCard({ title: 'T', ownerUserId: 'usr_q' });
      if (!c.ok) throw new Error('card');
      state.storage.sql.exec(`UPDATE cards SET updated_at = '2026-10-01T00:00:00Z', created_at = '2026-10-01T00:00:00Z', stage_since = '2026-10-01T00:00:00Z', state_since = '2026-10-01T00:00:00Z' WHERE id = ?`, c.value.id);
      state.storage.sql.exec(`UPDATE cards SET state = 'input-required', updated_at = '2026-10-02T00:00:00Z' WHERE id = ?`, c.value.id);
      let v = (await b.getState()).cards.find((x) => x.id === c.value.id)!;
      expect(v.stateSince).toBe('2026-10-02T00:00:00Z');
      expect(v.stageSince).toBe('2026-10-01T00:00:00Z');
      state.storage.sql.exec(`UPDATE cards SET current_stage_key = 'reproduce', updated_at = '2026-10-03T00:00:00Z' WHERE id = ?`, c.value.id);
      v = (await b.getState()).cards.find((x) => x.id === c.value.id)!;
      expect(v.stageSince).toBe('2026-10-03T00:00:00Z');
    });
  });

  it('queuedGrantOwner records whose grant a queue ran on, and is null when nobody said', async () => {
    await runInDurableObject(stub('prov-3'), async (b: BoardDO) => {
      await b.init({ id: 'brd_r', tenantId: 'tnt_r', name: 'R', stages: STAGES });
      const a = await b.createCard({ title: 'By an agent', ownerUserId: 'usr_r', queuedBy: 'prn_chotu', queuedByAgentId: 'agt_chotu', queuedGrant: ['prn_a', 'prn_b'], queuedGrantOwner: 'usr_r' });
      const h = await b.createCard({ title: 'By hand', ownerUserId: 'usr_r' });
      if (!a.ok || !h.ok) throw new Error('cards');
      expect(a.value.queuedGrantOwner).toBe('usr_r');
      expect(h.value.queuedGrantOwner).toBeNull();
    });
  });

  it('a move or resume with no grant keeps the earlier grant AND its owner together', async () => {
    await runInDurableObject(stub('prov-4'), async (b: BoardDO, state) => {
      await b.init({ id: 'brd_s', tenantId: 'tnt_s', name: 'S', stages: STAGES });
      const c = await b.createCard({ title: 'T', ownerUserId: 'usr_s', queuedGrant: ['prn_a'], queuedGrantOwner: 'usr_first' });
      if (!c.ok) throw new Error('card');
      const m = await b.moveCard(c.value.id, 'reproduce', 'usr_other', null, null, null);
      if (!m.ok) throw new Error('move');
      expect(m.value.queuedGrant).toEqual(['prn_a']);
      expect(m.value.queuedGrantOwner).toBe('usr_first');
      state.storage.sql.exec(`UPDATE cards SET state = 'input-required' WHERE id = ?`, c.value.id);
      const r = await b.resumeCard({ cardId: c.value.id, comment: 'again', toStageKey: 'reproduce', actor: { id: 'usr_other', name: null }, queuedGrant: null, queuedGrantOwner: 'usr_other' });
      if (!r.ok) throw new Error(r.message);
      expect(r.value.card.queuedGrant).toEqual(['prn_a']);
      expect(r.value.card.queuedGrantOwner).toBe('usr_first');
    });
  });

  it('a sub-task inherits the parent grant owner with the grant', async () => {
    await runInDurableObject(stub('prov-5'), async (b: BoardDO) => {
      await b.init({ id: 'brd_t', tenantId: 'tnt_t', name: 'T', stages: STAGES });
      const p = await b.createCard({ title: 'P', ownerUserId: 'usr_t', queuedGrant: ['prn_a'], queuedGrantOwner: 'usr_first' });
      if (!p.ok) throw new Error('card');
      const ch = await b.createChildCard(p.value.id, { title: 'C', ownerUserId: 'usr_t' });
      if (!ch.ok) throw new Error('child');
      expect(ch.value.queuedGrantOwner).toBe('usr_first');
    });
  });
});
