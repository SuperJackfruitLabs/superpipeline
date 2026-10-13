// apps/web/e2e/card-page.spec.ts
import { expect, test, type APIRequestContext } from '@playwright/test';
import { API, TENANT, setAppearance } from './support/seed';

async function boardWithCard(request: APIRequestContext) {
  const board = (await (await request.post(`${API}/v1/boards`, { headers: TENANT, data: { name: 'Card page board', stages: [{ key: 'todo', name: 'To do', order: 0 }] } })).json()) as { boardId: string };
  const card = (await (await request.post(`${API}/v1/boards/${board.boardId}/cards`, { headers: TENANT, data: { title: 'A card with its own page', ownerUserId: 'usr_a' } })).json()) as { card: { id: string } };
  return { boardId: board.boardId, cardId: card.card.id };
}

test('the drawer opens the card as a page in a new window, and the page leads back to the board', async ({ page, request }) => {
  const { boardId, cardId } = await boardWithCard(request);
  await setAppearance(page, 'daylight.light.strong.0');
  await page.goto(`/b/${boardId}/c/${cardId}`);
  const open = page.getByRole('dialog').getByRole('link', { name: 'Open in new window' });
  await expect(open).toHaveAttribute('href', `/b/${boardId}/c/${cardId}/page`);
  await expect(open).toHaveAttribute('target', '_blank');

  await page.goto(`/b/${boardId}/c/${cardId}/page`);
  await expect(page.getByRole('heading', { level: 1, name: 'A card with its own page' })).toBeVisible();
  await expect(page).toHaveTitle('A card with its own page · Card page board');
  // The bare slot: no rail, no top bar, no tabs.
  await expect(page.getByRole('navigation', { name: 'Card window' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to the board' }).first().click();
  await expect(page).toHaveURL(new RegExp(`/b/${boardId}$`));
});

test('a card the board does not hold says so, with the way back', async ({ page, request }) => {
  const { boardId } = await boardWithCard(request);
  await page.goto(`/b/${boardId}/c/card_not_here/page`);
  await expect(page.getByText('This card is not on Card page board any more.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to the board' })).toHaveAttribute('href', `/b/${boardId}`);
});

test('the appearance button opens the appearance dialog over the page', async ({ page, request }) => {
  const { boardId, cardId } = await boardWithCard(request);
  await setAppearance(page, 'daylight.light.strong.0');
  await page.goto(`/b/${boardId}/c/${cardId}/page`);
  await page.getByRole('button', { name: /^Appearance: Daylight/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('below 640px the page is the phone card, and Close goes back to the board', async ({ page, request }) => {
  const { boardId, cardId } = await boardWithCard(request);
  await setAppearance(page, 'daylight.light.strong.0');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/b/${boardId}/c/${cardId}/page`);
  await expect(page.getByRole('navigation', { name: 'Card window' })).toHaveCount(0);
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  await expect(page).toHaveURL(new RegExp(`/b/${boardId}$`));
});
