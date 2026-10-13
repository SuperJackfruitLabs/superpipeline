// apps/web/e2e/new-card.spec.ts
import { expect, test } from '@playwright/test';
import { API, TENANT, openBoard, seedBoard } from './support/seed';

test('the composer creates the card in the chosen stage, with labels and a project', async ({ page, request }) => {
  const tag = Date.now().toString(36);
  const boardId = await seedBoard(request, `Composer ${tag}`);
  const label = ((await (await request.post(`${API}/v1/labels`, { headers: TENANT, data: { name: `nc-${tag}`, colour: 'marigold' } })).json()) as { label: { id: string } }).label;
  const project = ((await (await request.post(`${API}/v1/projects`, { headers: TENANT, data: { name: `Composer project ${tag}` } })).json()) as { project: { id: string } }).project;

  await openBoard(page, boardId);
  await expect(page.getByText('Backlog', { exact: true }).first()).toBeVisible();
  await page.keyboard.press('n');
  const dialog = page.getByRole('dialog', { name: 'What needs doing?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Card title' }).fill(`Composed ${tag}`);
  await dialog.getByRole('combobox', { name: 'Starts in stage' }).selectOption('ready');
  await dialog.getByRole('combobox', { name: 'Project (optional)' }).selectOption(project.id);
  await dialog.getByRole('button', { name: 'Add label' }).click();
  await dialog.getByRole('option', { name: `nc-${tag}` }).click();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible(); // Escape closed only the picker
  await dialog.getByRole('button', { name: 'Dispatch' }).click();
  await expect(dialog).toBeHidden();

  const snap = (await (await request.get(`${API}/v1/boards/${boardId}`, { headers: TENANT })).json()) as { cards: Array<{ title: string; currentStageKey: string; labels: string[]; projectId: string | null }> };
  const made = snap.cards.find((c) => c.title === `Composed ${tag}`)!;
  expect(made).toMatchObject({ currentStageKey: 'ready', projectId: project.id });
  expect(made.labels).toEqual([label.id]);
});
