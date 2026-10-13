import { SELF, env, runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import type { BoardDO } from '../src/board/board-do';

const H = (t: string, u = 'usr_g') => ({ 'X-Tenant-Id': t, 'X-User-Id': u, 'Content-Type': 'application/json' });

async function gatedCard(tenant: string) {
  const b = await (await SELF.fetch('https://api.test/v1/boards', { method: 'POST', headers: H(tenant), body: JSON.stringify({ name: 'G', stages: [
    { key: 'draft', name: 'Draft', order: 0, ownerKind: 'capability', owner: 'writing' },
    { key: 'review', name: 'Review', order: 1, ownerKind: 'human', gate: 'approval' },
  ] }) })).json<{ boardId: string }>();
  const stub = env.BOARD_DO.get(env.BOARD_DO.idFromName(`${tenant}:${b.boardId}`)) as unknown as DurableObjectStub<BoardDO>;
  let gateId = '';
  await runInDurableObject(stub, async (_d: BoardDO, state) => {
    state.storage.sql.exec(`INSERT INTO cards (id, title, owner_user_id, current_stage_key, state, context_id, created_at) VALUES ('card_g', 'G', 'usr_g', 'review', 'input-required', 'ctx_g', '2026-10-11T07:00:00Z')`);
    state.storage.sql.exec(`INSERT INTO gates (id, card_id, stage_key, return_stage_key, status, produced_by, options_json, created_at) VALUES ('gate_g', 'card_g', 'review', 'draft', 'pending', 'agt_w', ?, '2026-10-11T07:00:00Z')`,
      JSON.stringify([{ name: 'approve', title: 'Approve', description: 'File it as it is.' }, { name: 'request_changes', title: 'Request changes', interactive: true }, { name: 'reject', title: 'Reject' }]));
    gateId = 'gate_g';
  });
  return { boardId: b.boardId, gateId, stub };
}

describe('a gate decided elsewhere', () => {
  it('the second decision gets 409 GATE_NOT_PENDING, reason decided, naming the first decider, surface and time', async () => {
    const { boardId, gateId } = await gatedCard('tnt_g1');
    const first = await SELF.fetch(`https://api.test/v1/boards/${boardId}/gates/${gateId}/resolve`, { method: 'POST', headers: H('tnt_g1'), body: JSON.stringify({ decision: 'approve', via: 'matrix' }) });
    // (a body `via` is ignored: the surface comes from who is calling)
    expect(first.status).toBe(200);
    const second = await SELF.fetch(`https://api.test/v1/boards/${boardId}/gates/${gateId}/resolve`, { method: 'POST', headers: H('tnt_g1', 'usr_h'), body: JSON.stringify({ decision: 'reject' }) });
    expect(second.status).toBe(409);
    const body = await second.json<{ error: { code: string; reason: string; decidedBy: string; decidedAt: string; via: string } }>();
    expect(body.error).toMatchObject({ code: 'GATE_NOT_PENDING', reason: 'decided', decidedBy: 'usr_g', via: 'web' });
    expect(Date.parse(body.error.decidedAt)).not.toBeNaN();
  });
  it('a cancelled gate says cancelled, with no decider', async () => {
    const { boardId, gateId, stub } = await gatedCard('tnt_g5');
    await runInDurableObject(stub, async (_d: BoardDO, state) => { state.storage.sql.exec(`UPDATE gates SET status = 'cancelled' WHERE id = 'gate_g'`); });
    const res = await SELF.fetch(`https://api.test/v1/boards/${boardId}/gates/${gateId}/resolve`, { method: 'POST', headers: H('tnt_g5'), body: JSON.stringify({ decision: 'approve' }) });
    expect(res.status).toBe(409);
    const e = (await res.json<{ error: Record<string, unknown> }>()).error;
    expect(e).toMatchObject({ code: 'GATE_NOT_PENDING', reason: 'cancelled' });
    expect(e.decidedBy).toBeUndefined();
  });
  it('a decision from the web app is recorded as web', async () => {
    const { boardId, gateId, stub } = await gatedCard('tnt_g2');
    await SELF.fetch(`https://api.test/v1/boards/${boardId}/gates/${gateId}/resolve`, { method: 'POST', headers: H('tnt_g2'), body: JSON.stringify({ decision: 'approve' }) });
    await runInDurableObject(stub, async (_d: BoardDO, state) => {
      expect(state.storage.sql.exec(`SELECT decided_via FROM gates WHERE id = 'gate_g'`).one().decided_via).toBe('web');
    });
  });
  it('gate options keep their description in the snapshot', async () => {
    const { boardId } = await gatedCard('tnt_g3');
    const snap = await (await SELF.fetch(`https://api.test/v1/boards/${boardId}`, { headers: H('tnt_g3') })).json<{ gates: Array<{ options: Array<{ name: string; description?: string }> }> }>();
    expect(snap.gates[0]!.options[0]).toEqual({ name: 'approve', title: 'Approve', description: 'File it as it is.' });
  });
  it('an option an agent posts keeps its description', async () => {
    const { parseElicitationOptions } = await import('../src/board/elicitation');
    expect(parseElicitationOptions([{ name: 'a', title: 'A', description: 'Does a.' }])).toEqual([{ name: 'a', title: 'A', description: 'Does a.' }]);
  });
  it('archiving a card cancels its pending review, spelled cancelled', async () => {
    const { boardId, stub } = await gatedCard('tnt_g4');
    const res = await SELF.fetch(`https://api.test/v1/boards/${boardId}/cards/card_g`, { method: 'PATCH', headers: H('tnt_g4'), body: JSON.stringify({ archivedAt: '2026-10-11T08:00:00Z' }) });
    expect(res.status).toBe(200);
    await runInDurableObject(stub, async (_d: BoardDO, state) => {
      expect(state.storage.sql.exec(`SELECT status FROM gates WHERE id = 'gate_g'`).one().status).toBe('cancelled');
    });
  });
});
