import { test, expect, type Page } from '@playwright/test';
import { PORTS } from '../scripts/ports';
import { BASE_WORLD, IDS } from './pixel/fixture/world';
import { FIXTURE_TENANT, FIXTURE_USER } from './pixel/fixture/seed';
import type { Row } from './pixel/fixture/types';

/**
 * The rich card, the way a person meets it: the fixture world's 4605 (two attempts with twenty tool
 * calls, a long structured brief, a blocked notice) plus what live cards carried when the live bugs were
 * found: tool calls with long unbroken strings and a correspondence thread. Every vibe, the drawer and the
 * page on a desktop and the card on a phone. The exhaustive pieces live elsewhere (card-overflow.spec.ts
 * for hostile text in every box, attempts-every-vibe.svelte.test.ts for every attempt's controls); this is
 * the whole flow on real-shaped data. Needs the API's FIXTURE_IMPORT (`api dev:pixel`, playwright.config.ts).
 */
const API = PORTS.apiUrl;
const DX = `/b/${IDS.DX}`;
const CARD = `${DX}/c/${IDS.C4605}`;
const ONE = 'run_fx_4605_1';
const TWO = 'run_fx_4605_2';
const PATTERN = 'search_files:gates/.*/delivery|/delivery|updateApprovalDelivery\\('.repeat(3);
const PATH = 'apps/hub/src/services/matrix-as/inbound/control-pair/acp-transport/matrix-outbound/delivery-gates.ts';
const URL_ = 'https://github.com/SuperJackfruitLabs/agentpod/blob/3f625b618d443aa8ef1dad7c04d3ddd14dcf6708/apps/hub/src/services/matrix-as/inbound.ts#L379-L786';

/** The fixture world, with 4605's second attempt calling tools on long unbroken strings and a thread of comments. */
function richWorld(): typeof BASE_WORLD {
  const world = structuredClone(BASE_WORLD);
  const dx = world.dos[IDS.DX]!;
  const tool = (ts: string, action: string, body: string, detail: object): Row =>
    ({ run_id: TWO, card_id: IDS.C4605, type: 'action', ephemeral: 0, body, action, detail_json: JSON.stringify({ kind: 'TOOL', ...detail }), ts });
  dx.activities.push(
    tool('2026-10-08T14:05:00Z', 'search_files', PATTERN, { parameter: { pattern: PATTERN, path: PATH }, result: { matches: [URL_] } }),
    tool('2026-10-08T14:06:00Z', `read_file:${PATH}`, URL_, { parameter: { path: PATH }, result: { lines: 408 } }),
  );
  const comment = (id: string, kind: 'user' | 'agent', author: string, name: string, body: string, at: string): Row =>
    ({ id, card_id: IDS.C4605, author_kind: kind, author_id: author, author_name: name, body, created_at: at, deleted_at: null });
  dx.comments.push(
    comment('cmt_fx_rich_1', 'user', FIXTURE_USER, 'Ira Mehta', `Before you push: is the failing hop really ${PATH}? The trace at ${URL_} stops earlier.`, '2026-10-08T14:20:00Z'),
    comment('cmt_fx_rich_2', 'agent', 'agt_fx_error_eric', 'error-eric', `It stops at the control pair. Searched ${PATTERN} and found only the outbound side.`, '2026-10-08T14:25:00Z'),
  );
  return world;
}

test.beforeAll(async ({ request }) => {
  const res = await request.post(`${API}/v1/dev/fixture`, { data: richWorld(), headers: { 'Content-Type': 'application/json' } });
  expect(res.ok(), `fixture import: ${res.status()} (the API must run with FIXTURE_IMPORT, \`api dev:pixel\`)`).toBe(true);
});

async function open(page: Page, vibe: string, width: number, route: string): Promise<void> {
  await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
  await page.context().addCookies([{ name: 'vk_appearance', value: `${vibe}.light.${vibe === 'quiet' ? 'off' : 'strong'}.0`, url: PORTS.webUrl }]);
  await page.addInitScript(([t, u, b]) => {
    localStorage.setItem('superpipeline.devTenant', t);
    localStorage.setItem('superpipeline.devUser', u);
    localStorage.setItem('superpipeline.boardId', b);
  }, [FIXTURE_TENANT, FIXTURE_USER, IDS.DX] as const);
  // Integrations the card reaches out to answer "nothing" (the page renders its own offline state).
  await page.route('https://app.superlibrary.dev/**', (r) => r.abort());
  await page.route('https://hub.agentpod.dev/**', (r) => r.abort());
  await page.goto(route);
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', undefined, { timeout: 20_000 });
}

// The board behind a drawer, or a hidden layout, may carry the same controls: take the one on screen.
const head = (page: Page, run: string) => page.locator(`button[aria-expanded][data-attempt-head="${run}"]`).filter({ visible: true }).first();
const toggle = (page: Page, run: string) => page.locator(`button[data-attempt-tools="${run}"]`).filter({ visible: true }).first();

/** Older attempt opens and closes; the newer attempt's tool calls show, and one call's Details opens. */
async function attempts(page: Page): Promise<void> {
  // Studio's drawer keeps the log behind a tab.
  const log = page.getByRole('tab', { name: /^Log/ });
  if (await log.count()) await log.first().click();
  // A layout may fold the log into a section: open it the way a person would, by its summary.
  for (let i = 0; i < 3 && !(await head(page, ONE).count()); i++) {
    const folded = page.locator('details:not([open])').filter({ has: page.locator(`[data-attempt-head="${ONE}"]`) }).filter({ visible: true }).last();
    if (!(await folded.count())) break;
    await folded.locator('> summary').click();
  }
  await expect(head(page, ONE)).toHaveAttribute('aria-expanded', 'false');
  await head(page, ONE).click();
  await expect(head(page, ONE)).toHaveAttribute('aria-expanded', 'true');
  await head(page, ONE).click();
  await expect(head(page, ONE)).toHaveAttribute('aria-expanded', 'false');

  if ((await head(page, TWO).getAttribute('aria-expanded')) === 'false') await head(page, TWO).click();
  await expect(head(page, TWO)).toHaveAttribute('aria-expanded', 'true');
  const t = toggle(page, TWO);
  const before = await t.getAttribute('aria-pressed');
  await t.click();
  await expect(t).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true');
  if (before === 'true') await t.click(); // leave the tool calls shown
  await expect(t).toHaveAttribute('aria-pressed', 'true');
  const body = page.locator(`#${await head(page, TWO).getAttribute('aria-controls')}`);
  const details = body.locator('details').filter({ hasText: 'search_files' }).first();
  await details.locator('summary').click();
  await expect(details).toHaveAttribute('open', '');
  await expect(details).toContainText('updateApprovalDelivery');
}

/** Nothing scrolls the page sideways, and visible text carries no raw id and no email. */
async function clean(page: Page): Promise<void> {
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(wide, 'the page does not scroll sideways').toBeLessThanOrEqual(0);
  const sideways = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"], main, article')]
    .filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible').map((e) => e.tagName + '.' + (e.className || '')));
  expect(sideways, 'no panel scrolls sideways').toEqual([]);
  const text = await page.evaluate(() => document.body.innerText);
  const around = (re: RegExp) => [...text.matchAll(re)].map((m) => text.slice(Math.max(0, m.index! - 40), m.index! + m[0].length + 10).replace(/\s+/g, ' '));
  // A "Card id" row shows the card's own id on purpose, with a Copy button (the approved Quiet mockups).
  expect(around(/\b(?:agt|usr|card)_[0-9a-z_]{6,}/g).filter((t) => !/Card id card_\w+Cop/.test(t)), 'no raw ids in visible text').toEqual([]);
  // An email, not an ssh remote (git@host:owner/repo is a repository address the brief quotes).
  expect(around(/\b(?!git@)[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b(?!:)/g), 'no email in visible text').toEqual([]);
}

for (const vibe of ['daylight', 'paper', 'studio', 'quiet'] as const) {
  test.describe(`${vibe}: the rich card`, () => {
    test('board, then the drawer: opens at the top with Close visible, attempts work, nothing leaks', async ({ page }) => {
      await open(page, vibe, 1440, DX);
      await clean(page); // the board and its greeting
      await page.goto(CARD);
      await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', undefined, { timeout: 20_000 });
      const drawer = page.getByRole('dialog').first();
      await expect(drawer).toBeVisible();
      await expect(drawer.getByRole('button', { name: /^Close/ }).filter({ visible: true }).first()).toBeInViewport();
      const top = await drawer.evaluate((d) => [d, ...d.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)).map((e) => e.scrollTop));
      expect(top.every((s) => s === 0), `the drawer opens scrolled to the top (${top})`).toBe(true);
      await attempts(page);
      await clean(page);
    });
    test('the card page on a desktop', async ({ page }) => {
      await open(page, vibe, 1280, `${CARD}/page`);
      await attempts(page);
      await clean(page);
    });
    test('the card on a phone', async ({ page }) => {
      await open(page, vibe, 390, CARD);
      await attempts(page);
      await clean(page);
    });
  });
}

// Last: it re-seeds the world. An account with no display name (as a live one was) must not be greeted by its email.
test('with no name on the account, no vibe greets by email', async ({ page, request }) => {
  const world = richWorld();
  world.user.name = '';
  expect((await request.post(`${API}/v1/dev/fixture`, { data: world, headers: { 'Content-Type': 'application/json' } })).ok()).toBe(true);
  for (const vibe of ['daylight', 'paper', 'studio', 'quiet'] as const) {
    for (const width of [1440, 390]) {
      await open(page, vibe, width, DX);
      await clean(page);
    }
  }
});
