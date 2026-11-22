// Open a page of the fixture world in one vibe, theme and size (no screenshots: callers measure).
import type { Page, APIRequestContext } from '@playwright/test';
import { FIXTURE_TENANT, FIXTURE_USER, seedWorld } from '../visual/fixture/seed';
import { PORTS } from '../../scripts/ports';
import { defaultTimeStrength, type Vibe } from '@superjackfruitlabs/vibekit-ui/appearance';

/** Every vibe, from vibekit (its plain entry: no Svelte), so a new vibe reaches every spec that loops VIBES. */
export { VIBES, defaultTimeStrength } from '@superjackfruitlabs/vibekit-ui/appearance';
export type VibeName = Vibe;
/** Test-only groups of vibes, each named for what a spec checks (no spec compares a vibe to a name; see no-vibe-literals.test.ts). */
/** Also measured in the dark theme: Studio's dark look is the one whose chrome and columns change width. */
export const DARK_MEASURED_VIBES: ReadonlySet<Vibe> = new Set<Vibe>(['studio']);
/** The shell's chrome (AppNav, PhoneTabBar) is opaque, never a translucent wash. */
export const OPAQUE_CHROME_VIBES: ReadonlySet<Vibe> = new Set<Vibe>(['studio']);
/** The mark turns white in the dark theme (on the sky); the others keep the amber mark. */
export const WHITE_DARK_MARK_VIBES: ReadonlySet<Vibe> = new Set<Vibe>(['daylight']);
/** Walked at every size by the loading spec; the other vibes at phone size only. */
export const EVERY_SIZE_LOADING_VIBES: ReadonlySet<Vibe> = new Set<Vibe>(['daylight']);
/** The vk_appearance cookie for a vibe and theme, with the vibe's own time-of-day default (off in the plain vibes). */
export const appearanceCookie = (vibe: Vibe, theme: 'light' | 'dark'): string => `${vibe}.${theme}.${defaultTimeStrength(vibe)}.0`;
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
  await ctx.addCookies([{ name: 'vk_appearance', value: appearanceCookie(o.vibe, o.dark ? 'dark' : 'light'), url: PORTS.webUrl }]);
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
