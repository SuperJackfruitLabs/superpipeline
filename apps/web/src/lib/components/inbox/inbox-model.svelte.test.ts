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
  // Each board in scope gets a feed; these record which and hand the test their message handler.
  sockets: [] as Array<{ boardId: string; closed: boolean; emit: (e: unknown) => void }>,
  openBoardSocket: vi.fn<(boardId: string, onEvent: (e: unknown) => void) => unknown>(),
}));
api.openBoardSocket.mockImplementation((boardId, onEvent) => {
  const s = Object.assign(new EventTarget(), { boardId, closed: false, close() { s.closed = true; }, emit: onEvent });
  api.sockets.push(s);
  return s;
});
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), ...api }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

import { app } from '$lib/stores/app.svelte';
import { InboxStore, CHOOSE_A_BOARD_FOR_CAPS } from './inbox-model.svelte';
import { inboxScope } from './inbox-scope.svelte';
import { liveUpdates } from '$lib/live/live-updates.svelte';

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
  app.boardsLoaded = true;
  app.boardsFailed = false;
  app.attentionSettled = true;
});
afterEach(() => { stop?.(); stop = null; api.sockets = []; liveUpdates.resume(); inboxScope.choose(null); app.board = null; app.boards = []; app.attention = []; vi.clearAllMocks(); });

describe('the Inbox model', () => {
  it('is pending before the board list arrives: no boards yet is not "nothing needs you" (L1)', async () => {
    app.boardsLoaded = false;
    app.boards = [];
    app.board = null;
    const m = make();
    await settle();
    expect(m.boardIds).toEqual([]);
    expect(m.pendingNow).toBe(true);
    expect(m.loading).toBe(true);
    expect(m.failed).toBe(false);
  });
  it('is pending until the attention list has answered', async () => {
    app.attentionSettled = false;
    const m = make();
    await settle();
    expect(m.pendingNow).toBe(true);
    app.attentionSettled = true;
    await settle();
    expect(m.pendingNow).toBe(false);
  });
  it('counts once: pending until every board with something waiting is read, even while the open board shows', async () => {
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    api.getBoard.mockImplementation(async (id: string) => { if (id === OTHER) await held; return id === OTHER ? OTHER_BOARD : DX_BOARD; });
    const m = make();
    await settle();
    expect(m.pendingNow).toBe(true);
    release();
    await settle();
    expect(m.pendingNow).toBe(false);
    expect(new Set(m.needs.map((r) => r.boardId))).toEqual(new Set([OTHER, DX_ID]));
  });
  it('fails, not empty, when every board read fails, and stops being pending', async () => {
    api.getBoard.mockImplementation(async () => { throw new Error('getBoard failed (500)'); });
    app.board = null;
    const m = make();
    await settle();
    expect(m.failed).toBe(true);
    expect(m.pendingNow).toBe(false);
  });
  it('fails when the board list could not be read at all', async () => {
    app.boardsLoaded = false;
    app.boardsFailed = true;
    const m = make();
    await settle();
    expect(m.failed).toBe(true);
    expect(m.pendingNow).toBe(false);
  });
  it('says a spend failure in words, never the raw error', async () => {
    api.getUsage.mockImplementation(async () => { throw new Error('getUsage failed (500)'); });
    const m = make();
    await settle();
    expect(m.usageError).not.toMatch(/failed \(|Error/);
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
  it('the inbox shows 20 activity groups and says how many remain', async () => {
    app.notifications = Array.from({ length: 129 }, (_, i) => ({ ...DX_NOTIFICATIONS[0], seq: 1000 + i, cardId: `card_many_${i}`, createdAt: new Date(Date.UTC(2026, 9, 1) + i * 60_000).toISOString() }));
    const m = make();
    await settle();
    expect(m.groups).toHaveLength(129);
    expect(m.activityPage).toHaveLength(20);
    expect(m.activityRemaining).toBe(109);
    m.showMoreActivity();
    expect(m.activityPage).toHaveLength(40);
    expect(m.activityRemaining).toBe(89);
    inboxScope.choose(DX_ID);
    await settle();
    expect(m.activityShown).toBe(20);
    expect(m.activityPage).toHaveLength(20);
  });
  it('keeps a feed open on every other board in scope and closes them when the Inbox goes', async () => {
    make();
    await settle();
    expect(api.sockets.filter((s) => !s.closed).map((s) => s.boardId)).toEqual([OTHER]);
    inboxScope.choose(DX_ID);
    await settle();
    expect(api.sockets.filter((s) => !s.closed)).toEqual([]);
    inboxScope.choose(null);
    await settle();
    stop?.();
    stop = null;
    expect(api.sockets.every((s) => s.closed)).toBe(true);
  });
  it('a scope board’s event is read again and applied as a diff; paused, it waits for Apply', async () => {
    const m = make();
    await settle();
    const feed = api.sockets.find((s) => s.boardId === OTHER && !s.closed);
    const kept = m.needs.find((r) => r.boardId === OTHER);
    expect(kept).toBeTruthy();
    const keptCard = OTHER_BOARD.cards[0];
    const added = { ...keptCard, id: 'card_other_new', title: 'A new card that needs you' };
    api.getBoard.mockImplementation(async (id: string) => (id === OTHER ? { ...OTHER_BOARD, cards: [...OTHER_BOARD.cards.map((c) => ({ ...c })), added] } : DX_BOARD));
    liveUpdates.pause();
    feed?.emit({ seq: 1, type: 'card.created', payload: { cardId: added.id }, ts: '2026-11-18T09:00:00.000Z' });
    await settle();
    expect(liveUpdates.queued).toHaveLength(1);
    // More events for the same board while paused: still one entry, holding the latest read.
    feed?.emit({ seq: 2, type: 'card.moved', payload: { cardId: added.id }, ts: '2026-11-18T09:00:01.000Z' });
    await settle();
    feed?.emit({ seq: 3, type: 'card.moved', payload: { cardId: added.id }, ts: '2026-11-18T09:00:02.000Z' });
    await settle();
    expect(liveUpdates.queued.map((q) => q.key)).toEqual([`board:${OTHER}`]);
    expect(m.needs.some((r) => r.card.id === added.id)).toBe(false);
    liveUpdates.apply();
    flushSync();
    expect(m.needs.some((r) => r.card.id === added.id)).toBe(true);
    expect(m.changes[OTHER]?.enter.map((i) => i.cardId)).toEqual([added.id]);
    expect(m.changes[OTHER]?.leave).toEqual([]);
    expect(m.changes[OTHER]?.change).toEqual([]);
    // The unchanged card is the same card it was: its row keeps its identity.
    expect(m.needs.find((r) => r.card.id === keptCard.id)?.card).toBe(kept?.card);
  });
  it('groups the needs by what to do, filters them, and says the headline', async () => {
    const m = make();
    await settle();
    const total = m.needs.length;
    expect(m.needGroups.reduce((n, g) => n + g.items.length, 0)).toBe(total);
    expect(m.headline.h1).toContain(`${total} cards want you.`);
    m.filters.group = m.needGroups[0].key;
    expect(m.needGroups.map((g) => g.key)).toEqual([m.filters.group]);
    m.filters.find = 'no card is called this';
    expect(m.needGroups).toEqual([]);
    // Filters narrow the list, never the message.
    expect(m.headline.h1).toContain(`${total} cards want you.`);
  });
  it('a live read compares both sides at one clock: an age that moved a millisecond changes nothing', async () => {
    const m = make();
    await settle();
    const feed = api.sockets.find((s) => s.boardId === OTHER && !s.closed);
    // Every read of the clock is a millisecond later than the last one.
    let t = Date.parse('2026-11-18T09:00:00.000Z');
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => (t += 1));
    try {
      api.getBoard.mockImplementation(async (id: string) => (id === OTHER ? { ...OTHER_BOARD, cards: OTHER_BOARD.cards.map((c) => ({ ...c })) } : DX_BOARD));
      feed?.emit({ seq: 9, type: 'card.updated', payload: {}, ts: '2026-11-18T09:00:00.000Z' });
      await settle();
      expect(OTHER_BOARD.cards.every((c) => c.stateSince)).toBe(true);
      expect(m.changes[OTHER]?.order.length).toBeGreaterThan(0);
      expect(m.changes[OTHER]?.enter).toEqual([]);
      expect(m.changes[OTHER]?.leave).toEqual([]);
      expect(m.changes[OTHER]?.change).toEqual([]);
    } finally {
      clock.mockRestore();
    }
  });
});
