import { expect, type Locator } from '@playwright/test';

/** Measure the current layout atomically; a hidden frame never meets the floor. */
export async function expectTouchHeight(target: Locator, options: { timeout?: number } = {}): Promise<void> {
  await expect.poll(async () => (await target.boundingBox())?.height ?? 0, options).toBeGreaterThanOrEqual(44);
}
