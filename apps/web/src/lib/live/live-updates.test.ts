// apps/web/src/lib/live/live-updates.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveUpdates, LIVE_UPDATES_KEY } from './live-updates.svelte';

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
}

beforeEach(() => { vi.stubGlobal('localStorage', memoryStorage()); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('LiveUpdates', () => {
  it('push runs now when live and queues when paused; resume applies in order', () => {
    const l = new LiveUpdates();
    const seen: number[] = [];
    l.push('a', () => seen.push(1));
    expect(seen).toEqual([1]);
    l.pause();
    l.push('a', () => seen.push(2));
    l.push('b', () => seen.push(3));
    expect(seen).toEqual([1]);
    expect(l.queued).toHaveLength(2);
    l.resume();
    expect(seen).toEqual([1, 2, 3]);
    expect(l.queued).toHaveLength(0);
    expect(l.live).toBe(true);
    // Apply while paused plays the queue and stays paused.
    l.pause();
    l.push('c', () => seen.push(4));
    l.apply();
    expect(seen).toEqual([1, 2, 3, 4]);
    expect(l.queued).toHaveLength(0);
    expect(l.live).toBe(false);
  });
  it('a key already waiting keeps its place and takes the latest change', () => {
    const l = new LiveUpdates();
    const seen: string[] = [];
    l.pause();
    l.push('inbox:board:a', () => seen.push('a1'));
    l.push('inbox:board:b', () => seen.push('b1'));
    l.push('inbox:board:a', () => seen.push('a2'));
    l.push('inbox:board:a', () => seen.push('a3'));
    expect(l.queued.map((q) => q.key)).toEqual(['inbox:board:a', 'inbox:board:b']);
    l.resume();
    expect(seen).toEqual(['a3', 'b1']);
  });
  it('drop forgets what waits under a key and keeps the rest in order', () => {
    const l = new LiveUpdates();
    l.pause();
    const ran: string[] = [];
    l.push('a', () => ran.push('a'));
    l.push('b', () => ran.push('b'));
    l.push('c', () => ran.push('c'));
    l.drop('b');
    l.drop('nothing');
    l.apply();
    expect(ran).toEqual(['a', 'c']);
  });
  it('the choice is remembered', () => {
    const a = new LiveUpdates();
    expect(a.live).toBe(true);
    a.pause();
    expect(localStorage.getItem(LIVE_UPDATES_KEY)).toBe('paused');
    expect(new LiveUpdates().live).toBe(false);
    a.resume();
    expect(localStorage.getItem(LIVE_UPDATES_KEY)).toBe('on');
    expect(new LiveUpdates().live).toBe(true);
    // A private window that refuses storage still works; it simply forgets.
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } });
    const b = new LiveUpdates();
    expect(b.live).toBe(true);
    expect(() => b.pause()).not.toThrow();
    expect(b.live).toBe(false);
  });
  it('queued reads replay in order and end on the latest one', () => {
    type Row = { key: string; v: number };
    const snapshots: Row[][] = [
      [{ key: 'a', v: 1 }, { key: 'b', v: 1 }],
      [{ key: 'b', v: 2 }, { key: 'c', v: 1 }],
      [{ key: 'c', v: 1 }, { key: 'b', v: 2 }, { key: 'd', v: 1 }],
      [{ key: 'd', v: 5 }, { key: 'c', v: 1 }],
    ];
    const play = (l: LiveUpdates): { rows: () => Row[]; order: number[] } => {
      let rows = snapshots[0];
      const order: number[] = [];
      for (let i = 1; i < snapshots.length; i++) l.push(`read:${i}`, () => { rows = snapshots[i]; order.push(i); });
      return { rows: () => rows, order };
    };
    const live = play(new LiveUpdates());
    const paused = new LiveUpdates();
    paused.pause();
    const held = play(paused);
    // Paused: nothing moved, three reads wait.
    expect(held.rows()).toEqual(snapshots[0]);
    expect(paused.queued).toHaveLength(3);
    paused.apply();
    expect(held.order).toEqual([1, 2, 3]);
    expect(held.rows()).toEqual(live.rows());
    expect(held.rows()).toEqual(snapshots[3]);
  });
});
