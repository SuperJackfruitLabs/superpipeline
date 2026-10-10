import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../app.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

describe('vibekit is the only source of colour and type', () => {
  it('declares the cascade order before anything else', () => {
    expect(css.trimStart().startsWith('@layer theme, base, vk, components, utilities;')).toBe(true);
  });

  it('imports tailwind, then vibekit fonts, then vibekit styles', () => {
    const tw = css.indexOf("@import 'tailwindcss';");
    const fonts = css.indexOf("@import '@superjackfruit/vibekit/fonts.css';");
    const vk = css.indexOf("@import '@superjackfruit/vibekit/vibekit.css';");
    expect(tw).toBeGreaterThan(-1);
    expect(fonts).toBeGreaterThan(tw);
    expect(vk).toBeGreaterThan(fonts);
  });

  it('maps every Tailwind colour and font name to a vibekit variable', () => {
    const block = /@theme inline \{([\s\S]*?)\n\}/.exec(css)![1]!;
    const lines = block.split('\n').filter((l) => /--(color|font|radius)-/.test(l));
    expect(lines.length).toBeGreaterThan(30);
    for (const l of lines) expect(l, l.trim()).toMatch(/var\(--vk-/);
  });

  it('keeps no hand-written palette or retired fonts', () => {
    expect(css).not.toMatch(/--ink:\s*#/);
    expect(css).not.toContain("[data-theme='light']");
    expect(css).not.toMatch(/IBM Plex|Space Grotesk/);
  });

  it('loads no Google Fonts', () => {
    expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });
});
