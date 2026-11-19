// apps/web/src/lib/focus-row.test.ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { liveMatch } from './focus-row';

describe('liveMatch', () => {
  it('skips a tile fading out (inert) for the live one, whatever the DOM order', () => {
    document.body.innerHTML = '<section inert><article data-card-id="c1" id="old"></article></section><section><article data-card-id="c1" id="new"></article></section>';
    expect(liveMatch('[data-card-id="c1"]')?.id).toBe('new');
  });
  it('is null when only an inert one is there', () => {
    document.body.innerHTML = '<div inert><article data-card-id="c1"></article></div>';
    expect(liveMatch('[data-card-id="c1"]')).toBeNull();
  });
});
