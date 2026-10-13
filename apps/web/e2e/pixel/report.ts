// apps/web/e2e/pixel/report.ts
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Result } from './compare';

export const OUT = fileURLToPath(new URL('../../test-results/pixel', import.meta.url));

export interface Row {
  artboard: string; vibe: string; theme: string; panel?: number;
  status: Result['status'] | 'expected-fail'; ratio?: number; brokenBlocks?: number;
  sizeMismatch?: Result['sizeMismatch']; masks?: string[];
  /** Why the app did not render. A render error has no ratio and is always a fail. */
  error?: string;
}

/**
 * A render error fails loudly with its cause, allow-listed or not: an allow-listed key is excused
 * for a pixel difference, never for not drawing at all (merge-3 harness ruling). The row carries the
 * error text in place of a ratio, and as a fail it still counts against the ratchet.
 */
export function renderFailure<R extends Omit<Row, 'status'>>(row: R, key: string, msg: string): { row: R & { status: 'fail'; error: string }; message: string } {
  return { row: { ...row, status: 'fail', error: msg }, message: `${key}: the app did not render: ${msg}` };
}
/**
 * Rows go to disk as they are recorded: Playwright replaces the worker after every failed test, so
 * in-memory rows would hold only the last worker's. `resetReport` (the pixel config's globalSetup)
 * clears the file at the start of a run.
 */
const ROWS = join(OUT, 'rows.jsonl');
export function resetReport(): void { rmSync(OUT, { recursive: true, force: true }); }

function base(r: Row): string {
  return `${r.artboard}/${r.vibe}.${r.theme}${r.panel !== undefined ? `.p${r.panel}` : ''}`;
}

export function record(row: Row, result?: Result): void {
  if (result) {
    const dir = join(OUT, row.artboard);
    mkdirSync(dir, { recursive: true });
    const b = join(OUT, base(row));
    writeFileSync(`${b}.ref.png`, result.ref);
    writeFileSync(`${b}.app.png`, result.app);
    writeFileSync(`${b}.diff.png`, result.diff);
  }
  mkdirSync(OUT, { recursive: true });
  appendFileSync(ROWS, JSON.stringify(row) + '\n');
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function writeReport(): void {
  mkdirSync(OUT, { recursive: true });
  const rows: Row[] = existsSync(ROWS) ? readFileSync(ROWS, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Row) : [];
  const order = { fail: 0, 'expected-fail': 1, warn: 2, pass: 3 } as const;
  rows.sort((a, b) => order[a.status] - order[b.status] || a.artboard.localeCompare(b.artboard));
  writeFileSync(join(OUT, 'results.json'), JSON.stringify(rows, null, 2));
  const count = (s: Row['status']) => rows.filter((r) => r.status === s).length;
  const body = rows.map((r) => {
    const b = base(r);
    const meta = r.error !== undefined ? `render error: ${r.error}` : `ratio ${((r.ratio ?? 0) * 100).toFixed(3)}% · broken blocks ${r.brokenBlocks}${r.sizeMismatch ? ` · size ${r.sizeMismatch.ref.join('×')} vs ${r.sizeMismatch.app.join('×')}` : ''}${r.masks?.length ? ` · masks ${r.masks.join(', ')}` : ''}${r.status === 'expected-fail' ? ' · allow-listed (expected-failures.ts)' : ''}`;
    const imgs = `
      <div class="trio"><figure><figcaption>Reference</figcaption><img src="${b}.ref.png"></figure>
      <figure><figcaption>App</figcaption><img src="${b}.app.png"></figure>
      <figure><figcaption>Diff</figcaption><img src="${b}.diff.png"></figure></div>
      <div class="slide"><img src="${b}.ref.png"><img class="top" src="${b}.app.png"><input type="range" min="0" max="100" value="50" aria-label="Reveal app over reference"></div>`;
    return `<section class="row ${r.status}"><h2>${esc(r.artboard)} · ${r.vibe} · ${r.theme}${r.panel !== undefined ? ` · panel ${'ABCDEF'[r.panel]}` : ''} <span class="badge">${r.status}</span></h2><p>${esc(meta)}</p>${imgs}</section>`;
  }).join('\n');
  writeFileSync(join(OUT, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pixel diff</title>
<style>
:root{--bg:#fff;--fg:#1a1a1a;--line:#ddd;--fail:#c4002b;--warn:#a86b00;--pass:#2a7a3b;--miss:#666}
@media (prefers-color-scheme:dark){:root{--bg:#141414;--fg:#eee;--line:#333}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:14px/1.4 system-ui}
.row{border-top:1px solid var(--line);padding:12px 0}.badge{font-size:12px;padding:2px 6px;border-radius:4px;color:#fff}
.fail .badge{background:var(--fail)}.warn .badge{background:var(--warn)}.pass .badge{background:var(--pass)}.expected-fail .badge{background:var(--miss)}
.trio{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.trio img{width:100%;border:1px solid var(--line)}
.slide{position:relative;max-width:900px;margin-top:8px}.slide img{width:100%;display:block}.slide .top{position:absolute;inset:0;clip-path:inset(0 50% 0 0)}
.slide input{width:100%}figure{margin:0}figcaption{font-size:12px;opacity:.7}
</style></head><body>
<h1>Pixel diff — ${count('fail')} fail · ${count('expected-fail')} expected-fail · ${count('warn')} warn · ${count('pass')} pass</h1>
${body}
<script>for(const s of document.querySelectorAll('.slide')){const t=s.querySelector('.top'),r=s.querySelector('input');r.addEventListener('input',()=>{t.style.clipPath='inset(0 '+(100-r.value)+'% 0 0)'})}</script>
</body></html>`);
}
