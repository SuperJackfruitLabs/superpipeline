import { SELF, env, runInDurableObject } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
// workerd has no host filesystem; Vite's ?raw inlines the file at transform time (as test/helpers/catalog.ts does).
import wranglerJsonc from '../wrangler.jsonc?raw';
import worker from '../src/index';
import type { BoardDO } from '../src/board/board-do';
import type { FixtureWorld } from '../src/dev/fixture-types';

const T = 'tnt_fx_test';
const U = 'usr_fx_test';
const BOARD = 'brd_fx_test';

function world(cardTitle = 'Imported card'): FixtureWorld {
  return {
    tenant: { id: T, slug: 'fx-test', name: 'Fixture test', forgeHost: null, externalId: null, externalSource: null, createdAt: '2026-09-01T00:00:00Z' },
    user: { id: U, email: 'person@fixture.invalid', name: 'Fixture Person', createdAt: '2026-09-01T00:00:00Z' },
    membership: { id: 'mbr_fx_test', role: 'owner', createdAt: '2026-09-01T00:00:00Z' },
    boards: [{ id: BOARD, name: 'Fixture board', stages: [{ key: 'todo', name: 'To do', order: 0, ownerKind: 'human' }], createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-10-11T08:00:00Z', createdBy: U }],
    agents: [{ id: 'agt_fx_sample', name: 'sample-agent', capabilities: ['code'], externalId: 'prn_fx_sample', ownerUserId: U, mayQueueTo: null, createdAt: '2026-09-01T05:01:00Z', tokens: 2 }],
    capabilities: [{ key: 'code', description: null, origin: 'declared', createdAt: '2026-09-01T04:30:00Z' }],
    implications: [],
    labels: [],
    projects: [],
    milestones: [],
    externalLinks: [],
    dos: {
      [BOARD]: {
        meta: {},
        cards: [{
          id: 'card_fx_0001', title: cardTitle, spec_json: '{}', owner_user_id: U, current_stage_key: 'todo', state: 'submitted', priority: 0,
          context_id: 'ctx_fx_0001', claim_seq: 0, failure_count: 0, created_at: '2026-10-08T06:00:00.000Z', updated_at: '2026-10-08T06:00:00.000Z',
          state_since: '2026-10-08T06:00:00.000Z', queued_by: U, labels: '[]', auto_returns: 0,
        }],
        runs: [], activities: [], events: [{ type: 'card.created', payload: { cardId: 'card_fx_0001' }, ts: '2026-10-08T06:00:00Z' }],
        notifications: [], gates: [], approvalSubjects: [], elicitations: [], references: [], links: [], comments: [],
      },
    },
  };
}

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('https://api.test/v1/dev/fixture', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

describe('POST /v1/dev/fixture', () => {
  it('is a 404 unless both DEV_AUTH and FIXTURE_IMPORT are "true"', async () => {
    for (const over of [{ FIXTURE_IMPORT: undefined }, { FIXTURE_IMPORT: 'false' }, { DEV_AUTH: 'false' }]) {
      // ASSETS off: with it, every unknown path falls through to the SPA assets (a POST there is
      // 405). Without it an unknown path is a plain 404, and so must this route be.
      const res = await worker.fetch(post(world()), { ...env, ASSETS: undefined, ...over } as typeof env);
      expect(res.status).toBe(404);
      // And with ASSETS on, it answers exactly what an unknown path answers.
      const asUnknown = await worker.fetch(post(world()), { ...env, ...over } as typeof env);
      const unknown = await worker.fetch(new Request('https://api.test/v1/dev/nothing-here', { method: 'POST', body: '{}' }), env);
      expect(asUnknown.status).toBe(unknown.status);
    }
  });

  it('imports historical timestamps the public API cannot write', async () => {
    const res = await SELF.fetch(post(world()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, boards: 1, cards: 1 });
    const snap = await SELF.fetch(`https://api.test/v1/boards/${BOARD}`, { headers: { 'X-Tenant-Id': T, 'X-User-Id': U } });
    const body = await snap.json<{ cards: Array<{ id: string; stateSince: string; createdAt: string }> }>();
    expect(body.cards[0]).toMatchObject({ id: 'card_fx_0001', stateSince: '2026-10-08T06:00:00.000Z', createdAt: '2026-10-08T06:00:00.000Z' });
  });

  it('replaces, never appends: a second import leaves exactly the second world', async () => {
    await SELF.fetch(post(world('First')));
    await SELF.fetch(post(world('Second')));
    const snap = await SELF.fetch(`https://api.test/v1/boards/${BOARD}`, { headers: { 'X-Tenant-Id': T, 'X-User-Id': U } });
    const body = await snap.json<{ cards: Array<{ title: string }> }>();
    expect(body.cards.map((c) => c.title)).toEqual(['Second']);
    const agents = await (await SELF.fetch('https://api.test/v1/agents', { headers: { 'X-Tenant-Id': T, 'X-User-Id': U } })).json<{ agents: unknown[] }>();
    expect(agents.agents).toHaveLength(1);
  });

  it('refuses a column the table does not have, naming it', async () => {
    const w = world();
    (w.dos[BOARD]!.cards[0] as Record<string, unknown>).not_a_column = 1;
    const res = await SELF.fetch(post(w));
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('not_a_column');
  });

  it('writes no event of its own and schedules no alarm', async () => {
    await SELF.fetch(post(world()));
    const stub = env.BOARD_DO.get(env.BOARD_DO.idFromName(`${T}:${BOARD}`)) as unknown as DurableObjectStub<BoardDO>;
    await runInDurableObject(stub, async (_b: BoardDO, state) => {
      const n = state.storage.sql.exec(`SELECT COUNT(*) AS n FROM events`).one().n;
      expect(n).toBe(1);
      expect(await state.storage.getAlarm()).toBeNull();
    });
  });

  it('dev auth reads the user name, so /auth/me can say who is signed in', async () => {
    await SELF.fetch(post(world()));
    const me = await SELF.fetch('https://api.test/auth/me', { headers: { 'X-Tenant-Id': T, 'X-User-Id': U } });
    expect(await me.json()).toMatchObject({ user: { userId: U, name: 'Fixture Person' } });
    const ws = await SELF.fetch(`https://api.test/auth/me?tenant=${T}&user=${U}`);
    expect(await ws.json()).toMatchObject({ user: { userId: U } });
  });

  it('the Board DO refuses on its own unless its env says FIXTURE_IMPORT is "true"', async () => {
    const stub = env.BOARD_DO.get(env.BOARD_DO.idFromName(`${T}:brd_fx_guard`)) as unknown as DurableObjectStub<BoardDO>;
    await runInDurableObject(stub, async (b: BoardDO) => {
      const own = (b as unknown as { env: Record<string, unknown> }).env;
      const was = own.FIXTURE_IMPORT;
      own.FIXTURE_IMPORT = undefined;
      try {
        expect(await b.importFixture(world().dos[BOARD]!)).toEqual({ ok: false, code: 'FIXTURE_IMPORT_DISABLED' });
      } finally {
        own.FIXTURE_IMPORT = was;
      }
    });
  });

  it('FIXTURE_IMPORT is never configured in wrangler.jsonc', () => {
    const cfg = wranglerJsonc.replace(/\/\/.*$/gm, '');
    expect(cfg).not.toMatch(/FIXTURE_IMPORT/);
  });
});
