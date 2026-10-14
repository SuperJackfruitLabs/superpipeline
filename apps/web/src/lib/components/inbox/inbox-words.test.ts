import { describe, expect, it } from 'vitest';
import { acrossBoards, askBoards, inboxCounts, inboxSubline, wantYou } from './inbox-words';

const row = (kind: string, boardId: string) => ({ item: { kind }, boardId });

describe('the Inbox sentences', () => {
  it('reads the mockup line from real counts', () => {
    const rows = [row('blocked', 'a'), row('repeated-failure', 'a'), row('failed', 'a'), row('review', 'b'), row('question', 'c'), row('no-owner', 'a')];
    expect(inboxSubline(inboxCounts(rows), askBoards(rows), 0)).toBe(
      'Three agents stopped and are waiting on you, two cards wait for your decision and one has nobody to pick it up, across three boards. Nothing is running.',
    );
    expect(wantYou(rows.length)).toBe('6 cards want you.');
    expect(acrossBoards(askBoards(rows))).toBe('across 3 boards');
  });
  it('is singular where it should be, says nothing about boards for one, and only says nothing runs when true', () => {
    const one = [row('review', 'a')];
    expect(wantYou(1)).toBe('1 card wants you.');
    expect(inboxSubline(inboxCounts(one), 1, 2)).toBe('One card waits for your decision. Two agents are working.');
    expect(inboxSubline(inboxCounts([row('blocked', 'a')]), 1, 1)).toBe('One agent stopped and is waiting on you. One agent is working.');
    expect(acrossBoards(1)).toBe('on 1 board');
  });
  it('nothing waiting', () => {
    expect(wantYou(0)).toBe('Nothing needs you.');
    expect(inboxSubline(inboxCounts([]), 0, 0)).toBe('Nothing is running.');
    expect(acrossBoards(0)).toBe('');
  });
});
