// apps/web/e2e/pixel/compare.ts
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import type { Mask } from './masks';

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

/** A boolean per pixel: 1 where a mask hides it. Masks never live in the pixels themselves. */
function maskArray(w: number, h: number, masks: Mask[]): Uint8Array {
  const out = new Uint8Array(w * h);
  for (const m of masks)
    for (let y = Math.max(0, m.y); y < Math.min(h, m.y + m.h); y++)
      for (let x = Math.max(0, m.x); x < Math.min(w, m.x + m.w); x++) out[y * w + x] = 1;
  return out;
}

/** Copy the masked pixels of `from` into `to`, so pixelmatch sees them as equal. */
function neutralise(to: PNG, from: PNG, mask: Uint8Array): void {
  for (let p = 0; p < mask.length; p++) if (mask[p]) for (let c = 0; c < 4; c++) to.data[p * 4 + c] = from.data[p * 4 + c]!;
}

/** For the report only: paint masked regions on copies so a reader can see what was hidden. */
function shade(img: PNG, mask: Uint8Array): Buffer {
  const out = new PNG({ width: img.width, height: img.height });
  img.data.copy(out.data);
  for (let p = 0; p < mask.length; p++) if (mask[p]) { out.data[p * 4] = 255; out.data[p * 4 + 1] = 0; out.data[p * 4 + 2] = 255; out.data[p * 4 + 3] = 255; }
  return PNG.sync.write(out);
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

export function compare(refBuf: Buffer, appBuf: Buffer, masks: Mask[] = []): Result {
  for (const m of masks) if (!m.id) throw new Error('every mask must cite a conflict id (fixtures-and-harness.md §A.8)');
  const ref0 = PNG.sync.read(refBuf);
  const app0 = PNG.sync.read(appBuf);
  const w = Math.max(ref0.width, app0.width);
  const h = Math.max(ref0.height, app0.height);
  const sizeMismatch = ref0.width !== app0.width || ref0.height !== app0.height
    ? { ref: [ref0.width, ref0.height] as [number, number], app: [app0.width, app0.height] as [number, number] } : null;
  assertOpaque(ref0, 'reference');
  assertOpaque(app0, 'app');
  const ref = pad(ref0, w, h);
  const app = pad(app0, w, h);
  const mask = maskArray(w, h, masks);
  neutralise(app, ref, mask);
  const diff = new PNG({ width: w, height: h });
  const diffPixels = pixelmatch(ref.data, app.data, diff.data, w, h, {
    threshold: PIXEL_THRESHOLD, includeAA: false, alpha: 0.3, diffColor: [255, 0, 64], aaColor: [255, 200, 0],
  });
  let masked = 0;
  for (const v of mask) masked += v;
  const ratio = diffPixels / Math.max(1, w * h - masked);
  // Structural check: an 8×8 block "breaks" when >40% of its pixels are diff-coloured.
  let brokenBlocks = 0;
  for (let by = 0; by < h; by += BLOCK)
    for (let bx = 0; bx < w; bx += BLOCK) {
      let n = 0, d = 0;
      for (let y = by; y < Math.min(h, by + BLOCK); y++)
        for (let x = bx; x < Math.min(w, bx + BLOCK); x++) {
          if (mask[y * w + x]) continue;
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
    diff: PNG.sync.write(diff), ref: shade(ref, mask), app: shade(app, mask),
  };
}
