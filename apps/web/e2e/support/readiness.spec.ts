import { expect, test } from '@playwright/test';
import { waitForAppReady, waitForSurfaceReady, waitForLayout } from './readiness';

test('readiness rejects explicit boot failure even if data-ready is stale true', async ({ page }) => {
  await page.setContent('<html data-ready="true"><body><main data-boot="failed">Could not reach test API</main></body></html>');
  await expect(waitForAppReady(page)).rejects.toThrow('Could not reach test API');
});

test('readiness waits for pending reads and layout includes font readiness and painted content', async ({ page }) => {
  await page.setContent('<html data-ready="false"><body><main></main></body></html>');
  let resolved = false;
  const ready = waitForAppReady(page).then(() => { resolved = true; });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  expect(resolved).toBe(false);
  await page.evaluate(() => {
    document.querySelector('main')!.textContent = 'Actual route content';
    document.documentElement.dataset.ready = 'true';
  });
  await ready;
  await waitForLayout(page);
  await expect(page.getByText('Actual route content')).toBeVisible();
});

test('surface readiness waits for visible pending content without requiring background idle', async ({ page }) => {
  await page.setContent('<html data-ready="false"><body><main aria-busy="true"><div data-skeleton>Loading</div></main></body></html>');
  let resolved = false;
  const ready = waitForSurfaceReady(page).then(() => { resolved = true; });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  expect(resolved).toBe(false);
  await page.evaluate(() => {
    document.querySelector('main')!.removeAttribute('aria-busy');
    document.querySelector('[data-skeleton]')!.setAttribute('style', 'display:none');
  });
  await ready;
  expect(await page.locator('html').getAttribute('data-ready')).toBe('false');
});

test('surface readiness cannot treat an explicit read failure as loaded', async ({ page }) => {
  await page.setContent('<main data-failed>Could not read the project</main>');
  await expect(waitForSurfaceReady(page)).rejects.toThrow('Could not read the project');
});
