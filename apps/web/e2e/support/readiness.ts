import type { Page } from '@playwright/test';

/** App reads/card log settled; this does not assert that a route's expected content exists. */
export async function waitForAppReady(page: Page): Promise<void> {
  const state = await page.waitForFunction(() => {
    const failed = document.querySelector('[data-boot="failed"], [data-failed]');
    if (failed) return { error: failed.textContent?.trim() || 'Application boot/read failed' };
    return document.documentElement.dataset.ready === 'true' ? { error: null } : false;
  }, undefined, { timeout: 15_000 });
  const result = await state.jsonValue() as { error: string | null };
  await state.dispose();
  if (result.error) throw new Error(`Application readiness failed at ${page.url()}: ${result.error}`);
}

/** Fonts and two actual paint frames, after the caller proves its expected route content. */
export async function waitForLayout(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}
