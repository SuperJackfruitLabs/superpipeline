import { SELF, env, runInDurableObject } from 'cloudflare:test';
import { describe, expect, it, vi } from 'vitest';
import type { BoardDO } from '../src/board/board-do';

const H = { 'X-Tenant-Id': 'tnt_bl', 'Content-Type': 'application/json' };
describe('GET /v1/boards', () => {
  it('counts live cards and the cards that need you, and says when the board last changed', async () => {
    const id = (await (await SELF.fetch('https://api.test/v1/boards', { method: 'POST', headers: H, body: JSON.stringify({ name: 'Counted', stages: [{ key: 'reported', name: 'Reported', order: 0, ownerKind: 'human' }, { key: 'work', name: 'Work', order: 1, ownerKind: 'capability', owner: 'code' }] }) })).json<{ boardId: string }>()).boardId;
    const stub = env.BOARD_DO.get(env.BOARD_DO.idFromName(`tnt_bl:${id}`)) as unknown as DurableObjectStub<BoardDO>;
    await runInDurableObject(stub, async (_d: BoardDO, state) => {
      const ins = (cid: string, stage: string, st: string, since: string, archived: string | null = null) => state.storage.sql.exec(
        `INSERT INTO cards (id, title, owner_user_id, current_stage_key, state, context_id, created_at, state_since, archived_at) VALUES (?, 'x', 'usr', ?, ?, ?, ?, ?, ?)`, cid, stage, st, `ctx_${cid}`, since, since, archived);
      ins('card_1', 'work', 'input-required', '2026-10-01T00:00:00Z');
      ins('card_2', 'reported', 'submitted', '2026-10-01T00:00:00Z');
      ins('card_3', 'work', 'submitted', '2026-10-01T00:00:00Z');
      ins('card_4', 'work', 'input-required', '2026-10-01T00:00:00Z', '2026-10-02T00:00:00Z');
    });
    const rows = (await (await SELF.fetch('https://api.test/v1/boards', { headers: H })).json<{ boards: Array<{ id: string; cardCount: number; needsYouCount: number; lastActivityAt: string | null }> }>()).boards;
    expect(rows.find((b) => b.id === id)).toMatchObject({ cardCount: 3, needsYouCount: 2 });
    expect(rows.find((b) => b.id === id)!.lastActivityAt).not.toBeNull();
  });
  it('moves lastActivityAt when a card is written, and reads it as ISO', async () => {
    const H2 = { ...H, 'X-Tenant-Id': 'tnt_bl2' };
    const id = (await (await SELF.fetch('https://api.test/v1/boards', { method: 'POST', headers: H2, body: JSON.stringify({ name: 'Moving', stages: [{ key: 'a', name: 'A', order: 0, ownerKind: 'human' }] }) })).json<{ boardId: string }>()).boardId;
    const read = async () => (await (await SELF.fetch('https://api.test/v1/boards', { headers: H2 })).json<{ boards: Array<{ id: string; lastActivityAt: string }> }>()).boards.find((b) => b.id === id)!.lastActivityAt;
    const before = await read();
    expect(before).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/);
    await new Promise((r) => setTimeout(r, 1100));
    const made = await SELF.fetch(`https://api.test/v1/boards/${id}/cards`, { method: 'POST', headers: H2, body: JSON.stringify({ title: 'T' }) });
    expect(made.status).toBe(201);
    // The touch runs in waitUntil, after the response: poll for it.
    await vi.waitFor(async () => expect(Date.parse(await read())).toBeGreaterThan(Date.parse(before)));
  });
});
