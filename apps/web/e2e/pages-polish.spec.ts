import { test, expect, type Page } from '@playwright/test';
import { PORTS } from '../scripts/ports';
import { FIXTURE_TENANT, FIXTURE_USER } from './pixel/fixture/seed';
import { openWorld, seed, DX, SIZES, VIBES, type VibeName } from './support/world';

/**
 * Pages, phone and polish (live-UI issues 15, 17, 18, 20-25, 29 and the Studio dark rail).
 * Geometry, roles and text only: every assertion reads a bounding box, a computed style or a name.
 */
test.beforeAll(async ({ request }) => seed(request));

/** A label name the width of the one that was cut off on the operator's phone. */
const LONG_LABEL = 'independent-verification';

const PHONE = SIZES[2];
const lum = (css: string): number => {
  const m = css.match(/[\d.]+/g)!.map(Number);
  const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(m[0]!) + 0.7152 * f(m[1]!) + 0.0722 * f(m[2]!);
};
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

// ---- Q1: the rails, headers and bars take the dark tokens ------------------------------------
for (const vibe of VIBES) {
  for (const size of SIZES) {
    test(`Q1 dark chrome is dark | ${vibe} | ${size.name}`, async ({ page }) => {
      await openWorld(page, DX, { vibe, dark: true, width: size.width, height: size.height });
      const chrome = await page.evaluate(() =>
        [...document.querySelectorAll('.vk-appnav, .vk-phonetabbar, .vk-masthead, .vk-statusline, .vk-phoneheader')]
          .filter((e) => e.getBoundingClientRect().width > 0)
          .map((e) => {
            // A resting item is drawn on the bar; the current one (aria-current) carries its own tile, so it is read on that.
            const item = e.querySelector('.vk-appnav__item:not([aria-current]), .vk-phonetabbar__item:not([aria-current])');
            const cur = e.querySelector('.vk-appnav__item[aria-current], .vk-phonetabbar__item[aria-current]');
            return {
              name: e.className.toString().split(' ')[0]!,
              bg: getComputedStyle(e).backgroundColor,
              itemColour: item ? getComputedStyle(item).color : null,
              current: cur ? { fg: getComputedStyle(cur).color, bg: getComputedStyle(cur).backgroundColor } : null,
            };
          }),
      );
      expect(chrome.length).toBeGreaterThan(0);
      for (const c of chrome) {
        if (/rgba\(.*, 0\)$/.test(c.bg)) continue; // transparent: the dark page shows through
        expect(lum(c.bg), `${c.name} background ${c.bg} in ${vibe} dark`).toBeLessThan(0.2);
        if (c.itemColour) expect(contrast(c.itemColour, c.bg), `${c.name} text ${c.itemColour} on ${c.bg}`).toBeGreaterThanOrEqual(4.5);
        if (c.current && !/rgba\(.*, 0\)$/.test(c.current.bg)) {
          expect(contrast(c.current.fg, c.current.bg), `${c.name} current item ${c.current.fg} on ${c.current.bg}`).toBeGreaterThanOrEqual(4.5);
        }
      }
      if (vibe === 'studio') expect(chrome.some((c) => /appnav|phonetabbar/.test(c.name) && !/rgba/.test(c.bg))).toBe(true);
    });
  }
}

// ---- Q2: settings -----------------------------------------------------------------------------
for (const vibe of VIBES) {
  for (const size of SIZES) {
    test(`Q2 payload URL fully shown, dropdowns styled | ${vibe} | ${size.name}`, async ({ page }) => {
      await openWorld(page, `${DX}/settings`, { vibe, dark: false, width: size.width, height: size.height });
      const url = page.locator('#gh-url');
      await expect(url).toBeVisible();
      const m = await url.evaluate((el: HTMLInputElement) => ({
        value: el.value, w: el.clientWidth, sw: el.scrollWidth, h: el.clientHeight, sh: el.scrollHeight,
      }));
      expect(m.value).toMatch(/^https:\/\//);
      expect(m.sw, 'the value runs sideways out of its box').toBeLessThanOrEqual(m.w + 1);
      expect(m.sh, 'the value is cut off vertically').toBeLessThanOrEqual(m.h + 1);
      await expect(page.getByRole('button', { name: /^copy/i }).first()).toBeVisible();

      for (const id of ['#sc-s', '#sc-o']) {
        const s = await page.locator(id).evaluate((el) => {
          const cs = getComputedStyle(el);
          return { appearance: cs.appearance, bg: cs.backgroundImage, pr: parseFloat(cs.paddingRight) };
        });
        expect(s.appearance, `${id} drawn by the browser`).toBe('none');
        expect(s.bg, `${id} has a chevron`).not.toBe('none');
        expect(s.pr, `${id} text clears the chevron`).toBeGreaterThanOrEqual(28);
      }
    });
  }
}

// ---- Q3: workspace ------------------------------------------------------------------------------
for (const vibe of VIBES) {
  for (const size of SIZES) {
    test(`Q3 labels named and untruncated | ${vibe} | ${size.name}`, async ({ page, request }) => {
      await request.post(`${PORTS.apiUrl}/v1/labels`, { headers: { 'X-Tenant-Id': FIXTURE_TENANT, 'X-User-Id': FIXTURE_USER }, data: { name: LONG_LABEL, colour: '#3366cc' } });
      await openWorld(page, '/workspace/labels', { vibe, dark: false, width: size.width, height: size.height });
      await expect(page.locator('[id^="lb-"]').first()).toBeVisible();
      const r = await page.evaluate(() => {
        const colour = [...document.querySelectorAll('input[type="color"]')].map((i) => i.getAttribute('aria-label') ?? '');
        const names = [...document.querySelectorAll<HTMLInputElement>('[id^="lb-"]:not(#lb-new)')].map((i) => ({
          v: i.value, w: i.clientWidth, sw: i.scrollWidth, sh: i.scrollHeight, h: i.clientHeight,
        }));
        return { colour, names };
      });
      expect(r.colour.length).toBeGreaterThan(0);
      for (const c of r.colour) expect(c).toMatch(/^Colour for .+/);
      expect(r.names.some((n) => n.v === 'independent-verification')).toBe(true);
      for (const n of r.names) {
        expect(n.sw, `label "${n.v}" is cut off (${n.sw} needed, ${n.w} shown)`).toBeLessThanOrEqual(n.w + 1);
        expect(n.sh, `label "${n.v}" is cut off vertically`).toBeLessThanOrEqual(n.h + 1);
      }
    });

    test(`Q3 capability descriptions grow | ${vibe} | ${size.name}`, async ({ page }) => {
      await openWorld(page, '/workspace/capabilities', { vibe, dark: false, width: size.width, height: size.height });
      await expect(page.locator('[id^="cd-"]').first()).toBeVisible();
      const fields = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLTextAreaElement | HTMLInputElement>('[id^="cd-"]')].map((e) => ({
          tag: e.tagName, v: e.value, w: e.clientWidth, sw: e.scrollWidth, h: e.clientHeight, sh: e.scrollHeight,
        })),
      );
      expect(fields.some((f) => f.v.length > 60), 'the fixture has a long description').toBe(true);
      for (const f of fields) {
        expect(f.tag).toBe('TEXTAREA');
        expect(f.sw, 'description cut off sideways').toBeLessThanOrEqual(f.w + 1);
        expect(f.sh, `description of ${f.v.length} characters cut off vertically`).toBeLessThanOrEqual(f.h + 1);
      }
    });
  }
}

// ---- Q4: phone targets --------------------------------------------------------------------------
const TARGET_PAGES: [string, string][] = [
  ['labels', '/workspace/labels'],
  ['capabilities', '/workspace/capabilities'],
  ['agents', '/workspace/agents'],
  ['settings', `${DX}/settings`],
  ['operate', `${DX}/operate`],
];
async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const root = document.querySelector('.vk-appshell__main') ?? document.body;
    const bad: string[] = [];
    const sel = 'button, a[href], summary, select, textarea, input:not([type="hidden"]):not([type="color"]):not([type="checkbox"]):not([type="radio"])';
    for (const el of root.querySelectorAll(sel)) {
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (b.width === 0 || b.height === 0 || cs.visibility === 'hidden') continue;
      if (el.closest('.vk-visually-hidden, [aria-hidden="true"], .sr')) continue;
      // A link inside a sentence is exempt (WCAG 2.5.8): inline, with other words around it.
      if (el.tagName === 'A' && cs.display === 'inline') {
        const rest = (el.parentElement?.textContent ?? '').replace(el.textContent ?? '', '').trim();
        if (rest.length > 3) continue;
      }
      if (b.height < 43.5 || b.width < 43.5) {
        bad.push(`${el.parentElement?.tagName.toLowerCase()}.${String(el.parentElement?.className).split(' ')[0]} > ${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} "${(el.textContent ?? '').trim().slice(0, 24)}" ${Math.round(b.width)}x${Math.round(b.height)}`);
      }
    }
    return bad;
  });
}
for (const vibe of VIBES) {
  for (const [name, route] of TARGET_PAGES) {
    test(`Q4 targets are 44px on a phone | ${vibe} | ${name}`, async ({ page }) => {
      await openWorld(page, route, { vibe, dark: false, width: PHONE.width, height: PHONE.height });
      await page.waitForTimeout(300);
      expect(await smallTargets(page)).toEqual([]);
    });
  }
}

// ---- Q5: polish -----------------------------------------------------------------------------------
for (const vibe of VIBES) {
  for (const size of SIZES) {
    for (const [name, route] of [['board', DX], ['operate', `${DX}/operate`]] as const) {
      test(`Q5 greeting has no "?," | ${vibe} | ${name} | ${size.name}`, async ({ page }) => {
        // 22:30 in the fixture's zone: the "Working late?" greeting.
        await openWorld(page, route, { vibe, dark: false, width: size.width, height: size.height, at: '2026-10-11T17:00:00Z' });
        const text = await page.evaluate(() => document.body.innerText + '\n' + [...document.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).join('\n'));
        expect(text).not.toMatch(/\?,/);
        if (vibe === 'daylight') expect(text).toMatch(/Working late, Ira\?/);
      });
    }
  }
}

test('Q5 the sun does not sit on the Live chip | daylight | phone', async ({ page }) => {
  await openWorld(page, DX, { vibe: 'daylight', dark: false, width: PHONE.width, height: PHONE.height });
  const r = await page.evaluate(() => {
    const box = (s: string) => document.querySelector(s)!.getBoundingClientRect();
    const sun = box('.vk-phoneheader__sun'), live = box('.vk-phoneheader .vk-live');
    return { sun: [sun.left, sun.top, sun.right, sun.bottom], live: [live.left, live.top, live.right, live.bottom] };
  });
  const overlap = r.sun[0]! < r.live[2]! && r.sun[2]! > r.live[0]! && r.sun[1]! < r.live[3]! && r.sun[3]! > r.live[1]!;
  expect(overlap, `sun ${r.sun} over live ${r.live}`).toBe(false);
});

for (const size of [SIZES[0], SIZES[1]]) {
  test(`Q5 daylight card titles use the card's width | ${size.name}`, async ({ page }) => {
    await openWorld(page, DX, { vibe: 'daylight', dark: false, width: size.width, height: size.height });
    const gaps = await page.evaluate(() =>
      [...document.querySelectorAll('.dl-tile')].map((t) => {
        // The title's text box: the heading's own padding does not count as width the title uses.
        const h = t.querySelector('h3')!;
        const cs = getComputedStyle(h);
        const right = h.getBoundingClientRect().right - parseFloat(cs.paddingRight);
        return { right: Math.round(t.getBoundingClientRect().right - right), title: h.textContent!.trim().slice(0, 20) };
      }),
    );
    expect(gaps.length).toBeGreaterThan(0);
    // The tile's own padding is 10px on the right; the title must not hold back more than that.
    for (const g of gaps) expect(g.right, `"${g.title}" stops ${g.right}px short of the card edge`).toBeLessThanOrEqual(12);
  });
}

for (const size of [SIZES[0], SIZES[1]]) {
  test(`Q5 studio stage columns line up | ${size.name}`, async ({ page }) => {
    await openWorld(page, DX, { vibe: 'studio', dark: false, width: size.width, height: size.height });
    const cols = await page.evaluate(() =>
      [...document.querySelectorAll('.ar-sm .ar-mul')].map((m) => {
        const top = (s: string) => m.querySelector(s)?.getBoundingClientRect().top ?? NaN;
        return { row: Math.round(m.getBoundingClientRect().top), note: top('.note'), who: m.querySelector('.who')!.getBoundingClientRect().height };
      }),
    );
    expect(cols.length).toBe(7);
    expect(cols.some((c) => c.who > 20), 'the fixture has a stage owner line that wraps').toBe(true);
    const rows = new Map<number, number[]>();
    for (const c of cols) rows.set(c.row, [...(rows.get(c.row) ?? []), c.note]);
    expect(rows.size).toBeGreaterThan(0);
    for (const [row, notes] of rows) {
      expect(Math.max(...notes) - Math.min(...notes), `note rows in the grid row at ${row}: ${notes}`).toBeLessThanOrEqual(1);
    }
  });
}
