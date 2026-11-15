import { test, expect } from '@playwright/test';
import { expectTouchHeight } from './touch-target';

test('touch measurement waits across a hidden layout frame without lowering the floor', async ({ page }) => {
  await page.setContent('<a href="/plan" style="display:none;height:44px">Plan</a>');
  await page.evaluate(() => {
    setTimeout(() => {
      const link = document.querySelector('a');
      if (link) link.style.display = 'block';
    }, 300);
  });
  await expectTouchHeight(page.locator('a'));
});

test('a permanently undersized target still fails the 44 pixel requirement', async ({ page }) => {
  await page.setContent('<a href="/plan" style="display:block;height:43px">Plan</a>');
  await expect(expectTouchHeight(page.locator('a'), { timeout: 200 })).rejects.toThrow(/44/);
});
