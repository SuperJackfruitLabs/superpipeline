// apps/web/e2e/list.spec.ts
import { test, expect } from '@playwright/test';
import { API, TENANT, seedBoard, setAppearance } from './support/seed';

const STAGES = [
  { key: 'todo', name: 'To do', order: 0, ownerKind: 'human' },
  { key: 'doing', name: 'Doing', order: 1, ownerKind: 'human' },
  { key: 'done', name: 'Done', order: 2, ownerKind: 'human' },
];

test('?view=list opens the List, and a row menu moves the card on the server', async ({ page, request }) => {
  const boardId = await seedBoard(request, 'List move', STAGES);
  await request.post(`${API}/v1/boards/${boardId}/cards`, { headers: TENANT, data: { title: 'Write the changelog', ownerUserId: 'usr_a' } });
  await setAppearance(page, 'daylight.light.strong.0');
  await page.goto(`/b/${boardId}?view=list`);

  const row = page.getByRole('row', { name: /Write the changelog/ });
  await row.getByRole('button', { name: /^Move$/ }).click();
  await page.getByRole('menu', { name: 'Move to' }).getByRole('menuitem', { name: 'Doing' }).click();

  await expect
    .poll(async () => (await (await request.get(`${API}/v1/boards/${boardId}`, { headers: TENANT })).json()).cards[0].currentStageKey)
    .toBe('doing');
  await expect(page.getByText('Write the changelog moved to Doing')).toBeAttached();
  await expect(page.getByRole('rowgroup').filter({ hasText: 'Doing' }).getByRole('link', { name: 'Write the changelog' })).toBeVisible();
});
