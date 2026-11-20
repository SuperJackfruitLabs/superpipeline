// apps/web/e2e/visual/compare.ts — pixelmatch over two screenshots of the app (base and head), padded to
// one size, plus the structural block check. Nothing is masked: both sides come from one machine.
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export const PIXEL_THRESHOLD = 0.1;
export const MAX_RATIO = 0.005;
export const WARN_RATIO = 0.001;
export const BLOCK = 8;
export const BLOCK_BREAK = 0.4;

export interface Result {
  ratio: number; diffPixels: number; brokenBlocks: number;
  sizeMismatch: { ref: [number, number]; app: [number, number] } | null;
  status: 'pass' | 'warn' | 'fail'; diff: Buffer; ref: Buffer; app: Buffer;
}

function pad(img: PNG, w: number, h: number): PNG {
  if (img.width === w && img.height === h) return img;
  const out = new PNG({ width: w, height: h }); // transparent
  PNG.bitblt(img, out, 0, 0, Math.min(img.width, w), Math.min(img.height, h), 0, 0);
  return out;
}

function assertOpaque(img: PNG, side: string): void {
  for (let i = 3; i < img.data.length; i += 4)
    if (img.data[i]! < 255) throw new Error(`${side} screenshot has alpha ${img.data[i]} at pixel ${(i - 3) / 4}; screenshots must be opaque`);
}

/**
 * A screenshot is blank when ≥ 99.9% of its pixels sit within 24 (summed RGB) of its most common
 * colour: an unstyled, unloaded or empty render that would otherwise "match" another blank one.
 */
export function assertNotBlank(buf: Buffer, label: string): void {
  const img = PNG.sync.read(buf);
  const counts = new Map<number, number>();
  for (let i = 0; i < img.data.length; i += 4) {
    const k = (img.data[i]! << 16) | (img.data[i + 1]! << 8) | img.data[i + 2]!;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let top = 0, best = -1;
  for (const [k, n] of counts) if (n > best) { best = n; top = k; }
  const r = top >> 16, g = (top >> 8) & 255, b = top & 255;
  let off = 0;
  for (let i = 0; i < img.data.length; i += 4)
    if (Math.abs(img.data[i]! - r) + Math.abs(img.data[i + 1]! - g) + Math.abs(img.data[i + 2]! - b) > 24) off++;
  if (off / (img.width * img.height) < 0.001) throw new Error(`${label}: screenshot is blank (one colour, ${off} pixels differ)`);
}

/** `ref` is the base screenshot, `app` the head's. */
export function compare(refBuf: Buffer, appBuf: Buffer): Result {
  const ref0 = PNG.sync.read(refBuf);
  const app0 = PNG.sync.read(appBuf);
  const w = Math.max(ref0.width, app0.width);
  const h = Math.max(ref0.height, app0.height);
  const sizeMismatch = ref0.width !== app0.width || ref0.height !== app0.height
    ? { ref: [ref0.width, ref0.height] as [number, number], app: [app0.width, app0.height] as [number, number] } : null;
  assertOpaque(ref0, 'base');
  assertOpaque(app0, 'head');
  const ref = pad(ref0, w, h);
  const app = pad(app0, w, h);
  const diff = new PNG({ width: w, height: h });
  const diffPixels = pixelmatch(ref.data, app.data, diff.data, w, h, {
    threshold: PIXEL_THRESHOLD, includeAA: false, alpha: 0.3, diffColor: [255, 0, 64], aaColor: [255, 200, 0],
  });
  const ratio = diffPixels / Math.max(1, w * h);
  // Structural check: an 8×8 block "breaks" when >40% of its pixels are diff-coloured.
  let brokenBlocks = 0;
  for (let by = 0; by < h; by += BLOCK)
    for (let bx = 0; bx < w; bx += BLOCK) {
      let n = 0, d = 0;
      for (let y = by; y < Math.min(h, by + BLOCK); y++)
        for (let x = bx; x < Math.min(w, bx + BLOCK); x++) {
          const i = (y * w + x) * 4;
          n++;
          if (diff.data[i] === 255 && diff.data[i + 1] === 0 && diff.data[i + 2] === 64) d++;
        }
      if (n > 0 && d / n > BLOCK_BREAK) brokenBlocks++;
    }
  const pass = !sizeMismatch && ratio <= MAX_RATIO && brokenBlocks === 0;
  return {
    ratio, diffPixels, brokenBlocks, sizeMismatch,
    status: pass ? (ratio > WARN_RATIO ? 'warn' : 'pass') : 'fail',
    diff: PNG.sync.write(diff), ref: PNG.sync.write(ref), app: PNG.sync.write(app),
  };
}
