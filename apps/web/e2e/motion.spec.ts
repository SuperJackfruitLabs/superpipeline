// apps/web/e2e/motion.spec.ts — the vibekit motion suite in the app. Reduced motion means no motion at all; with
// motion on, loading skeletons clear and every enter settles: nothing keeps moving the layout, and nothing is left
// covering the controls or blocking the page. Tests never wait on an animation except here, on purpose.
import { expect, test, type Page } from '@playwright/test';
import { DX, VIBES, openWorld, seed } from './support/world';

const SCREENS = ['/inbox', DX, '/plan/projects', `${DX}/operate`] as const;
const SIZE = { width: 1280, height: 820 };

test.beforeAll(async ({ request }) => seed(request));

/** Running animations that end (infinite ones, such as a live pulse, are not motion that settles). */
const finiteRunning = (page: Page) =>
  page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().endTime !== Infinity).length);

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => finiteRunning(page), { timeout: 10_000 }).toBe(0);
}

/** The page is usable: no inert layer, nothing covering the first controls in the main content. */
async function usable(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    if (getComputedStyle(document.body).pointerEvents === 'none') out.push('body pointer-events: none');
    if (document.querySelector('.vk-drag-float, .vk-exit')) out.push('a leftover overlay');
    const main = document.querySelector('main') ?? document.body;
    const controls = [...main.querySelectorAll<HTMLElement>('a[href], button')].filter((el) => {
      const r = el.getBoundingClientRect();
      const shut = el.closest('details');
      if (shut && !shut.open && !el.closest('summary')) return false; // a closed disclosure's form is not on screen
      return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight && !el.closest('[aria-hidden="true"], .vk-visually-hidden');
    }).slice(0, 8);
    for (const el of controls) {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (hit && !el.contains(hit) && !hit.contains(el)) out.push(`${el.outerHTML.slice(0, 80)} is covered by ${hit.outerHTML.slice(0, 80)}`);
    }
    return out;
  });
}

test.describe('reduced motion: nothing animates', () => {
  for (const vibe of VIBES) {
    test(`${vibe}: no animation runs on the main screens`, async ({ page }) => {
      for (const route of SCREENS) {
        await openWorld(page, route, { vibe, dark: false, ...SIZE });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(300);
        const running = await page.evaluate(() => document.getAnimations().map((a) => (a as CSSAnimation).animationName ?? a.constructor.name));
        expect(running, `${vibe} ${route}`).toEqual([]);
      }
    });
  }
});

test.describe('motion on: it settles', () => {
  for (const vibe of VIBES) {
    test(`${vibe}: skeletons clear, enters settle without layout shift, nothing is left covering the page`, async ({ page }) => {
      for (const route of SCREENS) {
        await openWorld(page, route, { vibe, dark: false, ...SIZE });
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.reload();
        await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', undefined, { timeout: 20_000 });
        await expect(page.locator('[data-skeleton], [aria-busy="true"] .vk-skeleton')).toHaveCount(0, { timeout: 15_000 });
        await settle(page);
        const rects = () => page.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3')].slice(0, 12).map((h) => { const r = h.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; }));
        const before = await rects();
        await page.waitForTimeout(600);
        expect(await rects(), `${vibe} ${route}: headings moved after settling`).toEqual(before);
        expect(await usable(page), `${vibe} ${route}`).toEqual([]);
      }
      // A change of screen cross-fades and then hands the page back.
      await page.getByRole('link', { name: /^Inbox/ }).first().click();
      await page.waitForURL(/\/inbox/);
      await settle(page);
      expect(await usable(page), `${vibe}: after a route change`).toEqual([]);
    });
  }
});
