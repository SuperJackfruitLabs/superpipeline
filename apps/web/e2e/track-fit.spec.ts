/**
 * The stage track names every stage in full (composition contract, Board variant A): on the seven-stage
 * Developer Experience board at 1008 px, the narrowest desktop width with the rail, in every vibe. A
 * name that a two-line clamp cuts is caught by its height as well as its width. And no vibe adds words
 * of its own to a tile: a card that wants you is marked by colour, weight or a shape, never by text
 * drawn in CSS.
 */
import { test, expect } from '@playwright/test';
import { DX, VIBES, openWorld, seed } from './support/world';

const STAGES = ['Reported', 'Reproduce', 'Failing test', 'Fix', 'Integrate', 'Signed off', 'Shipped'];

test.beforeAll(async ({ request }) => seed(request));

for (const vibe of VIBES) {
  test(`${vibe} 1008: every stage name in the track is whole`, async ({ page }) => {
    await openWorld(page, DX, { vibe, dark: false, width: 1008, height: 900 });
    const names = page.getByRole('list', { name: 'Stages' }).locator('.vk-stages__name');
    await expect(names).toHaveCount(STAGES.length);
    const measured = await names.evaluateAll((els) => els.map((e) => ({
      text: e.textContent, sw: e.scrollWidth, cw: e.clientWidth, sh: e.scrollHeight, ch: e.clientHeight,
    })));
    expect(measured.map((m) => m.text)).toEqual(STAGES);
    for (const m of measured) {
      expect(m.sw, `${m.text}: width ${m.sw} > ${m.cw}`).toBeLessThanOrEqual(m.cw);
      expect(m.sh, `${m.text}: height ${m.sh} > ${m.ch}`).toBeLessThanOrEqual(m.ch);
    }
  });

  test(`${vibe}: a tile's state line carries no words drawn in CSS`, async ({ page }) => {
    await openWorld(page, DX, { vibe, dark: false, width: 1440, height: 900 });
    const lines = page.locator('.bv-tile .bv-st');
    await expect(lines.first()).toBeVisible();
    const generated = await lines.evaluateAll((els) => els.flatMap((e) => ['::before', '::after'].map((p) => getComputedStyle(e, p).content)).filter((c) => c !== 'none' && c !== 'normal'));
    expect(generated).toEqual([]);
  });
}
