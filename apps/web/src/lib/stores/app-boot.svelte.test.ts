// @vitest-environment jsdom
/**
 * Boot when the server fails: a failed read is never "no boards" (onboarding) and never forgets the
 * remembered board (loading-audit L3). Only a 404/403 means the board is gone.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/loading';

const h = vi.hoisted(() => ({ board: 'ok' as 'ok' | 500 | 404, boards: 'ok' as 'ok' | 500, attention: 'ok' as 'ok' | 500 }));
const BOARD = { boardId: 'brd_1', name: 'Board', stages: [], cards: [], gates: [], elicitations: [], references: [] };
vi.mock('$lib/api', async (orig) => ({
  ...(await orig<typeof import('$lib/api')>()),
  getMe: vi.fn(async () => ({ userId: 'usr_1', tenantId: 'tnt_1', name: 'Ira Mehta' })),
  getBoard: vi.fn(async () => { if (h.board !== 'ok') throw new ApiError('getBoard', h.board); return BOARD; }),
  getBoards: vi.fn(async () => { if (h.boards !== 'ok') throw new ApiError('getBoards', h.boards); return [{ id: 'brd_1', name: 'Board' }]; }),
  listAttention: vi.fn(async () => { if (h.attention !== 'ok') throw new ApiError('listAttention', h.attention); return { cards: [], boardsUnanswered: 0 }; }),
  getNotifications: vi.fn(async () => []),
  listLabels: vi.fn(async () => []),
  getAgents: vi.fn(async () => []),
  getMembers: vi.fn(async () => []),
  listProjects: vi.fn(async () => []),
  openBoardSocket: vi.fn(() => Object.assign(new EventTarget(), { close() {} })),
}));

async function fresh() {
  vi.resetModules();
  return (await import('./app.svelte')).app;
}

beforeEach(() => {
  localStorage.clear();
  h.board = 'ok'; h.boards = 'ok'; h.attention = 'ok';
});

describe('boot when reads fail', () => {
  it('keeps the remembered board and does not offer onboarding when the server answers 500', async () => {
    localStorage.setItem('superpipeline.boardId', 'brd_1');
    h.board = 500; h.boards = 500;
    const app = await fresh();
    await app.init();
    expect(localStorage.getItem('superpipeline.boardId')).toBe('brd_1');
    expect(app.needsBoard).toBe(false);
    expect(app.boardFailure).toBe('failed');
  });

  it('says boot failed, not "no boards", when the board list cannot be read', async () => {
    h.boards = 500;
    const app = await fresh();
    await app.init();
    expect(app.needsBoard).toBe(false);
    expect(app.bootFailure).toBe('failed');
    expect(app.boardsLoaded).toBe(false);
    expect(app.boardsFailed).toBe(true);
  });

  it('forgets the remembered board only when the server says it is gone (404)', async () => {
    localStorage.setItem('superpipeline.boardId', 'brd_gone');
    h.board = 404;
    const app = await fresh();
    await app.init();
    expect(localStorage.getItem('superpipeline.boardId')).not.toBe('brd_gone');
  });

  it('marks a board that is not there as missing, not failed', async () => {
    const app = await fresh();
    await app.init();
    h.board = 404;
    await app.openBoard('brd_other');
    expect(app.boardFailure).toBe('missing');
  });

  it('retry after a failed boot opens the board once the server answers', async () => {
    h.boards = 500;
    const app = await fresh();
    await app.init();
    h.boards = 'ok';
    await app.retry();
    expect(app.bootFailure).toBeNull();
    expect(app.board?.name).toBe('Board');
  });
});

describe('pending flags', () => {
  it('the board list, the attention and the agents are pending until their first read', async () => {
    const app = await fresh();
    expect([app.boardsLoaded, app.attentionLoaded, app.agentsLoaded]).toEqual([false, false, false]);
    localStorage.setItem('superpipeline.boardId', 'brd_1');
    await app.init();
    expect([app.boardsLoaded, app.attentionSettled, app.agentsLoaded]).toEqual([true, true, true]);
    expect(app.attentionLoaded).toBe(true);
  });

  it('a failed attention read settles but is not loaded (counts stay "–", never 0)', async () => {
    h.attention = 500;
    const app = await fresh();
    await app.init();
    expect(app.attentionSettled).toBe(true);
    expect(app.attentionLoaded).toBe(false);
  });
});

describe('connection', () => {
  it('is connecting before the feed opened, never reconnecting', async () => {
    const app = await fresh();
    await app.init();
    expect(app.connection).toBe('connecting');
    app.feedOpened = true;
    expect(app.connection).toBe('reconnecting');
    app.connected = true;
    expect(app.connection).toBe('live');
    app.online = false;
    expect(app.connection).toBe('offline');
  });
});
