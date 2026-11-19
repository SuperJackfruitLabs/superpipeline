// apps/web/scripts/vk-guard.test.ts — the guard itself (vk-scoped-css.test.ts runs it on the card's stylesheet).
import { describe, expect, it } from 'vitest';
import { violations } from './vk-guard.mjs';

describe('the guard: a page may place a vibekit component, never restyle it', () => {
  it('accepts a layout-only rule behind a page class', () => {
    expect(violations('.dl-act .vk-button{max-width:100%;overflow:hidden;text-overflow:ellipsis}')).toEqual([]);
    expect(violations(':where(.fg) .nc-prio .vk-segmented { width: 100%; }')).toEqual([]);
  });
  it('rejects a scoped rule that sets colour, radius, padding or type', () => {
    for (const d of ['color:red', 'background:#000', 'border-radius:3px', 'padding:0 14px', 'font-size:14px']) {
      expect(violations(`.dl-act .vk-button{${d}}`)).toHaveLength(1);
    }
  });
  it('rejects a bare component rule, even a layout one', () => {
    expect(violations('.vk-button{white-space:nowrap}')).toHaveLength(1);
    expect(violations('button:where(:not(.vk-button)) { font: inherit; color: inherit; }'), 'a negation excludes vibekit, it never restyles it').toEqual([]);
    expect(violations('.vk-button:not(.x) { font: inherit; }')).toHaveLength(1);
  });
  it('sees BEM element rules', () => {
    expect(violations('.ap .vk-segmented__item[data-state="checked"]{background:red}')).toHaveLength(1);
  });
});
