// apps/web/src/lib/components/plan/list/list-css.test.ts
/**
 * jsdom draws no CSS, so the List's rule that hides vibekit's keys sentence is pinned in list.css itself: the table
 * is described by that sentence (same words as the footer's keys line), which the footer shows, so it is read
 * by screen readers, not drawn. Without the rule the keys appear twice.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./list.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

describe("the List's keys sentence", () => {
  it('is clipped, not drawn', () => {
    expect(css).toMatch(/\.lv \.vk-datatable__keys \{[^}]*position: absolute;[^}]*clip-path: inset\(50%\)/);
  });
});
