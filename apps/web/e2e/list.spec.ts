// apps/web/e2e/list.spec.ts
import { test, expect } from '@playwright/test';
import { API, TENANT, seedBoard, setAppearance } from './support/seed';
import { seedRealistic, useRealistic } from './support/realistic-inbox';

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


// The composition contract: one List in every vibe, on the realistic workspace's first board.
for (const vibe of ['daylight', 'paper', 'studio', 'quiet'] as const) {
  test(`${vibe}: the List is one composition: the pickers in the top row, one Move per row, J and R work`, async ({ page, request }) => {
    const { boardIds } = await seedRealistic(request);
    await useRealistic(page, boardIds[0]);
    await setAppearance(page, `${vibe}.light.${vibe === 'quiet' ? 'off' : 'strong'}.0`);
    await page.goto(`/b/${boardIds[0]}?view=list`);

    const top = page.locator('.bv-top');
    await expect(top.getByRole('combobox', { name: /Group by/ })).toHaveValue('stage');
    await expect(top.getByRole('combobox', { name: /Sort by/ })).toBeVisible();
    await expect(top.getByRole('navigation', { name: 'View' }).getByRole('link', { name: 'List' })).toBeVisible();
    await expect(page.getByLabel('Keyboard')).toContainText('J / K rows');

    const rows = page.locator('tr[data-row]');
    await expect(rows.first()).toBeVisible();
    const perRow = await rows.evaluateAll((trs) => trs.map((tr) => tr.querySelectorAll('button').length));
    expect(perRow.length).toBeGreaterThan(0);
    expect(new Set(perRow)).toEqual(new Set([1]));

    await page.locator('body').press('j');
    await expect(page.locator('tr[data-row][aria-current="true"]')).toHaveCount(1);
    await page.locator('body').press('r');
    await expect(top.getByRole('combobox', { name: /Group by/ })).toHaveValue('state');
  });
}

// G belongs to the shell's G I / G P / G C chords: on the List it never regroups (R does).
test('on the List, G P goes to Plan and G C to Crew; neither regroups the List', async ({ page, request }) => {
  const { boardIds } = await seedRealistic(request);
  await useRealistic(page, boardIds[0]);
  await setAppearance(page, 'studio.light.strong.0');
  await page.goto(`/b/${boardIds[0]}?view=list`);
  const group = page.locator('.bv-top').getByRole('combobox', { name: /Group by/ });
  await expect(group).toHaveValue('stage');

  await page.locator('body').press('g');
  await page.locator('body').press('p');
  await expect(page).toHaveURL(new RegExp(`/b/${boardIds[0]}$`));
  // Plan · Boards keeps the view the person was on: still the List, still grouped by stage.
  await expect(group).toHaveValue('stage');

  await page.locator('body').press('r');
  await expect(group).toHaveValue('state');

  await page.locator('body').press('g');
  await page.locator('body').press('c');
  await expect(page).toHaveURL(/\/crew\/agents$/);
});
