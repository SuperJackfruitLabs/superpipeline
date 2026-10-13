import { SELF, env, runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import type { BoardDO } from '../src/board/board-do';

const H = { 'X-Tenant-Id': 'tnt_load', 'X-User-Id': 'usr_load', 'Content-Type': 'application/json' };

describe('GET /v1/agents — role and load', () => {
  it('sums claimed and working cards over every board, ignoring archived and finished ones', async () => {
    const agent = await (await SELF.fetch('https://api.test/v1/agents', { method: 'POST', headers: H, body: JSON.stringify({ name: 'sample-agent', capabilities: ['code'] }) })).json<{ agent: { id: string } }>();
    const id = agent.agent.id;
    await env.DB.prepare(`UPDATE agents SET role = 'Diagnostics' WHERE id = ?`).bind(id).run();
    for (const name of ['One', 'Two']) {
      const b = await (await SELF.fetch('https://api.test/v1/boards', { method: 'POST', headers: H, body: JSON.stringify({ name, stages: [{ key: 's', name: 'S', order: 0, ownerKind: 'capability', owner: 'code' }] }) })).json<{ boardId: string }>();
      const stub = env.BOARD_DO.get(env.BOARD_DO.idFromName(`tnt_load:${b.boardId}`)) as unknown as DurableObjectStub<BoardDO>;
      await runInDurableObject(stub, async (_d: BoardDO, state) => {
        const ins = (cid: string, st: string, archived: string | null) => state.storage.sql.exec(
          `INSERT INTO cards (id, title, owner_user_id, current_stage_key, state, context_id, created_at, delegate_agent_id, archived_at) VALUES (?, 'x', 'usr_load', 's', ?, ?, '2026-10-11T00:00:00Z', ?, ?)`, cid, st, `ctx_${cid}`, id, archived);
        ins(`card_${name}_w`, 'working', null);
        ins(`card_${name}_i`, 'input-required', null);
        ins(`card_${name}_d`, 'completed', null);
        ins(`card_${name}_a`, 'working', '2026-10-10T00:00:00Z');
      });
    }
    const list = await (await SELF.fetch('https://api.test/v1/agents', { headers: H })).json<{ agents: Array<{ id: string; role: string | null; claimedCount: number; workingCount: number }> }>();
    expect(list.agents.find((a) => a.id === id)).toMatchObject({ role: 'Diagnostics', claimedCount: 4, workingCount: 2 });
  });
  it('an agent with no role and no cards reads null and zero', async () => {
    const H2 = { ...H, 'X-Tenant-Id': 'tnt_load2' };
    const a = await (await SELF.fetch('https://api.test/v1/agents', { method: 'POST', headers: H2, body: JSON.stringify({ name: 'idle-agent', capabilities: ['code'] }) })).json<{ agent: { id: string } }>();
    const list = await (await SELF.fetch('https://api.test/v1/agents', { headers: H2 })).json<{ agents: Array<{ id: string; role: string | null; claimedCount: number; workingCount: number }> }>();
    expect(list.agents.find((x) => x.id === a.agent.id)).toMatchObject({ role: null, claimedCount: 0, workingCount: 0 });
  });
});
