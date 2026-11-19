// The keys line (page composition contract, rule 13). Task B16 folds these two tests into composition.spec.ts.
import { test, expect } from '@playwright/test';
import { API, TENANT, seedBoard, setAppearance } from './support/seed';

const STAGES = [
  { key: 'todo', name: 'To do', order: 0, ownerKind: 'human' },
  { key: 'done', name: 'Done', order: 1, ownerKind: 'human' },
];
const PAGES = (id: string) => [`/b/${id}`, `/b/${id}?view=list`, '/crew/agents', '/settings', `/b/${id}/operate/telemetry`, '/plan/projects'];

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
