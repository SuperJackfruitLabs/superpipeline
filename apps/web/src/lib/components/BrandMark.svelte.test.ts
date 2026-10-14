// @vitest-environment jsdom
/**
 * The Superpipeline mark is the translucent-v2 "Channel" (static/brand/README.md), drawn inline
 * so it can take its colour from CSS. The old three-path pipe mark must not survive anywhere
 * the product is shown: the app, the landing page, the docs site and the link preview.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import BrandMark from './BrandMark.svelte';

const REPO = join(__dirname, '..', '..', '..', '..', '..');
const CHANNEL_TOP = 'M24 105C24 91 32 81 45 75L171 18';
const CHANNEL_BOTTOM = 'M64 198L156 145C164 141 167 138 168 129';

afterEach(cleanup);

describe('BrandMark', () => {
  it('draws the Channel: both halves, the pack viewBox, no fixed fill', () => {
    const { container } = render(BrandMark);
    const svg = container.querySelector('svg.brandmark')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 256 256');
    const d = [...svg.querySelectorAll('path')].map((p) => p.getAttribute('d') ?? '');
    expect(d.some((x) => x.startsWith(CHANNEL_TOP))).toBe(true);
    expect(d.some((x) => x.startsWith(CHANNEL_BOTTOM))).toBe(true);
    for (const p of svg.querySelectorAll('path')) expect(p.getAttribute('fill')).toBe('currentColor');
  });

  it('is decorative unless labelled', () => {
    const { container } = render(BrandMark);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('role')).toBeNull();
    cleanup();
    const labelled = render(BrandMark, { label: 'Superpipeline' }).container.querySelector('svg')!;
    expect(labelled.getAttribute('role')).toBe('img');
    expect(labelled.getAttribute('aria-label')).toBe('Superpipeline');
    expect(labelled.getAttribute('aria-hidden')).toBeNull();
  });
});

/** Every shipped text file where the product shows its mark. */
function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.svelte-kit', 'build', 'dist', '.astro', 'reference', 'pixel', 'visual'].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.(svelte|ts|html|astro|mjs|css|svg|webmanifest|md|sh)$/.test(name)) out.push(p);
  }
  return out;
}

describe('no leftover old mark', () => {
  const roots = ['apps/web/src', 'apps/web/static', 'apps/web/scripts', 'apps/web/e2e', 'landing', 'docs-site/src', 'docs-site/public', 'docs-site/astro.config.mjs'];
  const all = roots.flatMap((r) => (statSync(join(REPO, r)).isDirectory() ? files(join(REPO, r)) : [join(REPO, r)])).filter((f) => !f.endsWith('BrandMark.svelte.test.ts'));

  it('nothing draws the old pipe mark', () => {
    const hits = all.filter((f) => readFileSync(f, 'utf8').includes('M8.5 6H15a3 3 0 0 1 0 6H9')).map((f) => relative(REPO, f));
    expect(hits).toEqual([]);
  });

  it('nothing refers to the old root icon files', () => {
    const old = /["'(]\/?(icon-192|icon-512|icon-maskable-512)\.png/;
    const hits = all.filter((f) => old.test(readFileSync(f, 'utf8'))).map((f) => relative(REPO, f));
    expect(hits).toEqual([]);
  });

  it('the old icon renderer is gone', () => {
    expect(() => statSync(join(REPO, 'apps/web/scripts/render-icons.sh'))).toThrow();
  });
});
