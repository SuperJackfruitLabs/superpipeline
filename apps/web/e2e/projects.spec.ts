import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { API, TENANT, openBoard, seedBoard, setAppearance } from './support/seed';
import { VIBES } from './support/world';

/**
 * Nav v2, track N2: Plan has two sections, Boards and Projects. Projects belong to the workspace,
 * so they live at /plan/projects with no board switcher; a project has its own page and opens in
 * a drawer over the list; the New project dialog creates one.
 */

const PHONE = { width: 390, height: 844 };
const tag = () => Math.random().toString(36).slice(2, 8);

async function seedProject(request: APIRequestContext, name: string, extra: Record<string, unknown> = {}): Promise<string> {
  const res = await request.post(`${API}/v1/projects`, { headers: TENANT, data: { name, ...extra } });
  expect(res.status()).toBe(201);
  return ((await res.json()) as { project: { id: string } }).project.id;
}
async function seedCard(request: APIRequestContext, boardId: string, title: string, projectId: string): Promise<string> {
  const res = await request.post(`${API}/v1/boards/${boardId}/cards`, { headers: TENANT, data: { title, ownerUserId: 'usr_a', projectId } });
  return ((await res.json()) as { card: { id: string } }).card.id;
}
/** Daylight's Plan switch is a Segmented (radios); the other vibes' are link tabs. */
const planItem = (page: Page, name: 'Boards' | 'Projects') =>
  page.getByRole('radiogroup', { name: 'Plan' }).getByRole('radio', { name })
    .or(page.getByRole('navigation', { name: 'Plan' }).getByRole('link', { name, exact: true }));

async function noSideScroll(page: Page, what: string): Promise<void> {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(over, `${what}: no horizontal scroll`).toBeLessThanOrEqual(0);
}

test('Plan switches between Boards and Projects; Projects has no board switcher', async ({ page, request }) => {
  const boardId = await seedBoard(request, `Plan switch ${tag()}`);
  await openBoard(page, boardId);
  await expect(planItem(page, 'Boards')).toBeVisible();
  // A board's views are Board and List; Projects is no longer one of them.
  const views = page.getByRole('radiogroup', { name: 'View' });
  await expect(views.getByRole('radio')).toHaveText(['Board', 'List']);
  await planItem(page, 'Projects').click();
  await expect(page).toHaveURL(/\/plan\/projects$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Switch board|Change board/ })).toHaveCount(0);
  await expect(page.getByRole('radiogroup', { name: 'View' })).toHaveCount(0);
  await planItem(page, 'Boards').click();
  await expect(page).toHaveURL(new RegExp(`/b/${boardId}$`));
});

test('a board’s old Projects view address opens Plan · Projects', async ({ page, request }) => {
  const boardId = await seedBoard(request, `Old projects ${tag()}`);
  await openBoard(page, boardId);
  await page.goto(`/b/${boardId}?view=projects`);
  await expect(page).toHaveURL(/\/plan\/projects$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();
});

test('New project creates one, with its health and first milestone, and opens its page', async ({ page, request }) => {
  await openBoard(page, await seedBoard(request, `New project ${tag()}`));
  await page.goto('/plan/projects');
  const opener = page.getByRole('button', { name: 'New project' });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'New project' });
  await expect(dialog.getByRole('textbox', { name: 'Name' })).toBeFocused();
  // Escape closes it and focus returns to the opener.
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await opener.click();
  const name = `Clean-room fixes ${tag()}`;
  await dialog.getByRole('textbox', { name: 'Name' }).fill(name);
  await dialog.getByRole('textbox', { name: /^Goal/ }).fill('Every journey passes.');
  await dialog.getByRole('radio', { name: 'At risk' }).click();
  await dialog.getByRole('textbox', { name: 'Milestone' }).fill('Kickoff');
  await dialog.getByRole('button', { name: 'Create project' }).click();
  await expect(page).toHaveURL(/\/plan\/projects\/prj_/);
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  await expect(page.getByText('declared At risk')).toBeVisible();
  await expect(page.getByText('Every journey passes.')).toBeVisible();
  await expect(page.getByText('Kickoff', { exact: true })).toBeVisible();
});

test('a project page loads from its own address: health, blockers, cards by board', async ({ page, request }) => {
  const t = tag();
  const boardId = await seedBoard(request, `Project page board ${t}`);
  const projectId = await seedProject(request, `Checkpoint recovery ${t}`, { health: 'on-track', targetDate: '2030-01-01', description: 'A stopped run can be restored.' });
  // A milestone whose date has passed, with an open card on it: computed At risk.
  const ms = await (await request.post(`${API}/v1/projects/${projectId}/milestones`, { headers: TENANT, data: { name: 'Restore tested', targetDate: '2020-01-01' } })).json() as { milestone: { id: string } };
  const first = await seedCard(request, boardId, 'Restore a run from its checkpoint', projectId);
  const second = await seedCard(request, boardId, 'Resume a restored run', projectId);
  await request.patch(`${API}/v1/boards/${boardId}/cards/${first}`, { headers: TENANT, data: { milestoneId: ms.milestone.id } });
  await request.post(`${API}/v1/boards/${boardId}/links`, { headers: TENANT, data: { fromCardId: first, toCardId: second, kind: 'blocks' } });

  await openBoard(page, boardId);
  await page.goto(`/plan/projects/${projectId}`);
  await expect(page.getByRole('heading', { level: 1, name: `Checkpoint recovery ${t}` })).toBeVisible();
  await expect(page.getByText('declared On track')).toBeVisible();
  await expect(page.getByText('computed At risk: 1 milestone overdue')).toBeVisible();
  const blockers = page.getByRole('region', { name: 'Blockers' });
  await expect(blockers.getByText('Resume a restored run', { exact: true })).toBeVisible();
  await expect(blockers.getByText('Blocked by')).toBeVisible();
  const cards = page.getByRole('region', { name: 'Cards' });
  await expect(cards.getByRole('link', { name: 'Restore a run from its checkpoint' })).toHaveAttribute('href', `/b/${boardId}/c/${first}`);
  await expect(cards.getByRole('heading', { name: new RegExp(`Project page board ${t}`) })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Milestones' }).getByText('Overdue', { exact: true })).toBeVisible();
  await expect(page.getByText(/^as of \d\d:\d\d · a snapshot$/)).toBeVisible();
});

test('a project opens in a drawer over the list; Escape closes it and focus returns', async ({ page, request }) => {
  const t = tag();
  const boardId = await seedBoard(request, `Drawer board ${t}`);
  const projectId = await seedProject(request, `Drawer project ${t}`);
  await seedCard(request, boardId, 'A card in the drawer', projectId);
  await openBoard(page, boardId);
  await page.goto('/plan/projects');
  const link = page.getByRole('link', { name: `Drawer project ${t}` });
  // The list names the boards the project's cards live on.
  await expect(page.locator('article, li').filter({ has: link }).getByText(`Drawer board ${t}`)).toBeVisible();
  await link.click();
  const drawer = page.getByRole('dialog', { name: `Drawer project ${t}` });
  await expect(drawer).toBeVisible();
  await expect(page).toHaveURL(/\/plan\/projects$/);
  await expect(drawer.getByText('1 · 0 done')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
  await expect(link).toBeFocused();
  await link.click();
  await drawer.getByRole('link', { name: 'Open full page' }).click();
  await expect(page).toHaveURL(new RegExp(`/plan/projects/${projectId}$`));
});

for (const vibe of VIBES) {
  test(`${vibe} phone: Projects, a project page and the New project dialog fit`, async ({ page, request }) => {
    const t = tag();
    const boardId = await seedBoard(request, `Phone projects ${vibe} ${t}`);
    const projectId = await seedProject(request, `A long project name that has to wrap on a phone ${vibe} ${t}`, { description: 'What is true when this project is done, in a sentence long enough to wrap.' });
    await seedCard(request, boardId, 'A card with a title long enough to wrap across the phone screen', projectId);
    await setAppearance(page, `${vibe}.light.strong.0`);
    await page.setViewportSize(PHONE);
    await openBoard(page, boardId);
    await page.goto('/plan/projects');
    await expect(planItem(page, 'Projects')).toBeVisible();
    await noSideScroll(page, 'projects');
    // A phone follows the link to the page (no drawer).
    await page.getByRole('link', { name: new RegExp(`A long project name .* ${vibe} ${t}`) }).click();
    await expect(page).toHaveURL(new RegExp(`/plan/projects/${projectId}$`));
    await expect(page.getByRole('region', { name: 'Cards' })).toBeVisible();
    await noSideScroll(page, 'project page');
    await page.goto('/plan/projects');
    await page.getByRole('button', { name: 'New project' }).click();
    const dialog = page.getByRole('dialog', { name: 'New project' });
    await expect(dialog).toBeVisible();
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(PHONE.width + 0.5);
    for (const b of await dialog.getByRole('button', { name: /^(Cancel|Create project)$/ }).all()) {
      expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await noSideScroll(page, 'new project dialog');
  });
}

// Round 3: the masthead's primary action names the page's main thing. Plan · Projects said "New card".
for (const vibe of VIBES) {
  test(`${vibe} desktop: the masthead says New project on Projects (it opens the dialog) and New card on the Inbox`, async ({ page, request }) => {
    await openBoard(page, await seedBoard(request, `Masthead ${tag()}`));
    await setAppearance(page, `${vibe}.light.${vibe === 'quiet' ? 'off' : 'strong'}.0`);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/plan/projects');
    const opener = page.getByRole('button', { name: /^New project/ });
    await expect(opener).toHaveCount(1);
    await expect(page.getByRole('button', { name: /^(New card|Write a new card)/ })).toHaveCount(0);
    await opener.click();
    await expect(page.getByRole('dialog', { name: 'New project' })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.goto('/inbox');
    // Quiet's board-less pages have one row, the links, and no masthead action (its Projects page draws New project itself).
    await expect(page.getByRole('button', { name: /^(New card|Write a new card)/ })).toHaveCount(vibe === 'quiet' ? 0 : 1);
    await expect(page.getByRole('button', { name: /^New project/ })).toHaveCount(0);
  });
}
