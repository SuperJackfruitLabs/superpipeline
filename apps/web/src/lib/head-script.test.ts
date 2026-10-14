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
  it('names the product on <html>, so HEAD_SCRIPT paints its accent on the first frame', () => {
    expect(html).toMatch(/<html lang="en" data-product="superpipeline">/);
  });
  it('paints each vibe and theme’s own background on the first frame, matching vibekit’s tokens', () => {
    const tokens = readFileSync(new URL('../../node_modules/@superjackfruit/vibekit/dist/styles/tokens.css', import.meta.url), 'utf8');
    for (const vibe of ['daylight', 'paper', 'studio', 'quiet']) {
      for (const theme of ['light', 'dark']) {
        const block = new RegExp(`\\[data-vibe="${vibe}"\\]\\[data-theme="${theme}"\\] \\{[^}]*?--vk-color-bg: (#[0-9a-f]+);`).exec(tokens);
        expect(block, `${vibe} ${theme} in tokens.css`).not.toBeNull();
        const want = block![1];
        const rule = vibe === 'daylight' && theme === 'light' ? /:where\(html\)\{background:(#[0-9a-f]+)/ : new RegExp(`:where\\(html\\[data-vibe=${vibe}\\]\\[data-theme=${theme}\\]\\)\\{background:(#[0-9a-f]+)`);
        expect(rule.exec(html)?.[1], `${vibe} ${theme}`).toBe(want);
      }
    }
  });
});
