/**
 * Loading, empty and failed states (loading-audit 2026-10-14). The API is held back (or fails, or never
 * answers) and each surface must say nothing false while it waits: no "nothing/none/0" before the data
 * is in, a skeleton in aria-busy, no raw "Error:" text, a failed read with Try again that works, the
 * remembered board kept, "Connecting…" before "Live", and the phone page not jumping when data lands.
 *
 * Reduced motion is on (playwright.config.ts): nothing here waits on an animation.
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { waitForAppReady, waitForLayout } from './support/readiness';
import { seedWorld, FIXTURE_TENANT, FIXTURE_USER } from './pixel/fixture/seed';

const DX = '/b/brd_134a0ddb6d434478';
const CARD = 'card_05823a57e8224605';
const PROJECT = '/plan/projects/prj_34b48f840daa4309';
const VIBES = ['daylight', 'paper', 'studio', 'quiet'] as const;
const SIZES = [{ n: 'desk', width: 1440, height: 900 }, { n: 'phone', width: 390, height: 844 }] as const;
/** Words that would be false before the data is in. */
const EMPTY = 'Nothing needs you|Nothing is running|Nothing waits|Nothing is waiting|No [a-z ]{1,24} yet|Reconnecting|Nothing here|No boards|No projects|No agents|No agent is working|Nothing unread|None\\.|\\b0 (cards?|boards?|agents?|projects?|asks?|letters?)\\b|\\$0\\.00|Error:';
/** Text that is only on screen once the fixture's data is: the surface has loaded. */
const REAL = ['Diagnose Melissa', 'Fix the highest-severity', 'AgentPod: connector', 'Integrate editorial', 'Building in public', 'Melissa and Anna onboarding', 'Research Ray', 'research-ray', 'Coder Kai', 'coder-kai', 'Developer Experience', 'Client Quality', 'Ira Mehta'];

const SURFACES: Record<string, string> = {
  inbox: '/inbox', home: '/', board: DX, list: `${DX}?view=list`, drawer: `${DX}/c/${CARD}`, cardpage: `${DX}/c/${CARD}/page`,
  projects: '/plan/projects', project: PROJECT, agents: '/crew/agents', people: '/crew/people', capabilities: '/crew/capabilities',
  settings: '/settings', telemetry: `${DX}/operate/telemetry`, boardsettings: `${DX}/settings`,
};

type Mode = { delay: number } | 'error' | 'never';

function sampler([empty, real]: [string, string[]]): void {
  const w = window as unknown as { __a: { cls: number; empties: Record<string, number>; real: number | null; skeleton: number | null; busy: number | null; texts: string[] } };
  const a = (w.__a = { cls: 0, empties: {}, real: null, skeleton: null, busy: null, texts: [] });
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries() as unknown as { hadRecentInput: boolean; value: number }[]) if (!e.hadRecentInput) a.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  } catch { /* not Chromium */ }
  const re = new RegExp(empty, 'g');
  const look = () => {
    const b = document.body;
    if (!b) return;
    const t = Math.round(performance.now());
    const txt = b.innerText || '';
    for (const m of txt.match(re) ?? []) if (a.empties[m] === undefined) a.empties[m] = t;
    if (a.real === null && real.some((r) => txt.includes(r))) a.real = t;
    if (a.skeleton === null && document.querySelector('[data-skeleton], [data-board-skeleton], .vk-skeleton')) a.skeleton = t;
    if (a.busy === null && document.querySelector('[aria-busy="true"]')) a.busy = t;
  };
  new MutationObserver(look).observe(document, { subtree: true, childList: true, characterData: true });
  document.addEventListener('DOMContentLoaded', look);
}

async function open(ctx: BrowserContext, vibe: string, boardId = 'brd_134a0ddb6d434478'): Promise<Page> {
  await ctx.addCookies([{ name: 'vk_appearance', value: `${vibe}.light.${vibe === 'quiet' ? 'off' : 'strong'}.0`, url: test.info().project.use.baseURL! }]);
  await ctx.addInitScript(([t, u, b]) => {
    localStorage.setItem('superpipeline.devTenant', t);
    localStorage.setItem('superpipeline.devUser', u);
    if (!sessionStorage.getItem('lf.kept')) { localStorage.setItem('superpipeline.boardId', b); sessionStorage.setItem('lf.kept', '1'); }
  }, [FIXTURE_TENANT, FIXTURE_USER, boardId] as const);
  await ctx.addInitScript(sampler, [EMPTY, REAL] as [string, string[]]);
  return ctx.newPage();
}

/** Hold every /v1 read (and the live socket) back by `delay`, answer 500, or never answer. */
async function hold(page: Page, mode: Mode): Promise<void> {
  await page.route('**/v1/**', async (r) => {
    if (mode === 'never') return;
    if (mode === 'error') { await r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"internal error"}' }).catch(() => {}); return; }
    await new Promise((f) => setTimeout(f, mode.delay));
    await r.continue().catch(() => {});
  });
  await page.routeWebSocket(/\/v1\/boards\/.*\/ws/, async (ws) => {
    if (typeof mode === 'object') { await new Promise((f) => setTimeout(f, mode.delay)); ws.connectToServer(); } else ws.close({ code: 1011, reason: 'held' });
  });
}

const stats = (page: Page) => page.evaluate(() => (window as unknown as { __a: { cls: number; empties: Record<string, number>; real: number | null; skeleton: number | null; busy: number | null } }).__a);

test.beforeAll(async ({ request }) => { await seedWorld(request); });

// The walk, with the API 800 ms slow. Daylight walks every surface at 1440 and 390; Paper, Studio and Quiet walk the
// four surfaces whose pending frames differ most by vibe (Inbox, board, card page, Projects) at 390, where CLS bites.
// The other surfaces' per-vibe skeletons are covered by unit tests (SkeletonRows and the layouts' pending tests).
const OTHER_VIBE_SURFACES = ['inbox', 'board', 'cardpage', 'projects'];
const WALKS = VIBES.flatMap((vibe) => SIZES.filter((size) => vibe === 'daylight' || size.n === 'phone').map((size) => ({ vibe, size })));
for (const { vibe, size } of WALKS) {
  {
    test(`${vibe} ${size.n}: no surface says "nothing" or 0 before its data, and each waits in aria-busy`, async ({ browser }) => {
      test.setTimeout(180_000);
      const problems: string[] = [];
      for (const [name, url] of Object.entries(SURFACES).filter(([n]) => vibe === 'daylight' || OTHER_VIBE_SURFACES.includes(n))) {
        const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, reducedMotion: 'reduce', timezoneId: 'Asia/Kolkata', isMobile: size.width < 500, hasTouch: size.width < 500 });
        const page = await open(ctx, vibe);
        await hold(page, { delay: 800 });
        await page.goto(url, { waitUntil: 'commit' });
        await expect.poll(async () => (await stats(page)).real, { timeout: 20_000, message: `${name}: real content` }).not.toBeNull();
        await waitForAppReady(page);
        await waitForLayout(page);
        const a = await stats(page);
        const early = Object.entries(a.empties).filter(([, t]) => t < a.real!).map(([w]) => w);
        if (early.length) problems.push(`${name}: "${early.join('", "')}" before the data`);
        if (a.busy === null) problems.push(`${name}: never aria-busy while waiting`);
        if (Object.keys(a.empties).some((w) => w === 'Error:')) problems.push(`${name}: raw "Error:" text`);
        if (size.n === 'phone' && a.cls > 0.1) problems.push(`${name}: phone CLS ${a.cls.toFixed(3)} > 0.1`);
        await ctx.close();
      }
      expect(problems).toEqual([]);
    });
  }
}

test.describe('failures', () => {
  for (const vibe of VIBES) {
    test(`${vibe}: a 500 on boot is Try again, not onboarding, keeps the remembered board, and Try again works`, async ({ browser }) => {
      const ctx = await browser.newContext({ reducedMotion: 'reduce' });
      const page = await open(ctx, vibe);
      await hold(page, 'error');
      await page.goto('/inbox');
      await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
      await expect(page.locator('body')).not.toContainText(/Nothing needs you|Create your first board|Set up the pipeline|Error:/);
      expect(await page.evaluate(() => localStorage.getItem('superpipeline.boardId'))).toBe('brd_134a0ddb6d434478');
      await page.unrouteAll({ behavior: 'ignoreErrors' });
      await page.getByRole('button', { name: 'Try again' }).click();
      await expect(page.getByRole('heading', { name: /Needs you|Waiting on you/ }).first()).toBeVisible();
      await expect(page.locator('body')).toContainText('Developer Experience');
      await ctx.close();
    });
  }

  test('a board that fails keeps the shell and offers Try again; one that is not there says so', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await open(ctx, 'daylight');
    await hold(page, 'error');
    await page.goto(DX);
    await expect(page.getByRole('navigation', { name: 'Superpipeline' })).toBeVisible();
    await expect(page.getByText("Couldn't reach Superpipeline. Your boards are safe.")).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/Error:|establishing link/);
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.locator('body')).toContainText('Diagnose Melissa');
    await page.goto('/b/brd_0000000000000000');
    await expect(page.getByText("This board doesn't exist or isn't shared with you.")).toBeVisible();
    await expect(page.getByRole('link', { name: 'Go to your Inbox' })).toBeVisible();
    await ctx.close();
  });

  for (const [name, url, words] of [['projects', '/plan/projects', /No projects yet/], ['project', PROJECT, /no longer exists/], ['settings', '/settings', /No labels yet/], ['people', '/crew/people', /People 0|No people/]] as const) {
    test(`${name}: a failed read says it could not load, never that there is nothing`, async ({ browser }) => {
      const ctx = await browser.newContext({ reducedMotion: 'reduce' });
      const page = await open(ctx, 'daylight');
      await page.goto(url);
      await expect(page.locator('body')).toContainText(/Developer Experience|Ira Mehta/);
      await hold(page, 'error');
      await page.goto(url);
      await expect(page.getByRole('button', { name: 'Try again' }).first()).toBeVisible();
      await expect(page.locator('body')).not.toContainText(words);
      await expect(page.locator('body')).not.toContainText('Error:');
      await ctx.close();
    });
  }
});

test.describe('slow and silent servers', () => {
  test('a board that never answers keeps its shape, says the server is slow at 8 s, and fails with Try again at 20 s', async ({ browser }) => {
    test.setTimeout(90_000);
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await open(ctx, 'daylight');
    await page.goto('/inbox');
    await expect(page.locator('body')).toContainText('Developer Experience');
    await hold(page, 'never');
    await page.goto(DX);
    await expect(page.locator('[data-board-skeleton] [aria-busy="true"]')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/establishing link|Nothing/);
    await expect(page.getByText('Still loading — the server is slow.').first()).toBeVisible({ timeout: 12_000 });
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible({ timeout: 30_000 });
    await ctx.close();
  });

  test('the live pill says Connecting… first, then Live, never Reconnecting… before the feed opened', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await open(ctx, 'daylight');
    await hold(page, { delay: 1500 });
    await page.goto(DX);
    await expect(page.getByText(/^Connecting…$/).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-conn="live"]').first()).toBeVisible({ timeout: 15_000 });
    expect(Object.keys((await stats(page)).empties)).not.toContain('Reconnecting');
    await ctx.close();
  });
});

test.describe('not found', () => {
  for (const vibe of VIBES) {
    test(`${vibe}: an unknown address shows the vibe's shell with a way home`, async ({ browser }) => {
      const ctx = await browser.newContext({ reducedMotion: 'reduce' });
      const page = await open(ctx, vibe);
      await page.goto('/nope');
      await expect(page.getByRole('heading', { level: 1 })).toContainText(/isn't here|not found/i);
      await expect(page.getByRole('link', { name: 'Go to your Inbox' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.dataset.vibe)).toBe(vibe);
      await ctx.close();
    });
  }
});

test('the first frame is already the vibe background, before the app mounts', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await open(ctx, 'studio');
  await page.route('**/*.js', () => {}); // the app never mounts: only app.html is drawn
  await page.goto('/inbox', { waitUntil: 'domcontentloaded' });
  const bg = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  expect(bg).not.toBe('rgb(255, 255, 255)');
  await ctx.close();
});
