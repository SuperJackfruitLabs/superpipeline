// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { cardKeys, openLabel } from './open-label';

const key = (k: string, mods: Partial<KeyboardEventInit> = {}) => new KeyboardEvent('keydown', { key: k, cancelable: true, ...mods });
const handlers = () => ({ open: vi.fn(), toggleMove: vi.fn(), step: vi.fn() });

describe('openLabel', () => {
  it('names the card, its stage and the three keys', () => {
    expect(openLabel({ title: 'Launch post', stageName: 'Build' })).toBe(
      'Launch post, in Build. Enter to open, M to move, Alt with left or right arrow to move between stages.',
    );
  });
});

describe('cardKeys', () => {
  it('opens on Enter', () => {
    const h = handlers();
    cardKeys(key('Enter'), h);
    expect(h.open).toHaveBeenCalledOnce();
  });
  it('toggles the move menu on m and M', () => {
    const h = handlers();
    cardKeys(key('m'), h);
    cardKeys(key('M'), h);
    expect(h.toggleMove).toHaveBeenCalledTimes(2);
  });
  it('steps with Alt and the arrows', () => {
    const h = handlers();
    cardKeys(key('ArrowLeft', { altKey: true }), h);
    cardKeys(key('ArrowRight', { altKey: true }), h);
    expect(h.step.mock.calls).toEqual([[-1], [1]]);
  });
  it('ignores a bare arrow, other keys and modified m', () => {
    const h = handlers();
    const e = key('ArrowLeft');
    cardKeys(e, h);
    cardKeys(key('x'), h);
    cardKeys(key('m', { metaKey: true }), h);
    expect(e.defaultPrevented).toBe(false);
    expect(h.open).not.toHaveBeenCalled();
    expect(h.toggleMove).not.toHaveBeenCalled();
    expect(h.step).not.toHaveBeenCalled();
  });
});
