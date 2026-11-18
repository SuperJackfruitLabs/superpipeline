// apps/web/e2e/workspace-agents.spec.ts
import { expect, test } from '@playwright/test';
import { API, TENANT } from './support/seed';

// Tokens live under each agent's actions menu (composition contract, Crew): the menu counts them.
test('issuing a token shows it once and counts it under the agent\'s actions', async ({ page, request }) => {
  const name = `e2e-quill-${Date.now()}`;
  const res = await request.post(`${API}/v1/agents`, { headers: TENANT, data: { name, capabilities: ['research'] } });
  expect(res.ok()).toBe(true);

  await page.goto('/crew/agents');
  await expect(page.getByRole('table', { name: 'Agents' })).toBeVisible();
  // The table shows ten rows, then Show N more: open them all to reach the agent made here.
  const more = page.getByRole('button', { name: /^Show \d+ more/ });
  while (await more.isVisible().catch(() => false)) await more.click();
  const actions = page.getByRole('button', { name: `Actions for ${name}` });
  await actions.click();
  const menu = page.getByRole('menu', { name: `Actions for ${name}` });
  await expect(menu.getByText('1 token in use', { exact: true })).toBeVisible();
  await menu.getByRole('menuitem', { name: 'Issue a token', exact: true }).click();

  const banner = page.getByRole('status').filter({ hasText: `${name}'s token.` });
  await expect(banner).toBeVisible();
  await expect(banner.getByLabel(`New token for ${name}`)).toHaveText(/^spa_/);
  await expect(menu).toBeHidden();
  await actions.click();
  await expect(menu.getByText('2 tokens in use', { exact: true })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: /^Revoke token/ })).toHaveCount(2);
});
