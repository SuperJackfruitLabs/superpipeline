import { expect, test } from '@playwright/test';
import { openBoard, seedBoard, setAppearance } from './support/seed';

// A fixed London clock: 12:00 is midday, 23:00 is night.
test.use({ timezoneId: 'Europe/London' });
const NOON = new Date('2026-10-11T12:00:00+01:00');
const NIGHT = new Date('2026-10-11T23:00:00+01:00');

test('a first visit is Daylight following the sun: light at noon', async ({ page, request }) => {
  await page.clock.setFixedTime(NOON);
  await openBoard(page, await seedBoard(request, 'Appearance noon'));
  await expect(page.getByText('Backlog', { exact: true })).toBeVisible();
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-vibe', 'daylight');
  await expect(html).toHaveAttribute('data-theme', 'light');
  await expect(html).toHaveAttribute('data-phase', 'noon');
});

test('following the sun is dark at night, whatever the OS says', async ({ page, request }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.clock.setFixedTime(NIGHT);
  await openBoard(page, await seedBoard(request, 'Appearance night'));
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('the theme toggle persists in the cookie and survives a reload before any app script', async ({ page, request }) => {
  await page.clock.setFixedTime(NOON);
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      (window as unknown as { __firstTheme: string | null }).__firstTheme = document.documentElement.getAttribute('data-theme');
    });
  });
  await openBoard(page, await seedBoard(request, 'Appearance toggle'));
  await page.getByRole('button', { name: /toggle theme/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === 'vk_appearance')?.value).toBe('daylight.dark.strong.0');
  await page.reload();
  expect(await page.evaluate(() => (window as unknown as { __firstTheme: string | null }).__firstTheme)).toBe('dark');
});

test('a light/dark choice made with the old toggle carries over', async ({ page, request }) => {
  await page.clock.setFixedTime(NIGHT);
  await page.addInitScript(() => { if (!document.cookie.includes('vk_appearance')) localStorage.setItem('superpipeline.theme', 'light'); });
  await openBoard(page, await seedBoard(request, 'Appearance legacy'));
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === 'vk_appearance')?.value).toBe('daylight.light.strong.0');
});

test('a cookie set elsewhere wins on the first frame', async ({ page, request }) => {
  await page.clock.setFixedTime(NOON);
  await setAppearance(page, 'paper.dark.subtle.0');
  await openBoard(page, await seedBoard(request, 'Appearance cookie'));
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-vibe', 'paper');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(html).toHaveAttribute('data-time', 'subtle');
});
