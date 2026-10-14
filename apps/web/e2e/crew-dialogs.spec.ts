// apps/web/e2e/crew-dialogs.spec.ts — Crew's create dialogs (New agent, New person, New capability).
// A header button opens each over the list; the lists carry no inline create form. Each creates, focuses its first
// field, closes on Escape and Cancel with focus back on its button, and fits a phone in every vibe (44px Close,
// stacked fields, inside the viewport).
import { expect, test, type Locator, type Page } from '@playwright/test';
import { API, TENANT, seedBoard, setAppearance } from './support/seed';

const VIBES = ['daylight', 'paper', 'studio', 'quiet'] as const;
const DIALOGS = [
  { tab: 'agents', open: 'New agent', first: 'Name', primary: 'Create agent and issue token' },
  { tab: 'people', open: 'New person', first: 'Name (optional)', primary: 'Add person' },
  { tab: 'capabilities', open: 'New capability', first: 'Name', primary: 'Create capability' },
] as const;

async function within(page: Page, loc: Locator, what: string): Promise<void> {
  const vp = page.viewportSize()!;
  const b = (await loc.boundingBox())!;
  expect(b, `${what} has a box`).not.toBeNull();
  expect.soft(b.x, `${what} left edge`).toBeGreaterThanOrEqual(-0.5);
  expect.soft(b.y, `${what} top edge`).toBeGreaterThanOrEqual(-0.5);
  expect.soft(b.x + b.width, `${what} right edge`).toBeLessThanOrEqual(vp.width + 0.5);
  expect.soft(b.y + b.height, `${what} bottom edge`).toBeLessThanOrEqual(vp.height + 0.5);
}

async function openFrom(page: Page, tab: string, name: string): Promise<{ button: Locator; dialog: Locator }> {
  await page.goto(`/crew/${tab}`);
  const button = page.getByRole('button', { name, exact: true }).first();
  await expect(button).toBeVisible({ timeout: 60_000 });
  // Nothing may sit over the header's button (a note's widened link target once covered it in Studio).
  const covered = await button.evaluate((el) => { const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return hit && !el.contains(hit) ? hit.outerHTML.slice(0, 120) : null; });
  expect(covered, `${name} is not covered`).toBeNull();
  await button.click();
  const dialog = page.getByRole('dialog', { name });
  await expect(dialog).toBeVisible();
  return { button, dialog };
}

// The near-name hint and the agent's chip both lean on `research`; it may already exist (a 409 is fine).
test.beforeAll(async ({ request }) => {
  // A stage asking for a capability no agent holds puts a note (with a link) on Capabilities in every vibe.
  await seedBoard(request, `Crew note ${Date.now().toString(36)}`, [{ key: 'w', name: 'Work', order: 0, ownerKind: 'capability', owner: `unstaffed-${Date.now().toString(36)}` }]);
  await request.post(`${API}/v1/capabilities`, { headers: TENANT, data: { key: 'research' } });
});

test.describe('create from the dialog', () => {
  test.beforeEach(async ({ page }) => setAppearance(page, 'daylight.light.strong.0'));

  test('New agent creates the agent and shows its token once, above the list', async ({ page }) => {
    const name = `e2e-dlg-${Date.now().toString(36)}`;
    const { dialog } = await openFrom(page, 'agents', 'New agent');
    await dialog.getByLabel('Name', { exact: true }).fill(name);
    await dialog.getByLabel('Cards at once').fill('2');
    await dialog.getByLabel('New capability').fill('research');
    await dialog.getByLabel('New capability').press('Enter');
    await expect(dialog, 'Enter in the capability box adds a chip, it does not submit').toBeVisible();
    await dialog.getByRole('button', { name: 'Create agent and issue token' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByLabel(`New token for ${name}`)).toHaveText(/^spa_/);
    await expect(page.locator('li.arow, tr').filter({ hasText: name }).first()).toBeVisible();
  });

  test('New person adds someone with a name and a role', async ({ page }) => {
    const tag = Date.now().toString(36);
    const { dialog } = await openFrom(page, 'people', 'New person');
    await dialog.getByLabel('Name (optional)').fill(`Dev ${tag}`);
    await dialog.getByLabel('Email').fill(`dev-${tag}@vibes-fixture.invalid`);
    await dialog.getByRole('radio', { name: /Viewer/ }).check();
    await dialog.getByRole('button', { name: 'Add person' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(`Dev ${tag}`)).toBeVisible();
  });

  test('New capability hints at a near name, then creates it with its description', async ({ page }) => {
    const key = `e2e-cap-${Date.now().toString(36)}`;
    const { dialog } = await openFrom(page, 'capabilities', 'New capability');
    await dialog.getByLabel('Name', { exact: true }).fill('researc');
    await expect(dialog.getByText(/^Similar to .*research/)).toBeVisible();
    await dialog.getByLabel('Name', { exact: true }).fill(key);
    await dialog.getByLabel('Description (optional)').fill('Made by the dialog test.');
    await dialog.getByRole('button', { name: 'Create capability' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByLabel(`Description of ${key}`)).toHaveValue('Made by the dialog test.');
  });
});

test.describe('focus', () => {
  for (const d of DIALOGS) {
    test(`${d.open}: first field focused; Escape and Cancel give focus back to the button`, async ({ page }) => {
      await setAppearance(page, 'daylight.light.strong.0');
      const { button, dialog } = await openFrom(page, d.tab, d.open);
      await expect(dialog.getByLabel(d.first, { exact: true })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(button).toBeFocused();
      await button.click();
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(dialog).toBeHidden();
      await expect(button).toBeFocused();
    });
  }
});

test.describe('phone fit', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  for (const vibe of VIBES) {
    for (const d of DIALOGS) {
      test(`${vibe}: ${d.open} fits a phone`, async ({ page }) => {
        await setAppearance(page, `${vibe}.light.strong.0`);
        const { dialog } = await openFrom(page, d.tab, d.open);
        expect.soft(await dialog.getAttribute('aria-modal'), 'aria-modal').toBe('true');
        await within(page, dialog, 'the dialog');
        const close = dialog.getByRole('button', { name: /^Close/ }).first();
        await expect(close).toBeVisible();
        await within(page, close, 'Close');
        const cb = (await close.boundingBox())!;
        expect.soft(cb.width, 'Close width').toBeGreaterThanOrEqual(44);
        expect.soft(cb.height, 'Close height').toBeGreaterThanOrEqual(44);
        const primary = dialog.getByRole('button', { name: d.primary });
        await within(page, primary, d.primary);
        const pb = (await primary.boundingBox())!;
        expect.soft(pb.height, `${d.primary} height`).toBeGreaterThanOrEqual(44);
        // Stacked: every field takes the body's width, none sits beside another.
        const inputs = dialog.locator('.vk-overlay__body input:not([type=radio]):not([type=checkbox]), .vk-overlay__body textarea');
        const xs = new Set<number>();
        for (const box of await inputs.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().x))) xs.add(Math.round(box));
        expect.soft(xs.size, 'fields stack in one column').toBeLessThanOrEqual(1);
        const overflow = await dialog.evaluate((el) => el.scrollWidth - el.clientWidth);
        expect.soft(overflow, 'no sideways scroll').toBeLessThanOrEqual(1);
      });
    }
  }
});
