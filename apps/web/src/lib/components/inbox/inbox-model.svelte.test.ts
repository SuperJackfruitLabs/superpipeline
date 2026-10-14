// apps/web/src/lib/components/inbox/inbox-model.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, tick } from 'svelte';
import { C1DFC, C4605, DX_AGENTS, DX_BOARD, DX_ID, DX_NOTIFICATIONS } from '$lib/test/dx-snapshot';
import type { BoardSnapshot, StaleCard } from '$lib/api';

const OTHER = 'brd_other0000000001';
const OTHER_BOARD: BoardSnapshot = {
  ...DX_BOARD, boardId: OTHER, name: 'Client Quality',
  cards: DX_BOARD.cards.filter((c) => c.id === C1DFC.id).map((c) => ({ ...c, id: 'card_other_1dfc' })),
};
const usage = (n: number) => ({ totalCostUsd: n, estimatedCostUsd: 0, totalInputTokens: 0, totalOutputTokens: 0, unpricedRecords: 0, byModel: [], byAgent: [], byCard: [], byDay: [] });
const api = vi.hoisted(() => ({
  getBoard: vi.fn(), getNotifications: vi.fn(), getUsage: vi.fn(), setBudget: vi.fn(),
}));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), ...api }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

import { app } from '$lib/stores/app.svelte';
import { InboxStore, CHOOSE_A_BOARD_FOR_CAPS } from './inbox-model.svelte';
import { inboxScope } from './inbox-scope.svelte';

let stop: (() => void) | null = null;
const make = (): InboxStore => {
  let s!: InboxStore;
  stop = $effect.root(() => { s = new InboxStore(); });
  return s;
};
const settle = async () => { for (let i = 0; i < 5; i++) { await tick(); await Promise.resolve(); } flushSync(); };

beforeEach(() => {
  api.getBoard.mockImplementation(async (id: string) => (id === OTHER ? OTHER_BOARD : DX_BOARD));
  api.getNotifications.mockImplementation(async (id: string) => (id === OTHER ? [] : DX_NOTIFICATIONS));
  api.getUsage.mockImplementation(async (id: string) => usage(id === OTHER ? 2 : 1.5));
  app.boards = [{ id: DX_ID, name: 'Developer Experience', cardCount: 7, needsYouCount: 4, lastActivityAt: null }, { id: OTHER, name: 'Client Quality', cardCount: 1, needsYouCount: 1, lastActivityAt: null }];
  app.attention = [{ boardId: OTHER } as StaleCard, { boardId: OTHER } as StaleCard];
  app.agents = DX_AGENTS;
  app.boardId = DX_ID;
  app.board = DX_BOARD;
  app.notifications = DX_NOTIFICATIONS;
});
afterEach(() => { stop?.(); stop = null; inboxScope.choose(null); app.board = null; app.boards = []; app.attention = []; vi.clearAllMocks(); });

describe('the Inbox model', () => {
  it('is loading until a board in scope has been read, and stops even when every read fails', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    api.getBoard.mockImplementation(async () => { await gate; throw new Error('offline'); });
    app.board = null;
    const m = make();
    await settle();
    expect(m.loading).toBe(true);
    release();
    await settle();
    expect(m.loading).toBe(false);
    expect(m.needs).toEqual([]);
  });
  it('is not loading while the open board already shows', async () => {
    api.getBoard.mockImplementation(() => new Promise(() => {}));
    const m = make();
    await settle();
    expect(m.needs.length).toBeGreaterThan(0);
    expect(m.loading).toBe(false);
  });
  it('reads every board by default, boards that need you first, and every row names its board', async () => {
    const m = make();
    await settle();
    expect(m.scoped).toBe(false);
    expect(m.boardName).toBe('All boards');
    expect(m.boardIds).toEqual([OTHER, DX_ID]);
    expect(m.needs[0]!.boardName).toBe('Client Quality');
    expect(new Set(m.needs.map((r) => r.boardName))).toEqual(new Set(['Client Quality', 'Developer Experience']));
    expect(m.needs.find((r) => r.card.id === C4605.id)!.boardId).toBe(DX_ID);
    expect(m.spend.total).toBe(3.5);
    expect(m.spend.cap).toBeNull();
    expect(m.cardHref('card_other_1dfc', OTHER)).toBe(`/b/${OTHER}/c/card_other_1dfc`);
  });
  it('a chosen board scopes Needs, Spend and Activity; caps need one board', async () => {
    const m = make();
    await settle();
    expect(await m.setCaps('5', '')).toEqual({ board: null, card: null, refused: CHOOSE_A_BOARD_FOR_CAPS });
    inboxScope.choose(DX_ID);
    await settle();
    expect(m.scoped).toBe(true);
    expect(m.boardName).toBe('Developer Experience');
    expect(new Set(m.needs.map((r) => r.boardId))).toEqual(new Set([DX_ID]));
    expect(m.spend.total).toBe(1.5);
    expect(m.groups.every((g) => g.boardId === DX_ID)).toBe(true);
  });
});
