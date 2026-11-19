import { expect, test } from '@playwright/test';
import { AGENT, API, openBoard, seedBoard, setAppearance, TENANT } from './support/seed';

// A blocked card in Studio: on a phone every control can be reached (the card is one document, the same composition as every vibe).
const PIPELINE = [
  { key: 'build', name: 'Build', order: 0, ownerKind: 'capability', owner: 'build' },
  { key: 'review', name: 'Review', order: 1, ownerKind: 'human', gate: 'approval' },
];

test('studio phone: every control can be reached and nothing covers it', async ({ page, request }) => {
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
  // Nothing may cover a control: at its centre, the topmost element is the control or sits inside it.
  const covered = (el: Element): string | null => {
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return top && (top === el || el.contains(top) || top.contains(el)) ? null : `${top?.tagName.toLowerCase()}.${top?.className}`;
  };
  // Open every disclosure so their controls count.
  await dialog.locator('details:not([open]) > summary').evaluateAll((els) => els.forEach((e) => { if (e instanceof HTMLElement) e.click(); }));
  const controls = dialog.locator('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]');
  const n = await controls.count();
  for (let i = 0; i < n; i++) {
    const c = controls.nth(i);
    if (!(await c.isVisible())) continue;
    // Scrolled to the bottom edge and to the top edge of the viewport, where a pinned bar would sit on it.
    for (const block of ['end', 'start'] as const) {
      await c.evaluate((el, b) => el.scrollIntoView({ block: b }), block);
      await expect(c, `#${i}: in the viewport`).toBeInViewport();
      expect(await c.evaluate(covered), `#${i}: nothing covers it at 375px (scrolled to the ${block})`).toBeNull();
    }
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
  const save = dialog.getByRole('button', { name: 'Save' });
  await save.scrollIntoViewIfNeeded();
  await expect(save).toBeInViewport();
  await save.focus();
  await expect(save).toBeFocused();
});

// Was "the column headers show on a desktop, the phone draws rows and no table": the Studio board was an
// annual-report table. The board is one composition now (Board variant A): lanes of tiles in every vibe.
test('studio board: the same lanes and tiles on a desktop and a phone, no table, the card reachable by its title', async ({ page, request }) => {
  await setAppearance(page, 'studio.light.strong.0');
  const boardId = await seedBoard(request, 'Studio columns', PIPELINE);
  await request.post(`${API}/v1/boards/${boardId}/cards`, { headers: TENANT, data: { title: 'A row', ownerUserId: 'usr_a' } });
  for (const [width, height] of [[1280, 800], [375, 667]] as const) {
    await page.setViewportSize({ width, height });
    await openBoard(page, boardId);
    await expect(page.getByRole('button', { name: /^A row, in / })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Stages' })).toBeVisible();
    await expect(page.getByRole('table')).toHaveCount(0);
  }
});
