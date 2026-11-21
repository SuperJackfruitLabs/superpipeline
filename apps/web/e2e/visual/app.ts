// apps/web/e2e/visual/app.ts — render one screen of the running app for the visual job: the screen's
// size, a frozen clock, reduced motion, no animation or transition, fonts awaited, and every request
// that leaves localhost refused and reported (a render that leaned on the network is not a capture).
import { defaultTimeStrength } from '@superjackfruitlabs/vibekit-ui/appearance';
import type { Browser, Page } from '@playwright/test';
import { FAMILIES, SYMBOL_PIN_CSS } from './fonts';
import { FIXTURE_TENANT, FIXTURE_USER } from './fixture/seed';
import { DEFAULT_CLOCK, type Screen } from './screens';
import { PORTS } from '../../scripts/ports';

const STABILISE = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}::-webkit-scrollbar{display:none}';
const ORIGIN = PORTS.webUrl;
/** Integrations the app calls out to; aborted quietly (they render their own offline state). Anything else external fails the render. */
const QUIET_ABORT = ['https://hub.agentpod.dev/**', 'https://app.superlibrary.dev/**'];
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** What went wrong at the network boundary during one render. */
type Guard = { errors: string[] };

/** Let localhost (the app and its API) through; abort and record everything else. */
async function installGuard(page: Page): Promise<Guard> {
  const guard: Guard = { errors: [] };
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.protocol === 'data:' || url.protocol === 'blob:' || LOCAL_HOSTS.has(url.hostname)) return route.continue();
    guard.errors.push(`blocked external request ${url.href}`);
    return route.abort('blockedbyclient');
  });
  return guard;
}

function assertGuardClean(guard: Guard): void {
  if (guard.errors.length) throw new Error(`visual capture: ${guard.errors.join('; ')}`);
}

async function waitForFonts(page: Page): Promise<void> {
  await page.evaluate(async (families) => {
    await document.fonts.ready;
    const used = new Set<string>();
    for (const el of document.querySelectorAll('*')) used.add(getComputedStyle(el).fontFamily.split(',')[0]!.trim().replace(/^["']|["']$/g, ''));
    await Promise.all([...used].filter((f) => families.includes(f) || /Variable$/.test(f)).flatMap((f) => [
      document.fonts.load(`400 16px "${f}"`), document.fonts.load(`700 16px "${f}"`), document.fonts.load(`italic 400 16px "${f}"`),
    ]));
    await document.fonts.ready;
  }, FAMILIES);
}

/** Harness families the page actually uses (first entry of each element's computed font-family). */
async function usedFamilies(page: Page): Promise<string[]> {
  return page.evaluate((families) => {
    const used = new Set<string>();
    for (const el of document.querySelectorAll('body, body *')) {
      const f = getComputedStyle(el).fontFamily.split(',')[0]!.trim().replace(/^["']|["']$/g, '');
      if (families.includes(f)) used.add(f);
    }
    return [...used].sort();
  }, FAMILIES);
}

/**
 * Each family needs a FontFace in document.fonts with status 'loaded'. document.fonts.check() alone
 * is not enough: it returns true when no face matches the family at all.
 */
async function assertFamiliesLoaded(page: Page, families: string[]): Promise<void> {
  const missing = await page.evaluate((fs) => {
    const loaded = new Set<string>();
    document.fonts.forEach((ff) => { if (ff.status === 'loaded') loaded.add(ff.family.replace(/^["']|["']$/g, '')); });
    return fs.filter((f) => !loaded.has(f));
  }, families);
  if (missing.length) throw new Error(`fonts not loaded: ${missing.join(', ')}`);
}

/** One screen, light theme (the visual job captures light only), as a viewport screenshot. */
export async function renderApp(browser: Browser, screen: Screen): Promise<Buffer> {
  const { w, h } = screen.size;
  const strength = screen.strength ?? defaultTimeStrength(screen.vibe);
  const themeWord = screen.lightTheme ?? 'light';
  const context = await browser.newContext({
    viewport: { width: w, height: Math.min(h, 1200) }, deviceScaleFactor: 1, timezoneId: 'Asia/Kolkata', locale: 'en-GB',
    reducedMotion: 'reduce', colorScheme: 'light', baseURL: ORIGIN,
  });
  let guard: Guard | undefined;
  try {
    await context.addCookies([{ name: 'vk_appearance', value: `${screen.vibe}.${themeWord}.${strength}.0`, url: ORIGIN }]);
    const boardId = /\/b\/([^/?]+)/.exec(screen.route)?.[1] ?? 'brd_134a0ddb6d434478';
    await context.addInitScript(([t, u, b]) => {
      localStorage.setItem('superpipeline.devTenant', t);
      localStorage.setItem('superpipeline.devUser', u);
      localStorage.setItem('superpipeline.boardId', b);
    }, [FIXTURE_TENANT, FIXTURE_USER, boardId] as const);
    const page: Page = await context.newPage();
    page.setDefaultTimeout(10_000);
    // Localhost passes, every other request is aborted and recorded. Routes added later win, so the
    // quiet aborts, holds and fulfils below take precedence over it.
    guard = await installGuard(page);
    for (const glob of QUIET_ABORT) await page.route(glob, (r) => r.abort());
    for (const glob of screen.hold ?? []) await page.route(glob, () => new Promise<void>(() => {}));
    for (const [glob, r] of Object.entries(screen.fulfil ?? {})) await page.route(glob, (route) => route.fulfill({ status: r.status, json: r.json }));
    const clock = new Date(screen.clock ?? DEFAULT_CLOCK);
    await page.clock.install({ time: clock });
    await page.clock.pauseAt(clock);

    await page.goto(screen.route);
    await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', undefined, { timeout: 20_000 });
    // Grow to the screen's height now, before any step: Chromium's resize briefly matches the phone
    // query, which swaps the shell and re-mounts the page (losing what the steps opened). Then wait again.
    await page.setViewportSize({ width: w, height: h });
    await page.clock.runFor(34);
    await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', undefined, { timeout: 20_000 });
    // The Live indicator is part of the shell: wait until the feed says it is connected.
    await page.waitForFunction(() => !document.querySelector('[data-live]') || !!document.querySelector('[data-live="on"]'), undefined, { timeout: 10_000 });
    // Connecting the feed refreshes the board, which reads again: wait for the app to settle once more.
    await page.clock.runFor(34);
    await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', undefined, { timeout: 20_000 });
    await waitForFonts(page);
    if (screen.steps) {
      await screen.steps(page);
      await page.clock.runFor(1000);
      // A step that loads (a token issued, a list refreshed) is done only when the app says it is.
      await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', undefined, { timeout: 20_000 });
    }
    await page.addStyleTag({ content: STABILISE + SYMBOL_PIN_CSS });
    await waitForFonts(page);
    // The clock is paused, so requestAnimationFrame only fires when the fake clock moves: tick two frames.
    await page.clock.runFor(34);
    assertGuardClean(guard);
    await assertFamiliesLoaded(page, await usedFamilies(page));
    // Screenshots are taken of the viewport, never `fullPage`: a full-page capture re-sizes the emulated
    // viewport, which flips the phone query for a moment and re-mounts the page (losing what the steps opened).
    // So a page taller than the screen grows the viewport first, and waits for the app again.
    // Grow only when the page's own (fractional) height rounds past the screen's height: scrollHeight ceils, so a
    // page 2983.4px tall reads 2984, and the phone root's min-height:100dvh then stretches the main area by
    // 0.6px, which draws the tab bar a pixel lower (measured on SP-Phone-Board-Paper, on Linux).
    const tall = await page.evaluate(() => {
      const sh = document.documentElement.scrollHeight;
      const natural = Math.max(0, ...Array.from(document.body.children, (e) => e.getBoundingClientRect().bottom + scrollY));
      return sh - innerHeight <= 1 && Math.round(natural) <= innerHeight ? innerHeight : sh;
    });
    if (tall > h) {
      await page.setViewportSize({ width: w, height: tall });
      await page.clock.runFor(34);
      await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', undefined, { timeout: 20_000 });
    }
    const shot = await page.screenshot({ animations: 'disabled' });
    assertGuardClean(guard);
    return shot;
  } catch (e) {
    // A blocked request is the cause, whatever timed out after it: surface it as the guard error.
    if (guard) assertGuardClean(guard);
    throw e;
  } finally {
    await context.close().catch(() => {}); // never mask the render error with a close error
  }
}
