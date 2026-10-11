import { readFileSync } from 'node:fs';
import { HEAD_SCRIPT } from '@superjackfruit/vibekit';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

describe('app.html paints the right vibe on the first frame', () => {
  it('inlines vibekit HEAD_SCRIPT verbatim, so an upgrade cannot leave a stale copy', () => {
    expect(html).toContain(HEAD_SCRIPT);
  });
  it('runs the legacy-theme migration before HEAD_SCRIPT and both before %sveltekit.head%', () => {
    const migrate = html.indexOf("localStorage.getItem('superpipeline.theme')");
    const head = html.indexOf(HEAD_SCRIPT);
    expect(migrate).toBeGreaterThan(-1);
    expect(migrate).toBeLessThan(head);
    expect(head).toBeLessThan(html.indexOf('%sveltekit.head%'));
  });
  it('no longer writes data-theme from the OS preference', () => {
    expect(html).not.toMatch(/matchMedia\('\(prefers-color-scheme/);
  });
});
