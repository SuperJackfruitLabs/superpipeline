import { SELF, env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

const H = { 'X-Tenant-Id': 'tnt_cc', 'Content-Type': 'application/json' };
async function board() {
  return (await (await SELF.fetch('https://api.test/v1/boards', { method: 'POST', headers: H, body: JSON.stringify({ name: 'C', stages: [{ key: 'a', name: 'A', order: 0, ownerKind: 'human' }, { key: 'b', name: 'B', order: 1, ownerKind: 'human' }] }) })).json<{ boardId: string }>()).boardId;
}
describe('POST /v1/boards/:id/cards', () => {
  it('starts the card in the named stage with its labels and project', async () => {
    // labels and projects reference tenants(id); the dev-header tenant needs a row.
    await env.DB.prepare(`INSERT OR IGNORE INTO tenants (id, slug, name) VALUES ('tnt_cc', 'cc', 'cc')`).run();
    const id = await board();
    const prj = (await (await SELF.fetch('https://api.test/v1/projects', { method: 'POST', headers: H, body: JSON.stringify({ name: 'alpha' }) })).json<{ project: { id: string } }>()).project.id;
    const lbl = (await (await SELF.fetch('https://api.test/v1/labels', { method: 'POST', headers: H, body: JSON.stringify({ name: 'clean-room', colour: '#3366ff' }) })).json<{ label: { id: string } }>()).label.id;
    const res = await SELF.fetch(`https://api.test/v1/boards/${id}/cards`, { method: 'POST', headers: H, body: JSON.stringify({ title: 'T', stageKey: 'b', labelIds: [lbl], projectId: prj }) });
    expect(res.status).toBe(201);
    expect((await res.json<{ card: { currentStageKey: string; labels: string[]; projectId: string | null } }>()).card).toMatchObject({ currentStageKey: 'b', labels: [lbl], projectId: prj });
  });
  it('refuses a project that is not in the workspace', async () => {
    const id = await board();
    const res = await SELF.fetch(`https://api.test/v1/boards/${id}/cards`, { method: 'POST', headers: H, body: JSON.stringify({ title: 'T', projectId: 'prj_nope' }) });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('UNKNOWN_PROJECT');
  });
  it('without the new fields the card starts in the first stage as it always did', async () => {
    const id = await board();
    const res = await SELF.fetch(`https://api.test/v1/boards/${id}/cards`, { method: 'POST', headers: H, body: JSON.stringify({ title: 'T' }) });
    expect((await res.json<{ card: { currentStageKey: string; labels: string[] } }>()).card).toMatchObject({ currentStageKey: 'a', labels: [] });
  });
  it('refuses an unknown stage or label by name', async () => {
    const id = await board();
    const s = await SELF.fetch(`https://api.test/v1/boards/${id}/cards`, { method: 'POST', headers: H, body: JSON.stringify({ title: 'T', stageKey: 'nope' }) });
    expect(s.status).toBe(400); expect(await s.text()).toContain('UNKNOWN_STAGE');
    const l = await SELF.fetch(`https://api.test/v1/boards/${id}/cards`, { method: 'POST', headers: H, body: JSON.stringify({ title: 'T', labelIds: ['lbl_nope'] }) });
    expect(l.status).toBe(400); expect(await l.text()).toContain('UNKNOWN_LABEL');
  });
});
