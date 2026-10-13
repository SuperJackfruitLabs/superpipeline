// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ boardRefusals: 0, renew: [] as unknown[], noteAuth: null as null | ((r: Response) => Response) }));
vi.mock('$lib/api', async (orig) => {
  const real = await orig<typeof import('$lib/api')>();
  h.noteAuth = real.noteAuth;
  return {
    ...real,
    getBoard: vi.fn(async () => {
      if (h.boardRefusals > 0) { h.boardRefusals -= 1; h.noteAuth!(new Response(null, { status: 401 })); throw new Error('getBoard failed (401)'); }
      return { boardId: 'brd_1', name: 'Board', stages: [], cards: [], gates: [], elicitations: [], references: [] };
    }),
    getNotifications: vi.fn(async () => []),
    listLabels: vi.fn(async () => []),
    getMe: vi.fn(async () => ({ userId: 'usr_1', tenantId: 'tnt_1', name: 'Ira Mehta' })),
    renewSession: vi.fn(async () => h.renew.shift() ?? { ok: true }),
    openBoardSocket: vi.fn(() => Object.assign(new EventTarget(), { close() {} })),
  };
});
import { app } from './app.svelte';
import { auth } from '$lib/auth-recovery.svelte';

const settle = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  auth.resolved();
  app.watchAuth();
  app.authState = 'ready';
  app.user = { userId: 'usr_1', tenantId: 'tnt_1', name: 'Ira Mehta' };
  app.boardId = 'brd_1';
  app.error = null;
});

describe('a lapsed session, from the store’s side', () => {
  it('renews silently and keeps the person, the route and a clean error bar', async () => {
    h.boardRefusals = 1;
    await app.refresh();
    await settle(); await settle();
    expect(auth.state).toBe('ok');
    expect(app.authState).toBe('ready');
    expect(app.user?.name).toBe('Ira Mehta');
    expect(app.board?.name).toBe('Board');
    expect(app.error).toBeNull();
  });
  it('when renewal is refused it expires but keeps the person (no Landing)', async () => {
    h.boardRefusals = 1;
    h.renew.push({ ok: false, reason: 'login_required', issuer: 'accounts.superjackfruit.com' });
    await app.refresh();
    await settle(); await settle();
    expect([auth.state, auth.reason]).toEqual(['expired', 'login_required']);
    expect(app.authState).toBe('ready');
    expect(app.user).not.toBeNull();
  });
});
