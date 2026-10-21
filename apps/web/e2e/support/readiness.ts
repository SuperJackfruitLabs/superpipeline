import type { Page } from '@playwright/test';

/** App reads/card log settled; this does not assert that a route's expected content exists. */
export async function waitForAppReady(page: Page): Promise<void> {
  const state = await page.waitForFunction(() => {
    const failed = document.querySelector('[data-boot="failed"], [data-failed]');
    if (failed) return { error: failed.textContent?.trim() || 'Application boot/read failed' };
    return document.documentElement.dataset.ready === 'true' ? { error: null } : false;
  }, undefined, { timeout: 15_000 }).catch(async (cause: unknown) => {
    const ready = await page.locator('html').getAttribute('data-ready').catch(() => null);
    throw new Error(`Application readiness timed out at ${new URL(page.url()).pathname} (data-ready=${ready})`, { cause });
  });
  const result = await state.jsonValue() as { error: string | null };
  await state.dispose();
  if (result.error) throw new Error(`Application readiness failed at ${page.url()}: ${result.error}`);
}

/** Visible route settled, even when unrelated catalogue/background reads continue. */
export async function waitForSurfaceReady(page: Page): Promise<void> {
  const state = await page.waitForFunction(() => {
    const visible = (element: Element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
    const failed = [...document.querySelectorAll('[data-boot="failed"], [data-failed]')].find(visible);
    if (failed) return { error: failed.textContent?.trim() || 'Application boot/read failed' };
    const pending = [...document.querySelectorAll('[data-skeleton], [data-board-skeleton], [aria-busy="true"]')].some(visible);
    return pending ? false : { error: null };
  }, undefined, { timeout: 15_000 });
  const result = await state.jsonValue() as { error: string | null };
  await state.dispose();
  if (result.error) throw new Error(`Surface readiness failed at ${page.url()}: ${result.error}`);
}

/** Fonts and two actual paint frames, after the caller proves its expected route content. */
export async function waitForLayout(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}
