import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { openBoard, seedBoard, setAppearance } from './support/seed';
import { PORTS } from '../scripts/ports';

/**
 * The desktop rail stays the height of the window, however long the page is.
 *
 * Reported live (2026-10-14): with ~40 cards in one lane, Daylight's and Studio's rail stretched to
 * the full height of the page (the grid row is as tall as the board), so its foot — the account —
 * sat thousands of pixels down. The rail now sticks to the window and scrolls on its own if the
 * window is short; the page keeps its own scroll. Paper's and Quiet's navs are rows across the top:
 * they must stay a row, not grow with the page.
 */
const API = PORTS.apiUrl;
const TENANT = { 'X-Tenant-Id': 'tnt_dev', 'Content-Type': 'application/json' };
const CARDS = 40;

async function seedLongLane(request: APIRequestContext, name: string): Promise<string> {
  const boardId = await seedBoard(request, name);
  for (let i = 1; i <= CARDS; i++) {
    await request.post(`${API}/v1/boards/${boardId}/cards`, { headers: TENANT, data: { title: `Long lane card ${i}`, ownerUserId: 'usr_dev' } });
  }
  return boardId;
}

/** The visible Superpipeline nav's box, the account control's box, and the scroll state. */
async function measure(page: Page) {
  return page.evaluate(() => {
    const nav = [...document.querySelectorAll<HTMLElement>('nav[aria-label="Superpipeline"]')].find((n) => n.getBoundingClientRect().height > 0)!;
    const r = nav.getBoundingClientRect();
    return {
      innerHeight: window.innerHeight,
      scrollY: window.scrollY,
      pageHeight: document.documentElement.scrollHeight,
      top: r.top,
      bottom: r.bottom,
      height: r.height,
      sideways: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
}

const RAIL_VIBES = new Set(['daylight', 'studio']);
const SIZES = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1100x800', width: 1100, height: 800 },
  { name: 'phone', width: 390, height: 844 },
];

for (const vibe of ['daylight', 'studio', 'paper', 'quiet']) {
  for (const size of SIZES) {
    test.describe(`${vibe} at ${size.name}`, () => {
      test.use({ viewport: { width: size.width, height: size.height } });

      test('the nav stays the window height, not the page height, at the top and at the bottom', async ({ page, request }) => {
        await setAppearance(page, `${vibe}.light.strong.0`);
        const boardId = await seedLongLane(request, `Rail height ${vibe} ${size.name}`);
        await openBoard(page, boardId);
        await expect(page.locator('html')).toHaveAttribute('data-vibe', vibe);
        // A cold dev server can fail the first page's dynamic import ("Failed to fetch dynamically
        // imported module"); that page never recovers, so reload it once rather than flake.
        const last = page.getByText(`Long lane card ${CARDS}`, { exact: true }).first();
        if (!(await last.waitFor({ state: 'attached', timeout: 15_000 }).then(() => true, () => false))) await page.reload();
        await expect(last).toBeAttached();

        const top = await measure(page);
        expect(top.pageHeight, 'the long lane makes the page taller than the window').toBeGreaterThan(top.innerHeight * 1.5);

        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await expect.poll(async () => (await measure(page)).scrollY).toBeGreaterThan(0);
        const bottom = await measure(page);

        const phone = size.width < 768;
        for (const m of [top, bottom]) {
          expect(m.sideways).toBeLessThanOrEqual(0);
          if (phone) {
            // The phone's bottom nav: on the screen and whole.
            expect(m.bottom).toBeLessThanOrEqual(m.innerHeight + 0.5);
            expect(m.top).toBeGreaterThanOrEqual(0);
          } else if (RAIL_VIBES.has(vibe)) {
            // The rail fills the window (Daylight floats 12px inside it) and never more.
            expect(m.top).toBeGreaterThanOrEqual(-0.5);
            expect(m.bottom).toBeLessThanOrEqual(m.innerHeight + 0.5);
            expect(m.height).toBeGreaterThanOrEqual(m.innerHeight - 24.5);
          } else {
            // A row across the top: far shorter than the window.
            expect(m.height).toBeLessThan(m.innerHeight / 2);
          }
        }

        if (!phone && RAIL_VIBES.has(vibe)) {
          // The rail's foot (the account) is reachable at the bottom of the page.
          const account = page.locator('nav[aria-label="Superpipeline"] .vk-appnav__account').first();
          await account.scrollIntoViewIfNeeded();
          await expect(account).toBeInViewport();
        }
      });
    });
  }
}
