// Open a page of the fixture world in one vibe, theme and size (no screenshots: callers measure).
import type { Page, APIRequestContext } from '@playwright/test';
import { FIXTURE_TENANT, FIXTURE_USER, seedWorld } from '../pixel/fixture/seed';
import { PORTS } from '../../scripts/ports';

export const VIBES = ['daylight', 'paper', 'studio', 'quiet'] as const;
export type VibeName = (typeof VIBES)[number];
export const SIZES = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1100x800', width: 1100, height: 800 },
  { name: '390x844', width: 390, height: 844 },
] as const;
export const DX = '/b/brd_134a0ddb6d434478';

export async function seed(request: APIRequestContext): Promise<void> {
  await seedWorld(request);
}

export async function openWorld(page: Page, route: string, o: { vibe: VibeName; dark: boolean; width: number; height: number; at?: string }): Promise<void> {
  const ctx = page.context();
  await ctx.addCookies([{ name: 'vk_appearance', value: `${o.vibe}.${o.dark ? 'dark' : 'light'}.${o.vibe === 'quiet' ? 'off' : 'strong'}.0`, url: PORTS.webUrl }]);
  await ctx.addInitScript(([t, u, b]) => {
    localStorage.setItem('superpipeline.devTenant', t);
    localStorage.setItem('superpipeline.devUser', u);
    localStorage.setItem('superpipeline.boardId', b);
  }, [FIXTURE_TENANT, FIXTURE_USER, 'brd_134a0ddb6d434478'] as const);
  if (o.at) await page.clock.install({ time: new Date(o.at) });
  await page.emulateMedia({ colorScheme: o.dark ? 'dark' : 'light', reducedMotion: 'reduce' });
  await page.setViewportSize({ width: o.width, height: o.height });
  await page.goto(route);
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', undefined, { timeout: 20_000 });
}
