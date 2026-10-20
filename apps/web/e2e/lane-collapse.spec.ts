// apps/web/e2e/lane-collapse.spec.ts
/**
 * Expanding and collapsing an empty stage animates (Daylight's strip <-> lane): the stage's slot
 * persists and its width moves through the values between, the others glide; reduced motion jumps.
 * Focus lands on the control that undoes it, and aria-expanded says the state.
 */
import { expect, test, type Page } from '@playwright/test';
import { API, TENANT, openBoard, seedBoard, setAppearance } from './support/seed';

async function widthsDuring(page: Page, key: string, act: () => Promise<void>): Promise<number[]> {
  await page.evaluate((k) => {
    const el = document.querySelector<HTMLElement>(`[data-lane-slot="${k}"]`)!;
    const w = window as unknown as { __widths: number[] };
    w.__widths = [];
    const t0 = performance.now();
    const tick = () => { w.__widths.push(el.getBoundingClientRect().width); if (performance.now() - t0 < 700) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }, key);
  await act();
  await page.waitForTimeout(800);
  return page.evaluate(() => (window as unknown as { __widths: number[] }).__widths);
}

async function setup(page: Page, request: import('@playwright/test').APIRequestContext) {
  const id = await seedBoard(request, `Lanes ${Date.now().toString(36)}`);
  await request.post(`${API}/v1/boards/${id}/cards`, { headers: TENANT, data: { title: 'A card in backlog' } });
  await setAppearance(page, 'daylight.light.strong.0');
  await page.setViewportSize({ width: 1440, height: 900 });
  await openBoard(page, id);
  const strip = page.locator('[data-lane-slot="ready"] .dl-strip');
  await expect(strip).toBeVisible();
  await expect(strip).toHaveAttribute('aria-expanded', 'false');
  return strip;
}

test('Daylight: an empty stage expands and collapses with motion, focus stays on the stage', async ({ page, request }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const strip = await setup(page, request);
  const open = await widthsDuring(page, 'ready', () => strip.click());
  const [first, last] = [open[0]!, open[open.length - 1]!];
  expect(last).toBeGreaterThan(first + 40);
  expect(open.some((w) => w > first + 5 && w < last - 5), `widths in between: ${open.map(Math.round).join(',')}`).toBe(true);
  const collapse = page.locator('[data-lane-slot="ready"] .dl-collapse');
  await expect(collapse).toBeFocused();
  await expect(collapse).toHaveAttribute('aria-expanded', 'true');
  const shut = await widthsDuring(page, 'ready', () => collapse.click());
  expect(shut.some((w) => w > shut[shut.length - 1]! + 5 && w < shut[0]! - 5)).toBe(true);
  await expect(page.locator('[data-lane-slot="ready"] .dl-strip')).toBeFocused();
});

test('Daylight under reduced motion: the stage jumps to its new width', async ({ page, request }) => {
  const strip = await setup(page, request);
  const open = await widthsDuring(page, 'ready', () => strip.click());
  const last = open[open.length - 1]!;
  expect(open.filter((w) => w > open[0]! + 5 && w < last - 5)).toEqual([]);
  await expect(page.locator('[data-lane-slot="ready"] .dl-collapse')).toBeFocused();
});
