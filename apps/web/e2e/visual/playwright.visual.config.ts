// apps/web/e2e/visual/playwright.visual.config.ts — capture this tree's visual screens (capture.spec.ts).
// Never reuses a running server: base and head take turns on the same ports, and each must be served by
// its own tree.
import { defineConfig, devices } from '@playwright/test';
import { PORTS } from '../../scripts/ports';
export default defineConfig({
  testDir: '.',
  testMatch: ['capture.spec.ts'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: [['list']],
  outputDir: '../../test-results/visual-artifacts',
  use: { ...devices['Desktop Chrome'], baseURL: PORTS.webUrl, deviceScaleFactor: 1, timezoneId: 'Asia/Kolkata' },
  webServer: [
    { command: 'pnpm --filter @superpipeline/web build && pnpm --filter @superpipeline/api dev:setup && pnpm --filter @superpipeline/api dev:pixel', url: `${PORTS.apiUrl}/health`, reuseExistingServer: false, timeout: 180_000 },
    { command: 'pnpm --filter @superpipeline/web dev', url: PORTS.webUrl, reuseExistingServer: false, timeout: 120_000 },
  ],
});
