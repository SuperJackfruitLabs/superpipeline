// apps/web/e2e/pixel/playwright.refs.config.ts — the references alone (references-render.spec.ts): no app, no server.
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  testMatch: ['references-render.spec.ts'],
  workers: 4,
  timeout: 60_000,
  reporter: [['list']],
  outputDir: '../../test-results/refs-artifacts',
  use: { ...devices['Desktop Chrome'], deviceScaleFactor: 1 },
});
