// apps/web/e2e/composition.spec.ts — the composition guards that need a browser's layout (design spec §9; the
// per-page DOM guards are src/lib/composition/pages.svelte.test.ts): the height budget, the track that never
// truncates, motion that honours reduce, and the keys line (rule 13). On the realistic workspace
// (e2e/support/realistic-inbox.ts) where the guard is about real volume. Each guard was proven by breaking a page
// once (see the commit that added this file).
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { REALISTIC_BOARD_IDS, REALISTIC_TENANT, REALISTIC_USER } from '../src/lib/fixtures/realistic';
import { seedRealistic, useRealistic } from './support/realistic-inbox';
import { API, TENANT, seedBoard, setAppearance } from './support/seed';
import { waitForAppReady, waitForLayout } from './support/readiness';

const VIBES = ['daylight', 'paper', 'studio', 'quiet'] as const;
type Vibe = (typeof VIBES)[number];
const appearance = (vibe: Vibe) => `${vibe}.light.${vibe === 'quiet' ? 'off' : 'strong'}.0`;
const BOARDS = [REALISTIC_BOARD_IDS.planning, REALISTIC_BOARD_IDS.devex, REALISTIC_BOARD_IDS.marketing] as const;
const AS_OWNER = { 'X-Tenant-Id': REALISTIC_TENANT, 'X-User-Id': REALISTIC_USER, 'Content-Type': 'application/json' };

/** The page's height: the document's, or the scroller that holds `main` where the shell scrolls its content. */
const pageHeight = (page: Page) => page.evaluate(() => {
  const main = document.querySelector('main');
  let h = document.documentElement.scrollHeight;
  for (let p = main?.parentElement ?? null; p; p = p.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(p).overflowY)) h = Math.max(h, p.scrollHeight);
  }
  return Math.round(h);
});

async function openInbox(page: Page, vibe: Vibe): Promise<void> {
  await useRealistic(page);
  await setAppearance(page, appearance(vibe));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/inbox');
  await waitForAppReady(page);
  await expect(page.locator('.ib-group')).toHaveCount(5, { timeout: 15_000 });
  await waitForLayout(page);
}

async function openBoard(page: Page, vibe: Vibe, boardId: string, width: number): Promise<void> {
  await useRealistic(page, boardId);
  await setAppearance(page, appearance(vibe));
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`/b/${boardId}`);
  await waitForAppReady(page);
  await expect(page.locator('.bv-lanes')).toBeVisible({ timeout: 15_000 });
  await waitForLayout(page);
}

/** Animations running on the page, by what they animate. */
const running = (page: Page) => page.evaluate(() => document.getAnimations()
  .filter((a) => a.playState === 'running' || a.pending)
  .map((a) => {
    const t = a.effect instanceof KeyframeEffect ? a.effect.target : null;
    const name = a instanceof CSSAnimation ? a.animationName : a.constructor.name;
    return `${name} on ${t ? `${t.tagName.toLowerCase()}.${t.classList[0] ?? ''}` : '?'}`;
  }));

/** A live event: the Developer Experience board's first reported card moves to a stage an agent works, so it leaves the Inbox's last group. */
async function liveChange(page: Page, request: APIRequestContext): Promise<string[]> {
  const card = 'card_rl_devex_001';
  const row = page.locator(`[data-row] a[href*="${card}"]`);
  const before = await page.locator('.ib-group').last().locator('.ib-count').textContent();
  const res = await request.post(`${API}/v1/boards/${REALISTIC_BOARD_IDS.devex}/cards/${card}/move`, { headers: AS_OWNER, data: { toStageKey: 'reproduce' } });
  expect(res.ok(), await res.text()).toBe(true);
  // Sample while the page applies the diff, and for a moment after.
  const seen = new Set<string>();
  await expect.poll(async () => {
    for (const a of await running(page)) seen.add(a);
    const now = await page.locator('.ib-group').last().locator('.ib-count').textContent();
    return now !== before || (await row.count()) === 0;
  }, { timeout: 15_000, intervals: [50] }).toBe(true);
  for (let i = 0; i < 6; i++) { for (const a of await running(page)) seen.add(a); await page.waitForTimeout(50); }
  return [...seen];
}

// ── Height budget (§9): the Inbox under three screens and a board under about two, at 1440×900 ────────────────────

/** The Inbox: three screens. */
const INBOX_BUDGET = 2700;
/**
 * A board, per vibe (controller ruling, 2026-11-19). Rule 7 is met (every lane pages behind "Show N more"), and
 * 1800 px (two screens) was the plan's estimate, not the rule: Quiet is one column by design and Paper sets larger
 * type, so on the realistic seed they need more room for the same five-tile lanes.
 */
const BOARD_BUDGET: Record<Vibe, number> = { daylight: 1800, studio: 1800, paper: 2100, quiet: 2400 };

test.describe('on the realistic workspace', () => {
  test.beforeEach(async ({ request }) => { await seedRealistic(request); });

  for (const vibe of VIBES) {
    test(`inbox: height budget, under ${INBOX_BUDGET} px at 1440×900 (${vibe})`, async ({ page }) => {
      await openInbox(page, vibe);
      expect(await pageHeight(page), `${vibe} Inbox`).toBeLessThan(INBOX_BUDGET);
    });
    test(`board: height budget, under ${BOARD_BUDGET[vibe]} px at 1440×900 (${vibe})`, async ({ page }) => {
      for (const id of BOARDS) {
        await openBoard(page, vibe, id, 1440);
        // Soft, so one run reports every board's height.
        expect.soft(await pageHeight(page), `${vibe} ${id}`).toBeLessThan(BOARD_BUDGET[vibe]);
      }
    });
  }

  // ── Track never truncates (§9, rule 6): at 1008 px every stage is named in full ─────────────────────────────────────

  for (const vibe of VIBES) {
    test(`board: the track never truncates a stage name at 1008 px (${vibe})`, async ({ page }) => {
      for (const id of BOARDS) {
        await openBoard(page, vibe, id, 1008);
        const names = page.locator('.vk-stages__name');
        expect(await names.count(), `${vibe} ${id}: the track names its stages`).toBeGreaterThan(3);
        const clipped = await names.evaluateAll((els) => els
          // Clipped either way: wider than its box (an ellipsis), or taller (vibekit's board form clamps to two lines).
          .filter((el) => el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight + 1 || el.getBoundingClientRect().width === 0)
          .map((el) => `${el.textContent?.trim()} ${el.scrollWidth}×${el.scrollHeight} in ${el.clientWidth}×${el.clientHeight}`));
        expect(clipped, `${vibe} ${id}`).toEqual([]);
      }
    });
  }

  // ── Motion honours reduce (§9, rule 9): a live change animates, and under data-motion="reduce" nothing does ──────

  test('inbox: motion honours reduce, a live change animates with motion on and nothing animates under data-motion="reduce"', async ({ page, request }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await openInbox(page, 'daylight');
    await page.waitForTimeout(1500); // the entrance settles
    const on = await liveChange(page, request);
    expect(on.length, 'motion on: the change animates').toBeGreaterThan(0);

    await seedRealistic(request);
    await openInbox(page, 'daylight');
    await page.evaluate(() => document.documentElement.setAttribute('data-motion', 'reduce'));
    expect(await running(page), 'reduce: nothing runs before the change').toEqual([]);
    const reduced = await liveChange(page, request);
    expect(reduced, 'reduce: nothing animates').toEqual([]);
  });
});

// ── The keys line (rule 13): every page's footer ends with its keys, the same in every vibe; none on a phone ───────

const STAGES = [
  { key: 'todo', name: 'To do', order: 0, ownerKind: 'human' },
  { key: 'done', name: 'Done', order: 1, ownerKind: 'human' },
];
const KEY_PAGES = (id: string) => [`/b/${id}`, `/b/${id}?view=list`, '/inbox', '/crew/agents', '/settings', `/b/${id}/operate/telemetry`, '/plan/projects'];

for (const vibe of VIBES) {
  test(`every page: the footer ends with its keys (${vibe})`, async ({ page, request }) => {
    const id = await seedBoard(request, 'Keys line', STAGES);
    await request.post(`${API}/v1/boards/${id}/cards`, { headers: TENANT, data: { title: 'A card', ownerUserId: 'usr_a' } });
    await setAppearance(page, appearance(vibe));
    await page.setViewportSize({ width: 1280, height: 800 });
    for (const url of KEY_PAGES(id)) {
      await page.goto(url);
      await waitForAppReady(page);
      const keys = page.getByLabel('Keyboard', { exact: true });
      await expect(keys, url).toBeVisible();
      expect((await keys.textContent())?.trim(), url).toMatch(/ (search|filter|rows)\b/);
    }
  });
}

test('every page: no keys line on a phone', async ({ page, request }) => {
  const id = await seedBoard(request, 'Keys phone', STAGES);
  await request.post(`${API}/v1/boards/${id}/cards`, { headers: TENANT, data: { title: 'A card', ownerUserId: 'usr_a' } });
  await setAppearance(page, appearance('daylight'));
  await page.setViewportSize({ width: 390, height: 800 });
  for (const url of KEY_PAGES(id)) {
    await page.goto(url);
    await waitForAppReady(page);
    await expect(page.getByLabel('Keyboard', { exact: true }), url).toBeHidden();
  }
});

test('board: an empty board ends with its keys too', async ({ page, request }) => {
  const id = await seedBoard(request, 'Keys empty', STAGES);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/b/${id}`);
  await waitForAppReady(page);
  await expect(page.getByLabel('Keyboard', { exact: true })).toContainText('N new card');
});

test("card: the footer names its keys on the drawer and the page, Esc closes both, a closed card opens again by its link, and a phone hides the line", async ({ page, request }) => {
  const id = await seedBoard(request, 'Keys card', STAGES);
  const created = await request.post(`${API}/v1/boards/${id}/cards`, { headers: TENANT, data: { title: 'A card with keys', ownerUserId: 'usr_a' } });
  const card = String((await created.json()).card.id);
  const second = await request.post(`${API}/v1/boards/${id}/cards`, { headers: TENANT, data: { title: 'Another card with keys', ownerUserId: 'usr_a' } });
  const other = String((await second.json()).card.id);
  await setAppearance(page, appearance('daylight'));
  await page.setViewportSize({ width: 1280, height: 800 });

  // The drawer: its own line, not the board's behind it. Reached by its address, Esc closes it too.
  await page.goto(`/b/${id}/c/${card}`);
  const drawer = page.getByRole('dialog');
  await expect(drawer.getByLabel('Keyboard', { exact: true })).toHaveText('Esc close · ⌘K search');
  await drawer.getByRole('button', { name: 'Edit card' }).focus();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  // Closed, it opens again by its link: ⌘K's Open card on the same card.
  await page.keyboard.press('ControlOrMeta+k');
  const find = page.getByPlaceholder(/Jump to a card/i);
  await find.fill('A card with keys');
  await page.getByRole('dialog').getByRole('option', { name: /^A card with keys/ }).click();
  await expect(drawer.getByRole('heading', { name: 'A card with keys' })).toBeVisible();
  // From one card's address to another's, in the app (⌘K again), opens the other.
  await page.keyboard.press('ControlOrMeta+k');
  await find.fill('Another card with keys');
  await page.getByRole('dialog').getByRole('option', { name: /^Another card with keys/ }).click();
  await expect(drawer.getByRole('heading', { name: 'Another card with keys' })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/b/${id}/c/${other}$`));

  // The page: the same line; Esc closes it back to the board from the page's first focus, as Close does.
  await page.goto(`/b/${id}/c/${card}/page`);
  const main = page.getByRole('main');
  await expect(main.getByLabel('Keyboard', { exact: true })).toHaveText('Esc close · ⌘K search');
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(new RegExp(`/b/${id}$`));

  // A phone has no hardware keyboard: the card's line is hidden on the sheet, from the board or the page.
  await page.setViewportSize({ width: 390, height: 800 });
  for (const url of [`/b/${id}/c/${card}`, `/b/${id}/c/${card}/page`]) {
    await page.goto(url);
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'A card with keys' }), url).toBeVisible();
    await expect(page.getByRole('dialog').getByLabel('Keyboard', { exact: true }), url).toBeHidden();
  }
});

test('inbox: the footer names its keys, and they work (J / K pick a row, R resumes it, O opens it, F filters)', async ({ page, request }) => {
  // One board with two blocked cards (two Resume rows), shown alone under Show.
  const at = Date.now();
  const id = await seedBoard(request, 'Keys inbox', [
    { key: 'build', name: 'Build', order: 0, ownerKind: 'capability', owner: 'build' },
    { key: 'review', name: 'Review', order: 1, ownerKind: 'human', gate: 'approval' },
  ]);
  const agent = { ...TENANT, 'X-Agent-Id': 'agt_keys' };
  for (const title of [`Keys walk A ${at}`, `Keys walk B ${at}`]) {
    await request.post(`${API}/v1/boards/${id}/cards`, { headers: TENANT, data: { title, ownerUserId: 'usr_a' } });
    const claim = await (await request.post(`${API}/v1/boards/${id}/claims`, { headers: agent, data: { capabilities: ['build'] } })).json();
    await request.post(`${API}/v1/boards/${id}/runs/${claim.runId}/block`, { headers: agent, data: { leaseEpoch: claim.leaseEpoch, reason: 'waiting on a key' } });
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/inbox');
  const keys = page.locator('.ib-foot').getByLabel('Keyboard', { exact: true });
  await expect(keys).toHaveText('J / K rows · O open · M move · R resume · F filter · ⌘K search · G I / P / C go to Inbox, Plan, Crew');
  await page.getByRole('radiogroup', { name: 'Show' }).locator(`[role="radio"][data-key="${id}"]`).click();
  const a = page.locator('.ib-needs .ib-row').filter({ hasText: `Keys walk A ${at}` });
  const b = page.locator('.ib-needs .ib-row').filter({ hasText: `Keys walk B ${at}` });
  await expect(b).toBeVisible();
  await page.locator('body').click({ position: { x: 1, y: 1 } });

  // J, J, K: the second row, then back to the first; the selected row says so.
  await page.keyboard.press('j');
  await expect(a).toHaveAttribute('aria-current', 'true');
  await page.keyboard.press('j');
  await expect(b).toHaveAttribute('aria-current', 'true');
  // Said as the List says it: focus is on the selected card's title.
  await expect(b.locator('.ib-row__t a')).toBeFocused();
  await expect(a).not.toHaveAttribute('aria-current', 'true');
  await page.keyboard.press('k');
  await expect(a).toHaveAttribute('aria-current', 'true');
  // R: this row offers Resume, so its note form opens under it.
  await page.keyboard.press('r');
  await expect(a.getByRole('button', { name: 'Send back to work' })).toBeVisible();
  await a.getByRole('button', { name: 'Cancel' }).click();
  // F: the filter row opens, its find field focused.
  const filter = page.getByRole('button', { name: /^Filter/ });
  await expect(filter).toHaveAttribute('aria-expanded', 'false');
  await page.locator('body').press('f');
  await expect(filter).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#ib-filter-row input').first()).toBeFocused();
  // O on the selected row opens its card (out of the find field first: a key typed there is the find's).
  await filter.click();
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await expect(a).toHaveAttribute('aria-current', 'true');
  await page.keyboard.press('o');
  await expect(page.getByRole('heading', { name: `Keys walk A ${at}` }).first()).toBeVisible();
  // Its two stopped cards would stay in every later run's Resume group on a long-lived dev database.
  await request.delete(`${API}/v1/boards/${id}`, { headers: TENANT });
});
