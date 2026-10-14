// apps/web/e2e/reconnect.spec.ts
import { expect, test } from '@playwright/test';
import { API, TENANT, seedBoard } from './support/seed';

async function cardPage(page: import('@playwright/test').Page, request: import('@playwright/test').APIRequestContext, title: string) {
  const boardId = await seedBoard(request, `Reconnect ${Date.now().toString(36)}`);
  await request.post(`${API}/v1/boards/${boardId}/cards`, { headers: TENANT, data: { title } });
  const snap = (await (await request.get(`${API}/v1/boards/${boardId}`, { headers: TENANT })).json()) as { cards: Array<{ id: string; title: string }> };
  const path = `/b/${boardId}/c/${snap.cards.find((c) => c.title === title)!.id}`;
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  return path;
}

test('a lapsed session renews quietly and keeps the open card', async ({ page, request }) => {
  const path = await cardPage(page, request, 'Keep me open');
  let refused = false;
  await page.route('**/v1/boards/*', (route) => {
    if (!refused && route.request().method() === 'GET') { refused = true; return route.fulfill({ status: 401, json: { error: 'unauthorized' } }); }
    return route.continue();
  });
  let release!: () => void;
  const held = new Promise<void>((r) => (release = r));
  await page.route('**/hub/session', async (route) => { await held; await route.continue(); }); // the DEV_AUTH stub answers ok

  await page.evaluate(() => (window as unknown as { __spDev: { refresh(): Promise<void> } }).__spDev.refresh());
  const toast = page.getByRole('status').filter({ hasText: 'Signing you back in…' });
  await expect(toast).toBeVisible();
  await expect(toast).toContainText('You stay on this card.');
  release();
  await expect(toast).toBeHidden();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  expect(new URL(page.url()).pathname).toBe(path);
  await expect(page.getByText('Keep me open').first()).toBeVisible();
});

test('a refused renewal asks to sign in again, keeps the person and remembers the card', async ({ page, request }) => {
  const path = await cardPage(page, request, 'Come back to me');
  await page.route('**/hub/session', (r) => r.fulfill({ status: 200, json: { ok: false, reason: 'login_required', issuer: 'accounts.superjackfruit.com', reauthorize: '/auth/login' } }));
  await page.route('**/v1/**', (r) => r.fulfill({ status: 401, json: { error: 'unauthorized' } }));
  await page.evaluate(() => (window as unknown as { __spDev: { refresh(): Promise<void> } }).__spDev.refresh());
  const dialog = page.getByRole('alertdialog', { name: 'Sign in again to keep going' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Come back to me');
  await expect(dialog.getByRole('link', { name: 'Sign in again' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(path); // Esc did not close the card behind it either
  await dialog.getByRole('link', { name: 'Sign in again' }).click();
  await page.waitForURL('**/auth/login');
  expect(await page.evaluate(() => sessionStorage.getItem('superpipeline.returnTo'))).toBe(path);
});

test('a half-typed resume note survives the expired session and the sign-in round trip', async ({ page, request }) => {
  const AGENT = { ...TENANT, 'X-Agent-Id': 'agt_b' };
  const board = await (await request.post(`${API}/v1/boards`, { headers: TENANT, data: { name: `Reconnect note ${Date.now().toString(36)}`, stages: [
    { key: 'build', name: 'Build', order: 0, ownerKind: 'capability', owner: 'build' },
    { key: 'review', name: 'Review', order: 1, ownerKind: 'human', gate: 'approval' },
  ] } })).json() as { boardId: string };
  await request.post(`${API}/v1/boards/${board.boardId}/cards`, { headers: TENANT, data: { title: 'Rotate the keys', ownerUserId: 'usr_a' } });
  const claim = await (await request.post(`${API}/v1/boards/${board.boardId}/claims`, { headers: AGENT, data: { capabilities: ['build'] } })).json();
  await request.post(`${API}/v1/boards/${board.boardId}/runs/${claim.runId}/block`, { headers: AGENT, data: { leaseEpoch: claim.leaseEpoch, reason: 'the vault is sealed' } });
  const snap = (await (await request.get(`${API}/v1/boards/${board.boardId}`, { headers: TENANT })).json()) as { cards: Array<{ id: string }> };
  const path = `/b/${board.boardId}/c/${snap.cards[0]!.id}`;
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  const note = page.getByRole('textbox', { name: /note|what changed/i }).first();
  await note.fill('Half a thought');

  await page.route('**/hub/session', (r) => r.fulfill({ status: 200, json: { ok: false, reason: 'login_required', issuer: 'accounts.superjackfruit.com', reauthorize: '/auth/login' } }));
  await page.route('**/v1/**', (r) => r.fulfill({ status: 401, json: { error: 'unauthorized' } }));
  await page.evaluate(() => (window as unknown as { __spDev: { refresh(): Promise<void> } }).__spDev.refresh());
  await expect(page.getByRole('alertdialog', { name: 'Sign in again to keep going' })).toBeVisible();
  await expect(note).toHaveValue('Half a thought');

  // Signed in again: the same card opens and the note comes back from sessionStorage.
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByRole('textbox', { name: /note|what changed/i }).first()).toHaveValue('Half a thought');
  expect(await page.evaluate((id) => sessionStorage.getItem(`sp:draft:resume:${id}`), snap.cards[0]!.id)).toBe('Half a thought');
});

test('after Reconnect the sign-in lands on / and the app reopens the same card, not the Inbox', async ({ page, request }) => {
  const path = await cardPage(page, request, 'Reopen me after sign-in');
  // The sign-in round trip: reconnect() stored the place, /auth/callback answered with a redirect to /.
  await page.evaluate((p) => sessionStorage.setItem('superpipeline.returnTo', p), path);
  await page.goto('/');
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe(path);
  await page.waitForTimeout(1_000); // the front door's Inbox redirect must not arrive late and win
  expect(new URL(page.url()).pathname).toBe(path);
  await expect(page.getByText('Reopen me after sign-in').first()).toBeVisible();
});
