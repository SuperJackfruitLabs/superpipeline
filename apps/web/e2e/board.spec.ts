import { test, expect } from '@playwright/test';
import { REVIEW_PIPELINE, openRememberedBoard, seedBoard, seedGatedCard } from './support/seed';
import { waitForAppReady } from './support/readiness';

// Composing is a sheet now, opened by the header's one primary action. The old inline field plus
// a 15x16px `+` popover put priority, due date and description behind a control below the WCAG
// target-size floor; they are first-class fields in the sheet.

const BOARD_KEY = 'superpipeline.boardId';
import { PORTS } from '../scripts/ports';
const API = PORTS.apiUrl;
// The app talks to the API as the dev workspace (tnt_dev) when the server runs with DEV_AUTH on.
const TENANT = { 'X-Tenant-Id': 'tnt_dev', 'Content-Type': 'application/json' };
const DEFAULT_STAGES = [
  { key: 'backlog', name: 'Backlog', order: 0 },
  { key: 'ready', name: 'Ready', order: 1 },
  { key: 'in-progress', name: 'In Progress', order: 2, wipLimit: 3 },
  { key: 'review', name: 'Review', order: 3, gate: 'approval' },
  { key: 'done', name: 'Done', order: 4 },
];

// Each test gets its own fresh board (created via the API) and points the app at it, so tests are
// isolated and don't depend on the onboarding/auto-pick path.
let boardId: string;
test.beforeEach(async ({ page, request }) => {
  const res = await request.post(`${API}/v1/boards`, { headers: TENANT, data: { name: 'E2E board', stages: DEFAULT_STAGES } });
  boardId = (await res.json()).boardId as string;
  await page.addInitScript(([key, id]) => window.localStorage.setItem(key, id), [BOARD_KEY, boardId]);
});

test('names every stage and connects live', async ({ page }) => {
  await openRememberedBoard(page);
  // No card yet: the board explains itself, its stages in order.
  const track = page.getByRole('list', { name: 'Stages, in order' });
  for (const col of ['Backlog', 'Ready', 'In Progress', 'Review', 'Done']) {
    await expect(track.getByText(col, { exact: true })).toBeVisible();
  }
  await expect(page.locator('[data-live="on"]').first()).toBeVisible();
});

test('creates a card via the composer', async ({ page }) => {
  await openRememberedBoard(page);
  await page.getByRole('button', { name: 'New card' }).click();
  await page.getByLabel('Card title').fill('Write the launch post');
  await page.getByRole('button', { name: 'Dispatch' }).click();
  await expect(page.getByText('Write the launch post')).toBeVisible();
});

test('moves a card to another lane via drag', async ({ page }) => {
  await openRememberedBoard(page);
  await page.getByRole('button', { name: 'New card' }).click();
  await page.getByLabel('Card title').fill('Draggable task');
  await page.getByRole('button', { name: 'Dispatch' }).click();

  const card = page.locator('[data-card-id]', { hasText: 'Draggable task' });
  await expect(card).toBeVisible();

  // The last stage always has a lane: drop the card there.
  const done = page.locator('[data-lane="done"]');
  await card.dragTo(done);

  await expect(page.locator('[data-lane="done"] [data-card-id]', { hasText: 'Draggable task' })).toBeVisible();
  await expect(page.locator('[data-lane="backlog"]')).toHaveCount(0);
});

test('streams a new card to a second client in real time', async ({ browser }) => {
  const a = await browser.newPage();
  await a.addInitScript(([key, id]) => window.localStorage.setItem(key, id), [BOARD_KEY, boardId]);
  await openRememberedBoard(a);
  await expect(a.getByRole('list', { name: 'Stages, in order' }).getByText('Backlog', { exact: true })).toBeVisible();

  // Second client opens the SAME board, then subscribes to its live feed.
  const b = await browser.newPage();
  await b.addInitScript(([key, id]) => window.localStorage.setItem(key, id), [BOARD_KEY, boardId]);
  await openRememberedBoard(b);
  await expect(b.getByRole('list', { name: 'Stages, in order' }).getByText('Backlog', { exact: true })).toBeVisible();

  await a.getByRole('button', { name: 'New card' }).click();
  await a.getByLabel('Card title').fill('Realtime card');
  await a.getByRole('button', { name: 'Dispatch' }).click();

  await expect(b.getByText('Realtime card')).toBeVisible({ timeout: 10_000 });
});

test('streams a card another client made to the Inbox in real time', async ({ browser, request }) => {
  // A board in the Inbox's scope with one card at its review gate (Show lists boards that need you);
  // a second card reaches the gate after the Inbox opened.
  const other = await seedBoard(request, 'E2E inbox stream', REVIEW_PIPELINE);
  await seedGatedCard(request, other, `Inbox first ${Date.now()}`);
  const b = await browser.newPage();
  await b.addInitScript(([key, id]) => window.localStorage.setItem(key, id), [BOARD_KEY, boardId]);
  await b.goto('/inbox');
  await waitForAppReady(b);
  // Shown alone under Show (a long-lived dev database holds hundreds of rows on All boards).
  const show = b.getByRole('radiogroup', { name: 'Show' }).locator(`[role="radio"][data-key="${other}"]`);
  await show.click();
  await expect(show).toHaveAttribute('aria-checked', 'true');
  const title = `Inbox realtime ${Date.now()}`;
  await seedGatedCard(request, other, title);
  await expect(b.getByText(title).first()).toBeVisible({ timeout: 10_000 });
});
