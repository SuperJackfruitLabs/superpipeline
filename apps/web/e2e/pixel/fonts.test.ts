// apps/web/e2e/pixel/fonts.test.ts
import { describe, expect, it } from 'vitest';
import { FONT_MAP, referenceFontCss } from './fonts';

describe('reference fonts', () => {
  it('serves every mockup family from the app’s own Fontsource files', () => {
    const css = referenceFontCss();
    for (const family of Object.keys(FONT_MAP)) expect(css).toContain(`font-family: '${family}'`);
    expect(css).not.toMatch(/Variable'/);
    expect(css).not.toContain('./files/');
    expect(css).toContain('http://pixel.local/fontsource/@fontsource-variable/archivo/files/');
    // vibekit 0.0.3's fonts.css draws Newsreader and Bricolage from their opsz files; the references must get the same cut.
    expect(css).toContain('/fontsource/@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2');
    expect(css).toContain('/fontsource/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-opsz-normal.woff2');
  });
});
