// apps/web/scripts/pixel/extract-css.test.ts
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = new URL('./extract-css.mjs', import.meta.url).pathname;
const run = (...args: string[]) => execFileSync('node', [script, ...args], { encoding: 'utf8' });
/** A reference folder of hand-written artboards (the retired page references can no longer serve). */
function fixtures(files: Record<string, string>): NodeJS.ProcessEnv {
  const dir = mkdtempSync(join(tmpdir(), 'ecss-'));
  for (const [name, html] of Object.entries(files)) writeFileSync(join(dir, `${name}.html`), html);
  return { ...process.env, REF_DIR: dir };
}

describe('extract-css', () => {
  it('pulls one prefix’s rules out of a reference, media queries included, canvas rules dropped', () => {
    const css = run('SP-Operate-Daylight', '--prefix', 'dy-');
    expect(css).toMatch(/\.dy-rail\s*[,{]/);
    expect(css).not.toMatch(/\.sc-placeholder/);
    expect(css).not.toMatch(/\.mh-|\.ar-|\.qn-/);
  });
  it('--exclude drops the rules of whole classes vibekit draws, and keeps their neighbours', () => {
    const css = run('SP-Operate-Daylight', '--prefix', 'dy-', '--exclude', 'dy-rail,dy-dest');
    expect(css).not.toMatch(/\.dy-rail(?![\w-])/);
    expect(css).not.toMatch(/\.dy-dest(?![\w-])/);
    expect(css).toMatch(/\.dy-dests\s*\{/);
    expect(css).toMatch(/\.dy-crew\s*\{/);
  });
  it('fails loudly on an artboard that does not exist', () => {
    expect(() => run('SP-Nope-Daylight', '--prefix', 'dy-')).toThrow();
  });
  it('unions several artboards and keeps each rule once', () => {
    const env = fixtures({
      'A-Daylight': '<style>.t-h1 { font: 700 2rem/1.15 serif; } .t-meta { color: grey; }</style>',
      'A-Paper': '<style>.t-h1 { font: 700 2rem/1.15 serif; } [data-vibe="paper"] .t-h1, [data-vibe="paper"] .t-h2 { font-weight: 500; }</style>',
    });
    const css = execFileSync('node', [script, 'A-Daylight,A-Paper', '--prefix', 't-'], { encoding: 'utf8', env });
    expect(css).toContain('[data-vibe="paper"] .t-h1, [data-vibe="paper"] .t-h2 {');
    expect(css.match(/^\.t-h1 \{/gm)).toHaveLength(1);
  });
  it('keeps rules by an anchored selector regex', () => {
    const env = fixtures({ B: '<style>details > summary { cursor: pointer; } .t-h1 { margin: 0; } .x details { color: red; }</style>' });
    const css = execFileSync('node', [script, 'B', '--match', '^details'], { encoding: 'utf8', env });
    expect(css).toContain('details > summary {');
    expect(css).not.toContain('.t-h1');
  });
  it('--where scopes with zero specificity, after any vibe or theme ancestor', () => {
    const env = fixtures({ C: '<style>.ptitle { margin: 0; } [data-vibe="paper"] .ptitle { font-weight: 500; }</style>' });
    const css = execFileSync('node', [script, 'C', '--prefix', 'ptitle', '--where', '.scr-projects'], { encoding: 'utf8', env });
    expect(css).toContain(':where(.scr-projects) .ptitle {');
    expect(css).toContain('[data-vibe="paper"] :where(.scr-projects) .ptitle {');
  });
  it('--skip-vibekit ignores the style block that defines the tokens, keeping the page’s own rules', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ecss-'));
    writeFileSync(join(dir, 'X.html'), '<style>:root { --vk-color-bg: #fff; } .t-tok { color: red; }</style><style>.t-own { color: blue; }</style>');
    const env = { ...process.env, REF_DIR: dir };
    const all = execFileSync('node', [script, 'X', '--prefix', 't-'], { encoding: 'utf8', env });
    const page = execFileSync('node', [script, 'X', '--prefix', 't-', '--skip-vibekit'], { encoding: 'utf8', env });
    expect(all).toContain('.t-tok');
    expect(page).not.toContain('.t-tok');
    expect(page).toContain('.t-own { color: blue; }');
  });
  it('--where leaves a selector that already names the scope alone, and keeps .ar outside it', () => {
    const env = fixtures({ D: '<style>.pj-main { display: grid; } .ar .u.act { background: black; }</style>' });
    const css = execFileSync('node', [script, 'D', '--prefix', 'pj-main', '--match', '^\\.ar \\.u\\.act', '--where', '.pj-main'], { encoding: 'utf8', env });
    expect(css).toMatch(/^\.pj-main \{/m);
    expect(css).toContain('.ar :where(.pj-main) .u.act {');
  });
});
