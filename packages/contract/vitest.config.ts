import { defineConfig } from 'vitest/config';
import { timeouts } from '../../ci-timeouts.mjs';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Longer under CI (saturated shared runner); local values are vitest's defaults.
    ...timeouts().vitest,
  },
});
