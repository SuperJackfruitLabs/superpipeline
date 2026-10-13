// apps/web/src/lib/components/card/open-card.test.ts
import { describe, expect, it, vi } from 'vitest';
import { openCardAnywhere } from './open-card';

describe('openCardAnywhere', () => {
  it('finds the board that holds a card and goes to it', async () => {
    const goto = vi.fn(async () => {});
    const getBoard = vi.fn(async (id: string) => ({ cards: id === 'brd_b' ? [{ id: 'card_f180b1627c594b41' }] : [] }));
    await openCardAnywhere('card_f180b1627c594b41', { boards: () => [{ id: 'brd_a' }, { id: 'brd_b' }], getBoard, goto });
    expect(goto).toHaveBeenCalledWith('/b/brd_b/c/card_f180b1627c594b41');
  });
  it('does nothing for a card no board holds', async () => {
    const goto = vi.fn(async () => {});
    await openCardAnywhere('card_x', { boards: () => [{ id: 'brd_a' }], getBoard: async () => ({ cards: [] }), goto });
    expect(goto).not.toHaveBeenCalled();
  });
});
