// apps/web/e2e/workspace-agents.spec.ts
import { expect, test } from '@playwright/test';
import { API, TENANT } from './support/seed';

test('issuing a token shows it once and counts it on the row', async ({ page, request }) => {
  const name = `e2e-quill-${Date.now()}`;
  const res = await request.post(`${API}/v1/agents`, { headers: TENANT, data: { name, capabilities: ['research'] } });
  expect(res.ok()).toBe(true);

  await page.goto('/crew/agents');
  const row = page.locator('li.arow, tr').filter({ hasText: name });
  await expect(row.getByText('1 token', { exact: true })).toBeVisible();

  await page.locator(`summary[aria-label="Actions for ${name}"]`).click();
  await page.getByRole('menuitem', { name: 'Issue a token', exact: true }).click();

  const banner = page.getByRole('status').filter({ hasText: `${name}'s token.` });
  await expect(banner).toBeVisible();
  await expect(banner.getByLabel(`New token for ${name}`)).toHaveText(/^spa_/);
  await expect(row.getByText('2 tokens', { exact: true })).toBeVisible();
  await expect(page.getByRole('menu', { name: `Actions for ${name}` })).toBeHidden();
});
