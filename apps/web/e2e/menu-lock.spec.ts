import { test, expect } from '@playwright/test';
import { seedBoard } from './support/seed';

// A menu used to leave bits-ui's page lock (pointer-events:none on <body>) behind
// when it closed, so after the first dismissed menu nothing on the page could be clicked.
// Fixed in vibekit 0.0.11; this guards the app against the same thing coming back.
test('after a menu is dismissed, the page is clickable and the menu opens again', async ({ page, request }) => {
  const boardId = await seedBoard(request, 'Menu lock');
  await page.goto(`/b/${boardId}`);
  const nav = page.getByRole('navigation', { name: 'Superpipeline' });
  const account = nav.getByRole('button', { name: /^Account/ });
  for (const dismiss of ['Escape', 'outside', 'Escape', 'outside'] as const) {
    await account.click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    if (dismiss === 'Escape') await page.keyboard.press('Escape');
    else await page.mouse.click(700, 500);
    await expect(menu).toBeHidden();
    // The lock leaves pointer-events:none on <body>: a real click on the trigger must still land (no force).
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).pointerEvents)).not.toBe('none');
  }
});
