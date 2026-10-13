import { SELF, env, runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import type { BoardDO } from '../src/board/board-do';

const H = (t: string) => ({ 'X-Tenant-Id': t, 'Content-Type': 'application/json' });
async function board(t: string, body: Record<string, unknown>) {
  return (await (await SELF.fetch('https://api.test/v1/boards', { method: 'POST', headers: H(t), body: JSON.stringify(body) })).json<{ boardId: string }>()).boardId;
}

describe('board introduction and stage summaries', () => {
  it('keep what the board was created with and serve it on the snapshot', async () => {
    const id = await board('tnt_i1', {
      name: 'Releases', intro: { lede: 'It takes a release from **proposal to production**.', composeHint: 'Say what you want released in a sentence.' },
      stages: [{ key: 'proposed', name: 'Proposed', order: 0, ownerKind: 'human', summary: 'Someone writes up the release: what ships and why.' }],
    });
    const snap = await (await SELF.fetch(`https://api.test/v1/boards/${id}`, { headers: H('tnt_i1') })).json<{ intro: unknown; stages: Array<{ summary?: string }>; github: { webhookUrl: string } }>();
    expect(snap.intro).toEqual({ lede: 'It takes a release from **proposal to production**.', composeHint: 'Say what you want released in a sentence.' });
    expect(snap.stages[0]!.summary).toBe('Someone writes up the release: what ships and why.');
    expect(snap.github.webhookUrl).toBe(`https://app.superpipeline.dev/v1/boards/${id}/webhooks/github?tenant=tnt_i1`);
  });
  it('a board made without them still reads, with no intro', async () => {
    const id = await board('tnt_i3', { name: 'Plain', stages: [{ key: 'a', name: 'A', order: 0, ownerKind: 'human' }] });
    const snap = await (await SELF.fetch(`https://api.test/v1/boards/${id}`, { headers: H('tnt_i3') })).json<{ intro?: unknown; stages: Array<{ summary?: string }> }>();
    expect(snap.intro).toBeUndefined();
    expect(snap.stages[0]!.summary).toBeUndefined();
  });
  it('refuses a stage summary over 200 characters', async () => {
    const res = await SELF.fetch('https://api.test/v1/boards', { method: 'POST', headers: H('tnt_i2'), body: JSON.stringify({ name: 'X', stages: [{ key: 'a', name: 'A', order: 0, ownerKind: 'human', summary: 'x'.repeat(201) }] }) });
    expect(res.status).toBe(400);
  });
  it('refuses a malformed intro, and a stage edit can set and clear a summary', async () => {
    const bad = await SELF.fetch('https://api.test/v1/boards', { method: 'POST', headers: H('tnt_i4'), body: JSON.stringify({ name: 'X', intro: { lede: 'only a lede' }, stages: [{ key: 'a', name: 'A', order: 0, ownerKind: 'human' }] }) });
    expect(bad.status).toBe(400);
    const id = await board('tnt_i4', { name: 'X', stages: [{ key: 'a', name: 'A', order: 0, ownerKind: 'human' }] });
    const set = await SELF.fetch(`https://api.test/v1/boards/${id}/stages/a`, { method: 'PATCH', headers: H('tnt_i4'), body: JSON.stringify({ summary: 'Say what it is.' }) });
    expect(set.status).toBe(200);
    const snap = await (await SELF.fetch(`https://api.test/v1/boards/${id}`, { headers: H('tnt_i4') })).json<{ stages: Array<{ summary?: string }> }>();
    expect(snap.stages[0]!.summary).toBe('Say what it is.');
    const tooLong = await SELF.fetch(`https://api.test/v1/boards/${id}/stages/a`, { method: 'PATCH', headers: H('tnt_i4'), body: JSON.stringify({ summary: 'x'.repeat(201) }) });
    expect(tooLong.status).toBe(400);
  });
});

describe('usage by day', () => {
  it('byDay always has the last 7 UTC days, zero-filled, whatever the window', async () => {
    const id = await board('tnt_u1', { name: 'U', stages: [{ key: 's', name: 'S', order: 0, ownerKind: 'human' }] });
    const stub = env.BOARD_DO.get(env.BOARD_DO.idFromName(`tnt_u1:${id}`)) as unknown as DurableObjectStub<BoardDO>;
    const today = new Date().toISOString().slice(0, 10);
    await runInDurableObject(stub, async (_d: BoardDO, state) => {
      state.storage.sql.exec(`INSERT INTO usage_records (run_id, card_id, agent_id, model, input_tokens, output_tokens, cost_usd, estimated, ts) VALUES ('run_u', 'card_u', 'agt_u', 'm', 10, 5, 1.25, 0, ?)`, `${today}T12:00:00Z`);
    });
    const u = await (await SELF.fetch(`https://api.test/v1/boards/${id}/usage?window=24h`, { headers: H('tnt_u1') })).json<{ byDay: Array<{ day: string; costUsd: number }> }>();
    expect(u.byDay).toHaveLength(7);
    expect(u.byDay.at(-1)).toEqual({ day: today, costUsd: 1.25 });
    expect(u.byDay[0]!.costUsd).toBe(0);
  });
});
