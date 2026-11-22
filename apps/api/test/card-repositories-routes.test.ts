/**
 * A card's repositories through the real Worker: anyone who may edit the card (a person, or an
 * agent with the card-edit scope) sets them within the allowlist; the allowlist stays an owner or
 * admin write; a claim sends `checkpointProtocols` beside `checkpointProtocol`.
 * Scenario `card-writers-choose` of treaty's selection vectors.
 */
import { env, runInDurableObject } from 'cloudflare:test';
import { beforeAll, expect, it, vi } from 'vitest';
import { BoardDO } from '../src/board/board-do';
import type { BoardContext } from '../src/board/context';
import type { CardCheckpointPolicy } from '../src/board/checkpoint-selection';
import { boards } from '../src/routes/boards/entry';
import { agentRegistry } from '../src/routes/agents';
import { ensureOrgTenant } from '../src/auth/org-tenancy';
import * as ids from '../src/ids';
import { setupCatalog } from './helpers/catalog';
import { withOrgPlane, planeEnv, planeToken, AGENT, ORG } from './helpers/org-plane';
import vectors from './fixtures/checkpoint-settlement/selection.json';

beforeAll(setupCatalog);
const chooses = vectors.stages.chooses as CardCheckpointPolicy;
const stage = { key: 'build', name: 'Build', order: 0, ownerKind: 'capability' as const, owner: 'code', cardCheckpointPolicy: chooses };
let serial = 0;

async function fixture(check: (ctx: { id: string; stub: DurableObjectStub }) => Promise<void>) {
  return withOrgPlane(async () => {
    const tenant = await ensureOrgTenant(env.DB, ORG);
    const id = `brd_cardreposroutes${serial++}`;
    const stub = env.BOARD_DO.get(env.BOARD_DO.idFromName(`${tenant}:${id}`));
    const original = ids.newId;
    const mocked = vi.spyOn(ids, 'newId').mockImplementation((prefix) => prefix === 'brd' ? id : original(prefix));
    const toggle = (on: boolean) => runInDurableObject(stub, (board) => {
      if (!(board instanceof BoardDO)) throw new Error('expected BoardDO');
      const context: BoardContext = Reflect.get(board, 'board');
      if (on) context.env.PROPOSED_CHECKPOINT_POLICY = 'true';
      else delete context.env.PROPOSED_CHECKPOINT_POLICY;
    });
    await toggle(true);
    try {
      expect((await send('/v1/boards', { name: 'Chosen', stages: [stage] })).status).toBe(201);
      await check({ id, stub });
    } finally {
      mocked.mockRestore();
      await toggle(false);
      await runInDurableObject(stub, async (_board, state) => { await state.storage.deleteAlarm(); });
    }
  });
}
async function send(path: string, body: unknown, options: { method?: string; role?: string; kind?: string; scope?: string } = {}) {
  const token = await planeToken({ orgRole: options.role ?? 'owner', principalKind: options.kind ?? 'human',
    ...(options.kind === 'agent' ? { sub: AGENT, scope: options.scope ?? '' } : {}) });
  const request = new Request('https://api.test' + path, { method: options.method ?? 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const match = path.match(/^\/v1\/boards(?:\/([^/]+)(?:\/(.*))?)?$/);
  if (!match) throw new Error('bad route fixture');
  return boards({ request, path, url: new URL(request.url), env: planeEnv({ PROPOSED_CHECKPOINT_POLICY: 'true' }) }, match);
}
async function registerAgent() {
  const request = new Request('https://api.test/v1/agents', { method: 'POST', headers: { authorization: `Bearer ${await planeToken({ orgRole: 'owner' })}` },
    body: JSON.stringify({ name: 'Planner', externalId: AGENT, capabilities: ['code'] }) });
  const match = '/v1/agents'.match(/^\/v1\/agents(?:\/([^/]+))?$/);
  if (!match) throw new Error('bad agent fixture');
  // One agent per workspace with this principal: a second registration in this file is a 409.
  expect([201, 409]).toContain((await agentRegistry({ request, env: planeEnv(), path: '/v1/agents', url: new URL(request.url) }, match)).status);
}
async function makeCard(id: string, body: Record<string, unknown> = {}) {
  const made = await send(`/v1/boards/${id}/cards`, { title: 'Work', ...body });
  if (made.status !== 201) throw new Error(`create refused: ${made.status} ${await made.text()}`);
  return (await made.json<{ card: { id: string } }>()).card;
}

it('a person creates and edits a card with repositories, and reads them on the card', () => fixture(async ({ id }) => {
  const created = await send(`/v1/boards/${id}/cards`, { title: 'Two', repositories: ['api', 'docs'], primaryRepository: 'docs' });
  expect(created.status).toBe(201);
  const card = (await created.json<{ card: { id: string; repositories: string[]; primaryRepository: string } }>()).card;
  expect(card).toMatchObject({ repositories: ['api', 'docs'], primaryRepository: 'docs' });
  const edited = await send(`/v1/boards/${id}/cards/${card.id}`, { repositories: ['app'] }, { method: 'PATCH', role: 'member' });
  expect(edited.status).toBe(200);
  const after = (await edited.json<{ card: Record<string, unknown> }>()).card;
  expect(after.repositories).toEqual(['app']);
  expect(after).not.toHaveProperty('primaryRepository');
  const cleared = await send(`/v1/boards/${id}/cards/${card.id}`, { repositories: null }, { method: 'PATCH' });
  expect((await cleared.json<{ card: Record<string, unknown> }>()).card).not.toHaveProperty('repositories');
}));

it('refuses a choice outside the allowlist on entry with the named code, and a malformed one as input', () => fixture(async ({ id }) => {
  const outside = await send(`/v1/boards/${id}/cards`, { title: 'Outside', repositories: ['app', 'mobile'] });
  expect(outside.status).toBe(409);
  expect(await outside.json()).toMatchObject({ error: { code: 'REPOSITORY_CHOICE_REFUSED', detail: { reason: 'repository-not-allowed', stageKey: 'build' } } });
  for (const bad of [{ repositories: ['app', 'api'] }, { repositories: [] }, { repositories: ['example/app'] }, { primaryRepository: 'app' },
    { repositories: Array.from({ length: 33 }, (_, i) => `r${String(i).padStart(2, '0')}`) }]) {
    const refused = await send(`/v1/boards/${id}/cards`, { title: 'Bad', ...bad });
    expect(refused.status).toBe(400);
    expect(await refused.json()).toMatchObject({ error: { code: 'INVALID_INPUT' } });
  }
}));

it('an agent with the card-edit scope chooses within the allowlist; one without it may not', () => fixture(async ({ id }) => {
  await registerAgent();
  const card = await makeCard(id);
  const planner = await send(`/v1/boards/${id}/cards/${card.id}`, { repositories: ['api'] }, { method: 'PATCH', kind: 'agent', scope: 'plan' });
  expect(planner.status).toBe(200);
  expect((await planner.json<{ card: { repositories: string[] } }>()).card.repositories).toEqual(['api']);
  const outside = await send(`/v1/boards/${id}/cards/${card.id}`, { repositories: ['mobile'] }, { method: 'PATCH', kind: 'agent', scope: 'plan' });
  expect(outside.status).toBe(409);
  const reader = await send(`/v1/boards/${id}/cards/${card.id}`, { repositories: ['app'] }, { method: 'PATCH', kind: 'agent', scope: 'read' });
  expect(reader.status).toBe(403);
}));

it('only an owner or admin writes the allowlist the cards choose from', () => fixture(async ({ id }) => {
  const narrowed = { ...chooses, repositories: chooses.repositories.slice(0, 2) };
  expect((await send(`/v1/boards/${id}/stages/build`, { cardCheckpointPolicy: narrowed }, { method: 'PATCH', role: 'member' })).status).toBe(403);
  expect((await send(`/v1/boards/${id}/stages/build`, { cardCheckpointPolicy: narrowed }, { method: 'PATCH' })).status).toBe(200);
}));

it('a claim body lists its protocols beside checkpointProtocol, or is refused', () => fixture(async ({ id }) => {
  await registerAgent();
  await makeCard(id, { repositories: ['api'] });
  const claim = (body: Record<string, unknown>) => send(`/v1/boards/${id}/claims`, body, { kind: 'agent', scope: 'claim' });
  for (const bad of [
    { checkpointProtocols: ['superpipeline.checkpoint-claim.v1', 'superpipeline.checkpoint-claim.v2'] },
    { checkpointProtocol: 'superpipeline.checkpoint-claim.v1', checkpointProtocols: ['superpipeline.checkpoint-claim.v2'] },
    { checkpointProtocol: 'superpipeline.checkpoint-claim.v1', checkpointProtocols: ['superpipeline.checkpoint-claim.v1', 'superpipeline.checkpoint-claim.v3'] },
    { checkpointProtocol: 'superpipeline.checkpoint-claim.v1', checkpointProtocols: [] },
    { checkpointProtocol: 'superpipeline.checkpoint-claim.v1', checkpointProtocols: ['superpipeline.checkpoint-claim.v1', 'superpipeline.checkpoint-claim.v1'] },
  ]) expect((await claim(bad)).status).toBe(400);
  expect(await (await claim({ checkpointProtocol: 'superpipeline.checkpoint-claim.v1', checkpointOnly: true })).json()).toMatchObject({ claimed: false, reason: 'capability_mismatch' });
  const claimed = await claim({ checkpointProtocol: 'superpipeline.checkpoint-claim.v1',
    checkpointProtocols: ['superpipeline.checkpoint-claim.v1', 'superpipeline.checkpoint-claim.v2'], checkpointOnly: true });
  expect(await claimed.json()).toMatchObject({ claimed: true, checkpointClaim: { selection: { source: 'card', repositories: ['api'] } } });
}));
