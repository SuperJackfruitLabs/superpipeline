import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';

// vitest-pool-workers (vitest 4 line) wires the Workers runtime via a Vite plugin that reads our
// wrangler config for bindings (DB, BOARD_DO) and the Worker entry (docs/09-testing-strategy.md §3).
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      // Dev-mode auth is opt-in (it is NOT in wrangler.jsonc, so a bare `wrangler deploy` is safe).
      // The suite drives the API with the dev X-Tenant-Id headers, so it opts in here.
      miniflare: {
        bindings: {
          DEV_AUTH: 'true',
          // Enforcement is ON in wrangler.jsonc — it is production's posture —
          // and OFF here, because this suite tests board mechanics rather than
          // authorization. With it on, every test that queues a card without a
          // token gets it parked: 110 of 369 failed that way, all of them
          // faithfully.
          //
          // The tests that DO test the control pair turn it on themselves
          // (test/control-pair-claim.test.ts), which is the right shape: opt in
          // where it is the subject, off where it is scenery.
          ENFORCE_CONTROL_PAIR: 'false',
          // This plane's own origin, which a hub token must now name in `aud`
          // (`auth/hub-jwt.ts`, `planeAudience`). Overridden here rather than
          // inherited from wrangler.jsonc so the suite does not depend on the
          // production hostname: `https://api.test` is the origin these tests
          // already drive the Worker at, so the pinned value and the request's
          // own origin agree and a token is valid for the reason it reads as.
          APP_URL: 'https://api.test',
        },
      },
    }),
  ],
  test: {
    include: ['test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
  },
});
