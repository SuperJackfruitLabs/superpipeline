import { expect, test } from '@playwright/test';
import { AGENT, API, openBoard, seedBoard, setAppearance, TENANT } from './support/seed';

// A blocked card in Studio shows a tall resume bar. On a phone it must not cover what a person
// focuses in the open tab (WCAG 2.4.11): the body pads by the bar's measured height.
const PIPELINE = [
  { key: 'build', name: 'Build', order: 0, ownerKind: 'capability', owner: 'build' },
  { key: 'review', name: 'Review', order: 1, ownerKind: 'human', gate: 'approval' },
];

test('studio phone: a focused control in the open tab is not under the resume bar', async ({ page, request }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await setAppearance(page, 'studio.light.strong.0');
  const boardId = await seedBoard(request, 'Studio resume', PIPELINE);
  await request.post(`${API}/v1/boards/${boardId}/cards`, { headers: TENANT, data: { title: 'Rotate the keys', ownerUserId: 'usr_a' } });
  const claim = await (await request.post(`${API}/v1/boards/${boardId}/claims`, { headers: AGENT, data: { capabilities: ['build'] } })).json();
  await request.post(`${API}/v1/boards/${boardId}/runs/${claim.runId}/block`, {
    headers: AGENT,
    data: { leaseEpoch: claim.leaseEpoch, reason: 'the vault is sealed and nobody on the rota holds a key; '.repeat(12) },
  });
  await openBoard(page, boardId);
  await page.getByRole('button', { name: /^Rotate the keys, in / }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const bar = dialog.locator('.resume-bar');
  await expect(bar).toBeVisible();
  const barBox = (await bar.boundingBox())!;
  expect(barBox.height).toBeLessThanOrEqual(667 * 0.35 + 1);

  for (const tab of ['Spec', 'Log', 'Links', 'Talk', 'Cost']) {
    await dialog.getByRole('tab', { name: new RegExp(`^${tab}`) }).click();
    const panel = dialog.getByRole('tabpanel').and(page.locator(':not([hidden])'));
    const last = panel.locator('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]').last();
    if (!(await last.count())) continue;
    await last.focus();
    const box = (await last.boundingBox())!;
    const top = (await bar.boundingBox())!.y;
    expect(box.y + box.height, `${tab}: last control sits above the bar`).toBeLessThanOrEqual(top + 1);
  }
});

test('studio phone: the edit form scrolls with the body, and Save can be reached and seen', async ({ page, request }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await setAppearance(page, 'studio.light.strong.0');
  const boardId = await seedBoard(request, 'Studio edit', PIPELINE);
  await request.post(`${API}/v1/boards/${boardId}/cards`, { headers: TENANT, data: { title: 'Edit me on a phone', ownerUserId: 'usr_a' } });
  await openBoard(page, boardId);
  await page.getByRole('button', { name: /^Edit me on a phone, in / }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Edit card' }).click();
  // Not inside the header capped at 40dvh.
  await expect(dialog.getByRole('region', { name: 'Card summary' }).getByPlaceholder('Title')).toHaveCount(0);
  const save = dialog.getByRole('button', { name: 'Save' });
  await save.scrollIntoViewIfNeeded();
  await expect(save).toBeInViewport();
  await save.focus();
  await expect(save).toBeFocused();
});
