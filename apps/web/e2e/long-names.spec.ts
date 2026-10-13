// apps/web/e2e/long-names.spec.ts
/** A long board name wraps in every phone header, which holds the page's one h1; it never scrolls the phone sideways. */
import { expect, test } from '@playwright/test';
import { openBoard, seedBoard, setAppearance } from './support/seed';

for (const vibe of ['daylight', 'paper', 'studio', 'quiet']) {
  test(`${vibe}: a 90-character board name never scrolls the phone sideways`, async ({ page, request }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const id = await seedBoard(request, 'A board whose name runs on and on past any phone header ' + 'x'.repeat(34));
    await setAppearance(page, `${vibe}.light.strong.0`);
    await openBoard(page, id);
    // The phone header's title is the page's one h1.
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('banner').getByRole('heading', { level: 1 })).toContainText('A board whose name');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
}
