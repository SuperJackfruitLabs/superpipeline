/**
 * The stage track is a drop target. Lanes appear only where cards are, so a stage with no cards has
 * no lane to drop on; its cell in the track takes the card instead (composition contract, Board
 * variant A). The lane then appears, holding the card.
 */
import { test, expect } from '@playwright/test';
import { openRememberedBoard } from './support/seed';
import { PORTS } from '../scripts/ports';

const API = PORTS.apiUrl;
const TENANT = { 'X-Tenant-Id': 'tnt_dev', 'Content-Type': 'application/json' };
const STAGES = [
  { key: 'backlog', name: 'Backlog', order: 0 },
  { key: 'ready', name: 'Ready', order: 1 },
  { key: 'review', name: 'Review', order: 2 },
  { key: 'done', name: 'Done', order: 3 },
];

test.beforeEach(async ({ page, request }) => {
  const res = await request.post(`${API}/v1/boards`, { headers: TENANT, data: { name: 'Track drop', stages: STAGES } });
  const boardId = (await res.json()).boardId as string;
  await request.post(`${API}/v1/boards/${boardId}/cards`, { headers: TENANT, data: { title: 'Drop me on a stage', ownerUserId: 'usr_dev' } });
  await page.addInitScript((id) => window.localStorage.setItem('superpipeline.boardId', id), boardId);
});

test('dragging a tile onto an empty stage in the track moves it there', async ({ page }) => {
  await openRememberedBoard(page);
  const card = page.locator('[data-card-id]', { hasText: 'Drop me on a stage' });
  await expect(card).toBeVisible();
  // Ready holds no card, so it has no lane: only its cell in the track.
  await expect(page.locator('[data-lane="ready"]')).toHaveCount(0);
  const cell = page.getByRole('list', { name: 'Stages' }).getByRole('listitem').filter({ hasText: 'Ready' });

  await card.dragTo(cell);

  await expect(page.locator('[data-lane="ready"] [data-card-id]', { hasText: 'Drop me on a stage' })).toBeVisible();
  await expect(page.locator('[data-lane="backlog"]')).toHaveCount(0);
});

test('a track cell shows it will take the card while one is held over it', async ({ page }) => {
  await openRememberedBoard(page);
  const card = page.locator('[data-card-id]', { hasText: 'Drop me on a stage' });
  await expect(card).toBeVisible();
  const cell = page.getByRole('list', { name: 'Stages' }).getByRole('listitem').filter({ hasText: 'Review' });

  const from = (await card.boundingBox())!;
  const to = (await cell.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + 12);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + 20, { steps: 4 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await expect(cell).toHaveAttribute('data-over', '');
  await page.mouse.up();
  await expect(cell).not.toHaveAttribute('data-over', '');
});
