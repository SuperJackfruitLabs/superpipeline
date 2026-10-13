// apps/web/e2e/pixel/reference.ts
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import { FAMILIES, SYMBOL_PIN_CSS, pkgDir, referenceFontCss } from './fonts';
import { assertNotBlank } from './compare';
import { masksForPart, resolveMasks, type Mask, type MaskSpec } from './masks';
import { partClip, type Box } from './parts';

export type Theme = 'light' | 'dark';
export const REF_DIR = fileURLToPath(new URL('../reference/mockups', import.meta.url));
export const MANIFEST: Record<string, { w: number; h: number; title: string }> = JSON.parse(readFileSync(join(REF_DIR, 'manifest.json'), 'utf8'));
const MOON = '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"></path>';

export type RefSource = { file: string; derivedDark: boolean };

/** One fixed-vibe file per artboard; dark is an explicit `<artboard>.dark.html` or the light file swapped. */
export function resolveReference(artboard: string, theme: Theme): RefSource | null {
  const light = join(REF_DIR, `${artboard}.html`);
  if (!existsSync(light)) return null;
  if (theme === 'light') return { file: light, derivedDark: false };
  const dark = join(REF_DIR, `${artboard}.dark.html`);
  return existsSync(dark) ? { file: dark, derivedDark: false } : { file: light, derivedDark: true };
}

export function deriveDark(html: string): string {
  const out = html.replace(/data-theme="light"/g, 'data-theme="dark"');
  // The mockup paints <html> (and so the canvas past the artboard) from :root, which carries no theme:
  // swapping the artboard alone left a light band above and below a page drawn dark edge to edge.
  // <html> takes the artboard's vibe and the dark theme, so the canvas is painted dark too.
  const vibe = /<[a-z]+\b[^>]*\bdata-vibe="([a-z]+)"[^>]*\bdata-theme="dark"|<[a-z]+\b[^>]*\bdata-theme="dark"[^>]*\bdata-vibe="([a-z]+)"/.exec(out);
  const v = vibe?.[1] ?? vibe?.[2];
  if (!v) return out;
  return out.replace(/<html\b([^>]*)>/, (tag, attrs: string) => (/\bdata-theme=/.test(attrs) ? tag : `<html${attrs} data-vibe="${v}" data-theme="dark">`));
}

// Mockups pull Google Fonts by <link> and by @import inside <style>; both go, the routed copies replace them.
const stripGoogleFonts = (html: string) => html
  .replace(/<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>/g, '')
  .replace(/@import\s+url\(\s*["']?https:\/\/fonts\.(googleapis|gstatic)\.com[^)]*\)[^;]*;/g, '')
  .replace(/@import\s+["']https:\/\/fonts\.(googleapis|gstatic)\.com[^"']*["'][^;]*;/g, '');

/** The audited theme branches (F §B.3.3): the sun/moon icon, "Dark theme" pressed, the Appearance theme radio. */
export async function applyDarkPatches(page: Pick<Page, "evaluate">): Promise<void> {
  await page.evaluate((moon) => {
    for (const b of document.querySelectorAll<HTMLButtonElement>('[aria-label="Appearance"], [aria-label^="Appearance:"]')) {
      const svg = b.querySelector('svg');
      if (svg && b.closest('.dy-app, .dy-rail, .dp-bar, .dy-top')) svg.innerHTML = moon;
    }
    for (const b of document.querySelectorAll('button')) {
      if (b.textContent?.trim() === 'Dark theme' && b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', 'true');
    }
    // SP-Dlg-Appearance-*: the canvas resolved the theme control at export (dark checks "Dark" and
    // changes its hint), so a swapped light file must be patched the same way (notes `dialogs.md` §1).
    const group = document.querySelector('[role="radiogroup"][aria-label="Light or dark"]');
    if (group) {
      for (const b of group.querySelectorAll<HTMLElement>('[role="radio"]')) {
        const on = b.textContent?.trim() === 'Dark';
        b.setAttribute('aria-checked', String(on));
        b.setAttribute('data-state', on ? 'checked' : 'unchecked');
      }
      const hint = group.parentElement?.querySelector('.ap-hint');
      if (hint) hint.textContent = 'Always dark: a lamp-lit room, not black.';
    }
  }, MOON);
}

/** What went wrong at the sandbox boundary during one render; renderReference throws if non-empty. */
export type PixelOrigin = { errors: string[] };
const LOCAL_HOSTS = new Set(['pixel.local', 'localhost', '127.0.0.1', '[::1]']);

/**
 * Serve the reference and its fonts from a fake origin and abort everything else that is not the
 * app's own localhost origin. Every blocked request, unknown path or missing font file is recorded,
 * never silently 404ed, so a render that leaned on it fails.
 */
export async function installPixelOrigin(page: Page, html: string, fontCss = referenceFontCss()): Promise<PixelOrigin> {
  const origin: PixelOrigin = { errors: [] };
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();
    if (url.hostname !== 'pixel.local') {
      if (LOCAL_HOSTS.has(url.hostname)) return route.continue();
      origin.errors.push(`blocked external request ${url.href}`);
      return route.abort('blockedbyclient');
    }
    // vibekit's own stylesheet, linked by every re-synced reference (Task 5b), served from beside them.
    const vk = /^\/ref\/(_vibekit-[0-9.]+\/[a-z0-9.-]+\.css)$/.exec(url.pathname);
    if (vk) {
      const file = join(REF_DIR, vk[1]!);
      if (existsSync(file)) return route.fulfill({ status: 200, contentType: 'text/css', body: readFileSync(file, 'utf8') });
      origin.errors.push(`missing reference stylesheet ${url.pathname}`);
      return route.fulfill({ status: 404, body: '' });
    }
    if (url.pathname.startsWith('/ref/')) return route.fulfill({ status: 200, contentType: 'text/html', body: html });
    if (url.pathname === '/fonts.css') return route.fulfill({ status: 200, contentType: 'text/css', body: fontCss });
    const m = /^\/fontsource\/(@[^/]+\/[^/]+|[^@/][^/]*)\/files\/([^/]+)$/.exec(url.pathname);
    if (m) {
      let file: string | null = null;
      try { file = join(pkgDir(m[1]!), 'files', m[2]!); } catch { /* unknown package */ }
      if (file && existsSync(file)) return route.fulfill({ status: 200, contentType: 'font/woff2', body: readFileSync(file) });
      origin.errors.push(`missing font file ${url.pathname}`);
      return route.fulfill({ status: 404, body: '' });
    }
    origin.errors.push(`unknown pixel.local path ${url.pathname}`);
    return route.fulfill({ status: 404, body: '' });
  });
  return origin;
}

export function assertOriginClean(origin: PixelOrigin): void {
  if (origin.errors.length) throw new Error(`pixel origin: ${origin.errors.join('; ')}`);
}

/** Harness families the page actually uses (first entry of each element's computed font-family). */
export async function usedFamilies(page: Page): Promise<string[]> {
  return page.evaluate((families) => {
    const used = new Set<string>();
    for (const el of document.querySelectorAll('body, body *')) {
      const f = getComputedStyle(el).fontFamily.split(',')[0]!.trim().replace(/^["']|["']$/g, '');
      if (families.includes(f)) used.add(f);
    }
    return [...used].sort();
  }, FAMILIES);
}

/**
 * The compared element must have a size and some text; an empty or collapsed render is not a match.
 * A part may be a glyph instead (`graphic`: a logo is an svg, no text); it must still draw one.
 */
export async function assertRootRendered(page: Page, selector: string, opts: { graphic?: boolean } = {}): Promise<void> {
  const r = await page.locator(selector).first().evaluate((e) => {
    const b = e.getBoundingClientRect();
    return { w: b.width, h: b.height, text: ((e as HTMLElement).innerText ?? '').trim().length, glyphs: e.querySelectorAll('svg, img').length };
  });
  if (r.w === 0 || r.h === 0) throw new Error(`${selector}: reference root has zero size (${r.w}×${r.h})`);
  if (r.text === 0 && !(opts.graphic && r.glyphs > 0)) throw new Error(`${selector}: reference root has no text`);
}

export async function waitForFonts(page: Page): Promise<void> {
  await page.evaluate(async (families) => {
    await document.fonts.ready;
    const used = new Set<string>();
    for (const el of document.querySelectorAll('*')) used.add(getComputedStyle(el).fontFamily.split(',')[0]!.trim().replace(/^["']|["']$/g, ''));
    await Promise.all([...used].filter((f) => families.includes(f) || /Variable$/.test(f)).flatMap((f) => [
      document.fonts.load(`400 16px "${f}"`), document.fonts.load(`700 16px "${f}"`), document.fonts.load(`italic 400 16px "${f}"`),
    ]));
    await document.fonts.ready;
  }, FAMILIES);
}

/**
 * Each family needs a FontFace in document.fonts with status 'loaded'. document.fonts.check() alone
 * is not enough: it returns true when no face matches the family at all.
 */
export async function assertFamiliesLoaded(page: Page, families: string[]): Promise<void> {
  const missing = await page.evaluate((fs) => {
    const loaded = new Set<string>();
    document.fonts.forEach((ff) => { if (ff.status === 'loaded') loaded.add(ff.family.replace(/^["']|["']$/g, '')); });
    return fs.filter((f) => !loaded.has(f));
  }, families);
  if (missing.length) throw new Error(`fonts not loaded: ${missing.join(', ')}`);
}

const STABILISE = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}::-webkit-scrollbar{display:none}';

export async function renderReference(
  page: Page, src: RefSource, artboard: string,
  opts: { parts?: Array<{ name: string; ref: string; graphic?: boolean }>; masks?: MaskSpec[]; refPatch?: (page: Page) => Promise<void>; fontCss?: string } = {},
): Promise<{ shots: Buffer[]; masks: Mask[]; partMasks: Mask[][]; boxes: Box[] }> {
  const { w, h } = MANIFEST[artboard]!;
  let html = stripGoogleFonts(readFileSync(src.file, 'utf8'));
  if (src.derivedDark) html = deriveDark(html);
  html = html.replace('</head>', `<link rel="stylesheet" href="http://pixel.local/fonts.css"><style>${STABILISE}${SYMBOL_PIN_CSS}</style></head>`);
  await page.setViewportSize({ width: w, height: h });
  const origin = await installPixelOrigin(page, html, opts.fontCss);
  await page.goto(`http://pixel.local/ref/${artboard}.html`);
  if (src.derivedDark) await applyDarkPatches(page);
  if (opts.refPatch) await opts.refPatch(page);
  // A font load that fails rejects inside the page with a bare NetworkError; name the file instead.
  try { await waitForFonts(page); } catch (e) { assertOriginClean(origin); throw e; }
  assertOriginClean(origin);
  await assertRootRendered(page, 'body');
  const families = await usedFamilies(page);
  if (families.length === 0) throw new Error(`${artboard}: reference uses none of the harness font families`);
  await assertFamiliesLoaded(page, families);
  const masks = await resolveMasks(page, opts.masks ?? [], 'ref');
  if (opts.parts?.length) {
    const shots: Buffer[] = [];
    const partMasks: Mask[][] = [];
    const boxes: Box[] = [];
    for (const p of opts.parts) {
      const el = page.locator(p.ref).first();
      const box = await el.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }; });
      await assertRootRendered(page, p.ref, { graphic: p.graphic });
      const clip = partClip(box);
      const shot = await page.screenshot({ clip, fullPage: true, animations: 'disabled' });
      assertNotBlank(shot, `${artboard} part ${p.name}`);
      shots.push(shot);
      partMasks.push(masksForPart(masks, clip));
      boxes.push(box);
    }
    return { shots, masks: [], partMasks, boxes };
  }
  const shot = await page.screenshot({ clip: { x: 0, y: 0, width: w, height: h }, animations: 'disabled' });
  assertNotBlank(shot, artboard);
  assertOriginClean(origin);
  return { shots: [shot], masks, partMasks: [], boxes: [] };
}
