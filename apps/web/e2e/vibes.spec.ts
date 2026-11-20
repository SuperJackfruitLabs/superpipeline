import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { BOUND_PIPELINE, openBoard, REVIEW_PIPELINE, seedBoard, seedBoundGateCard, seedGatedCard, seedQuestionCard, setAppearance } from './support/seed';

// Every vibe × theme runs against the card's one composition (CardView): the same words and
// controls in every vibe. The card says what waits on you; Review and Answer open their panel in place.
const ALL_VIBES = ['daylight', 'paper', 'studio', 'quiet'] as const;

test.use({ timezoneId: 'Europe/London' });
const SUBJECT = [/What you are signing/, /example_product/, /Approving exactly this version, revision 1 · sealed [0-9a-f]{4}·[0-9a-f]{4}/, /sha256:[0-9a-f]{64}/];
/** The card shows no sub-task or reference composer until the person asks for one: its quiet action opens it in place. */
async function composers(dialog: Locator): Promise<void> {
  for (const [action, field] of [['Add a sub-task', 'New sub-task title'], ['Attach a link', 'Attach a link or Superlibrary item']] as const) {
    await dialog.getByRole('button', { name: action, exact: true }).click();
    const input = dialog.getByRole('textbox', { name: field });
    await expect(input).toBeVisible();
    await dialog.locator('form[data-composer]').getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog.getByRole('button', { name: action, exact: true })).toBeVisible();
  }
}
const NOON = new Date('2026-10-11T12:00:00+01:00');

async function revealAll(scope: Locator): Promise<void> {
  // `.all()` hands back nth() locators over a live `:not([open])` query: each opened one shifts the
  // rest, so re-query until no closed visible disclosure is left (Daylight's drawer has five).
  for (let i = 0; i < 50; i++) {
    const closed = scope.locator('details:not([open]) > summary');
    let clicked = false;
    for (const s of await closed.all()) if (await s.isVisible()) { await s.click(); clicked = true; break; }
    if (!clicked) break;
  }
  for (const b of await scope.locator('button[aria-expanded="false"][aria-controls]').all()) if (await b.isVisible()) await b.click();
}

/** Found by `find` now, or after opening every disclosure, or on some tab. */
async function reach(scope: Locator, find: (s: Locator) => Locator): Promise<boolean> {
  const seen = async () => find(scope).first().isVisible().catch(() => false);
  if (await seen()) return true;
  await revealAll(scope);
  if (await seen()) return true;
  const tabs = scope.getByRole('tab');
  for (let i = 0; i < (await tabs.count()); i++) {
    await tabs.nth(i).click();
    await revealAll(scope);
    if (await seen()) return true;
  }
  return false;
}

const reachable = (scope: Locator, role: Parameters<Locator['getByRole']>[0], name: string | RegExp) =>
  reach(scope, (s) => s.getByRole(role, { name, exact: typeof name === 'string' }));
const reachableText = (scope: Locator, text: string | RegExp) => reach(scope, (s) => s.getByText(text));

/** Axe reads the colours on screen, so let every finite transition (the drawer sliding in) finish first. */
async function settled(page: Page): Promise<void> {
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))));
}

async function noA11yViolations(page: Page, include?: string): Promise<void> {
  await settled(page);
  let b = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).exclude('iframe');
  if (include) b = b.include(include);
  const r = await b.analyze();
  expect(r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
}

async function noSideScroll(page: Page): Promise<void> {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

const SIZES = [{ name: 'desktop', width: 1280, height: 820 }, { name: 'phone', width: 390, height: 844 }] as const;

for (const vibe of ALL_VIBES) {
  for (const theme of ['light', 'dark'] as const) {
    for (const size of SIZES) {
      test(`${vibe} ${theme} ${size.name}: board, gate and question keep every action`, async ({ page, request }, info) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.clock.setFixedTime(NOON);
        await setAppearance(page, `${vibe}.${theme}.strong.0`);
        const boardId = await seedBoard(request, `Vibes ${vibe} ${theme} ${size.name}`, REVIEW_PIPELINE);
        await seedGatedCard(request, boardId, 'Launch post');
        await seedQuestionCard(request, boardId, 'Add the OAuth flow');
        await openBoard(page, boardId);
        await expect(page.locator('html')).toHaveAttribute('data-vibe', vibe);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

        // Board
        const body = page.locator('body');
        // The board page's own view switch and the shell's Plan switch: link tabs in every vibe (one shell, one top row).
        const viewRole = 'link';
        await expect(page.getByRole('button', { name: /^Launch post, in / }).or(page.getByRole('link', { name: /^Launch post, in / })).first()).toBeVisible();
        for (const [role, name] of [
          // The tiles say in words that a card waits on you; each card's title opens it (where Review and Answer are).
          [viewRole, 'Board'], [viewRole, /^List/], [viewRole, /^Projects/], ['button', /^Launch post, in /],
          ['button', /^Add the OAuth flow, in /], ['button', 'Move Launch post to another stage'], ['button', /filter/i],
        ] as const) {
          expect(await reachable(body, role, name), `board: ${String(name)}`).toBe(true);
        }
        await noSideScroll(page);
        // On a phone the tab bar is fixed over the screen's foot, so whichever row the first screen ends on sits
        // under it and axe reports it obscured. At the page's end the bar covers the frame's own bottom padding.
        if (size.name === 'phone') await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await noA11yViolations(page, 'main');
        await info.attach(`${vibe}-${theme}-${size.name}-board.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });

        // Gate: the card's title opens it.
        await page.getByRole('button', { name: /^Launch post, in / }).first().click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        // The drawer paints before its detail (and so the gate) has loaded: wait for the sentence, then open the decision.
        await expect(dialog.getByText(/^Waiting for your review/)).toBeVisible();
        await dialog.getByRole('button', { name: 'Review', exact: true }).click();
        for (const [role, name] of [
          ['radio', /^Approve/], ['radio', /^Request changes/], ['radio', /^Reject/], ['textbox', 'Note to the agent (optional)'], ['button', 'Approve'],
          ['button', 'Edit card'], ['button', 'Archive card'], ['button', 'Delete card'], ['button', 'Comment'],
          ['button', 'Add link'], ['button', 'Add a sub-task'], ['button', 'Attach a link'], ['button', /Close/],
        ] as const) {
          expect(await reachable(dialog, role, name), `gate: ${String(name)}`).toBe(true);
        }
        await noSideScroll(page);
        await noA11yViolations(page, '[role="dialog"]');
        await info.attach(`${vibe}-${theme}-${size.name}-gate.png`, { body: await page.screenshot(), contentType: 'image/png' });
        await composers(dialog);
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();

        // Question
        await page.getByRole('button', { name: /^Add the OAuth flow, in / }).first().click();
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: 'Answer', exact: true }).click();
        await expect(dialog.getByText('May I run the test suite?').first()).toBeVisible();
        for (const [role, name] of [['radio', /^Run the tests/], ['radio', /^Skip them/], ['textbox', 'Or answer in your own words'], ['button', 'Answer']] as const) {
          expect(await reachable(dialog, role, name), `question: ${String(name)}`).toBe(true);
        }
        await noA11yViolations(page, '[role="dialog"]');
        await info.attach(`${vibe}-${theme}-${size.name}-question.png`, { body: await page.screenshot(), contentType: 'image/png' });
      });
    }
  }
}

// D17: a gate bound to an approval subject shows what is being approved, whole, in every vibe.
for (const vibe of ALL_VIBES) {
  for (const size of SIZES) {
    test(`${vibe} ${size.name}: a bound gate shows its approval subject`, async ({ page, request }, info) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.clock.setFixedTime(NOON);
      await setAppearance(page, `${vibe}.light.strong.0`);
      const boardId = await seedBoard(request, `Bound ${vibe} ${size.name}`, BOUND_PIPELINE);
      await seedBoundGateCard(request, boardId, 'Launch post');
      await openBoard(page, boardId);
      await page.getByRole('button', { name: /^Launch post, in / }).first().click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText(/^Waiting for your review/)).toBeVisible();
      await dialog.getByRole('button', { name: 'Review', exact: true }).click();
      for (const text of SUBJECT) {
        expect(await reachableText(dialog, text), `subject: ${String(text)}`).toBe(true);
      }
      await noSideScroll(page);
      await noA11yViolations(page, '[role="dialog"]');
      await info.attach(`${vibe}-${size.name}-bound-gate.png`, { body: await page.screenshot(), contentType: 'image/png' });
    });
  }
}

// Ruling 12: on a finger every interactive thing is a 44px target (or sits in a 44px label/hit area).
/** Phone targets under 44px that vibekit draws: none since 0.0.4 (Quiet's Filter is 44px wide, Paper's 44px high). */
const VIBEKIT_SMALL: Partial<Record<string, string[]>> = {};

test.describe('coarse pointer', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  /** Visible interactive elements in `scope` whose hit area is under 44x44. */
  async function smallTargets(scope: Locator): Promise<string[]> {
    return scope.evaluate((root) => {
      const sel = 'button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=radio], [role=checkbox], [role=menuitem], [tabindex]:not([tabindex="-1"])';
      const out: string[] = [];
      for (const el of root.querySelectorAll<HTMLElement>(sel)) {
        const st = getComputedStyle(el);
        if (st.visibility === 'hidden' || st.display === 'none') continue;
        // Clipped out of sight until focused (a skip link): not a target anyone can see to tap.
        if (st.clipPath === 'inset(50%)') continue;
        let r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        // vibekit's .vk-hit draws a 44px target round a smaller control (component spec §2.1).
        if (el.classList.contains('vk-hit')) r = new DOMRect(r.x, r.y, Math.max(r.width, 44), Math.max(r.height, 44));
        // Radios/checkboxes are overlaid by, or wrapped in, a label: that is the hit area.
        const label = (el as HTMLInputElement).labels?.[0] ?? el.closest('label');
        if (label) { const lr = label.getBoundingClientRect(); if (lr.width * lr.height > r.width * r.height) r = lr; }
        // An inline link inside running text is exempt (WCAG 2.5.8 inline exception).
        if (el.tagName === 'A' && st.display === 'inline' && el.closest('p, li, dd')) continue;
        if (r.width < 43.5 || r.height < 43.5) {
          out.push(`${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
      }
      return out;
    });
  }

  for (const vibe of ALL_VIBES) {
    test(`${vibe}: every target on the board and in an open card is 44px`, async ({ page, request }) => {
      await page.clock.setFixedTime(NOON);
      await setAppearance(page, `${vibe}.light.strong.0`);
      const boardId = await seedBoard(request, `Targets ${vibe}`, REVIEW_PIPELINE);
      await seedGatedCard(request, boardId, 'Launch post');
      await seedQuestionCard(request, boardId, 'Add the OAuth flow');
      await openBoard(page, boardId);
      await expect(page.getByRole('button', { name: /^Launch post, in / }).or(page.getByRole('link', { name: /^Launch post, in / })).first()).toBeVisible();
      // A ratchet: each known vibekit gap must still be there, and nothing else may be small.
      const known = VIBEKIT_SMALL[vibe] ?? [];
      const small = await smallTargets(page.locator('body'));
      for (const k of known) expect(small.some((t) => t.startsWith(k)), `known vibekit gap ${k} is fixed: delete it`).toBe(true);
      expect(small.filter((t) => !known.some((k) => t.startsWith(k))), 'board').toEqual([]);

      await page.getByRole('button', { name: /^Launch post, in / }).first().tap();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Review', exact: true }).tap();
      await revealAll(dialog);
      expect(await smallTargets(dialog), 'card drawer').toEqual([]);

      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await page.getByRole('button', { name: /^Add the OAuth flow, in / }).first().tap();
      await dialog.getByRole('button', { name: 'Answer', exact: true }).tap();
      await expect(dialog.getByText('May I run the test suite?').first()).toBeVisible();
      await revealAll(dialog);
      expect(await smallTargets(dialog), 'question drawer').toEqual([]);
    });
  }
});
