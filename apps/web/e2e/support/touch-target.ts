import { expect, type Locator } from '@playwright/test';

/** The existing one-shot measurement, extracted for a browser regression. */
export async function expectTouchHeight(target: Locator, _options: { timeout?: number } = {}): Promise<void> {
  const box = await target.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
}
