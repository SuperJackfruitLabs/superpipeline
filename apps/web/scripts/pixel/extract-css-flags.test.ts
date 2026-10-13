// apps/web/scripts/pixel/extract-css-flags.test.ts
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const script = fileURLToPath(new URL('./extract-css.mjs', import.meta.url));
const run = (...args: string[]) => execFileSync('node', [script, ...args], { encoding: 'utf8' });
/** The shell classes vibekit draws in Studio, plus the board's own prefixes: the Annual base keeps neither. */
const ANNUAL_EXCLUDE = 'vk-button,ar-rail,ar-mark,ar-nav,ar-acct,ar-top,ar-board,ar-sw,ar-cmd,ar-live,ar-sub,ar-tab,ar-status,ar-sm,ar-mul,ar-share,bd,bd-body';

describe('extract-css flags', () => {
  it('--exclude drops the shell and board rules from the Annual base', () => {
    const css = run('SP-Board-Studio', '--prefix', 'ar', '--exclude', ANNUAL_EXCLUDE);
    expect(css).toContain('.ar .u.needs {');
    expect(css).toContain('.ar-tbl {');
    for (const gone of ['ar-rail', 'ar-top', 'ar-sub', 'ar-status', 'ar-sm', 'ar-share', 'vk-button']) expect(css).not.toMatch(new RegExp(`\\.${gone}(?![\\w-])`));
    expect(css).not.toContain('.ar.bd {');
  });
  it('annual.css is that port, with no hex colour and no body rule', () => {
    const css = readFileSync(fileURLToPath(new URL('../../src/lib/styles/annual.css', import.meta.url)), 'utf8');
    expect(css).toMatch(/^\/\*[^\n]*\n:where\(\.ar\) \*/);
    expect(css).toContain('.ar .u.working {');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/^body\s*\{/m);
    expect(css).not.toMatch(/\.vk-/);
  });
  it('--scope prefixes every selector and keeps the html theme attribute in front', () => {
    const css = run('SP-Phone-Board-Daylight', '--prefix', 'nav,greet', '--scope', '.ph-root[data-shell="daylight-phone"]');
    expect(css).toContain('.ph-root[data-shell="daylight-phone"] .nav a[aria-current="page"] .ico {');
    expect(css).toContain('[data-theme="dark"] .ph-root[data-shell="daylight-phone"] .greet {');
    expect(css).not.toMatch(/^\.nav \{/m);
  });
  it('--scope splits selector lists but not :where() arguments', () => {
    const css = run('SP-Phone-Board-Quiet', '--prefix', 'pq', '--scope', '.ph-root[data-shell="quiet-phone"]');
    expect(css).toContain('.ph-root[data-shell="quiet-phone"] .pq a, .ph-root[data-shell="quiet-phone"] .pq-link {');
  });
});
