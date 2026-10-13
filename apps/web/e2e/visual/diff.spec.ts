// apps/web/e2e/visual/diff.spec.ts — base versus head: VISUAL_BASE and VISUAL_HEAD are capture folders,
// VISUAL_CHANGE the range's `Visual-Change:` reason (empty for none). Prints the table to the log, writes
// base/head/diff PNGs of each changed screen to VISUAL_DIFF (uploaded on GitHub only), fails per verdict().
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';
import { compareShot, verdict, type Row } from './verdict';

test('base versus head', () => {
  const { VISUAL_BASE: base, VISUAL_HEAD: head, VISUAL_DIFF: out } = process.env;
  if (!base || !head) throw new Error('set VISUAL_BASE and VISUAL_HEAD');
  const names = (d: string) => (existsSync(d) ? readdirSync(d).filter((f) => f.endsWith('.png')) : []);
  const all = [...new Set([...names(base), ...names(head)])].sort();
  const read = (d: string, f: string) => (existsSync(join(d, f)) ? readFileSync(join(d, f)) : null);
  const rows: Row[] = [];
  for (const f of all) {
    const { row, result } = compareShot(f.replace(/\.png$/, ''), read(base, f), read(head, f));
    rows.push(row);
    if (out && row.changed && result) {
      mkdirSync(out, { recursive: true });
      const b = join(out, row.name);
      writeFileSync(`${b}.base.png`, result.ref); writeFileSync(`${b}.head.png`, result.app); writeFileSync(`${b}.diff.png`, result.diff);
    }
  }
  const v = verdict(rows, process.env.VISUAL_CHANGE?.trim() || null);
  console.log(['', 'visual: base versus head', ...v.lines, ''].join('\n'));
  expect(v.ok, v.lines.at(-1)).toBe(true);
});
