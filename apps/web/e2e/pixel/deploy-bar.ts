// apps/web/e2e/pixel/deploy-bar.ts
/**
 * The deploy bar (operator ruling, 2026-10-13): every screen is within 1% of its mockup. A key on the
 * allow-list (expected-failures.ts) may still miss the stricter compare (MAX_RATIO, broken blocks,
 * size), but never the bar: a listed key over 1% fails the run as if it were not listed.
 */
export const DEPLOY_BAR = 0.01;

export interface Outcome { ratio: number; failed: boolean }

/** Why an allow-listed key fails the run, or null when it may stay listed. `platform` names a per-platform override's list. */
export function allowListVerdict(key: string, o: Outcome, platform?: string, either = false): string | null {
  // `either` (a per-platform verdict): the key flips between passing and failing strictly from run to run
  // on that platform, so a pass is not a ratchet signal; the 1% bar still holds.
  if (!o.failed && either) return null;
  if (!o.failed) return platform
    ? `${key} passes now on ${platform}: remove its PLATFORM_OVERRIDES['${platform}'] line from apps/web/e2e/pixel/expected-failures.ts`
    : `${key} passes now: remove it from apps/web/e2e/pixel/expected-failures.ts`;
  if (o.ratio > DEPLOY_BAR) return `${key}: ratio ${(o.ratio * 100).toFixed(3)}% is over the 1% deploy bar; allow-listed keys must be within it`;
  return null;
}
