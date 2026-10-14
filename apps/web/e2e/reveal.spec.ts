// apps/web/e2e/reveal.spec.ts — "Show all" grows into place (Round 3, M1). The Needs-you ask swapped its clamped
// excerpt for the full text instantly; now the block's height animates (Quiet: a short fade), nothing moves under
// reduced motion, and the toggle keeps focus and says it is expanded.
import { expect, test, type Page } from '@playwright/test';
import { DX, VIBES, openWorld, seed } from './support/world';

test.beforeAll(async ({ request }) => seed(request));

/** What the reveal block is animating right after the click: 'height', 'opacity' or nothing. */
async function clickAndRead(page: Page, toggle: ReturnType<Page['locator']>): Promise<string[]> {
  await toggle.click();
  return page.evaluate(() => new Promise<string[]>((done) => requestAnimationFrame(() => requestAnimationFrame(() => {
    const props = document.getAnimations()
      .filter((a) => a.effect instanceof KeyframeEffect && a.effect.target instanceof Element && a.effect.target.matches('[data-reveal]'))
      .flatMap((a) => Object.keys((a.effect as KeyframeEffect).getKeyframes()[0] ?? {}).filter((k) => k === 'height' || k === 'opacity'));
    done([...new Set(props)]);
  }))));
}

/** The first expand toggle: an ask's "Show all" on the Inbox; Quiet's asks print in full, so a card's closed attempt. */
function where(vibe: string): { route: string; toggle: (p: Page) => ReturnType<Page['locator']> } {
  if (vibe === 'quiet') return { route: `${DX}/c/card_05823a57e8224605`, toggle: (p) => p.locator('[data-reveal] button[data-attempt-head][aria-expanded="false"]').first() };
  return { route: '/inbox', toggle: (p) => p.locator('[data-reveal]').getByRole('button', { name: 'Show all', exact: true }).first() };
}

for (const vibe of VIBES) {
  for (const motion of ['on', 'reduced'] as const) {
    test(`${vibe}, motion ${motion}: an expand toggle ${motion === 'on' ? (vibe === 'quiet' ? 'fades its block in' : 'animates its block’s height') : 'changes nothing but the content'}`, async ({ page }) => {
      const w = where(vibe);
      await openWorld(page, w.route, { vibe, dark: false, width: 1280, height: 900 });
      if (motion === 'on') await page.emulateMedia({ reducedMotion: 'no-preference' });
      const toggle = w.toggle(page);
      await expect(toggle).toBeVisible();
      await toggle.scrollIntoViewIfNeeded();
      const props = await clickAndRead(page, toggle);
      expect(props).toEqual(motion === 'reduced' ? [] : vibe === 'quiet' ? ['opacity'] : ['height']);
      // The toggle keeps focus and says it is open (its label may change: Show all → Show less).
      const focused = page.locator(':focus');
      await expect(focused).toHaveAttribute('aria-expanded', 'true');
    });
  }
}
