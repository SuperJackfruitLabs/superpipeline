// apps/web/src/lib/components/inbox/inbox-scope.test.ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { inboxScope, scopeChips, scopeLabel } from './inbox-scope.svelte';

const boards = [
  { id: 'b1', name: 'Alpha' }, { id: 'b2', name: 'Bravo' }, { id: 'b3', name: 'Charlie' }, { id: 'b4', name: 'Delta' }, { id: 'b5', name: 'Echo' },
];
const asks = [{ boardId: 'b3' }, { boardId: 'b3' }, { boardId: 'b2' }, { boardId: 'b3' }, { boardId: 'b5' }];

describe('the Inbox Show row', () => {
  it('All boards first, then the boards that need you (most first), then the rest behind "N more boards"', () => {
    const s = scopeChips(boards, asks, null);
    expect(s.chips.map((c) => [c.id, c.label, c.count])).toEqual([[null, 'All boards', 5], ['b3', 'Charlie', 3], ['b2', 'Bravo', 1], ['b5', 'Echo', 1]]);
    expect(s.more.map((b) => b.id)).toEqual(['b1', 'b4']);
    expect(s.moreLabel).toBe('2 more boards');
  });
  it('a chosen board that needs nothing still gets its chip, and leaves the rest', () => {
    const s = scopeChips(boards, asks, 'b4');
    expect(s.chips.map((c) => c.id)).toEqual([null, 'b3', 'b2', 'b5', 'b4']);
    expect(s.more.map((b) => b.id)).toEqual(['b1']);
    expect(s.moreLabel).toBe('1 more board');
  });
  it('says the scope in words', () => {
    expect(scopeLabel(null, boards)).toBe('All boards');
    expect(scopeLabel('b2', boards)).toBe('Bravo');
  });
});

describe('the chosen board lives in memory only', () => {
  afterEach(() => { inboxScope.choose(null); vi.restoreAllMocks(); });
  it('choosing writes no storage and no address', () => {
    const local = vi.spyOn(Storage.prototype, 'setItem');
    const before = location.href;
    inboxScope.choose('b2');
    expect(inboxScope.boardId).toBe('b2');
    expect(local).not.toHaveBeenCalled();
    expect(location.href).toBe(before);
  });
  it('starts on all boards', async () => {
    vi.resetModules();
    const fresh = await import('./inbox-scope.svelte');
    expect(fresh.inboxScope.boardId).toBeNull();
  });
});
