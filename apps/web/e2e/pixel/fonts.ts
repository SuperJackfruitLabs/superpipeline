// apps/web/e2e/pixel/fonts.ts
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);

/** mockup family → [package, css entry files…]; Fontsource family name is read from the CSS. */
export const FONT_MAP: Record<string, [string, ...string[]]> = {
  'Archivo': ['@fontsource-variable/archivo', 'wdth.css'],
  'Azeret Mono': ['@fontsource-variable/azeret-mono', 'index.css', 'wght-italic.css'],
  'Newsreader': ['@fontsource-variable/newsreader', 'opsz.css', 'opsz-italic.css'],
  'Atkinson Hyperlegible Next': ['@fontsource/atkinson-hyperlegible-next', '400.css', '700.css', '400-italic.css', '700-italic.css'],
  'Bricolage Grotesque': ['@fontsource-variable/bricolage-grotesque', 'opsz.css'],
  'Figtree': ['@fontsource-variable/figtree', 'index.css', 'wght-italic.css'],
  'Geist': ['@fontsource-variable/geist', 'index.css'],
  'Instrument Sans': ['@fontsource-variable/instrument-sans', 'index.css', 'wght-italic.css'],
  'Martian Mono': ['@fontsource-variable/martian-mono', 'index.css'],
};

export function pkgDir(pkg: string): string {
  return dirname(require.resolve(`${pkg}/package.json`));
}

/** @font-face CSS for the reference page: Fontsource files under the mockup's family names. */
export function referenceFontCss(origin = 'http://pixel.local'): string {
  const out: string[] = [];
  for (const [family, [pkg, ...entries]] of Object.entries(FONT_MAP)) {
    for (const entry of entries) {
      let css: string;
      try { css = readFileSync(join(pkgDir(pkg), entry), 'utf8'); } catch { continue; } // optional italic entries
      css = css
        .replace(/font-family:\s*'[^']+'/g, `font-family: '${family}'`)
        .replace(/url\(\.\/files\/([^)]+)\)/g, `url(${origin}/fontsource/${pkg}/files/$1)`);
      out.push(css);
    }
  }
  return out.join('\n');
}

export const FAMILIES = Object.keys(FONT_MAP);

/**
 * The mono families have no ⌘ (U+2318), so Chromium draws it from a system fallback font, and on
 * Linux the reference's span and the app's vibekit Kbd were given different fallbacks (CI linux-x64:
 * the reference's ⌘ is 10px wide, the app's 8px, so every Search ⌘K button was 6px narrower and its
 * row shifted: SP-Board-Quiet#shell 1.27%, SP-Board-Paper#shell 0.97%). Both pages get the same
 * local face for that one code point, under every mono family name either page uses, so the glyph
 * no longer depends on the fallback. Product CSS is untouched; real users see their own system's ⌘.
 */
const SYMBOL_LOCALS = "local('DejaVu Sans Mono'), local('DejaVuSansMono'), local('Menlo-Regular'), local('Menlo')";
// Each pin face carries its family's exact descriptors (Fontsource's weight range and style): a face
// whose descriptors differ is matched as a separate face and would hide the family's real faces.
const PIN_DESCRIPTORS: Array<[family: string, weight: string, style: string]> = [
  ['Martian Mono', '100 800', 'normal'], ['Martian Mono Variable', '100 800', 'normal'],
  ['Azeret Mono', '100 900', 'normal'], ['Azeret Mono', '100 900', 'italic'],
  ['Azeret Mono Variable', '100 900', 'normal'], ['Azeret Mono Variable', '100 900', 'italic'],
];
export const SYMBOL_PIN_CSS = PIN_DESCRIPTORS
  .map(([f, w, st]) => `@font-face{font-family:'${f}';font-style:${st};font-display:swap;font-weight:${w};src:${SYMBOL_LOCALS};unicode-range:U+2318}`)
  .join('');
