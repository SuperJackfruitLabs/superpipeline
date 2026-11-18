// apps/web/src/lib/stores/app.scope-sockets.test.ts
// @vitest-environment jsdom
/**
 * The live feeds the app holds: the open board's, opened as soon as its snapshot arrives, and one per
 * other board the Inbox shows ("All boards" stays live, spec §12.2).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Api from '$lib/api';
import type { BoardFeedEvent } from '$lib/api';

type FakeSocket = EventTarget & { boardId: string; closed: boolean; close(): void; emit(e: BoardFeedEvent | null): void };
const h = vi.hoisted(() => ({
  sockets: [] as FakeSocket[],
  agents: null as null | Promise<unknown[]>,
}));
const BOARD = (id: string) => ({ boardId: id, name: id, stages: [], cards: [], gates: [], elicitations: [], references: [] });
vi.mock('$lib/api', async (orig) => ({
  ...(await orig<typeof Api>()),
  getBoard: vi.fn<(id: string) => Promise<unknown>>(async (id) => BOARD(id)),
  getBoards: vi.fn<() => Promise<unknown[]>>(async () => []),
  listAttention: vi.fn<() => Promise<unknown>>(async () => ({ cards: [], boardsUnanswered: 0 })),
  getNotifications: vi.fn<() => Promise<unknown[]>>(async () => []),
  listLabels: vi.fn<() => Promise<unknown[]>>(async () => []),
  getAgents: vi.fn<() => Promise<unknown[]>>(() => h.agents ?? Promise.resolve([])),
  getMembers: vi.fn<() => Promise<unknown[]>>(async () => []),
  listProjects: vi.fn<() => Promise<unknown[]>>(async () => []),
  openBoardSocket: vi.fn<(boardId: string, onEvent: (e: BoardFeedEvent | null) => void) => FakeSocket>((boardId, onEvent) => {
    const s = Object.assign(new EventTarget(), {
      boardId, closed: false,
      close() { s.closed = true; },
      emit(e: BoardFeedEvent | null) { onEvent(e); },
    });
    h.sockets.push(s);
    return s;
  }),
}));

import { app } from './app.svelte';
import { liveUpdates } from '$lib/live/live-updates.svelte';
import * as api from '$lib/api';

const open = (id: string) => h.sockets.filter((s) => s.boardId === id && !s.closed);
const EVENT: BoardFeedEvent = { seq: 7, type: 'card.moved', payload: { cardId: 'card_1' }, ts: '2026-11-18T09:00:00.000Z' };

beforeEach(() => {
  h.sockets = [];
  h.agents = null;
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
    const off = app.onScopeEvent((boardId, event) => seen.push([boardId, event]));
    // The open board is not in the list: its own feed already carries it.
    app.openScopeSockets(['brd_open', 'brd_a', 'brd_b']);
    expect(h.sockets.map((s) => s.boardId)).toEqual(['brd_a', 'brd_b']);
    // The same scope again opens nothing new.
    app.openScopeSockets(['brd_b', 'brd_a', 'brd_open']);
    expect(h.sockets).toHaveLength(2);
    // Each event names its board.
    open('brd_a')[0].emit(EVENT);
    open('brd_b')[0].emit(null);
    expect(seen).toEqual([['brd_a', EVENT], ['brd_b', null]]);
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
    feed.emit(EVENT);
    await Promise.resolve();
    expect(api.getBoard).not.toHaveBeenCalled();
    expect(liveUpdates.queued).toHaveLength(1);
    liveUpdates.resume();
    await vi.waitFor(() => expect(api.getBoard).toHaveBeenCalledWith('brd_open'));
  });
});
