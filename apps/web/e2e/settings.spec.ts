// apps/web/e2e/settings.spec.ts
import { expect, test } from '@playwright/test';
import { API, TENANT, seedBoard } from './support/seed';

test('a standing rule saves when the field is left, and the board keeps it', async ({ page, request }) => {
  const boardId = await seedBoard(request, 'Settings E2E');
  await page.goto(`/b/${boardId}/settings`);
  await page.locator('details.stage > summary, details.st-stage > summary').filter({ has: page.locator('.t-h3, .st-name', { hasText: /^Ready$/ }) }).click();
  const rule = page.locator('#st-rule-ready');
  await rule.fill('Only cards with a named owner wait here.');
  await rule.blur();
  await expect(page.getByText('Rule saved · just now')).toBeVisible();
  const board = await (await request.get(`${API}/v1/boards/${boardId}`, { headers: TENANT })).json();
  expect(board.stages.find((s: { key: string }) => s.key === 'ready').instructions).toBe('Only cards with a named owner wait here.');
  await expect(page.getByRole('button', { name: 'Remove stage Ready' })).toBeEnabled();
  // A closed stage's controls are not on the page: open Backlog to see that the first stage cannot move earlier.
  await page.locator('details.stage > summary, details.st-stage > summary').filter({ has: page.locator('.t-h3, .st-name', { hasText: /^Backlog$/ }) }).click();
  await expect(page.getByRole('button', { name: 'Move Backlog earlier' })).toBeDisabled();
});
