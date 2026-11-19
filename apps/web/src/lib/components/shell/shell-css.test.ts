// apps/web/src/lib/components/shell/shell-css.test.ts
/**
 * jsdom does no layout, so the phone row's Live reservation (ShellView's `.sh-phone-live` cell) is pinned here, in
 * shell.css itself: without these rules the hidden pills take no width, the toggle's word decides whether the row
 * wraps, and the phone header changes height when the feed opens (loading contract, rule 11; e2e/project-loading.spec.ts).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./shell.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
/** The declarations of the one rule whose selector is exactly `selector`. */
const rule = (selector: string): string => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\>:]/g, '\\$&');
  return new RegExp(`(?:^|\\})\\s*${esc}\\s*\\{([^}]*)\\}`, 'm').exec(css)?.[1]?.replace(/\s+/g, ' ').trim() ?? '';
};

describe("the phone row's Live reservation in shell.css", () => {
  it('makes the toggle cell a grid', () => {
    expect(rule('.sh-phone-live')).toMatch(/display: inline-grid/);
  });
  it('stacks the toggle and every hidden pill in one grid area, so the cell is as wide as the widest', () => {
    expect(rule('.sh-phone-live > *')).toMatch(/grid-area: 1 \/ 1/);
  });
  it('hides the pills without taking them out of layout', () => {
    expect(rule('.sh-phone-live-size')).toMatch(/visibility: hidden/);
    expect(rule('.sh-phone-live-size')).not.toMatch(/display: none/);
  });
  it('draws each pill its word from data-word', () => {
    expect(rule('.sh-phone-live-size::after')).toMatch(/content: attr\(data-word\)/);
  });
});
