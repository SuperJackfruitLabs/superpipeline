import { test, expect, type Page } from '@playwright/test';

// Daylight's peek (Board-Daylight §3.4): from 1440px, pointing at or focusing a tile opens a peek
// beside it after 300 ms; Esc or "Close peek" shuts it and puts focus back on the title.

const BOARD_KEY = 'superpipeline.boardId';
import { PORTS } from '../scripts/ports';
const API = PORTS.apiUrl;
const TENANT = { 'X-Tenant-Id': 'tnt_dev', 'Content-Type': 'application/json' };
const STAGES = [
  { key: 'backlog', name: 'Backlog', order: 0 },
  { key: 'done', name: 'Done', order: 1 },
];

test.beforeEach(async ({ page, request }) => {
  const res = await request.post(`${API}/v1/boards`, { headers: TENANT, data: { name: 'E2E board', stages: STAGES } });
  const boardId = (await res.json()).boardId as string;
  await page.addInitScript(([key, id]) => window.localStorage.setItem(key, id), [BOARD_KEY, boardId]);
});

async function compose(page: Page, title: string) {
  await page.getByRole('button', { name: 'New card' }).click();
  await page.getByLabel('Card title').fill(title);
  await page.getByRole('button', { name: 'Dispatch' }).click();
  await expect(page.locator('[data-card-id]', { hasText: title })).toBeVisible();
}
const titleOf = (page: Page, t: string) => page.getByRole('button', { name: new RegExp(`^${t}, in `) });
const peek = (page: Page) => page.getByRole('complementary', { name: 'Peek' });

test('at 1440px pointing at a tile opens its peek, and the peek opens the card', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await compose(page, 'First peek card');
  await compose(page, 'Second peek card');
  await titleOf(page, 'Second peek card').hover();
  await expect(peek(page).getByRole('heading', { name: 'Second peek card' })).toBeVisible();
  await titleOf(page, 'First peek card').hover();
  await expect(peek(page).getByRole('heading', { name: 'First peek card' })).toBeVisible();
  await expect(peek(page)).toHaveCount(1);
  await peek(page).getByRole('button', { name: 'Open card to read it all' }).click();
  await expect(page.getByRole('dialog').getByText('First peek card').first()).toBeVisible();
});

test('focus opens the peek; Esc closes it, keeps focus on the title and does not reopen', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await compose(page, 'Focus peek card');
  await titleOf(page, 'Focus peek card').focus();
  await expect(peek(page).getByRole('heading', { name: 'Focus peek card' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(peek(page)).toHaveCount(0);
  await expect(titleOf(page, 'Focus peek card')).toBeFocused();
  await page.waitForTimeout(500);
  await expect(peek(page)).toHaveCount(0);
});

test('Close peek closes it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await compose(page, 'Closable peek card');
  await titleOf(page, 'Closable peek card').hover();
  await peek(page).getByRole('button', { name: 'Close peek' }).click();
  await expect(peek(page)).toHaveCount(0);
});

test('below 1440px there is no peek', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await compose(page, 'Narrow card');
  await titleOf(page, 'Narrow card').hover();
  await page.waitForTimeout(500);
  await expect(peek(page)).toHaveCount(0);
});

test('the peek goes when the pointer and focus have left the card', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await compose(page, 'Leaving peek card');
  await titleOf(page, 'Leaving peek card').hover();
  await expect(peek(page)).toHaveCount(1);
  await page.mouse.move(2, 2);
  await expect(peek(page)).toHaveCount(0);
});

test('the peek closes when the drawer opens and does not reopen by itself when it closes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await compose(page, 'Drawer peek card');
  await titleOf(page, 'Drawer peek card').hover();
  await expect(peek(page)).toHaveCount(1);
  await titleOf(page, 'Drawer peek card').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(peek(page)).toHaveCount(0);
  await page.mouse.move(2, 2);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.waitForTimeout(700);
  await expect(peek(page)).toHaveCount(0);
});
