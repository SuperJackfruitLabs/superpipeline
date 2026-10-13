// apps/web/e2e/pixel/app.ts — render one screen of the running app the way the reference is rendered:
// same Chromium, artboard size, frozen clock, the reference's network guard and font checks.
import type { Browser, Page } from '@playwright/test';
import { MANIFEST, type PixelOrigin, assertFamiliesLoaded, assertOriginClean, installPixelOrigin, usedFamilies, waitForFonts } from './reference';
import { SYMBOL_PIN_CSS } from './fonts';
import { masksForPart, resolveMasks, type Mask } from './masks';
import { partClip, phaseShift, type Box } from './parts';
import { FIXTURE_TENANT, FIXTURE_USER } from './fixture/seed';
import { DEFAULT_CLOCK, type Screen, type Theme } from './screens';

const STABILISE = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}::-webkit-scrollbar{display:none}';
import { PORTS } from '../../scripts/ports';
const ORIGIN = PORTS.webUrl;
/** Integrations the app calls out to; aborted quietly (they render their own offline state). Anything else external fails the render. */
const QUIET_ABORT = ['https://hub.agentpod.dev/**', 'https://app.superlibrary.dev/**'];

/** `onPage` is a test hook (harness.spec.ts): runs after the guard and the screen's routes are installed. */
export async function renderApp(browser: Browser, screen: Screen, theme: Theme, opts: { onPage?: (page: Page) => Promise<void>; refBoxes?: Box[] } = {}): Promise<{ shots: Buffer[]; masks: Mask[]; partMasks: Mask[][] }> {
  const { w, h } = MANIFEST[screen.artboard]!;
  const strength = screen.strength ?? (screen.vibe === 'quiet' ? 'off' : 'strong');
  const themeWord = theme === 'dark' ? 'dark' : screen.lightTheme ?? 'light';
  const context = await browser.newContext({
    viewport: { width: w, height: Math.min(h, 1200) }, deviceScaleFactor: 1, timezoneId: 'Asia/Kolkata', locale: 'en-GB',
    reducedMotion: 'reduce', colorScheme: theme, baseURL: ORIGIN,
  });
  let origin: PixelOrigin | undefined;
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
    // The reference's guard: localhost passes, every other request is aborted and recorded.
    // Routes added later win, so the quiet aborts, holds and fulfils below take precedence over it.
    origin = await installPixelOrigin(page, '');
    for (const glob of QUIET_ABORT) await page.route(glob, (r) => r.abort());
    for (const glob of screen.hold ?? []) await page.route(glob, () => new Promise<void>(() => {}));
    for (const [glob, r] of Object.entries(screen.fulfil ?? {})) await page.route(glob, (route) => route.fulfill({ status: r.status, json: r.json }));
    if (opts.onPage) await opts.onPage(page);
    const clock = new Date(screen.clock ?? DEFAULT_CLOCK);
    await page.clock.install({ time: clock });
    await page.clock.pauseAt(clock);

    await page.goto(screen.route);
    await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', undefined, { timeout: 20_000 });
    // Grow to the artboard's height now, before any step: Chromium's resize briefly matches the phone
    // query, which swaps the shell and re-mounts the page (losing what the steps opened). Then wait again.
    await page.setViewportSize({ width: w, height: h });
    await page.clock.runFor(34);
    await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', undefined, { timeout: 20_000 });
    // The Live indicator is part of the shell: wait until the feed says it is connected.
    await page.waitForFunction(() => !document.querySelector('[data-live]') || !!document.querySelector('[data-live="on"]'), undefined, { timeout: 10_000 });
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
    assertOriginClean(origin);
    await assertFamiliesLoaded(page, await usedFamilies(page));
    // Screenshots are taken of the viewport, never `fullPage`: a full-page capture re-sizes the emulated
    // viewport, which flips the phone query for a moment and re-mounts the page (losing what the steps opened).
    // So a page taller than the artboard grows the viewport first, and waits for the app again.
    // Grow only when the page's own (fractional) height rounds past the artboard: scrollHeight ceils, so a
    // page 2983.4px tall reads 2984, and the phone root's min-height:100dvh then stretches the main area by
    // 0.6px, which draws the tab bar a pixel lower than the reference's (SP-Phone-Board-Paper on Linux).
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
    const masks = await resolveMasks(page, screen.masks ?? [], 'app');
    if (screen.parts?.length) {
      const shots: Buffer[] = [];
      const partMasks: Mask[][] = [];
      for (const [i, p] of screen.parts.entries()) {
        const el = page.locator(p.app).first();
        // A modal dialog panel is position: fixed in the app and absolutely placed on the reference artboard. Chrome
        // composites a fixed box on its own layer and snaps its text rows there, so rows land a pixel off the
        // reference's at the same layout positions (SP-Dlg-*, measured: equal to 1/64px, 1px apart in the shot).
        // Captured as absolute it stays where it is (inset 0, auto margins: the same centring) and rasterizes as the page does.
        await el.evaluate((e) => { if (e.matches('[role="dialog"], [role="alertdialog"]') && getComputedStyle(e).position === 'fixed') (e as HTMLElement).style.position = 'absolute'; });
        const measure = () => el.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }; });
        let box = await measure();
        // Put the part on the reference part's sub-pixel phase (parts.ts phaseShift), moved in layout.
        const ref = opts.refBoxes?.[i];
        const { dx, dy } = ref ? phaseShift(ref, box) : { dx: 0, dy: 0 };
        if (dx || dy) {
          await el.evaluate((e, [x, y]) => {
            const s = getComputedStyle(e), st = (e as HTMLElement).style;
            st.marginLeft = `${parseFloat(s.marginLeft) + x}px`;
            // A stuck or fixed part (the phone tab bar) is placed by its inset, not by the flow.
            // Stuck to the foot it can only move up, so a downward fraction is taken as the same phase one pixel up.
            if ((s.position === 'sticky' || s.position === 'fixed') && s.bottom !== 'auto') st.bottom = `${parseFloat(s.bottom) - (y > 0 ? y - 1 : y)}px`;
            else if (s.position === 'sticky' || s.position === 'fixed') st.top = `${parseFloat(s.top) + y}px`;
            else st.marginTop = `${parseFloat(s.marginTop) + y}px`;
          }, [dx, dy] as const);
          box = await measure();
        }
        const clip = partClip(box);
        shots.push(await page.screenshot({ clip, animations: 'disabled' }));
        partMasks.push(masksForPart(masks, clip));
      }
      assertOriginClean(origin);
      return { shots, masks: [], partMasks };
    }
    const shot = await page.screenshot({ animations: 'disabled' });
    assertOriginClean(origin);
    return { shots: [shot], masks, partMasks: [] };
  } catch (e) {
    // A blocked request is the cause, whatever timed out after it: surface it as the guard error,
    // which the allow-list never excuses (pixel.spec.ts).
    if (origin) assertOriginClean(origin);
    throw e;
  } finally {
    await context.close().catch(() => {}); // never mask the render error with a close error
  }
}
