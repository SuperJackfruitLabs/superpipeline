import { expect, test } from '@playwright/test';
import { openBoard, seedBoard, setAppearance } from './support/seed';

/**
 * The translucent-v2 Channel mark (static/brand/README.md) where the app shows its brand.
 *
 * Daylight and Studio put the mark in the rail's home tile, in the brand amber on light and white
 * on dark. Paper's nameplate and Quiet's link row are type only by design, so their home link is
 * the name, never a picture. On a phone no vibe draws the rail; the check there is that no mark
 * that does render has collapsed to nothing. The favicons the page links must load.
 */
const VIBES = ['daylight', 'paper', 'studio', 'quiet'] as const;
const DRAWN = new Set(['daylight', 'studio']);
const AMBER = 'rgb(216, 150, 0)';
const WHITE = 'rgb(255, 255, 255)';

for (const vibe of VIBES) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${vibe} ${theme}: the rail home link carries the mark`, async ({ page, request }) => {
      await setAppearance(page, `${vibe}.${theme}.strong.0`);
      await openBoard(page, await seedBoard(request, `Logo ${vibe} ${theme}`));
      const home = page.getByRole('link', { name: 'Superpipeline home' }).first();
      await expect(home).toBeVisible();
      const mark = home.locator('svg.brandmark');
      if (DRAWN.has(vibe)) {
        await expect(mark).toHaveCount(1);
        const box = (await mark.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(20);
        expect(box.height).toBe(box.width);
        await expect(mark).toHaveAttribute('aria-hidden', 'true');
        // Amber on a light tile, white on a dark one, whatever the page theme (Studio's tile stays light).
        const ground = await home.evaluate((a) => getComputedStyle(a).backgroundColor);
        const [r, g, b] = ground.match(/\d+(\.\d+)?/g)!.map(Number);
        const light = 0.2126 * r! + 0.7152 * g! + 0.0722 * b! > 128;
        await expect(mark).toHaveCSS('color', light ? AMBER : WHITE);
      } else {
        await expect(mark).toHaveCount(0);
        await expect(home).toHaveText(/Superpipeline/);
      }
    });
  }

  test(`${vibe} phone: any mark shown has a size`, async ({ page, request }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setAppearance(page, `${vibe}.light.strong.0`);
    await openBoard(page, await seedBoard(request, `Logo ${vibe} phone`));
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
    for (const m of await page.locator('svg.brandmark').all()) {
      if (!(await m.isVisible())) continue;
      const box = (await m.boundingBox())!;
      expect(box.width).toBeGreaterThan(0);
    }
  });
}

test('every favicon the page links is served with its type', async ({ page, request }) => {
  await page.goto('/');
  const links = await page.locator('link[rel="icon"], link[rel="apple-touch-icon"], link[rel="manifest"]').evaluateAll((ls) =>
    ls.map((l) => ({ href: (l as HTMLLinkElement).href, type: l.getAttribute('type') })),
  );
  expect(links.length).toBeGreaterThanOrEqual(7);
  for (const { href, type } of links) {
    const res = await request.get(href);
    expect(res.status(), href).toBe(200);
    if (type) expect(res.headers()['content-type'], href).toContain(type);
  }
});

test('the logo animation bundle is served as a script', async ({ request }) => {
  const res = await request.get('/brand/logo-motion.js');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toMatch(/javascript/);
  expect(await res.text()).toContain('window.SJLLogoMotion');
});
