// apps/web/e2e/pixel/references-canonical.test.ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { violations } from './vk-guard.mjs';

const DIR = join(__dirname, '../reference/mockups');
const files = readdirSync(DIR).filter((f) => f.endsWith('.html'));
const styles = (html: string) => [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');

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

describe('references are re-synced to vibekit 0.0.1', () => {
  it('has all 80 references', () => expect(files).toHaveLength(80));
  for (const f of files) {
    const html = readFileSync(join(DIR, f), 'utf8');
    it(`${f} names the product, so it paints Gold`, () => {
      expect(html).toMatch(/<html[^>]*\bdata-product="superpipeline"/);
      expect(html).toMatch(/<html[^>]*\bdata-accent="product"/);
    });
    it(`${f}: every [data-vibe] element carries data-product and data-accent`, () => {
      const doc = new JSDOM(html).window.document;
      // An accent swatch or another product's mark (SP-Dlg-Appearance) draws its own accent, as the app's AppearancePicker does.
      const own = (e: Element) => e.matches('.sw.acc, .ac-other') && /^(gold|moss|jade|teal|azure|cobalt|violet|plum)$/.test(e.getAttribute('data-accent') ?? '');
      const bare = [...doc.querySelectorAll('[data-vibe]')].filter((e) => e.getAttribute('data-product') !== 'superpipeline' || (e.getAttribute('data-accent') !== 'product' && !own(e)));
      expect(bare.map((e) => e.outerHTML.slice(0, 80))).toEqual([]);
    });
    it(`${f} carries no rule of its own that restyles a vibekit component`, () => {
      expect(violations(styles(html))).toEqual([]);
    });
    it(`${f} has no duplicate ids`, () => {
      const ids = [...new JSDOM(html).window.document.querySelectorAll('[id]')].map((e) => e.id);
      expect(ids.filter((x, i) => ids.indexOf(x) !== i)).toEqual([]);
    });
  }
});
