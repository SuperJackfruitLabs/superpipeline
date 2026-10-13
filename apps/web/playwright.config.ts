import { defineConfig, devices } from '@playwright/test';
import { PORTS } from './scripts/ports';

// E2E boots the real app: the API Worker (wrangler dev, SP_API_PORT, default :8787) and the SvelteKit dev server
// (SP_WEB_PORT, default :5173, which proxies /v1 + the WebSocket to the Worker). See docs/09-testing-strategy.md.
export default defineConfig({
  testDir: './e2e',
  // The pixel folder has its own config (e2e/pixel/playwright.pixel.config.ts, `pnpm test:pixel`);
  // its *.test.ts files are vitest files run by `pnpm test`.
  testIgnore: ['pixel/**'],
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: PORTS.webUrl,
    // The fixture world's zone: clock words ("as of HH:MM", greetings) read the same on every machine.
    timezoneId: 'Asia/Kolkata',
    trace: 'on-first-retry',
  },
  // Set PW_CHANNEL=chrome to drive a locally-installed Chrome instead of the downloaded browser.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL || undefined } },
  ],
  webServer: [
    {
      // Build the web first so wrangler dev's assets.directory (apps/web/build) exists, then migrate
      // + seed the local D1 catalog (board create writes to it; tnt_dev must exist for the FKs). The
      // tests still hit the Vite server on the web port — the build only satisfies the Worker's assets check.
      command: 'pnpm --filter @superpipeline/web build && pnpm --filter @superpipeline/api dev:setup && pnpm --filter @superpipeline/api dev',
      url: `${PORTS.apiUrl}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: 'pnpm --filter @superpipeline/web dev',
      url: PORTS.webUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
