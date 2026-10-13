// apps/web/e2e/pixel/references-render.spec.ts — every reference, light and derived dark, through
// renderReference with all guards; then: the accent is vibekit's Gold for that vibe×theme (read from
// vibekit's accents.css, the [data-product="superpipeline"] path), and no control is wider than its card.
// Run: pnpm --filter @superpipeline/web test:refs (no app server needed).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { MANIFEST, renderReference, resolveReference } from './reference';

const ACCENTS = readFileSync(fileURLToPath(new URL('../../node_modules/@superjackfruit/vibekit/dist/styles/accents.css', import.meta.url)), 'utf8');
/** vibekit's own Gold for a vibe and theme: the block accents.css keys on product="superpipeline". */
export function gold(vibe: string, theme: string): string {
  const key = `[data-vibe="${vibe}"][data-theme="${theme}"][data-accent="product"][data-product="superpipeline"]`;
  const at = ACCENTS.indexOf(key);
  if (at < 0) throw new Error(`accents.css has no ${key}`);
  return /--vk-color-accent:\s*([^;]+);/.exec(ACCENTS.slice(at))![1]!.trim();
}

/** Controls whose box pokes out of the nearest drawn box (border or background) around them. */
async function overflowing(page: import('@playwright/test').Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const drawn = (e: Element) => { const s = getComputedStyle(e); return parseFloat(s.borderLeftWidth) > 0 && parseFloat(s.borderRightWidth) > 0 || (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent'); };
    for (const c of document.querySelectorAll('.vk-button, .vk-iconbutton, .vk-segmented, .vk-field__input')) {
      const r = c.getBoundingClientRect();
      if (!r.width) continue;
      let p = c.parentElement;
      while (p && p !== document.body && !drawn(p)) p = p.parentElement;
      if (!p || p === document.body) continue;
      const b = p.getBoundingClientRect();
      if (r.left < b.left - 1 || r.right > b.right + 1) out.push(`${(c.textContent ?? '').trim().slice(0, 40)} (${Math.round(r.width)}px in ${Math.round(b.width)}px .${p.className})`);
    }
    return out;
  });
}

for (const art of Object.keys(MANIFEST)) for (const theme of ['light', 'dark'] as const) {
  test(`${art} ${theme}`, async ({ page }) => {
    await renderReference(page, resolveReference(art, theme)!, art);
    const got = await page.evaluate(() => [...document.querySelectorAll('[data-vibe]')].map((e) => [e.getAttribute('data-vibe')!, e.getAttribute('data-theme')!, getComputedStyle(e).getPropertyValue('--vk-color-accent').trim()]));
    expect(got.length).toBeGreaterThan(0);
    for (const [v, t, a] of got) {
      expect(t).toBe(theme);
      expect(a, `${v} ${t}`).toBe(gold(v, t));
    }
    expect(await overflowing(page)).toEqual([]);
  });
}
