import { describe, expect, it } from 'vitest';
import { shouldRunPixel, touchesDesignInputs } from './design-inputs.mjs';

describe('pixel job scope', () => {
  it.each([
    'apps/web/vendor/vibekit-0.0.11.tgz',
    'apps/web/e2e/reference/mockups/SP-Board-Paper.html',
    'apps/web/e2e/pixel/screens.ts',
    'apps/web/src/lib/components/shell/AppShell.svelte',
    'apps/web/src/lib/styles/shell/paper.css',
    'apps/web/src/app.html',
  ])('a PR touching %s runs it', (f) => expect(touchesDesignInputs(['README.md', f])).toBe(true));
  it.each([
    'apps/web/src/lib/components/card/CardPage.svelte',
    'apps/web/src/app.css',
    'apps/api/src/index.ts',
    'apps/web/e2e/rich-card.spec.ts',
    'apps/web/vendorish/x',
  ])('a PR touching only %s skips it', (f) => expect(touchesDesignInputs([f])).toBe(false));
  it('push and schedule always run it; a PR only on design inputs', () => {
    expect(shouldRunPixel('push', [])).toBe(true);
    expect(shouldRunPixel('schedule', [])).toBe(true);
    expect(shouldRunPixel('workflow_dispatch', [])).toBe(true);
    expect(shouldRunPixel('pull_request', ['apps/api/x.ts'])).toBe(false);
    expect(shouldRunPixel('pull_request', ['apps/web/src/app.html'])).toBe(true);
  });
});
