import { expect, test } from '@playwright/test';
import { API, TENANT, openBoard, seedBoard, setAppearance } from './support/seed';

// One page, one h1. The shell's masthead (or the phone header) is the page's h1, so a page drawn
// inside the shell titles its own content with h2: Settings and Telemetry (Task 13 review).
// The front door's onboarding draws no shell, and keeps its own h1 (Onboarding.svelte.test.ts).
const VIBES = ['daylight', 'paper', 'studio', 'quiet'] as const;
const SIZES = [{ name: 'desktop', width: 1280, height: 820 }, { name: 'phone', width: 390, height: 844 }] as const;

for (const vibe of VIBES) {
  for (const size of SIZES) {
    test(`${vibe} ${size.name}: the board, Settings and Telemetry have one h1, the shell's`, async ({ page, request }) => {
      const boardId = await seedBoard(request, `Headings ${vibe} ${size.name}`);
      await setAppearance(page, `${vibe}.light.strong.0`);
      await page.setViewportSize({ width: size.width, height: size.height });
      await openBoard(page, boardId);
      await page.waitForURL(`**/b/${boardId}`);
      // The board page: the one h1 is the board's name, never Quiet's hidden "Workspace" as well or instead.
      // One page, one main landmark: the shell's. A board draws inside it, never its own.
      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toContainText(`Headings ${vibe} ${size.name}`);
      await expect(page.locator('h1')).not.toContainText('Workspace');
      // Operate draws its own h1 (the masthead title is then a plain line): still exactly one.
      await page.goto(`/b/${boardId}/operate`);
      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(page.locator('h1'), 'operate: one h1').toHaveCount(1);
      // The List draws its own h1 in Paper, Studio and Quiet (the shell's title is then a plain line): still exactly one.
      await page.goto(`/b/${boardId}?view=list`);
      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(page.locator('h1'), 'list: one h1').toHaveCount(1);
      // Projects draws its own h1 in every vibe (the shell's title is then a plain line): still exactly one.
      await page.goto(`/b/${boardId}?view=projects`);
      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(page.locator('h1'), 'projects: one h1').toHaveCount(1);
      // Desktop: the page's own title. Phone: the phone header's (the page then uses h2).
      await expect(page.locator('h1')).toContainText(size.name === 'phone' ? `Headings ${vibe} ${size.name}` : 'Projects');
      // The workspace frame draws its own h1 in every vibe (h2 on phones, where the header's is the one h1).
      for (const tab of ['agents', 'needs-you', 'capabilities', 'labels', 'people', 'connections']) {
        await page.goto(`/workspace/${tab}`);
        await expect(page.getByRole('main'), `workspace ${tab}: one main`).toHaveCount(1);
        await expect(page.locator('h1'), `workspace ${tab}: one h1`).toHaveCount(1);
        // The masthead draws no "Workspace" title line of its own: the page owns the one heading.
        await expect(page.locator('.vk-masthead__h1', { hasText: 'Workspace' }), `workspace ${tab}: no masthead title line`).toHaveCount(0);
      }
      // Settings draws its own title: the h1 on desktop (the masthead's is then a plain line), h2 on phones.
      await page.goto(`/b/${boardId}/settings`);
      await expect(page.getByRole('main'), 'settings: one main').toHaveCount(1);
      await expect(page.locator('h1'), 'settings: one h1').toHaveCount(1);
      await expect(page.getByRole('heading', { level: size.name === 'phone' ? 2 : 1, name: `Headings ${vibe} ${size.name}` }).first()).toBeAttached();
      // Spend draws its own title the same way; the full board log keeps the shell's.
      await page.goto(`/b/${boardId}/operate/telemetry`);
      await expect(page.getByRole('main'), 'spend: one main').toHaveCount(1);
      await expect(page.locator('h1'), 'spend: one h1').toHaveCount(1);
      await expect(page.getByRole('heading', { level: size.name === 'phone' ? 2 : 1, name: 'Agent spend' })).toBeAttached();
      await page.goto(`/b/${boardId}/operate/log`);
      await expect(page.getByRole('main'), 'board log: one main').toHaveCount(1);
      await expect(page.locator('h1'), 'board log: one h1').toHaveCount(1);
    });
  }
}

// The card page has no shell: it draws its own main and its one h1 (the card's title, hidden on a
// phone, where the phone card titles itself with an h2).
for (const vibe of VIBES) {
  for (const size of SIZES) {
    test(`${vibe} ${size.name}: the card page has one main and one h1, the card's title`, async ({ page, request }) => {
      const boardId = await seedBoard(request, `Card page headings ${vibe} ${size.name}`);
      const card = (await (await request.post(`${API}/v1/boards/${boardId}/cards`, { headers: TENANT, data: { title: `Page heading ${vibe}`, ownerUserId: 'usr_a' } })).json()) as { card: { id: string } };
      await setAppearance(page, `${vibe}.light.strong.0`);
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto(`/b/${boardId}/c/${card.card.id}/page`);
      // Paper's page is a letter: its h1 is "Re: <title>" (the phone's hidden h1 is the plain title).
      const letter = vibe === 'paper' && size.width >= 640;
      await expect(page.locator('h1')).toHaveText(`${letter ? 'Re: ' : ''}Page heading ${vibe}`);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('main')).toHaveCount(1);
    });
  }
}

// A loading state is a page too: while the session is still being read (/auth/me held), the placeholder draws one
// main and one (visually hidden) h1. The service worker is blocked so page.route sees every request.
test.describe(() => {
test.use({ serviceWorkers: 'block' });
test('the loading state has one main and one h1', async ({ page, request }) => {
  const boardId = await seedBoard(request, 'Headings loading');
  let release!: () => void;
  const held = new Promise<void>((r) => { release = r; });
  await page.route('**/auth/me', async (route) => { await held; await route.continue(); });
  await page.goto(`/b/${boardId}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Loading Superpipeline' })).toBeAttached();
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.getByRole('main')).toHaveCount(1);
  release();
  await expect(page.locator('h1')).toContainText('Headings loading');
});
});
