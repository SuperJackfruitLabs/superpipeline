// apps/web/src/lib/motion/reveal.test.ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { revealKind, revealTarget } from './reveal';

describe('revealKind', () => {
  it('does nothing under reduced motion, in every vibe', () => {
    for (const v of ['daylight', 'paper', 'studio', 'quiet']) expect(revealKind(true, v, 40, 200)).toBe('none');
  });
  it('fades in Quiet, never moving a height', () => expect(revealKind(false, 'quiet', 40, 200)).toBe('fade'));
  it('animates the height elsewhere, unless it did not change', () => {
    expect(revealKind(false, 'paper', 40, 200)).toBe('height');
    expect(revealKind(false, 'studio', 120, 120.4)).toBe('none');
  });
});

describe('revealTarget', () => {
  it('is the toggle’s [data-reveal] block; menus are not reveals', () => {
    document.body.innerHTML = '<div data-reveal id="b"><p>t</p><button aria-expanded="false" id="t"><span id="s">Show all</span></button><button aria-expanded="false" aria-haspopup="menu" id="m">Move</button></div><button aria-expanded="false" id="o">x</button>';
    expect(revealTarget(document.getElementById('s'))?.id).toBe('b');
    expect(revealTarget(document.getElementById('m'))).toBeNull();
    expect(revealTarget(document.getElementById('o'))).toBeNull();
  });
});
