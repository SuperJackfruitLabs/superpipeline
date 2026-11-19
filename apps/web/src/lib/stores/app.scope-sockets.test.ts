// apps/web/src/lib/stores/app.scope-sockets.test.ts
// @vitest-environment jsdom
/**
 * The live feeds the app holds: the open board's, opened as soon as its snapshot arrives, and one per
 * other board the Inbox shows ("All boards" stays live, spec §12.2).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Api from '$lib/api';
import type { BoardFeedEvent } from '$lib/api';

type FakeSocket = EventTarget & { boardId: string; closed: boolean; close(): void; emit(e: BoardFeedEvent | null, snapshot?: unknown): void };
const h = vi.hoisted(() => ({
  sockets: [] as FakeSocket[],
  agents: null as null | Promise<unknown[]>,
  renew: [] as unknown[],
  /** A board read that is not the plain `BOARD(id)`. */
  boards: {} as Record<string, unknown>,
}));
const BOARD = (id: string) => ({ boardId: id, name: id, stages: [], cards: [], gates: [], elicitations: [], references: [] });
vi.mock('$lib/api', async (orig) => ({
  ...(await orig<typeof Api>()),
  getMe: vi.fn<() => Promise<unknown>>(async () => ({ userId: 'usr_1', tenantId: 'tnt_1', name: 'Ira Mehta' })),
  renewSession: vi.fn<() => Promise<unknown>>(async () => h.renew.shift() ?? { ok: true }),
  getBoard: vi.fn<(id: string) => Promise<unknown>>(async (id) => h.boards[id] ?? BOARD(id)),
  getBoards: vi.fn<() => Promise<unknown[]>>(async () => []),
  listAttention: vi.fn<() => Promise<unknown>>(async () => ({ cards: [], boardsUnanswered: 0 })),
  getNotifications: vi.fn<() => Promise<unknown[]>>(async () => []),
  listLabels: vi.fn<() => Promise<unknown[]>>(async () => []),
  getAgents: vi.fn<() => Promise<unknown[]>>(() => h.agents ?? Promise.resolve([])),
  getMembers: vi.fn<() => Promise<unknown[]>>(async () => []),
  listProjects: vi.fn<() => Promise<unknown[]>>(async () => []),
  openBoardSocket: vi.fn<(boardId: string, onEvent: (e: BoardFeedEvent | null, snapshot?: unknown) => void) => FakeSocket>((boardId, onEvent) => {
    const s = Object.assign(new EventTarget(), {
      boardId, closed: false,
      close() { s.closed = true; },
      emit(e: BoardFeedEvent | null, snapshot?: unknown) { onEvent(e, snapshot); },
    });
    h.sockets.push(s);
    return s;
  }),
}));

import { app } from './app.svelte';
import { liveUpdates } from '$lib/live/live-updates.svelte';
import { auth } from '$lib/auth-recovery.svelte';
import * as api from '$lib/api';

/** The server ends a feed: it is closed and says so. */
const drop = (s: FakeSocket): void => { s.closed = true; s.dispatchEvent(new Event('close')); };
const open = (id: string) => h.sockets.filter((s) => s.boardId === id && !s.closed);
const EVENT: BoardFeedEvent = { seq: 7, type: 'card.moved', payload: { cardId: 'card_1' }, ts: '2026-11-18T09:00:00.000Z' };

beforeEach(() => {
  h.sockets = [];
  h.agents = null;
  h.boards = {};
  localStorage.clear();
  app.dispose();
  app.closeScopeSockets();
  liveUpdates.resume();
  app.boardId = 'brd_open';
  app.board = null;
  app.connected = false;
});
afterEach(() => { app.closeScopeSockets(); app.dispose(); liveUpdates.resume(); vi.clearAllMocks(); });

describe('the app’s live feeds', () => {
  it('opens one socket per board in scope and closes the ones that leave', () => {
    const seen: Array<[string, BoardFeedEvent | null]> = [];
    const off = app.onScopeEvent((boardId, event) => seen.push([boardId, event]), () => true);
    // The open board is not in the list: its own feed already carries it.
    app.openScopeSockets(['brd_open', 'brd_a', 'brd_b']);
    expect(h.sockets.map((s) => s.boardId)).toEqual(['brd_a', 'brd_b']);
    // The same scope again opens nothing new.
    app.openScopeSockets(['brd_b', 'brd_a', 'brd_open']);
    expect(h.sockets).toHaveLength(2);
    // A fresh feed's opening snapshot of a board the listener holds says nothing; each event names its board.
    open('brd_a')[0].emit(null, BOARD('brd_a'));
    open('brd_a')[0].emit(EVENT);
    open('brd_b')[0].emit(EVENT);
    expect(seen).toEqual([['brd_a', EVENT], ['brd_b', EVENT]]);
    // A board leaves the scope: its socket closes; one that joins opens.
    app.openScopeSockets(['brd_b', 'brd_c']);
    expect(open('brd_a')).toHaveLength(0);
    expect(open('brd_b')).toHaveLength(1);
    expect(open('brd_c')).toHaveLength(1);
    expect(h.sockets).toHaveLength(3);
    // A socket that left says nothing any more, even if a late message arrives.
    h.sockets[0].emit(EVENT);
    expect(seen).toHaveLength(2);
    // Closing the scope closes every socket, and the listener can leave.
    app.closeScopeSockets();
    expect(h.sockets.every((s) => s.closed)).toBe(true);
    off();
    app.openScopeSockets(['brd_d']);
    open('brd_d')[0].emit(EVENT);
    expect(seen).toHaveLength(2);
  });
  it('opens the live feed as soon as the board arrives: a slow agents read does not hold Connecting…', async () => {
    let release!: (v: unknown[]) => void;
    h.agents = new Promise((r) => (release = r));
    const opening = app.openBoard('brd_slow');
    await vi.waitFor(() => expect(open('brd_slow')).toHaveLength(1));
    open('brd_slow')[0].dispatchEvent(new Event('open'));
    expect(app.connected).toBe(true);
    expect(app.agentsLoaded).toBe(false);
    release([]);
    await opening;
    // Still the one socket: reading the agents did not open a second.
    expect(h.sockets.filter((s) => s.boardId === 'brd_slow')).toHaveLength(1);
    expect(open('brd_slow')).toHaveLength(1);
  });
  it('a paused page holds the open board too: its refresh waits in the queue', async () => {
    await app.openBoard('brd_open');
    const feed = open('brd_open')[0];
    vi.mocked(api.getBoard).mockClear();
    liveUpdates.pause();
    // Three events for the board: one refresh waits, not three.
    for (const seq of [7, 8, 9]) feed.emit({ ...EVENT, seq });
    await Promise.resolve();
    expect(api.getBoard).not.toHaveBeenCalled();
    expect(liveUpdates.queued.map((q) => q.key)).toEqual(['app:board:brd_open']);
    liveUpdates.resume();
    await vi.waitFor(() => expect(api.getBoard).toHaveBeenCalledWith('brd_open'));
    expect(api.getBoard).toHaveBeenCalledTimes(1);
  });
  it('a paused page holds the feed: an open card hears its events only on resume, in order', async () => {
    await app.openBoard('brd_open');
    const feed = open('brd_open')[0];
    const heard: string[] = [];
    const off = app.onFeed((e) => heard.push(`${String(e.payload.cardId)}:${e.seq}`));
    liveUpdates.pause();
    feed.emit({ ...EVENT, seq: 7, payload: { cardId: 'card_a' } });
    feed.emit({ ...EVENT, seq: 8, payload: { cardId: 'card_a' } });
    expect(heard).toEqual([]);
    // Another board opens while paused, and its feed numbers its events from the same seq.
    await app.openBoard('brd_other');
    open('brd_other')[0].emit({ ...EVENT, seq: 7, payload: { cardId: 'card_b' } });
    expect(liveUpdates.queued.map((q) => q.key)).toEqual([
      'app:board:brd_open', 'feed:brd_open:7', 'feed:brd_open:8', 'app:board:brd_other', 'feed:brd_other:7',
    ]);
    liveUpdates.resume();
    expect(heard).toEqual(['card_a:7', 'card_a:8', 'card_b:7']);
    off();
  });
  it('after a lapsed session is renewed, each scope board is read again once', async () => {
    const reads: string[] = [];
    const off = app.onScopeEvent((id) => reads.push(id), () => true);
    app.watchAuth();
    await app.openBoard('brd_open');
    app.openScopeSockets(['brd_a', 'brd_b']);
    for (const id of ['brd_a', 'brd_b']) open(id)[0].emit(null, BOARD(id)); // fresh feeds: snapshots of held boards are skipped
    expect(reads).toEqual([]);
    h.renew = [{ ok: false, reason: 'login_required' }];
    await auth.recover();
    expect(auth.state).toBe('expired');
    expect(open('brd_a')).toHaveLength(0);
    expect(open('brd_b')).toHaveLength(0);
    // Signed in again: the scope comes back as reconnects, so each opening snapshot reads its board.
    h.renew = [{ ok: true }];
    await auth.recover();
    expect(auth.state).toBe('ok');
    for (const id of ['brd_a', 'brd_b']) open(id)[0].emit(null);
    expect(reads).toEqual(['brd_a', 'brd_b']);
    off();
    auth.resolved();
  });
  it('a fresh feed skips an opening snapshot of the board it holds; a reconnected one reads the board again', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      await app.openBoard('brd_open');
      vi.mocked(api.getBoard).mockClear();
      liveUpdates.pause();
      const first = open('brd_open')[0];
      first.dispatchEvent(new Event('open'));
      first.emit(null, BOARD('brd_open'));
      expect(liveUpdates.queued).toEqual([]);
      // The feed drops and comes back: the way back refreshes, and so does the new feed's snapshot (one entry).
      drop(first);
      await vi.advanceTimersByTimeAsync(2_000);
      const second = open('brd_open').at(-1);
      expect(second).not.toBe(first);
      second?.emit(null);
      expect(liveUpdates.queued.map((q) => q.key)).toEqual(['app:board:brd_open']);
      liveUpdates.resume();
      await vi.waitFor(() => expect(api.getBoard).toHaveBeenCalledWith('brd_open'));
      // A scope feed: the same rule.
      const seen: Array<BoardFeedEvent | null> = [];
      const off = app.onScopeEvent((_id, e) => seen.push(e), () => true);
      app.openScopeSockets(['brd_a']);
      const a = open('brd_a')[0];
      a.emit(null, BOARD('brd_a'));
      expect(seen).toEqual([]);
      drop(a);
      await vi.advanceTimersByTimeAsync(2_000);
      open('brd_a')[0].emit(null);
      expect(seen).toEqual([null]);
      off();
    } finally {
      vi.useRealTimers();
    }
  });
  it('a fresh feed whose opening snapshot is not the board it read reads it again: a card made in between arrives', async () => {
    await app.openBoard('brd_open');
    vi.mocked(api.getBoard).mockClear();
    const feed = open('brd_open')[0];
    feed.dispatchEvent(new Event('open'));
    // Another client created a card after this one read the board and before its feed began.
    const card = { id: 'card_new', title: 'Realtime card', currentStageKey: 'backlog' };
    h.boards.brd_open = { ...BOARD('brd_open'), cards: [card] };
    feed.emit(null, { ...BOARD('brd_open'), cards: [card] });
    await vi.waitFor(() => expect(app.board?.cards.map((c) => c.id)).toEqual(['card_new']));
    expect(api.getBoard).toHaveBeenCalledTimes(1);
  });
  it('paused, an opening snapshot that differs waits as one read; one that cannot be read is not skipped', async () => {
    await app.openBoard('brd_open');
    liveUpdates.pause();
    open('brd_open')[0].emit(null, { ...BOARD('brd_open'), name: 'Renamed' });
    expect(liveUpdates.queued.map((q) => q.key)).toEqual(['app:board:brd_open']);
    liveUpdates.resume();
    await app.openBoard('brd_other');
    liveUpdates.pause();
    open('brd_other')[0].emit(null);
    expect(liveUpdates.queued.map((q) => q.key)).toEqual(['app:board:brd_other']);
  });
  it('a scope feed hands its opening snapshot on unless every listener holds that board', () => {
    const seen: Array<[string, BoardFeedEvent | null]> = [];
    const judged: Array<[string, string | null]> = [];
    const off = app.onScopeEvent((id, e) => seen.push([id, e]), (id, snap) => { judged.push([id, snap.name]); return snap.name === id; });
    app.openScopeSockets(['brd_a', 'brd_b', 'brd_c']);
    open('brd_a')[0].emit(null, BOARD('brd_a'));
    // A change made between the Inbox's read and the feed's start: the listener does not hold it.
    open('brd_b')[0].emit(null, { ...BOARD('brd_b'), name: 'Renamed' });
    // A first message that cannot be read is never skipped.
    open('brd_c')[0].emit(null);
    expect(judged).toEqual([['brd_a', 'brd_a'], ['brd_b', 'Renamed']]);
    expect(seen).toEqual([['brd_b', null], ['brd_c', null]]);
    off();
    // With no listener to judge, an opening snapshot is handed on.
    const heard: string[] = [];
    const off2 = app.onScopeEvent((id) => heard.push(id));
    app.openScopeSockets(['brd_d']);
    open('brd_d')[0].emit(null, BOARD('brd_d'));
    expect(heard).toEqual(['brd_d']);
    off2();
  });
  it('a scope feed that opened again starts its backoff over', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5); // no jitter: 1 s, then 2 s, ...
    try {
      app.openScopeSockets(['brd_a']);
      const first = open('brd_a')[0];
      first.dispatchEvent(new Event('open'));
      drop(first);
      vi.advanceTimersByTime(1_000);
      const second = open('brd_a')[0];
      expect(second).not.toBe(first);
      second.dispatchEvent(new Event('open'));
      drop(second);
      // Opened in between, so this is a first drop again: back after 1 s, not 2 s.
      vi.advanceTimersByTime(1_000);
      expect(open('brd_a')).toHaveLength(1);
      expect(open('brd_a')[0]).not.toBe(second);
    } finally {
      random.mockRestore();
      vi.useRealTimers();
    }
  });
  it('dispose closes the scope feeds and cancels their reconnects', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      app.openScopeSockets(['brd_a', 'brd_b']);
      drop(open('brd_a')[0]);
      app.dispose();
      expect(h.sockets.every((s) => s.closed || s.boardId === 'brd_a')).toBe(true);
      expect(open('brd_b')).toHaveLength(0);
      const before = h.sockets.length;
      vi.advanceTimersByTime(60_000);
      expect(h.sockets).toHaveLength(before);
    } finally {
      vi.useRealTimers();
    }
  });
});
