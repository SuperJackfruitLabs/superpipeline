// apps/web/e2e/crew-lists.spec.ts
/**
 * Crew tabs never sit on a skeleton under a count the pills already show (operator, Studio dark:
 * "32 agents" over skeleton rows). A tab opens on the list it last read and refreshes behind it,
 * so a slow list read on a tab switch shows the known rows, not the loading form.
 */
import { expect, test } from '@playwright/test';
import { openWorld, seed, VIBES } from './support/world';

for (const vibe of VIBES) {
  for (const dark of vibe === 'studio' ? [true, false] : [false]) {
    test(`${vibe}${dark ? ' dark' : ''}: switching Crew tabs with a slow server keeps the rows`, async ({ page, request }) => {
      await seed(request);
      await openWorld(page, '/crew/agents', { vibe, dark, width: 1440, height: 900 });
      await expect(page.locator('[data-skeleton]')).toHaveCount(0, { timeout: 10_000 });
      // From here every list read takes 6 s: longer than any skeleton hold.
      await page.route(/\/v1\/(agents|capabilities|members)(\?|$)/, async (r) => { await new Promise((ok) => setTimeout(ok, 6_000)); await r.continue().catch(() => {}); });
      for (const tab of ['People', 'Capabilities', 'Agents', 'Capabilities']) {
        await page.getByRole('main').getByRole('link', { name: new RegExp(`^${tab}`) }).or(page.getByRole('tab', { name: new RegExp(`^${tab}`) })).first().click();
        await page.waitForURL(`**/crew/${tab.toLowerCase()}`);
        await page.waitForTimeout(800);
        await expect(page.locator('[data-skeleton]'), `${tab} drew a skeleton over a known list`).toHaveCount(0);
      }
    });
  }
}
