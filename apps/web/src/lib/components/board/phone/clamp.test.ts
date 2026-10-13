// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { clampWatch } from './clamp';

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;

function el(scroll: number, client: number): HTMLElement {
  const p = document.createElement('p');
  Object.defineProperty(p, 'scrollHeight', { configurable: true, get: () => scroll });
  Object.defineProperty(p, 'clientHeight', { configurable: true, get: () => client });
  return p;
}

describe('clampWatch', () => {
  it('reports true when the text overflows its clamp', () => {
    const set = vi.fn();
    clampWatch(el(120, 66), set);
    expect(set).toHaveBeenLastCalledWith(true);
  });
  it('reports false when it fits (1px of rounding allowed)', () => {
    const set = vi.fn();
    clampWatch(el(67, 66), set);
    expect(set).toHaveBeenLastCalledWith(false);
  });
  it('stops reporting once destroyed', async () => {
    const set = vi.fn();
    const action = clampWatch(el(120, 66), set);
    action.destroy();
    set.mockClear();
    await Promise.resolve();
    expect(set).not.toHaveBeenCalled();
  });
});
