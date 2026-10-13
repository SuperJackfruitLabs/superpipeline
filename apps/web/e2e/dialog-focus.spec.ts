// apps/web/e2e/dialog-focus.spec.ts — every dialog gives focus back to what opened it, and a dialog
// panel sits centred inside the viewport.
import { expect, test, type Page } from '@playwright/test';
import { API, TENANT, openBoard, seedBoard, setAppearance } from './support/seed';

async function boardWithCard(request: import('@playwright/test').APIRequestContext, title: string) {
  const boardId = await seedBoard(request, `Focus ${Date.now().toString(36)}`);
  await request.post(`${API}/v1/boards/${boardId}/cards`, { headers: TENANT, data: { title } });
  const snap = (await (await request.get(`${API}/v1/boards/${boardId}`, { headers: TENANT })).json()) as { cards: Array<{ id: string; title: string }> };
  return { boardId, cardId: snap.cards.find((c) => c.title === title)!.id };
}
const focused = (page: Page) => page.evaluate(() => {
  const e = document.activeElement as HTMLElement | null;
  return e ? { tag: e.tagName, label: e.getAttribute('aria-label') ?? '', text: (e.textContent ?? '').trim().slice(0, 60), card: e.closest('[data-card-id]')?.getAttribute('data-card-id') ?? null } : null;
});

test('the board switcher gives focus back to the board control', async ({ page, request }) => {
  const { boardId } = await boardWithCard(request, 'Focus switcher');
  await setAppearance(page, 'daylight.light.strong.0');
  await openBoard(page, boardId);
  const trigger = page.getByRole('button', { name: /Switch board|Change board/ }).first();
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Find a board' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Find a board' })).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('the M key on a tile opens Move; Esc gives focus back to the tile', async ({ page, request }) => {
  const { boardId, cardId } = await boardWithCard(request, 'Focus tile');
  await setAppearance(page, 'daylight.light.strong.0');
  await openBoard(page, boardId);
  const tile = page.locator(`[data-card-id="${cardId}"]`);
  const title = tile.getByRole('button', { name: /^Focus tile/ }).first();
  await title.focus();
  await page.keyboard.press('m');
  const dialog = page.getByRole('dialog', { name: 'Focus tile' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(title).toBeFocused();
});

test('a Move that moves the tile puts focus on the card in its new column', async ({ page, request }) => {
  const { boardId, cardId } = await boardWithCard(request, 'Focus moved');
  await setAppearance(page, 'daylight.light.strong.0');
  await openBoard(page, boardId);
  await page.locator(`[data-card-id="${cardId}"]`).getByRole('button', { name: /^Move/ }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Focus moved' });
  await dialog.getByRole('button', { name: /^Move to / }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(async () => (await focused(page))?.card).toBe(cardId);
});

test('a List row’s Move gives focus back to it', async ({ page, request }) => {
  const { boardId } = await boardWithCard(request, 'Focus row');
  await setAppearance(page, 'paper.light.strong.0');
  await page.goto(`/b/${boardId}?view=list`);
  const move = page.getByRole('row', { name: /Focus row/ }).getByRole('button', { name: /^Move/ });
  await move.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Focus row' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(move).toBeFocused();
});

test('the palette shortcut gives focus back to where it was pressed', async ({ page, request }) => {
  const { boardId } = await boardWithCard(request, 'Focus palette');
  await setAppearance(page, 'daylight.light.strong.0');
  await openBoard(page, boardId);
  const newCard = page.getByRole('button', { name: /^New card/ }).first();
  await newCard.focus();
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: 'Search cards, boards, agents and actions' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(newCard).toBeFocused();
});

test('the Appearance button gets focus back', async ({ page, request }) => {
  const { boardId } = await boardWithCard(request, 'Focus appearance');
  await setAppearance(page, 'daylight.light.strong.0');
  await openBoard(page, boardId);
  const btn = page.getByRole('button', { name: /^Appearance/ }).first();
  await btn.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Appearance' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(btn).toBeFocused();
});

test('each fixed dialog sits centred, inside the viewport', async ({ page, request }) => {
  const { boardId, cardId } = await boardWithCard(request, 'Centred');
  await setAppearance(page, 'daylight.light.strong.0');
  await page.setViewportSize({ width: 1440, height: 900 });
  await openBoard(page, boardId);
  await expect(page.locator(`[data-card-id="${cardId}"]`)).toBeVisible();
  const opens: Array<[string, () => Promise<void>]> = [
    ['What needs doing?', () => page.keyboard.press('n')],
    ['Centred', () => page.locator(`[data-card-id="${cardId}"]`).getByRole('button', { name: /^Move/ }).first().click()],
    ['Search cards, boards, agents and actions', () => page.keyboard.press('Control+k')],
    ['Appearance', () => page.getByRole('button', { name: /^Appearance/ }).first().click()],
  ];
  for (const [name, open] of opens) {
    await open();
    const d = page.getByRole('dialog', { name });
    await expect(d).toBeVisible();
    const r = await d.evaluate((e) => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: innerWidth - b.right, b: innerHeight - b.bottom, pos: getComputedStyle(e).position }; });
    expect(r.pos, name).toBe('fixed');
    for (const side of [r.l, r.t, r.r, r.b]) expect(side, `${name} edge`).toBeGreaterThanOrEqual(0);
    expect(Math.abs(r.l - r.r), `${name} centred across`).toBeLessThanOrEqual(1);
    expect(Math.abs(r.t - r.b), `${name} centred down`).toBeLessThanOrEqual(1);
    await page.keyboard.press('Escape');
    await expect(d).toBeHidden();
  }
});
