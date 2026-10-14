// CI's shared runner is saturated (2 jobs at once, Chromium beside workerd): timeouts are longer under `CI`
// and unchanged locally (2026-10-14). Every config must read them from the one module.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { timeouts } from '../../../ci-timeouts.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));

describe('ci timeouts', () => {
  it('local values are the tools\' defaults', () => {
    const l = timeouts({});
    expect(l.vitest).toEqual({ testTimeout: 5_000, hookTimeout: 10_000 });
    expect(l.playwright).toEqual({ test: 30_000, expect: 5_000, action: 0, navigation: 0, apiServer: 180_000, webServer: 120_000 });
  });
  it('CI values are larger than every local one', () => {
    const l = timeouts({});
    const c = timeouts({ CI: 'true' });
    for (const k of ['testTimeout', 'hookTimeout'] as const) expect(c.vitest[k], k).toBeGreaterThan(l.vitest[k]);
    for (const k of Object.keys(l.playwright) as (keyof typeof l.playwright)[]) {
      // 0 is "no limit" locally; CI bounds it so a stall names the action instead of eating the test.
      if (l.playwright[k] === 0) expect(c.playwright[k], k).toBeGreaterThan(0);
      else expect(c.playwright[k], k).toBeGreaterThan(l.playwright[k]);
    }
  });
  it('every vitest config and the Playwright config use them', () => {
    for (const f of ['apps/web/vitest.config.ts', 'apps/api/vitest.config.ts', 'packages/cli/vitest.config.ts', 'packages/contract/vitest.config.ts', 'packages/docs-check/vitest.config.ts'])
      expect(readFileSync(join(root, f), 'utf8'), f).toMatch(/timeouts\(\)\.vitest/);
  });
  describe('playwright.config.ts', () => {
    afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
    it('applies the CI values when CI is set and the defaults otherwise', async () => {
      vi.stubEnv('CI', 'true');
      const ci = (await import('../playwright.config')).default;
      expect(ci.timeout).toBe(timeouts({ CI: 'true' }).playwright.test);
      expect(ci.expect?.timeout).toBe(timeouts({ CI: 'true' }).playwright.expect);
      expect(ci.use?.actionTimeout).toBe(timeouts({ CI: 'true' }).playwright.action);
      expect(ci.retries).toBe(1);
      vi.resetModules();
      vi.stubEnv('CI', '');
      const local = (await import('../playwright.config')).default;
      expect(local.timeout).toBe(30_000);
      expect(local.expect?.timeout).toBe(5_000);
    });
  });
});
