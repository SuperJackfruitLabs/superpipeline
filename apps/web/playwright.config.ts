import { defineConfig, devices } from '@playwright/test';
import { PORTS } from './scripts/ports';
import { timeouts } from '../../ci-timeouts.mjs';
import { extendedSpecs, smokeSpec } from './scripts/e2e-suites';

// Longer under CI, where the shared runner is saturated; local values are Playwright's defaults.
const t = timeouts().playwright;

// `pnpm e2e` serves the compiled app and Worker at one isolated origin. Explicit
// `e2e:dev` retains the Vite frontend for development and visual comparisons.
export default defineConfig({
  testDir: './e2e',
  // The pixel folder has its own config (e2e/pixel/playwright.pixel.config.ts, `pnpm test:pixel`);
  // its *.test.ts files are vitest files run by `pnpm test`.
  testIgnore: ['pixel/**', 'visual/**'],
  fullyParallel: false,
  workers: 1,
  metadata: { project: process.env.SP_E2E_PROJECT ?? 'local', shard: process.env.SP_E2E_SHARD ?? '1/1' },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  globalTimeout: process.env.CI ? 25 * 60_000 : undefined,
  timeout: t.test,
  expect: { timeout: t.expect },
  reporter: process.env.SP_E2E_REPORT
    ? [['list'], ['json', { outputFile: process.env.SP_E2E_REPORT }]]
    : process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: PORTS.webUrl,
    // The fixture world's zone: clock words ("as of HH:MM", greetings) read the same on every machine.
    timezoneId: 'Asia/Kolkata',
    // Tests never wait on an animation: reduced motion stops vibekit's motion suite (e2e/motion.spec.ts turns it back on).
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'on-first-retry',
    actionTimeout: t.action,
    navigationTimeout: t.navigation,
  },
  // Set PW_CHANNEL=chrome to drive a locally-installed Chrome instead of the downloaded browser.
  projects: [
    { name: 'critical', testIgnore: ['**/pixel/**', '**/visual/**', ...[...extendedSpecs, smokeSpec].map((name) => '**/' + name)], use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL || undefined } },
    { name: 'extended', testMatch: extendedSpecs.map((name) => '**/' + name), use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL || undefined } },
    { name: 'smoke', testMatch: '**/' + smokeSpec, retries: 0, use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL || undefined } },
  ],
  webServer: process.env.SP_E2E_SERVER === 'built' ? [{
    command: 'node scripts/e2e-server.mjs',
    url: `${PORTS.apiUrl}/health`,
    reuseExistingServer: false,
    timeout: t.apiServer,
  }] : [
    {
      // Build the web first so wrangler dev's assets.directory (apps/web/build) exists, then migrate
      // + seed the local D1 catalog (board create writes to it; tnt_dev must exist for the FKs). The
      // tests still hit the Vite server on the web port — the build only satisfies the Worker's assets check.
      // dev:pixel is dev plus FIXTURE_IMPORT, which rich-card.spec.ts uses to load the fixture world (tenant tnt_vibes).
      command: 'pnpm --filter @superpipeline/web build && pnpm --filter @superpipeline/api dev:setup && pnpm --filter @superpipeline/api dev:pixel',
      url: `${PORTS.apiUrl}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: t.apiServer,
    },
    {
      command: 'pnpm --filter @superpipeline/web dev',
      url: PORTS.webUrl,
      reuseExistingServer: !process.env.CI,
      timeout: t.webServer,
    },
  ],
});
