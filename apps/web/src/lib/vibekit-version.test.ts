import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as vk from '@superjackfruit/vibekit';

const require = createRequire(import.meta.url);
// package.json is not an exported subpath; accents.css is, and sits at <pkg>/dist/styles.
const dir = join(dirname(require.resolve('@superjackfruit/vibekit/accents.css')), '..', '..');
const css = ['vibekit.css', 'tokens.css', 'accents.css', 'type.css', 'derived.css'].map((f) => { try { return readFileSync(join(dir, 'dist/styles', f), 'utf8'); } catch { return ''; } }).join('\n');

describe('the component-library vibekit release is the library in use', () => {
  it('is version 0.0.10 (the operator-ruled release number)', () => expect(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version).toBe('0.0.10'));
  it('exports the components and the accent API the screens use', () => {
    for (const n of ['VibeRoot', 'AppShell', 'AppNav', 'Masthead', 'StatusLine', 'PhoneTabBar', 'PhoneHeader', 'Button', 'IconButton', 'Tabs', 'Segmented',
      'QuickFilter', 'Field', 'Choice', 'CommandField', 'CommandPalette', 'Kbd', 'CopyId', 'Disclosure', 'Menu', 'DataTable', 'FactList', 'PageHead', 'Hero',
      'FigureRow', 'SmallMultiples', 'StageTrack', 'StateLabel', 'AgentName', 'Face', 'AgentQuote', 'Footnotes', 'FootnoteRef', 'SectionHeader', 'Dialog',
      'Drawer', 'Sheet', 'Toast', 'Toaster', 'Notice', 'EmptyState', 'Loading', 'LoadMore', 'Meter', 'Sky',
      'ACCENTS', 'ACCENT_CHOICES', 'ACCENT_LABELS', 'PRODUCT_ACCENTS', 'resolveAccent', 'accentFor', 'withAccent', 'htmlAttributes', 'HEAD_SCRIPT']) expect(vk, n).toHaveProperty(n);
  });
  it('stops the sweep if the accent tokens are missing', () => {
    expect(css).toMatch(/\[data-accent="gold"\]/);
    for (const t of ['--vk-color-accent', '--vk-color-accent-fg', '--vk-color-accent-wash', '--vk-color-accent-text']) expect(css).toContain(t);
  });
  it("Superpipeline's own colour is gold", () => {
    expect(vk.PRODUCT_ACCENTS.superpipeline).toBe('gold');
    expect(vk.resolveAccent('product', 'superpipeline')).toBe('gold');
  });
  it('ships the type scale and derived tokens', () => {
    for (const t of ['--vk-type-h1', '--vk-type-meta', '--vk-color-rule', '--vk-stage-7', '--vk-scrim', '--vk-color-select']) expect(css).toContain(t);
  });
  it('loads the display faces with their optical-size axis, and both the app and the pixel references can serve those files', () => {
    const fonts = readFileSync(join(dir, 'dist/styles/fonts.css'), 'utf8');
    for (const f of ['@fontsource-variable/bricolage-grotesque/opsz.css', '@fontsource-variable/newsreader/opsz.css', '@fontsource-variable/newsreader/opsz-italic.css']) {
      expect(fonts).toContain(f);
      expect(() => require.resolve(f)).not.toThrow();
    }
  });
});
