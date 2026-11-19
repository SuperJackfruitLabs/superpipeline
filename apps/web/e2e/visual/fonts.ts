// apps/web/e2e/visual/fonts.ts — the font families the visual capture waits for, and the one-glyph pin
// that keeps ⌘ off the system fallback.

/** The product's families (vibekit's Fontsource files); a capture waits until each one it uses has loaded. */
export const FAMILIES = [
  'Archivo', 'Azeret Mono', 'Newsreader', 'Atkinson Hyperlegible Next', 'Bricolage Grotesque', 'Figtree', 'Geist',
  'Instrument Sans', 'Martian Mono',
];

/**
 * The mono families have no ⌘ (U+2318), so Chromium draws it from a system fallback font, which differs
 * between machines and font sets. The capture gives that one code point a fixed local face, under every
 * mono family name the app uses, so the glyph never depends on the fallback. Product CSS is untouched;
 * real users see their own system's ⌘.
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
