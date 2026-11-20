import { expect, test } from '@playwright/test';
import { REALISTIC_TENANT, REALISTIC_USER } from '../src/lib/fixtures/realistic';
import { seedRealistic, useRealistic } from './support/realistic-inbox';
import { API } from './support/seed';

const byId = (a: string, b: string) => a.localeCompare(b);
const H = { 'X-Tenant-Id': REALISTIC_TENANT, 'X-User-Id': REALISTIC_USER };

test('seedRealistic seeds three boards', async ({ page, request }) => {
  const { boardIds } = await seedRealistic(request);
  expect(boardIds).toHaveLength(3);
  // The API reads back what the fixture says: three boards, and one card over its cap.
  const boards: { boards: Array<{ id: string }> } = await (await request.get(`${API}/v1/boards`, { headers: H })).json();
  expect(boards.boards.map((b) => b.id).toSorted(byId)).toEqual(boardIds.toSorted(byId));
  const planning: { cards: Array<{ overBudget: boolean }> } = await (await request.get(`${API}/v1/boards/${boardIds[0]}`, { headers: H })).json();
  expect(planning.cards.filter((c) => c.overBudget)).toHaveLength(1);
  await useRealistic(page);
  await page.goto('/inbox');
  const inbox = page.getByRole('navigation', { name: 'Superpipeline' }).getByRole('link', { name: /^Inbox\W+18 need you across all boards/ });
  await expect(inbox).toBeVisible({ timeout: 15_000 });
  await expect(inbox.locator('.vk-appnav__count')).toHaveText('18');
});
