import { test, expect } from '@playwright/test';
import { API, TENANT, REVIEW_PIPELINE, seedBoard, seedQuestionCard } from './support/seed';

test('compiled app boots and creates a card in its declared board', async ({ page, request }) => {
  const boardId = await seedBoard(request, 'Artifact smoke board');
  await page.goto(`/b/${boardId}`);
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  const response = await request.post(`${API}/v1/boards/${boardId}/cards`, { headers: TENANT, data: { title: 'Artifact smoke card' } });
  expect(response.ok()).toBe(true);
  await expect(page.getByText('Artifact smoke card', { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText('Artifact smoke card', { exact: true }).first()).toBeVisible();
});

test('compiled phone app reaches a question without losing its operation', async ({ page, request }) => {
  const boardId = await seedBoard(request, 'Artifact question board', REVIEW_PIPELINE);
  await seedQuestionCard(request, boardId, 'Artifact question card');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/b/${boardId}`);
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByText('Artifact question card', { exact: true }).first()).toBeVisible();
  const snapshot = await (await request.get(`${API}/v1/boards/${boardId}`, { headers: TENANT })).json();
  expect(snapshot.cards.find((c: {title: string}) => c.title === 'Artifact question card').state).toBe('input-required');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('compiled app serves hashed assets and an unknown board fails visibly', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/b/brd_does_not_exist');
  await expect(page.getByText(/not found|couldn.t|doesn.t exist|unknown|not available|no board/i).first()).toBeVisible();
  // SvelteKit imports its hashed modules from an inline bootstrap, not script[src].
  const scripts = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => entry.name).filter((name) => /\/_app\/immutable\/.*\.js(?:\?|$)/.test(name)));
  expect(scripts.length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
