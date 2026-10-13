// apps/web/e2e/pixel/reference.test.ts
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deriveDark, MANIFEST, REF_DIR, resolveReference } from './reference';

describe('references', () => {
  it('the manifest lists exactly the 80 committed artboards', () => {
    const files = readdirSync(REF_DIR).filter((f) => /^SP-.*\.html$/.test(f) && !f.includes('.dark.')).map((f) => f.replace(/\.html$/, ''));
    expect(files.sort()).toEqual(Object.keys(MANIFEST).sort());
    expect(files).toHaveLength(80);
  });
  it('every artboard names its vibe in its file name', () => {
    for (const a of Object.keys(MANIFEST)) expect(a).toMatch(/-(Daylight|Paper|Studio|Quiet)$/);
  });
  it('dark is derived from the light file unless an explicit export exists', () => {
    expect(resolveReference('SP-Board-Paper', 'light')).toMatchObject({ derivedDark: false });
    expect(resolveReference('SP-Board-Paper', 'dark')).toMatchObject({ derivedDark: true });
    expect(resolveReference('SP-Nope-Paper', 'light')).toBeNull();
  });
  it('deriveDark leaves no light theme behind', () => {
    const out = deriveDark('<div data-theme="light"><i data-theme="light"></i></div>');
    expect(out).not.toContain('data-theme="light"');
    expect(out.match(/data-theme="dark"/g)).toHaveLength(2);
  });
  it('deriveDark paints <html> in the artboard\'s vibe and the dark theme, so no light band shows past the artboard', () => {
    const out = deriveDark('<html lang="en" style="x"><body><div class="pg" data-vibe="paper" data-theme="light"></div></body></html>');
    expect(out).toMatch(/<html lang="en" style="x" data-vibe="paper" data-theme="dark">/);
    // A real reference: its <html> background comes from :root, so <html> must carry the theme.
    const ref = deriveDark(readFileSync(join(REF_DIR, 'SP-CardPage-Paper.html'), 'utf8'));
    expect(ref).toMatch(/<html[^>]*data-vibe="paper"[^>]*data-theme="dark"/);
  });
});
