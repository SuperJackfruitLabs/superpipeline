// apps/web/e2e/dialogs-fit.spec.ts — every dialog (and its popovers) fits the screen it opens on.
// New card (with the Labels picker open), New board, Filter, the board switcher and the palette, in
// each vibe at 1440x900, 1100x800 and 390x844: inside the viewport, header and Close on screen (44px
// on a phone), a named modal dialog, and the Project and Due values drawn in full.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { API, TENANT, openBoard, seedBoard, setAppearance } from './support/seed';

const VIBES = ['daylight', 'paper', 'studio', 'quiet'] as const;
const SIZES = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1100, height: 800 },
  { name: 'phone', width: 390, height: 844 },
] as const;

let boardId = '';
test.beforeAll(async ({ request }) => {
  const tag = Date.now().toString(36);
  boardId = await seedBoard(request, `Fit ${tag}`, [
    { key: 'backlog', name: 'Backlog', order: 0, ownerKind: 'human' },
    { key: 'build', name: 'Build', order: 1, ownerKind: 'capability', owner: 'code' },
    { key: 'done', name: 'Done', order: 2, ownerKind: 'human' },
  ]);
  // Enough labels that the picker is taller than the space under its trigger.
  for (const n of ['baseline', 'baseline-journey', 'clean-room', 'evidence-required', 'independent-verification', 'superpipeline', 'design', 'docs', 'infra', 'ops'])
    await request.post(`${API}/v1/labels`, { headers: TENANT, data: { name: `${n}-${tag}`, colour: 'marigold' } });
  const made = await request.post(`${API}/v1/boards/${boardId}/cards`, { headers: TENANT, data: { title: 'Fit card', ownerUserId: 'usr_a' } });
  expect(made.status(), 'the seeded card').toBe(201);
});

// A dev server that just started compiles the board route (and its dialogs) on first visit, which can take
// longer than one test's 30s. Warm it once, with its own budget, so no test pays for the compile.
test.beforeAll(async ({ browser }) => {
  test.setTimeout(600_000);
  // Each vibe loads its own stylesheet and fonts, so warm every one, the way the tests open it.
  for (const vibe of VIBES) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await setAppearance(page, `${vibe}.light.strong.0`);
    await openBoard(page, boardId);
    await page.goto(`/b/${boardId}`);
    await expect(page.getByText('Fit card').first()).toBeVisible({ timeout: 120_000 });
    await page.keyboard.press('n');
    await expect(page.getByRole('dialog', { name: 'What needs doing?' })).toBeVisible({ timeout: 60_000 });
    await context.close();
  }
});

async function within(page: Page, loc: Locator, what: string): Promise<void> {
  const vp = page.viewportSize()!;
  const b = (await loc.boundingBox())!;
  expect(b, `${what} has a box`).not.toBeNull();
  expect.soft(b.x, `${what} left edge`).toBeGreaterThanOrEqual(-0.5);
  expect.soft(b.y, `${what} top edge`).toBeGreaterThanOrEqual(-0.5);
  expect.soft(b.x + b.width, `${what} right edge`).toBeLessThanOrEqual(vp.width + 0.5);
  expect.soft(b.y + b.height, `${what} bottom edge`).toBeLessThanOrEqual(vp.height + 0.5);
}

async function modal(dialog: Locator): Promise<void> {
  await expect(dialog).toBeVisible();
  expect.soft(await dialog.getAttribute('aria-modal'), 'aria-modal').toBe('true');
}

async function closeOk(page: Page, dialog: Locator, name: RegExp, phone: boolean): Promise<void> {
  const close = dialog.getByRole('button', { name }).first();
  await expect(close, 'a visible Close').toBeVisible();
  await within(page, close, 'Close');
  if (phone) {
    const b = (await close.boundingBox())!;
    expect.soft(b.width, 'Close width').toBeGreaterThanOrEqual(44);
    expect.soft(b.height, 'Close height').toBeGreaterThanOrEqual(44);
  }
}

/** The room a control's value has (content box) against the width its text needs (plus `extra` for an icon). */
function fits(control: Locator, sample: string | null, extra: number) {
  return control.evaluate((el, [sample, extra]) => {
    const e = el as HTMLInputElement | HTMLSelectElement;
    const cs = getComputedStyle(e);
    const text = (sample as string | null) ?? (e as HTMLSelectElement).selectedOptions[0]!.text;
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const need = ctx.measureText(text).width + (extra as number);
    const room = e.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    return { text, need: Math.ceil(need), room: Math.floor(room) };
  }, [sample, extra] as const);
}

for (const vibe of VIBES) {
  for (const size of SIZES) {
    const phone = size.name === 'phone';
    test.describe(`${vibe} at ${size.width}x${size.height}`, () => {
      test.use({ viewport: { width: size.width, height: size.height }, hasTouch: phone });
      test.beforeEach(async ({ page }) => {
        await setAppearance(page, `${vibe}.light.strong.0`);
        await openBoard(page, boardId);
        await page.goto(`/b/${boardId}`);
        await expect(page.getByText('Fit card').first()).toBeVisible({ timeout: 15_000 });
      });

      test('New card: Project and Due drawn in full; the Labels picker keeps the header on screen', async ({ page }) => {
        await page.keyboard.press('n');
        const dialog = page.getByRole('dialog', { name: 'What needs doing?' });
        await modal(dialog);
        const project = dialog.getByRole('combobox', { name: 'Project (optional)' });
        const p = await fits(project, null, 0);
        expect.soft(p.room, `Project "${p.text}" needs ${p.need}px`).toBeGreaterThanOrEqual(p.need);
        const due = dialog.getByLabel('Due (optional)');
        await due.fill('2026-10-06');
        // The date as Chromium draws it in en-US ("10/06/2026"), plus the calendar button (~24px).
        const d = await fits(due, '00/00/0000', 24);
        expect.soft(d.room, `Due needs ${d.need}px`).toBeGreaterThanOrEqual(d.need);

        await dialog.getByRole('button', { name: 'Add label' }).scrollIntoViewIfNeeded();
        await dialog.getByRole('button', { name: 'Add label' }).click();
        const picker = page.getByRole('listbox', { name: 'Labels' });
        await expect(picker).toBeVisible();
        await within(page, picker, 'Labels picker');
        await within(page, dialog.getByRole('heading', { name: 'What needs doing?' }), 'dialog title');
        await closeOk(page, dialog, /^Close without saving$/, phone);
        await within(page, dialog, 'New card dialog');
      });

      test('New card: a person’s stage gets neutral brief wording', async ({ page }) => {
        await page.keyboard.press('n');
        const dialog = page.getByRole('dialog', { name: 'What needs doing?' });
        await dialog.getByRole('combobox', { name: 'Starts in stage' }).selectOption('backlog'); // a person's stage
        await expect(dialog.locator('label[for="nc-b"]')).not.toContainText(/agent/i);
        await expect(dialog.locator('.nc-lead')).not.toContainText(/agent/i);
        await dialog.getByRole('combobox', { name: 'Starts in stage' }).selectOption('build'); // an agent's stage keeps the agent wording
        await expect(dialog.locator('label[for="nc-b"]')).toContainText(/agent/i);
      });

      test('New board is a named modal dialog that fits', async ({ page }) => {
        await page.getByRole('button', { name: /Switch board|Change board/ }).first().click();
        await page.getByRole('dialog', { name: 'Find a board' }).getByRole('button', { name: 'New board' }).click();
        const dialog = page.getByRole('dialog', { name: 'Design a pipeline' });
        await modal(dialog);
        await within(page, dialog, 'New board dialog');
        await closeOk(page, dialog, /^Close/, phone);
      });

      test('Filter fits, and every checkbox reads with its own label', async ({ page }) => {
        await page.getByRole('button', { name: /^Filter/ }).first().click();
        const dialog = page.getByRole('dialog', { name: 'Filter cards' });
        await modal(dialog);
        await within(page, dialog, 'Filter dialog');
        await closeOk(page, dialog, /^Close/, phone);
        // Each box is nearer its own label than the previous label: a clear gap before every box.
        const gaps = await dialog.locator('input[type="checkbox"]').evaluateAll((boxes) => boxes.map((b) => {
          const box = b.getBoundingClientRect();
          const own = (b.closest('label') ?? b.parentElement!).getBoundingClientRect();
          const prev = (b.closest('label')?.previousElementSibling as HTMLElement | null)?.getBoundingClientRect();
          return { sameLine: !!prev && Math.abs(prev.top - own.top) < 4, gap: prev ? box.left - prev.right : 99, ownLeft: own.left };
        }));
        for (const g of gaps) if (g.sameLine) expect.soft(g.gap, 'gap before a checkbox on the same line').toBeGreaterThanOrEqual(12);
        const legends = await dialog.locator('legend, .vk-field__label').allTextContents();
        const min = await dialog.getByText(/min(imum)? priority/i).first().evaluate((e) => getComputedStyle(e).textTransform + '|' + getComputedStyle(e).fontVariantCaps);
        const st = await dialog.locator('legend').first().evaluate((e) => getComputedStyle(e).textTransform + '|' + getComputedStyle(e).fontVariantCaps);
        expect.soft(min, `"min priority" styled as the headings (${legends.join(', ')})`).toBe(st);
      });

      test('the board switcher hangs inside the screen, with a Close and Delete in reach', async ({ page }) => {
        await page.getByRole('button', { name: /Switch board|Change board/ }).first().click();
        const dialog = page.getByRole('dialog', { name: 'Find a board' });
        await modal(dialog);
        await within(page, dialog, 'board switcher');
        if (phone) {
          const b = (await dialog.boundingBox())!;
          expect.soft(b.x, 'left margin').toBeGreaterThanOrEqual(8);
          expect.soft(size.width - (b.x + b.width), 'right margin').toBeGreaterThanOrEqual(8);
          await closeOk(page, dialog, /^Close/, phone);
        }
        await within(page, dialog.getByRole('button', { name: 'Delete board…' }), 'Delete board…');
      });

      test('the palette fits, with a Close on a phone', async ({ page }) => {
        await page.keyboard.press('Control+k');
        const dialog = page.getByRole('dialog', { name: 'Search cards, boards, agents and actions' });
        await modal(dialog);
        await within(page, dialog, 'palette');
        if (phone) await closeOk(page, dialog, /^Close/, phone);
      });
    });
  }
}
