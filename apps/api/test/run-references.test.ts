import { SELF, env } from 'cloudflare:test';
import { beforeAll, describe, it, expect } from 'vitest';
import { setupCatalog } from './helpers/catalog';
import { createAgent, createAgentToken } from '../src/db/catalog';

/**
 * The run holder links what it produced from its own card (POST runs/:runId/references). The
 * card route stays a human route: a `spa_` token there is still told to sign in.
 */

beforeAll(setupCatalog);

const base = 'https://api.test';
const STAGES = [{ key: 'research', name: 'Research', order: 0, ownerKind: 'capability', owner: 'research' }];
const ITEM = 'https://library.test/a/itm_0123456789abcdef';

async function setup(tenantId: string) {
  const board = await SELF.fetch(`${base}/v1/boards`, {
    method: 'POST',
    headers: { 'X-Tenant-Id': tenantId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Run references', stages: STAGES }),
  });
  const boardId = ((await board.json()) as { boardId: string }).boardId;
  const cards: string[] = [];
  for (const title of ['Answer', 'Other']) {
    const res = await SELF.fetch(`${base}/v1/boards/${boardId}/cards`, {
      method: 'POST',
      headers: { 'X-Tenant-Id': tenantId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, ownerUserId: 'usr_a', spec: { goal: title } }),
    });
    cards.push(((await res.json()) as { card: { id: string } }).card.id);
  }
  const agent = await createAgent(env.DB, tenantId, { name: 'Worker', capabilities: ['research'] });
  const { token } = await createAgentToken(env.DB, tenantId, agent.id, ['claim', 'run']);
  const other = await createAgent(env.DB, tenantId, { name: 'Other', capabilities: ['research'] });
  const { token: otherToken } = await createAgentToken(env.DB, tenantId, other.id, ['claim', 'run']);
  const claim = await SELF.fetch(`${base}/v1/boards/${boardId}/claims`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  const claimed = (await claim.json()) as { runId: string; leaseEpoch: number; card?: { id: string } };
  return { tenantId, boardId, cards, token, otherToken, ...claimed };
}

const post = (boardId: string, runId: string, token: string, body: unknown) =>
  SELF.fetch(`${base}/v1/boards/${boardId}/runs/${runId}/references`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

async function references(tenantId: string, boardId: string, runId: string, token: string) {
  const res = await SELF.fetch(`${base}/v1/boards/${boardId}/runs/${runId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return ((await res.json()) as { references: { url: string; addedBy: string; provider: string }[]; card: { id: string } });
}

describe('run references — POST /v1/boards/:id/runs/:runId/references', () => {
  it('lets the run holder link an item from its own card, idempotently', async () => {
    const s = await setup('tnt_runref1');
    const body = { leaseEpoch: s.leaseEpoch, url: ITEM, title: 'answer.md', provider: 'superlibrary' };
    const first = await post(s.boardId, s.runId, s.token, body);
    expect(first.status).toBe(200);
    expect(((await first.json()) as { reference: { url: string } }).reference.url).toBe(ITEM);
    expect((await post(s.boardId, s.runId, s.token, body)).status).toBe(200);
    const ctx = await references(s.tenantId, s.boardId, s.runId, s.token);
    const linked = ctx.references.filter((r) => r.url === ITEM);
    expect(linked).toHaveLength(1);
    expect(linked[0]).toMatchObject({ addedBy: 'agent', provider: 'superlibrary' });
  });

  it('refuses another agent, a stale lease and an unknown provider', async () => {
    const s = await setup('tnt_runref2');
    const ok = { leaseEpoch: s.leaseEpoch, url: ITEM, title: 'answer.md', provider: 'superlibrary' };
    expect((await post(s.boardId, s.runId, s.otherToken, ok)).status).not.toBe(200);
    expect((await post(s.boardId, s.runId, s.token, { ...ok, leaseEpoch: s.leaseEpoch + 1 })).status).toBe(409);
    expect((await post(s.boardId, s.runId, s.token, { ...ok, provider: 'web-nope' })).status).toBe(400);
    const ctx = await references(s.tenantId, s.boardId, s.runId, s.token);
    expect(ctx.references.some((r) => r.url === ITEM)).toBe(false);
  });

  it('always attaches to the run\'s own card, whatever card the body names', async () => {
    const s = await setup('tnt_runref3');
    const own = (await references(s.tenantId, s.boardId, s.runId, s.token)).card.id;
    const other = s.cards.find((c) => c !== own)!;
    const res = await post(s.boardId, s.runId, s.token, { leaseEpoch: s.leaseEpoch, url: ITEM, provider: 'superlibrary', cardId: other });
    expect(res.status).toBe(200);
    const onOther = await SELF.fetch(`${base}/v1/boards/${s.boardId}/cards/${other}`, { headers: { 'X-Tenant-Id': s.tenantId } });
    expect(JSON.stringify(await onOther.json())).not.toContain(ITEM);
  });

  it('leaves the card route a human route', async () => {
    const s = await setup('tnt_runref4');
    const own = (await references(s.tenantId, s.boardId, s.runId, s.token)).card.id;
    const res = await SELF.fetch(`${base}/v1/boards/${s.boardId}/cards/${own}/references`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${s.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: ITEM, provider: 'superlibrary', addedBy: 'agent' }),
    });
    expect(res.status).toBe(401);
  });
});
