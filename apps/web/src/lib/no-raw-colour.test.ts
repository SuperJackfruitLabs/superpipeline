import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = new URL('..', import.meta.url).pathname;
// Not global: a /g regex keeps lastIndex between .test() calls and skips lines.
const RAW = /(?<![\w{&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b(?![\w-])|\b(?:rgba?|hsla?)\(/;
// Tailwind classes built on raw palette colours (bg-black/55, text-red-500) bypass the tokens too.
const RAW_CLASS =
  /\b(?:bg|text|border|ring|fill|stroke|from|to|via|outline|shadow|divide|placeholder|accent|caret|decoration)-(?:black|white)\b|-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b/;
const ALLOW: Record<string, RegExp> = {
  'app.css': /--sp-scrim:/,
  'lib/components/workspace/LabelManager.svelte': /colour|color/i,
};

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (f === 'vendor' || f === 'node_modules') return [];
    return statSync(p).isDirectory() ? files(p) : /\.svelte$|^app\.css$/.test(f) ? [p] : [];
  });
}

describe('colour comes from vibekit tokens', () => {
  const all = files(SRC);
  it('scans the app', () => expect(all.length).toBeGreaterThan(40));
  for (const f of all) {
    const rel = relative(SRC, f);
    it(`${rel} has no raw colour`, () => {
      const bad = readFileSync(f, 'utf8')
        .split('\n')
        .map((line, i) => ({ line, n: i + 1 }))
        .filter(({ line }) => !line.trim().startsWith('//') && (RAW.test(line) || (f.endsWith('.svelte') && RAW_CLASS.test(line))) && !(ALLOW[rel]?.test(line)))
        .map(({ line, n }) => `${n}: ${line.trim()}`);
      expect(bad).toEqual([]);
    });
  }
  it('per-vibe blocks style, never hide', () => {
    const css = readFileSync(join(SRC, 'app.css'), 'utf8');
    const blocks = css.split('/* vibe:').slice(1).map((b) => b.split('/* end vibe */')[0]!);
    expect(blocks.length).toBe(4);
    for (const b of blocks) expect(b).not.toMatch(/display:\s*none|visibility:\s*hidden/);
  });
});
