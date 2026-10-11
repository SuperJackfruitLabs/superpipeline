import { test, expect } from '@playwright/test';

// Daylight's peek (spec §5.1): a 320px aside from 1440px up; pointing at a tile changes it, its
// button opens the card. Below 1440px it is not rendered at all.

const BOARD_KEY = 'superpipeline.boardId';
const API = 'http://localhost:8787';
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

async function compose(page: import('@playwright/test').Page, title: string) {
  await page.getByRole('button', { name: 'New card' }).click();
  await page.getByLabel('Card title').fill(title);
  await page.getByRole('button', { name: 'Dispatch' }).click();
  await expect(page.locator('.tile', { hasText: title })).toBeVisible();
}

test('at 1440px the peek follows the pointer and its button opens the card', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await compose(page, 'First peek card');
  await compose(page, 'Second peek card');
  const peek = page.getByRole('complementary', { name: 'Peek' });
  await expect(peek).toBeVisible();
  await page.locator('.tile', { hasText: 'Second peek card' }).hover();
  await expect(peek.getByText('Second peek card')).toBeVisible();
  await page.locator('.tile', { hasText: 'First peek card' }).hover();
  await expect(peek.getByText('First peek card')).toBeVisible();
  await peek.getByRole('button', { name: 'Open' }).click();
  await expect(page.getByRole('dialog').getByText('First peek card').first()).toBeVisible();
});

test('keyboard focus on a tile moves the peek too', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await compose(page, 'Focus peek card');
  await page.locator('.tile', { hasText: 'Focus peek card' }).getByRole('button', { name: /Focus peek card, in/ }).focus();
  await expect(page.getByRole('complementary', { name: 'Peek' }).getByText('Focus peek card')).toBeVisible();
});

test('P on a tile pins that card in the peek and moves focus to its button', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  for (const t of ['Peek one', 'Peek two', 'Peek three']) await compose(page, t);
  const peek = page.getByRole('complementary', { name: 'Peek' });
  const open = (t: string) => page.locator('.tile', { hasText: t }).getByRole('button', { name: new RegExp(`^${t}, in .* P to show it in the peek\\.$`) });
  await open('Peek two').focus();
  await page.keyboard.press('p');
  await expect(peek.getByText('Peek two')).toBeVisible();
  await expect(peek.getByRole('button', { name: 'Open' })).toBeFocused();
  // Walking on through the board does not repin it: the peek stays where the person pinned it.
  await open('Peek one').focus();
  await page.keyboard.press('p');
  await expect(peek.getByText('Peek one')).toBeVisible();
  await open('Peek one').focus();
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(200); }
  await expect(peek.getByText('Peek one')).toBeVisible();
  await peek.getByRole('button', { name: 'Open' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog').getByText('Peek one').first()).toBeVisible();
});

test('below 1440px there is no peek', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await compose(page, 'Narrow card');
  await expect(page.getByRole('complementary', { name: 'Peek' })).toHaveCount(0);
});
