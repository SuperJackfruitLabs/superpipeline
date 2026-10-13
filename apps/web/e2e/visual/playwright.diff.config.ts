// apps/web/e2e/visual/playwright.diff.config.ts — compare two capture folders (diff.spec.ts). No servers.
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  testMatch: ['diff.spec.ts'],
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: [['list']],
  outputDir: '../../test-results/visual-diff-artifacts',
});
