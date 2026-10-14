import { defineConfig } from 'vitest/config';
import { timeouts } from '../../ci-timeouts.mjs';
// Longer under CI (saturated shared runner); local values are vitest's defaults.
export default defineConfig({ test: { environment: 'node', ...timeouts().vitest } });
