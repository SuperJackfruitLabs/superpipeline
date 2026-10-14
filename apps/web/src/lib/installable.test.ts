/**
 * The app can be installed to a phone's home screen.
 *
 * Installability is a set of declarations that no screen shows when they break: a manifest missing
 * `display` or a 512px icon is just not offered for install, and an apple-touch-icon with a
 * transparent background turns black on iOS. So the declarations are checked here, from the
 * files that ship. That the Worker serves them, unauthenticated and with the manifest's media
 * type, is e2e/installable.spec.ts.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const WEB = join(__dirname, '..', '..');
const STATIC = join(WEB, 'static');
const html = readFileSync(join(WEB, 'src', 'app.html'), 'utf8');

/** Width, height, and colour type from a PNG's IHDR chunk. Colour types 4 and 6 carry alpha. */
function png(path: string): { width: number; height: number; alpha: boolean } {
  const b = readFileSync(path);
  expect(b.subarray(1, 4).toString('latin1')).toBe('PNG');
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), alpha: b[25] === 4 || b[25] === 6 };
}

interface Manifest {
  name?: string;
  short_name?: string;
  start_url?: string;
  scope?: string;
  display?: string;
  background_color?: string;
  theme_color?: string;
  icons?: { src: string; sizes: string; type: string; purpose?: string }[];
}

describe('installable', () => {
  it('app.html links the manifest and declares the iOS home-screen tags', () => {
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
    expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png" />');
    expect(html).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />');
    expect(html).toContain('<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />');
    expect(html).toContain('<meta name="apple-mobile-web-app-title" content="Superpipeline" />');
    expect(html).toMatch(/<meta name="theme-color" content="#[0-9a-f]{6}" media="\(prefers-color-scheme: dark\)" \/>/);
    expect(html).toMatch(/<meta name="theme-color" content="#[0-9a-f]{6}" media="\(prefers-color-scheme: light\)" \/>/);
    // The translucent-v2 favicon set (static/brand/README.md): adaptive SVG first, then the ICO and PNGs.
    expect(html).toContain('<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48" />');
    expect(html).toContain('<link rel="icon" type="image/svg+xml" href="/brand/favicon.svg" />');
    for (const px of [16, 32, 48]) expect(html).toContain(`<link rel="icon" type="image/png" sizes="${px}x${px}" href="/brand/favicon-${px}.png" />`);
    expect(html).not.toMatch(/data:image\/svg/);
  });

  it('registers no service worker: nothing is cached offline', () => {
    expect(html).not.toMatch(/serviceWorker/);
    expect(existsSync(join(WEB, 'src', 'service-worker.ts'))).toBe(false);
    expect(existsSync(join(WEB, 'src', 'service-worker.js'))).toBe(false);
  });

  it('the manifest parses and names what an install needs', () => {
    const m = JSON.parse(readFileSync(join(STATIC, 'manifest.webmanifest'), 'utf8')) as Manifest;
    expect(m.name).toBe('Superpipeline');
    expect(m.short_name).toBeTruthy();
    expect(m.start_url).toBe('/');
    expect(m.scope).toBe('/');
    expect(m.display).toBe('standalone');
    // Daylight's light --vk-color-bg, the first-visit default.
    expect(m.background_color).toBe('#fff8ee');
    expect(m.theme_color).toBe('#fff8ee');
    const want = [
      ['192x192', 'any'],
      ['512x512', 'any'],
      ['192x192', 'maskable'],
      ['512x512', 'maskable'],
    ];
    for (const [sizes, purpose] of want) {
      expect(m.icons?.some((i) => i.sizes === sizes && (i.purpose ?? 'any') === purpose && i.type === 'image/png')).toBe(true);
    }
  });

  it('every icon file exists at the size it declares, with an opaque background', () => {
    const m = JSON.parse(readFileSync(join(STATIC, 'manifest.webmanifest'), 'utf8')) as Manifest;
    const icons = [...(m.icons ?? []).map((i) => ({ src: i.src, sizes: i.sizes })), { src: '/apple-touch-icon.png', sizes: '180x180' }];
    for (const { src, sizes } of icons) {
      const [w, h] = sizes.split('x').map(Number);
      const file = join(STATIC, src.replace(/^\//, ''));
      expect(existsSync(file), src).toBe(true);
      expect(png(file), src).toEqual({ width: w, height: h, alpha: false });
    }
  });

  it('the favicon files ship at the sizes the links declare', () => {
    for (const px of [16, 32, 48]) expect(png(join(STATIC, 'brand', `favicon-${px}.png`))).toMatchObject({ width: px, height: px });
    const svg = readFileSync(join(STATIC, 'brand', 'favicon.svg'), 'utf8');
    expect(svg).toContain('viewBox="0 0 256 256"');
    expect(svg).toContain('prefers-color-scheme:dark');
    // An ICO header: reserved 0, type 1 (icon), three frames.
    const ico = readFileSync(join(STATIC, 'favicon.ico'));
    expect([ico.readUInt16LE(0), ico.readUInt16LE(2), ico.readUInt16LE(4)]).toEqual([0, 1, 3]);
  });

  it('Cloudflare is told the manifest media type', () => {
    expect(readFileSync(join(STATIC, '_headers'), 'utf8')).toMatch(/\/manifest\.webmanifest\n\s+Content-Type: application\/manifest\+json/);
  });
});
