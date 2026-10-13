// apps/web/scripts/pixel/extract-css.test.ts
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = new URL('./extract-css.mjs', import.meta.url).pathname;
const run = (...args: string[]) => execFileSync('node', [script, ...args], { encoding: 'utf8' });

describe('extract-css', () => {
  it('pulls one prefix’s rules out of a reference, media queries included, canvas rules dropped', () => {
    const css = run('SP-Board-Daylight', '--prefix', 'dy-');
    expect(css).toMatch(/\.dy-rail\s*[,{]/);
    expect(css).not.toMatch(/\.sc-placeholder/);
    expect(css).not.toMatch(/\.mh-|\.ar-|\.qn-/);
  });
  it('--exclude drops the rules of whole classes vibekit draws, and keeps their neighbours', () => {
    const css = run('SP-Board-Daylight', '--prefix', 'dy-', '--exclude', 'dy-rail,dy-dest');
    expect(css).not.toMatch(/\.dy-rail(?![\w-])/);
    expect(css).not.toMatch(/\.dy-dest(?![\w-])/);
    expect(css).toMatch(/\.dy-dests\s*\{/);
    expect(css).toMatch(/\.dy-crew\s*\{/);
  });
  it('fails loudly on an artboard that does not exist', () => {
    expect(() => run('SP-Nope-Daylight', '--prefix', 'dy-')).toThrow();
  });
  it('unions several artboards and keeps each rule once', () => {
    const css = run('SP-Projects-Daylight,SP-Projects-Paper', '--prefix', 't-');
    expect(css).toContain('[data-vibe="paper"] .t-h1, [data-vibe="paper"] .t-h2 {');
    expect(css.match(/^\.t-h1 \{/gm)).toHaveLength(1);
  });
  it('keeps rules by an anchored selector regex', () => {
    const css = run('SP-Projects-Daylight', '--match', '^details');
    expect(css).toContain('details > summary {');
    expect(css).not.toContain('.t-h1');
  });
  it('--where scopes with zero specificity, after any vibe or theme ancestor', () => {
    const css = run('SP-Projects-Paper', '--prefix', 'ptitle', '--where', '.scr-projects');
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
    const css = run('SP-Projects-Studio', '--prefix', 'pj-main', '--match', '^\\.ar \\.u\\.act', '--where', '.pj-main');
    expect(css).toMatch(/^\.pj-main \{/m);
    expect(css).toContain('.ar :where(.pj-main) .u.act {');
  });
});
