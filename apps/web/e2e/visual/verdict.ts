// apps/web/e2e/visual/verdict.ts — the visual job's verdict: the app's own screens at the PR's base and
// head, rendered by the same machine in the same job. Both sides come from one Chromium in one container,
// so the noise floor is zero (calibrated by capturing one tree twice): ANY differing pixel is a change.
import { PNG } from 'pngjs';
import { compare, type Result } from '../pixel/compare';

export interface Box { x: number; y: number; w: number; h: number }
export interface Row {
  name: string;
  /** null: the screen exists on one side only (added or removed), which is reported, never failed. */
  ratio: number | null; diffPixels: number; box: Box | null;
  sizes: { base: [number, number]; head: [number, number] } | null;
  changed: boolean; note?: string;
}

/** The bounding box of compare()'s diff-coloured pixels (pixelmatch diffColor [255, 0, 64]). */
export function diffBox(diffPng: Buffer): Box | null {
  const img = PNG.sync.read(diffPng);
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      if (img.data[i] === 255 && img.data[i + 1] === 0 && img.data[i + 2] === 64) {
        if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
      }
    }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Changed: a different size, or any pixel past compare()'s per-pixel threshold. */
export function changed(r: Pick<Result, 'diffPixels' | 'sizeMismatch' | 'brokenBlocks'>): boolean {
  return !!r.sizeMismatch || r.diffPixels > 0 || r.brokenBlocks > 0;
}

export function compareShot(name: string, base: Buffer | null, head: Buffer | null): { row: Row; result?: Result } {
  if (!base || !head) return { row: { name, ratio: null, diffPixels: 0, box: null, sizes: null, changed: false, note: base ? 'removed at head' : 'new at head' } };
  const result = compare(base, head);
  const box = result.sizeMismatch ? null : diffBox(result.diff);
  const sizes = result.sizeMismatch ? { base: result.sizeMismatch.ref, head: result.sizeMismatch.app } : null;
  return { row: { name, ratio: result.ratio, diffPixels: result.diffPixels, box, sizes, changed: changed(result) }, result };
}

export interface Verdict { ok: boolean; lines: string[] }
/** Fails when a screen changed and no commit in the range carries `Visual-Change: <why>`. */
export function verdict(rows: Row[], reason: string | null): Verdict {
  const fmt = (r: Row) => {
    const what = r.note ?? (r.sizes ? `size ${r.sizes.base.join('×')} → ${r.sizes.head.join('×')}`
      : r.changed ? `${((r.ratio ?? 0) * 100).toFixed(3)}% (${r.diffPixels} px), box x=${r.box!.x} y=${r.box!.y} w=${r.box!.w} h=${r.box!.h}` : 'same');
    return `${r.changed ? 'CHANGED' : r.note ? 'NOTE   ' : 'same   '}  ${r.name.padEnd(28)} ${what}`;
  };
  const diffs = rows.filter((r) => r.changed);
  const lines = rows.map(fmt);
  if (!rows.some((r) => r.ratio !== null)) return { ok: false, lines: [...lines, 'no screen was compared: the capture produced nothing on one side'] };
  if (!diffs.length) return { ok: true, lines: [...lines, `${rows.length} screens, none changed`] };
  if (reason) return { ok: true, lines: [...lines, `${diffs.length} screen(s) changed, as the range says: Visual-Change: ${reason}`] };
  return { ok: false, lines: [...lines, `${diffs.length} screen(s) changed and no commit in the range carries a "Visual-Change: <why>" trailer.`,
    'If the change is intended, add the trailer to a commit in this PR; otherwise fix the regression.'] };
}
