import { describe, it, expect } from 'vitest';
import { blockedCountInStage, isHeld } from './board-counts';

describe('blockedCountInStage', () => {
  it('counts from blockedBy.length > 0, across the stage\'s cards — two blocked of five', () => {
    const cards = [
      { state: 'submitted', blockedBy: [{ cardId: 'a', title: 'A' }] },
      { state: 'submitted', blockedBy: [] },
      { state: 'submitted', blockedBy: [{ cardId: 'b', title: 'B' }] },
      { state: 'submitted', blockedBy: [] },
      { state: 'submitted', blockedBy: [] },
    ];
    expect(blockedCountInStage(cards)).toBe(2);
  });

  it('is zero when nothing in the stage is blocked', () => {
    expect(blockedCountInStage([{ state: 'submitted', blockedBy: [] }, { state: 'submitted', blockedBy: [] }])).toBe(0);
  });

  it('is zero for an empty stage', () => {
    expect(blockedCountInStage([])).toBe(0);
  });
});

describe('isHeld: the one rule for "blocked"', () => {
  const blocker = [{ cardId: 'a', title: 'A' }];
  it('holds a card that still waits on a blocker, in any live state', () => {
    for (const state of ['submitted', 'working', 'input-required']) expect(isHeld({ state, blockedBy: blocker }), state).toBe(true);
  });
  it('never holds a done or closed card, whatever its history says', () => {
    for (const state of ['completed', 'canceled', 'rejected']) expect(isHeld({ state, blockedBy: blocker }), state).toBe(false);
    expect(blockedCountInStage([{ state: 'completed', blockedBy: blocker }, { state: 'submitted', blockedBy: blocker }])).toBe(1);
  });
  it('does not hold a card with no blocker', () => expect(isHeld({ state: 'submitted', blockedBy: [] })).toBe(false));
});
