import { defineConfig } from 'vitest/config';
import { timeouts } from '../ci-timeouts.mjs';

// Repository-wide checks that belong to no one package (scripts/architecture.test.ts).
export default defineConfig({
  test: {
    root: new URL('..', import.meta.url).pathname,
    include: ['scripts/**/*.test.ts'],
    environment: 'node',
    // Longer under CI (saturated shared runner); local values are vitest's defaults.
    ...timeouts().vitest,
  },
});
