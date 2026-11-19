// The keys line (page composition contract, rule 13). Task B16 folds these two tests into composition.spec.ts.
import { test, expect } from '@playwright/test';
import { API, TENANT, seedBoard, setAppearance } from './support/seed';

const STAGES = [
  { key: 'todo', name: 'To do', order: 0, ownerKind: 'human' },
  { key: 'done', name: 'Done', order: 1, ownerKind: 'human' },
];
const PAGES = (id: string) => [`/b/${id}`, `/b/${id}?view=list`, '/inbox', '/crew/agents', '/settings', `/b/${id}/operate/telemetry`, '/plan/projects'];

for (const vibe of ['daylight', 'paper', 'studio', 'quiet'] as const) {
  test(`${vibe}: every page's footer ends with its keys`, async ({ page, request }) => {
    const id = await seedBoard(request, 'Keys line', STAGES);
    await request.post(`${API}/v1/boards/${id}/cards`, { headers: TENANT, data: { title: 'A card', ownerUserId: 'usr_a' } });
    await setAppearance(page, `${vibe}.light.${vibe === 'quiet' ? 'off' : 'strong'}.0`);
    await page.setViewportSize({ width: 1280, height: 800 });
    for (const url of PAGES(id)) {
      await page.goto(url);
      const keys = page.getByLabel('Keyboard');
      await expect(keys, url).toBeVisible();
      expect((await keys.textContent())?.trim(), url).toMatch(/ (search|filter|rows)\b/);
    }
  });
}

test('the keys line is absent on a phone', async ({ page, request }) => {
  const id = await seedBoard(request, 'Keys phone', STAGES);
  await request.post(`${API}/v1/boards/${id}/cards`, { headers: TENANT, data: { title: 'A card', ownerUserId: 'usr_a' } });
  await setAppearance(page, 'daylight.light.strong.0');
  await page.setViewportSize({ width: 390, height: 800 });
  for (const url of PAGES(id)) {
    await page.goto(url);
    await expect(page.getByLabel('Keyboard'), url).toBeHidden();
  }
});

test('an empty board ends with its keys too', async ({ page, request }) => {
  const id = await seedBoard(request, 'Keys empty', STAGES);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/b/${id}`);
  await expect(page.getByLabel('Keyboard')).toContainText('N new card');
});

test('the Inbox footer names its keys, and they work: J / K pick a row, R resumes it, O opens it, F filters', async ({ page, request }) => {
  // One board with two blocked cards (two Resume rows), shown alone under Show.
  const at = Date.now();
  const id = await seedBoard(request, 'Keys inbox', [
    { key: 'build', name: 'Build', order: 0, ownerKind: 'capability', owner: 'build' },
    { key: 'review', name: 'Review', order: 1, ownerKind: 'human', gate: 'approval' },
  ]);
  const agent = { ...TENANT, 'X-Agent-Id': 'agt_keys' };
  for (const title of [`Keys walk A ${at}`, `Keys walk B ${at}`]) {
    await request.post(`${API}/v1/boards/${id}/cards`, { headers: TENANT, data: { title, ownerUserId: 'usr_a' } });
    const claim = await (await request.post(`${API}/v1/boards/${id}/claims`, { headers: agent, data: { capabilities: ['build'] } })).json();
    await request.post(`${API}/v1/boards/${id}/runs/${claim.runId}/block`, { headers: agent, data: { leaseEpoch: claim.leaseEpoch, reason: 'waiting on a key' } });
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/inbox');
  const keys = page.locator('.ib-foot').getByLabel('Keyboard');
  await expect(keys).toHaveText('J / K rows · O open · M move · R resume · F filter · ⌘K search · G I / P / C go to Inbox, Plan, Crew');
  await page.getByRole('radiogroup', { name: 'Show' }).locator(`[role="radio"][data-key="${id}"]`).click();
  const a = page.locator('.ib-needs .ib-row').filter({ hasText: `Keys walk A ${at}` });
  const b = page.locator('.ib-needs .ib-row').filter({ hasText: `Keys walk B ${at}` });
  await expect(b).toBeVisible();
  await page.locator('body').click({ position: { x: 1, y: 1 } });

  // J, J, K: the second row, then back to the first; the selected row says so.
  await page.keyboard.press('j');
  await expect(a).toHaveAttribute('aria-current', 'true');
  await page.keyboard.press('j');
  await expect(b).toHaveAttribute('aria-current', 'true');
  await expect(a).not.toHaveAttribute('aria-current', 'true');
  await page.keyboard.press('k');
  await expect(a).toHaveAttribute('aria-current', 'true');
  // R: this row offers Resume, so its note form opens under it.
  await page.keyboard.press('r');
  await expect(a.getByRole('button', { name: 'Send back to work' })).toBeVisible();
  await a.getByRole('button', { name: 'Cancel' }).click();
  // F: the filter row opens, its find field focused.
  const filter = page.getByRole('button', { name: /^Filter/ });
  await expect(filter).toHaveAttribute('aria-expanded', 'false');
  await page.locator('body').press('f');
  await expect(filter).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#ib-filter-row input').first()).toBeFocused();
  // O on the selected row opens its card (out of the find field first: a key typed there is the find's).
  await filter.click();
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await expect(a).toHaveAttribute('aria-current', 'true');
  await page.keyboard.press('o');
  await expect(page.getByRole('heading', { name: `Keys walk A ${at}` }).first()).toBeVisible();
});
