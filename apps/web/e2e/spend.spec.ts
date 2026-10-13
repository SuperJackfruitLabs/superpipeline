// apps/web/e2e/spend.spec.ts
import { expect, test } from '@playwright/test';
import { API, TENANT, seedBoard, setAppearance } from './support/seed';

const ZERO = { totalCostUsd: 0, estimatedCostUsd: 0, totalInputTokens: 0, totalOutputTokens: 0, unpricedRecords: 0, byModel: [], byAgent: [], byCard: [], byDay: [] };
const WITH_SPEND = {
  totalCostUsd: 14.2, estimatedCostUsd: 0, totalInputTokens: 1_600_000, totalOutputTokens: 300_000, unpricedRecords: 2,
  byModel: [{ model: 'gpt-5-codex', costUsd: 10.9, inputTokens: 1_300_000, outputTokens: 240_000 }, { model: 'kimi-k2', costUsd: 3.3, inputTokens: 300_000, outputTokens: 60_000 }],
  byAgent: [{ agentId: 'agt_fx_coder_kai', costUsd: 6.1 }, { agentId: 'agt_fx_tester_tim', costUsd: 4.05 }, { agentId: 'agt_fx_optimizer_ollie', costUsd: 2.4 }, { agentId: 'agt_fx_error_eric', costUsd: 1.65 }],
  byCard: [{ cardId: 'card_9ac2116a050858f8', costUsd: 6.35 }, { cardId: 'card_e10fb4fe39a91dfc', costUsd: 4.9 }, { cardId: 'card_691a65ff9894f83f', costUsd: 1.8 }, { cardId: 'card_ace250c9c25363ac', costUsd: 1.15 }],
  byDay: [
    { day: '2026-10-05', costUsd: 1.2 }, { day: '2026-10-06', costUsd: 3.4 }, { day: '2026-10-07', costUsd: 0.8 }, { day: '2026-10-08', costUsd: 2.9 },
    { day: '2026-10-09', costUsd: 4.1 }, { day: '2026-10-10', costUsd: 1.0 }, { day: '2026-10-11', costUsd: 0.8 },
  ],
};

test('with spend, the detail view adds it up against the cap', async ({ page, request }) => {
  const boardId = await seedBoard(request, 'Spend E2E');
  expect((await request.put(`${API}/v1/boards/${boardId}/budget`, { headers: TENANT, data: { boardUsdCap: 25, cardUsdCap: null } })).ok()).toBe(true);
  await setAppearance(page, 'daylight.light.strong.0');
  await page.clock.setFixedTime(new Date('2026-10-11T08:21:00Z'));
  await page.route('**/v1/boards/*/usage*', (route) => route.fulfill({ json: route.request().url().includes(`/boards/${boardId}/`) ? WITH_SPEND : ZERO }));
  await page.goto(`/b/${boardId}/operate/telemetry`);

  const tiles = page.locator('.tile');
  await expect(tiles.nth(0).locator('.big')).toHaveText('$14.20');
  await expect(tiles.nth(0)).toContainText('of a $25.00 board cap · 57% used');
  await expect(tiles.nth(1).locator('.big')).toHaveText('$3.55');
  await expect(tiles.nth(1)).toContainText('4 cards with spend in this window');
  await expect(tiles.nth(2).locator('.big')).toHaveText('1.9M');
  await expect(tiles.nth(2)).toContainText('1.6M in · 0.3M out');
  await expect(tiles.nth(3).locator('.big')).toHaveText('2');
  await expect(page.getByText('Busiest: Fri 9 · $4.10')).toBeVisible();
  expect(await page.locator('.chart .b').evaluateAll((bs) => bs.map((b) => (b as HTMLElement).style.height))).toEqual(['50px', '141px', '33px', '120px', '170px', '41px', '33px']);
  await expect(page.locator('#caps1')).toContainText('Board $25.00 · card none');
  await expect(page.getByLabel('Spend by model')).toContainText('gpt-5-codex');
});
