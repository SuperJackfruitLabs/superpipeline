// apps/web/e2e/desktop-fit.spec.ts — the nav v2 pages at desktop widths, with realistic data (long board names on
// the asks). Round 3: in Studio the Inbox's Show block sat flush against the rail (no gutter), and the board chip
// beside an agent's name ran over the Age and Att. columns. Measures every vibe at 1440, 1280 and 1100.
import { expect, test, type Page } from '@playwright/test';
import { DX, VIBES, openWorld } from './support/world';
import { seedRealistic } from './support/realistic';

const WIDTHS = [1440, 1280, 1100] as const;
const GUTTER = 16;
const PAGES = ['/inbox', '/crew/agents', '/crew/people', '/crew/capabilities', '/settings', '/plan/projects', DX, `${DX}?view=list`];

/** Text within 16px of the rail (or the window's edge), and table cells whose content runs into the next column. */
async function measure(page: Page) {
  return page.evaluate((g) => {
    const main = document.querySelector('main') ?? document.body;
    // The page's left edge: the rail's right edge where there is a rail, else the window's.
    const rail = [...document.querySelectorAll('.vk-appshell__nav, nav')].map((n) => n.getBoundingClientRect()).filter((r) => r.left < 4 && r.height > innerHeight / 2 && r.width < 200);
    const edge = rail.length ? Math.max(...rail.map((r) => r.right)) : 0;
    const scroller = (el: Element, stop: Element) => {
      for (let p = el.parentElement; p && p !== stop; p = p.parentElement) if (/(auto|scroll)/.test(getComputedStyle(p).overflowX)) return true;
      return false;
    };
    const shown = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' && !el.closest('.vk-visually-hidden, .sr, [aria-hidden="true"], [role="dialog"], details:not([open]) > :not(summary)');
    };
    const name = (el: Element) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} "${(el.textContent ?? '').trim().slice(0, 30)}"`;
    const tight: string[] = [];
    for (const el of main.querySelectorAll('h1, h2, h3, p, button, a, label, select, textarea, input')) {
      if (!shown(el) || scroller(el, main)) continue;
      const r = el.getBoundingClientRect();
      if (r.left < edge + g - 0.5) tight.push(`${name(el)} ${Math.round(r.left - edge)}px from the edge`);
    }
    const collide: string[] = [];
    for (const td of main.querySelectorAll('td, th')) {
      const c = td.getBoundingClientRect();
      if (c.width === 0) continue;
      for (const el of td.querySelectorAll('*')) {
        if (!shown(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.right > c.right + 1 || r.left < c.left - 1) collide.push(`${name(el)} ${Math.round(r.left)}–${Math.round(r.right)} in cell ${Math.round(c.left)}–${Math.round(c.right)}`);
      }
    }
    return { tight: tight.slice(0, 8), collide: collide.slice(0, 8) };
  }, GUTTER);
}

test.beforeAll(async ({ request }) => seedRealistic(request));

for (const vibe of VIBES) {
  for (const width of WIDTHS) {
    test(`${vibe} ${width}: the nav v2 pages keep a ${GUTTER}px gutter and no table cell runs into the next`, async ({ page }) => {
      test.setTimeout(120_000);
      for (const path of PAGES) {
        await openWorld(page, path, { vibe, dark: vibe === 'studio', width, height: 900 });
        if (path === '/inbox') await expect(page.locator('.ib-board', { hasText: 'Workspace Operations' }).first()).toBeVisible();
        const m = await measure(page);
        expect.soft(m.tight, `${path}: inside the ${GUTTER}px gutter`).toEqual([]);
        expect.soft(m.collide, `${path}: runs into the next column`).toEqual([]);
      }
    });
  }
}

// Projects rows (SP-Plan-Projects-Daylight and the vibes' Projects references): the boards its cards are on,
// the declared health, the target date and the roll-up's "as of HH:MM", in every vibe.
for (const vibe of VIBES) {
  test(`${vibe} 1280: a project row names its boards, health, target date and roll-up time`, async ({ page }) => {
    await openWorld(page, '/plan/projects', { vibe, dark: false, width: 1280, height: 900 });
    const main = page.locator('main');
    await expect(main.getByText('Cards on', { exact: true }).first()).toBeVisible();
    await expect(main.getByText('On track', { exact: true }).first()).toBeVisible();
    await expect(main.getByText(/Target \d{1,2} \w{3} 20\d\d/).first()).toBeVisible();
    await expect(main.getByText(/as of \d\d:\d\d/).first()).toBeVisible();
  });
}

// Paper's board switcher raises a copy of the board's name and "Change board" above the scrim. The copy's name sat
// 8px right of the real one, so the two showed through each other as a doubled, smeared title (Round 3).
for (const width of [1440, 1100]) {
  test(`paper ${width}: the switcher's raised name lies exactly over the board's own name`, async ({ page }) => {
    await openWorld(page, DX, { vibe: 'paper', dark: false, width, height: 900 });
    await page.getByRole('button', { name: /Change board/ }).first().click();
    const copy = page.locator('.bs-anchor .mh-title');
    await expect(copy).toBeVisible();
    const [a, b] = await Promise.all([copy.boundingBox(), page.locator('.vk-masthead__name').first().boundingBox()]);
    expect(Math.abs(a!.x - b!.x), `copy x ${a!.x}, name x ${b!.x}`).toBeLessThanOrEqual(1);
    expect(Math.abs(a!.y - b!.y), `copy y ${a!.y}, name y ${b!.y}`).toBeLessThanOrEqual(1);
    expect(Math.abs(a!.width - b!.width), 'same metrics').toBeLessThanOrEqual(1);
  });
}
