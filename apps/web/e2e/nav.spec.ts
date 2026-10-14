import { test, expect } from '@playwright/test';
import { openBoard, REVIEW_PIPELINE, seedBoard, seedGatedCard } from './support/seed';

const BOARD_KEY = 'superpipeline.boardId';
import { PORTS } from '../scripts/ports';
const API = PORTS.apiUrl;
const TENANT = { 'X-Tenant-Id': 'tnt_dev', 'Content-Type': 'application/json' };
const DEFAULT_STAGES = [
  { key: 'backlog', name: 'Backlog', order: 0 },
  { key: 'ready', name: 'Ready', order: 1 },
  { key: 'in-progress', name: 'In Progress', order: 2, wipLimit: 3 },
  { key: 'review', name: 'Review', order: 3, gate: 'approval' },
  { key: 'done', name: 'Done', order: 4 },
];

let boardId = '';
test.beforeEach(async ({ page, request }) => {
  const res = await request.post(`${API}/v1/boards`, {
    headers: TENANT,
    data: { name: 'Nav E2E board', stages: DEFAULT_STAGES },
  });
  ({ boardId } = (await res.json()) as { boardId: string });
  await page.addInitScript(
    ([key, id]) => window.localStorage.setItem(key as string, id as string),
    [BOARD_KEY, boardId],
  );
});

const rail = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Superpipeline' });

test('the app opens on the Inbox, and the nav reads Inbox, Plan, Crew', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/inbox$/);
  await expect(page.getByRole('heading', { name: 'Needs you', exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Show' }).getByRole('button', { name: /^All boards/ })).toHaveAttribute('aria-pressed', 'true');
  const names = await rail(page).locator('.vk-appnav__list a').allTextContents();
  expect(names.map((n) => n.match(/Inbox|Plan|Crew/)?.[0])).toEqual(['Inbox', 'Plan', 'Crew']);
  await expect(rail(page)).not.toContainText(/Operate|Workspace/);
});

/**
 * Triage and Telemetry were rail destinations. Operate absorbed both on 2026-09-03, and the Inbox
 * took Operate's place on 2026-10-14 (nav v2). A board's old Operate address opens the Inbox
 * showing that board.
 */
test('the Inbox shows a board’s spend, and its detail view breaks it down', async ({ page }) => {
  await page.goto(`/b/${boardId}/operate`);
  await expect(page).toHaveURL(/\/inbox$/);
  await expect(page.getByRole('group', { name: 'Show' }).getByRole('button', { name: /^Nav E2E board/ }).first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Spend' })).toBeVisible();
  await expect(page.getByText('$0.00')).toBeVisible();

  // By-model and by-card moved to the sub-view; the summary answers "are we fine", and this
  // answers "where did it go".
  await page.getByRole('link', { name: 'detail' }).click();
  await expect(page).toHaveURL(/\/operate\/telemetry$/);
  await expect(page.getByText(/by agent/i).first()).toBeVisible();
});

test('the Inbox shows what needs you on a board, and says so plainly when nothing does', async ({ page }) => {
  await page.goto(`/b/${boardId}/operate`);
  await expect(page.getByRole('heading', { name: 'Needs you', exact: true })).toBeVisible();
  // A fresh board has no gate, no question and no refusal.
  await expect(page.getByText('Nothing is waiting on you.')).toBeVisible();
});

test('the board log is reachable from the spend detail view', async ({ page }) => {
  await page.goto(`/b/${boardId}/operate`);
  await page.getByRole('link', { name: 'detail' }).click();
  await expect(page).toHaveURL(/\/operate\/telemetry$/);
  await expect(page.getByRole('heading', { name: 'Board log' })).toBeVisible();
  // …and the whole log is one link further.
  await page.getByRole('link', { name: 'Open the full board log' }).click();
  await expect(page).toHaveURL(/\/operate\/log$/);
  await expect(page.getByRole('heading', { name: 'Board log' })).toBeVisible();
});

test('the Inbox count is every board’s, on a board and off it, said to a screen reader too', async ({ page, request }) => {
  const id = await seedBoard(request, 'Shell count', REVIEW_PIPELINE);
  await seedGatedCard(request, id, 'Count me in');
  await openBoard(page, id);
  // vibekit's AppNav draws the count as a badge; AppShell names the link with the count's scope (nav-scope.ts).
  const inbox = rail(page).getByRole('link', { name: /^Inbox\W+\d+ needs? you across all boards/ });
  await expect(inbox).toBeVisible();
  await expect(inbox.locator('.vk-appnav__count')).toHaveText(/^\d+$/);
  await page.goto('/crew/agents');
  await expect(rail(page).getByRole('link', { name: /^Inbox\W+\d+ needs? you across all boards/ })).toBeVisible();
  // Crew has no Needs-you tab and no badge of its own.
  await expect(page.getByRole('tab')).toHaveText([/^Agents/, /^People/, /^Capabilities/]);
});

test('the board chosen under Show lasts until a refresh, and is written nowhere', async ({ page, request }) => {
  const name = `Show me first ${Date.now()}`;
  const id = await seedBoard(request, name, REVIEW_PIPELINE);
  await seedGatedCard(request, id, 'Ask from the chosen board');
  await page.goto('/inbox');
  const show = page.getByRole('group', { name: 'Show' });
  const chip = show.getByRole('button', { name: `${name}, 1 needs you` });
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  // Every ask names its board next to the agent.
  await expect(page.locator('.ib-board', { hasText: name }).first()).toBeVisible();
  await rail(page).getByRole('link', { name: /^Crew/ }).click();
  await rail(page).getByRole('link', { name: /^Inbox/ }).click();
  await expect(show.getByRole('button', { name: `${name}, 1 needs you` })).toHaveAttribute('aria-pressed', 'true');
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + location.href);
  expect(stored).not.toContain(id);
  await page.reload();
  await expect(show.getByRole('button', { name: /^All boards/ })).toHaveAttribute('aria-pressed', 'true');
});

test('old Workspace links land where each tab lives now; Settings holds Labels and Connections', async ({ page }) => {
  await page.goto('/workspace/needs-you');
  await expect(page).toHaveURL(/\/inbox$/);
  await page.goto('/workspace/people');
  await expect(page).toHaveURL(/\/crew\/people$/);
  await page.goto('/workspace/labels');
  await expect(page).toHaveURL(/\/settings#labels$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  for (const h of [/label/i, 'Connections', 'Appearance', 'Account']) await expect(page.getByRole('heading', { level: 2, name: h }).first()).toBeVisible();
  // …and the account menu reaches it.
  await page.goto('/crew/agents');
  await rail(page).getByRole('button', { name: /^Account/ }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/settings$/);
});
