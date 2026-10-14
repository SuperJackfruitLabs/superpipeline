import { expect, test, type Page } from '@playwright/test';
import { API, TENANT, openBoard, seedBoard, setAppearance } from './support/seed';

// vibekit's phone tab bar is fixed to the foot of the screen. Every phone page must leave enough
// bottom padding that, scrolled to the end, its last item sits above the bar: an item under the bar
// cannot be read or tapped (the Studio phone's title hid under it once, merge-2).
const VIBES = ['daylight', 'paper', 'studio', 'quiet'] as const;
const PHONE = { width: 390, height: 844 };

/** Scrolls to the end and returns how far the last visible item in main runs under the tab bar (0 when it clears). */
async function overlap(page: Page): Promise<{ under: number; what: string }> {
  // Content can still be arriving: scroll to the end until the page stops growing.
  let h = -1;
  for (let i = 0; i < 20; i++) {
    const now = await page.evaluate(() => { window.scrollTo(0, document.scrollingElement!.scrollHeight); return document.scrollingElement!.scrollHeight; });
    if (now === h) break;
    h = now;
    await page.waitForTimeout(250);
  }
  return page.evaluate(() => {
    const bar = document.querySelector('.vk-phonetabbar');
    const main = document.querySelector('main');
    if (!bar || !main) return { under: -1, what: 'no tab bar or main' };
    const top = bar.getBoundingClientRect().top;
    let last: Element | null = null;
    let bottom = -Infinity;
    for (const el of main.querySelectorAll('*')) {
      // An item is a leaf (text, a glyph, a control's face); its wrappers' padding may run under the bar.
      if (el.childElementCount > 0 || bar.contains(el) || el.closest('[role="menu"],[role="dialog"],.vk-visually-hidden,.sr')) continue;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      // checkVisibility drops a closed <details>'s content and anything display:none or visibility:hidden.
      if (r.width < 1 || r.height < 1 || cs.position === 'fixed' || !el.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true })) continue;
      if (r.bottom > bottom) { bottom = r.bottom; last = el; }
    }
    return { under: Math.max(0, Math.ceil(bottom - top)), what: last ? `${last.tagName}.${String(last.className).slice(0, 40)}` : '' };
  });
}

for (const vibe of VIBES) {
  test(`${vibe} phone: every page's last item clears the fixed tab bar`, async ({ page, request }) => {
    test.setTimeout(120_000);
    const boardId = await seedBoard(request, `Clearance ${vibe}`);
    for (let i = 0; i < 6; i++) await request.post(`${API}/v1/boards/${boardId}/cards`, { headers: TENANT, data: { title: `Clearance card ${i + 1}`, ownerUserId: 'usr_a' } });
    await setAppearance(page, `${vibe}.light.strong.0`);
    await page.setViewportSize(PHONE);
    await openBoard(page, boardId);
    await page.waitForURL(`**/b/${boardId}`);
    const pages = [
      `/b/${boardId}`, `/b/${boardId}?view=list`, `/b/${boardId}?view=projects`, '/inbox',
      `/b/${boardId}/operate/log`, `/b/${boardId}/operate/telemetry`, `/b/${boardId}/settings`,
      ...['agents', 'people', 'capabilities'].map((t) => `/crew/${t}`), '/settings',
    ];
    for (const url of pages) {
      if (page.url() !== new URL(url, page.url()).href) await page.goto(url);
      await expect(page.locator('.vk-phonetabbar'), `${url}: the phone tab bar`).toBeVisible();
      await expect(page.getByRole('main')).toBeVisible();
      const { under, what } = await overlap(page);
      expect.soft(under, `${url}: ${what} runs ${under}px under the tab bar`).toBe(0);
    }
  });
}
