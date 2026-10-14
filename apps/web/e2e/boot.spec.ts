// apps/web/e2e/boot.spec.ts
/**
 * The boot screen is never blank (operator, Studio dark: a dark page with one tiny mono line). While
 * sign-in and the board list are slow it shows the mark, a status line, then the slow copy, then
 * Failed with Try again; Quiet shows the words alone.
 */
import { expect, test } from '@playwright/test';
import { setAppearance } from './support/seed';

for (const vibe of ['daylight', 'paper', 'studio', 'quiet']) for (const held of ['sign-in', 'boards'] as const) {
  test(`${vibe}: a slow ${held} show a branded boot screen, then slow, then Try again`, async ({ page }) => {
    await setAppearance(page, `${vibe}.dark.strong.0`);
    await page.clock.install();
    let hold = true;
    await page.route(held === 'sign-in' ? /\/(auth\/me|v1\/boards)(\?|$)/ : /\/v1\/boards(\?|$)/, async (r) => { while (hold) await new Promise((ok) => setTimeout(ok, 100)); await r.continue().catch(() => {}); });
    await page.goto('/');
    const status = page.locator('main.sp-boot [role="status"]');
    await expect(status).toBeVisible();
    await expect(status).toHaveText(held === 'sign-in' ? /Signing you in…/ : /Finding your boards…/);
    await expect(page.locator('main.sp-boot .wordmark')).toHaveCount(vibe === 'quiet' ? 0 : 1);
    const box = await page.locator('main.sp-boot').boundingBox();
    expect(box!.height).toBeGreaterThan(400); // centred in the viewport, not a line at the top
    await page.clock.runFor(8_500);
    await expect(status).toContainText('Still loading — the server is slow.');
    await page.clock.runFor(12_000);
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    hold = false;
  });
}
