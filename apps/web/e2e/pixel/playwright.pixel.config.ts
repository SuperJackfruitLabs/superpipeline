// apps/web/e2e/pixel/playwright.pixel.config.ts
import { defineConfig, devices } from '@playwright/test';
import { PORTS } from '../../scripts/ports';
export default defineConfig({
  testDir: '.',
  // harness.spec.ts proves the guards; pixel.spec.ts compares every screen.
  testMatch: ['harness.spec.ts', 'pixel.spec.ts'],
  globalSetup: './global-setup.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  reporter: [['list']],
  outputDir: '../../test-results/pixel-artifacts',
  use: { ...devices['Desktop Chrome'], baseURL: PORTS.webUrl, deviceScaleFactor: 1, timezoneId: 'Asia/Kolkata' },
  webServer: [
    { command: 'pnpm --filter @superpipeline/web build && pnpm --filter @superpipeline/api dev:setup && pnpm --filter @superpipeline/api dev:pixel', url: `${PORTS.apiUrl}/health`, reuseExistingServer: !process.env.CI, timeout: 180_000 },
    { command: 'pnpm --filter @superpipeline/web dev', url: PORTS.webUrl, reuseExistingServer: !process.env.CI, timeout: 120_000 },
  ],
});
