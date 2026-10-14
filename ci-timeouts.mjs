// Test timeouts, longer when `CI` is set (operator decision 2026-10-14). The Forge runner runs two jobs at
// once in one 8-CPU container, so Chromium and workerd starve each other: tests that take well under a
// second locally hit vitest's 5s and Playwright's 30s limits there (Forge jobs 497, 531, 580). Local values
// are the tools' own defaults, unchanged. No assertion is loosened: only how long a slow machine may take.
// Checked by apps/web/scripts/ci-timeouts.test.ts.

/** @param {Record<string, string | undefined>} [env] */
export function timeouts(env = process.env) {
  const ci = !!env.CI;
  return {
    vitest: ci ? { testTimeout: 20_000, hookTimeout: 30_000 } : { testTimeout: 5_000, hookTimeout: 10_000 },
    playwright: ci
      ? { test: 60_000, expect: 15_000, action: 15_000, navigation: 30_000, apiServer: 300_000, webServer: 240_000 }
      : { test: 30_000, expect: 5_000, action: 0, navigation: 0, apiServer: 180_000, webServer: 120_000 },
  };
}
