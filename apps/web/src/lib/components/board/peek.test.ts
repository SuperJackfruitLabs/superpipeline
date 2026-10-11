// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { cameFromATile } from './peek';

function focusIn(target: Element, from: Element | null): FocusEvent {
  let seen: FocusEvent | undefined;
  target.addEventListener('focusin', (e) => (seen = e as FocusEvent), { once: true });
  target.dispatchEvent(new FocusEvent('focusin', { relatedTarget: from }));
  // currentTarget is reset after dispatch; rebuild the reading the handler had.
  return Object.defineProperty(seen!, 'currentTarget', { value: target });
}

describe('cameFromATile', () => {
  document.body.innerHTML = `<div class="tile" id="a"><button id="a1"></button><button id="a2"></button></div>
    <div class="tile" id="b"><button id="b1"></button></div><button id="out"></button>`;
  const $ = (id: string) => document.getElementById(id)!;
  it('is true when focus walks from one tile to the next, or between controls inside one', () => {
    expect(cameFromATile(focusIn($('b'), $('a1')))).toBe(true);
    expect(cameFromATile(focusIn($('a'), $('a2')))).toBe(true);
  });
  it('is false from outside the board, or from nowhere', () => {
    expect(cameFromATile(focusIn($('a'), $('out')))).toBe(false);
    expect(cameFromATile(focusIn($('a'), null))).toBe(false);
  });
});
