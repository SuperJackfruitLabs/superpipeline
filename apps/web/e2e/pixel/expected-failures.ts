/**
 * Screens that do not match their reference yet, each within the 1% deploy bar (operator ruling,
 * 2026-10-13; `deploy-bar.ts`). A ratchet: an entry that starts passing, or rises over 1%, fails the
 * run. Each comment is the key's ratio in the last full run and its cause; RESIDUALS.md lists them.
 * The keys are polished after deploy. The list only shrinks.
 */
export const EXPECTED_FAILURES: ReadonlySet<string> = new Set([
  'SP-Dlg-Appearance-Daylight·dark', // 0.162% (vibekit 0.0.10, full run): within the bar since vibekit 0.0.10 and the picker's 1.45 type: the reference's 'See every accent's contrast' link is not drawn (its target is a mockup page the app does not have); the Paper preview's IN PROGRESS heading wraps in vibekit's preview frame; the Studio card's five swatches are vibekit's (bg, surface, primary, accent, signal) where the reference shows bg, primary, stage 5, accent, signal; Studio's readout Sky draws a smaller sun; the swatch wash strips and the foot's line rasterise a pixel off
  'SP-Dlg-Appearance-Daylight·light', // 0.215% (vibekit 0.0.10, full run): within the bar since vibekit 0.0.10 and the picker's 1.45 type: the reference's 'See every accent's contrast' link is not drawn (its target is a mockup page the app does not have); the Paper preview's IN PROGRESS heading wraps in vibekit's preview frame; the Studio card's five swatches are vibekit's (bg, surface, primary, accent, signal) where the reference shows bg, primary, stage 5, accent, signal; Studio's readout Sky draws a smaller sun; the swatch wash strips and the foot's line rasterise a pixel off
  'SP-Dlg-Appearance-Paper·dark', // 0.074% (vibekit 0.0.10, full run): within the bar since vibekit 0.0.10 and the picker's 1.45 type: the reference's 'See every accent's contrast' link is not drawn (its target is a mockup page the app does not have); the Paper preview's IN PROGRESS heading wraps in vibekit's preview frame; the Studio card's five swatches are vibekit's (bg, surface, primary, accent, signal) where the reference shows bg, primary, stage 5, accent, signal; Studio's readout Sky draws a smaller sun; the swatch wash strips and the foot's line rasterise a pixel off
  'SP-Dlg-Appearance-Paper·light', // 0.123% (vibekit 0.0.10, full run): within the bar since vibekit 0.0.10 and the picker's 1.45 type: the reference's 'See every accent's contrast' link is not drawn (its target is a mockup page the app does not have); the Paper preview's IN PROGRESS heading wraps in vibekit's preview frame; the Studio card's five swatches are vibekit's (bg, surface, primary, accent, signal) where the reference shows bg, primary, stage 5, accent, signal; Studio's readout Sky draws a smaller sun; the swatch wash strips and the foot's line rasterise a pixel off
  'SP-Dlg-Appearance-Quiet·dark', // 0.084% (vibekit 0.0.10, full run): within the bar since vibekit 0.0.10 and the picker's 1.45 type: the reference's 'See every accent's contrast' link is not drawn (its target is a mockup page the app does not have); the Paper preview's IN PROGRESS heading wraps in vibekit's preview frame; the Studio card's five swatches are vibekit's (bg, surface, primary, accent, signal) where the reference shows bg, primary, stage 5, accent, signal; Studio's readout Sky draws a smaller sun; the swatch wash strips and the foot's line rasterise a pixel off
  'SP-Dlg-Appearance-Quiet·light', // 0.130% (vibekit 0.0.10, full run): within the bar since vibekit 0.0.10 and the picker's 1.45 type: the reference's 'See every accent's contrast' link is not drawn (its target is a mockup page the app does not have); the Paper preview's IN PROGRESS heading wraps in vibekit's preview frame; the Studio card's five swatches are vibekit's (bg, surface, primary, accent, signal) where the reference shows bg, primary, stage 5, accent, signal; Studio's readout Sky draws a smaller sun; the swatch wash strips and the foot's line rasterise a pixel off
  'SP-Dlg-Appearance-Studio·dark', // 0.256% (vibekit 0.0.10, full run): within the bar since vibekit 0.0.10 and the picker's 1.45 type: the reference's 'See every accent's contrast' link is not drawn (its target is a mockup page the app does not have); the Paper preview's IN PROGRESS heading wraps in vibekit's preview frame; the Studio card's five swatches are vibekit's (bg, surface, primary, accent, signal) where the reference shows bg, primary, stage 5, accent, signal; Studio's readout Sky draws a smaller sun; the swatch wash strips and the foot's line rasterise a pixel off
  'SP-Dlg-Appearance-Studio·light', // 0.235% (vibekit 0.0.10, full run): within the bar since vibekit 0.0.10 and the picker's 1.45 type: the reference's 'See every accent's contrast' link is not drawn (its target is a mockup page the app does not have); the Paper preview's IN PROGRESS heading wraps in vibekit's preview frame; the Studio card's five swatches are vibekit's (bg, surface, primary, accent, signal) where the reference shows bg, primary, stage 5, accent, signal; Studio's readout Sky draws a smaller sun; the swatch wash strips and the foot's line rasterise a pixel off
  'SP-Dlg-BoardSwitcher-Daylight·dark', // 0.442% (vibekit 0.0.10, full run): vibekit CommandPalette switcher form: row text and keycaps rasterise a pixel off the reference's hand-drawn rows (every box matches; the trigger copy is 0.000%)
  'SP-Dlg-BoardSwitcher-Daylight·light', // 0.476% (vibekit 0.0.10, full run): vibekit CommandPalette switcher form: row text and keycaps rasterise a pixel off the reference's hand-drawn rows (every box matches; the trigger copy is 0.000%)
  'SP-Dlg-BoardSwitcher-Paper·dark', // 0.462% (vibekit 0.0.10, full run): vibekit CommandPalette switcher form: row text and keycaps rasterise a pixel off the reference's hand-drawn rows (every box matches; the trigger copy is 0.000%)
  'SP-Dlg-BoardSwitcher-Paper·light', // 0.483% (vibekit 0.0.10, full run): vibekit CommandPalette switcher form: row text and keycaps rasterise a pixel off the reference's hand-drawn rows (every box matches; the trigger copy is 0.000%)
  'SP-Dlg-BoardSwitcher-Quiet·dark', // 0.403% (vibekit 0.0.10, full run): vibekit CommandPalette switcher form: row text and keycaps rasterise a pixel off the reference's hand-drawn rows (every box matches; the trigger copy is 0.000%)
  'SP-Dlg-BoardSwitcher-Quiet·light', // 0.410% (vibekit 0.0.10, full run): vibekit CommandPalette switcher form: row text and keycaps rasterise a pixel off the reference's hand-drawn rows (every box matches; the trigger copy is 0.000%)
  'SP-Dlg-BoardSwitcher-Studio·dark', // 0.502% (vibekit 0.0.10, full run): vibekit CommandPalette switcher form: row text and keycaps rasterise a pixel off the reference's hand-drawn rows (every box matches; the trigger copy is 0.000%)
  'SP-Dlg-BoardSwitcher-Studio·light', // 0.515% (vibekit 0.0.10, full run): vibekit CommandPalette switcher form: row text and keycaps rasterise a pixel off the reference's hand-drawn rows (every box matches; the trigger copy is 0.000%)
  'SP-Dlg-Move-Daylight·dark', // 0.363% (vibekit 0.0.10, full run): vibekit Choice stage rows and Dialog object title: sub-pixel text and Face drawing against the reference's hand-drawn rows; the description sits 2px off
  'SP-Dlg-Move-Daylight·light', // 0.412% (vibekit 0.0.10, full run): vibekit Choice stage rows and Dialog object title: sub-pixel text and Face drawing against the reference's hand-drawn rows; the description sits 2px off
  'SP-Dlg-Move-Paper·dark', // 0.369% (vibekit 0.0.10, full run): vibekit Choice stage rows and Dialog object title: sub-pixel text and Face drawing against the reference's hand-drawn rows; the description sits 2px off
  'SP-Dlg-Move-Paper·light', // 0.390% (vibekit 0.0.10, full run): vibekit Choice stage rows and Dialog object title: sub-pixel text and Face drawing against the reference's hand-drawn rows; the description sits 2px off
  'SP-Dlg-Move-Quiet·dark', // 0.359% (vibekit 0.0.10, full run): vibekit Choice stage rows and Dialog object title: sub-pixel text and Face drawing against the reference's hand-drawn rows; the description sits 2px off
  'SP-Dlg-Move-Quiet·light', // 0.360% (vibekit 0.0.10, full run): vibekit Choice stage rows and Dialog object title: sub-pixel text and Face drawing against the reference's hand-drawn rows; the description sits 2px off
  'SP-Dlg-Move-Studio·dark', // 0.414% (vibekit 0.0.10, full run): vibekit Choice stage rows and Dialog object title: sub-pixel text and Face drawing against the reference's hand-drawn rows; the description sits 2px off
  'SP-Dlg-Move-Studio·light', // 0.426% (vibekit 0.0.10, full run): vibekit Choice stage rows and Dialog object title: sub-pixel text and Face drawing against the reference's hand-drawn rows; the description sits 2px off
  'SP-Dlg-NewCard-Daylight·light', // 0.036% (vibekit 0.0.10, full run): vibekit Button and Field select rasterising (broken blocks only); Segmented sm on both sides since 0.0.9
  'SP-Dlg-NewCard-Quiet·dark', // 0.025% (vibekit 0.0.10, full run): vibekit Button and Field select rasterising (broken blocks only); Segmented sm on both sides since 0.0.9
  'SP-Dlg-NewCard-Quiet·light', // 0.029% (vibekit 0.0.10, full run): vibekit Button and Field select rasterising (broken blocks only); Segmented sm on both sides since 0.0.9
  'SP-Dlg-Palette-Daylight·dark', // 0.378% (vibekit 0.0.10, full run): vibekit CommandPalette rows (filter={false} since 0.0.9): Face tiles and keycaps rasterise differently from the reference's render
  'SP-Dlg-Palette-Daylight·light', // 0.386% (vibekit 0.0.10, full run): vibekit CommandPalette rows (filter={false} since 0.0.9): Face tiles and keycaps rasterise differently from the reference's render
  'SP-Dlg-Palette-Paper·dark', // 0.374% (vibekit 0.0.10, full run): vibekit CommandPalette rows (filter={false} since 0.0.9): Face tiles and keycaps rasterise differently from the reference's render
  'SP-Dlg-Palette-Paper·light', // 0.384% (vibekit 0.0.10, full run): vibekit CommandPalette rows (filter={false} since 0.0.9): Face tiles and keycaps rasterise differently from the reference's render
  'SP-Dlg-Palette-Quiet·dark', // 0.379% (vibekit 0.0.10, full run): vibekit CommandPalette rows (filter={false} since 0.0.9): Face tiles and keycaps rasterise differently from the reference's render
  'SP-Dlg-Palette-Quiet·light', // 0.386% (vibekit 0.0.10, full run): vibekit CommandPalette rows (filter={false} since 0.0.9): Face tiles and keycaps rasterise differently from the reference's render
  'SP-Dlg-Palette-Studio·dark', // 0.485% (vibekit 0.0.10, full run): vibekit CommandPalette rows (filter={false} since 0.0.9): Face tiles and keycaps rasterise differently from the reference's render
  'SP-Dlg-Palette-Studio·light', // 0.500% (vibekit 0.0.10, full run): vibekit CommandPalette rows (filter={false} since 0.0.9): Face tiles and keycaps rasterise differently from the reference's render
  'SP-Dlg-Reconnect-Daylight·dark', // 0.048% (vibekit 0.0.10, full run): broken blocks only: vibekit Button (Sign in again) rasterises differently from the reference's render
  'SP-Dlg-Reconnect-Daylight·light', // 0.108% (vibekit 0.0.10, full run): broken blocks only: vibekit Button (Sign in again) rasterises differently from the reference's render
]);

/** `${process.platform}-${process.arch}`, e.g. `darwin-arm64` or `linux-x64` (CI's runner). */
export type PlatformKey = string;
export const currentPlatform = (): PlatformKey => `${process.platform}-${process.arch}`;

/**
 * Per-platform verdicts that override EXPECTED_FAILURES (which holds the darwin verdict). Text
 * rasterises differently per platform and architecture (FreeType vs CoreText; arm64 and x64 Linux
 * disagree on 4 keys), so an override names the exact platform-arch. CI's linux-x64 is authoritative
 * for deploys. `fails`: the key fails strictly there but stays within the 1% bar; `passes`: it is on
 * the darwin list but passes there; `either`: it flips between passing and failing strictly from run to
 * run there, for a cause that could not be made deterministic, so neither outcome is a ratchet signal (the
 * 1% bar still holds; use it only with that cause logged). The ratchet and the bar apply per platform: a `fails` key that
 * passes, or a `passes` key that fails, fails the run. Each line is the ratio on that platform (from
 * CI's run) and its cause; RESIDUALS.md "Per platform" lists them.
 */
export const PLATFORM_OVERRIDES: Readonly<Record<PlatformKey, Readonly<Record<string, 'fails' | 'passes' | 'either'>>>> = {
  'linux-x64': {
    'SP-Dlg-NewCard-Daylight·dark': 'fails', // 0.030% (CI linux-x64): one broken block: the Add label chip's words and the label chips' × glyphs draw 1px higher than the reference's under Linux FreeType hinting
    'SP-Dlg-Reconnect-Daylight·dark': 'either', // 0.030% (CI linux-x64): flips between 0.000% and 0.030% (one broken block on vibekit's Sign in again Button) from run to run on linux-x64; focus, hover, transitions and font loading are ruled out on macOS (the button is focused then blurred identically every run), and the Linux run could not be reproduced locally
  },
};

/** Whether `key` is expected to fail the strict compare on `platform` (default: this process's). `overrides` is for tests. */
export function isExpectedFailure(key: string, platform: PlatformKey = currentPlatform(), overrides: typeof PLATFORM_OVERRIDES = PLATFORM_OVERRIDES): boolean {
  const o = overrides[platform]?.[key];
  return o === undefined ? EXPECTED_FAILURES.has(key) : o !== 'passes';
}

/** Whether `key` may pass or fail strictly (within the bar) on `platform`: it flips between runs there. */
export function isEither(key: string, platform: PlatformKey = currentPlatform()): boolean {
  return PLATFORM_OVERRIDES[platform]?.[key] === 'either';
}
