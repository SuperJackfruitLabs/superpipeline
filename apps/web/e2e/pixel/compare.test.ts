// apps/web/e2e/pixel/compare.test.ts
import { describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import { assertNotBlank, BLOCK_BREAK, compare } from './compare';

function png(w: number, h: number, paint: (x: number, y: number) => [number, number, number]): Buffer {
  const p = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b] = paint(x, y); const i = (y * w + x) * 4;
    p.data[i] = r; p.data[i + 1] = g; p.data[i + 2] = b; p.data[i + 3] = 255;
  }
  return PNG.sync.write(p);
}
const white = () => [255, 255, 255] as [number, number, number];
// A "text row": solid black bars 2px tall every 4px, like dense lines of glyph strokes. A 1px move
// changes half the rows of every 8×8 block it crosses (50% > BLOCK_BREAK). The plan's first fixture
// (2px bars every 6px, every third column blank) peaks at 25% per block, so it could never break one.
const row = (dy: number) => (_x: number, y: number) => (((y - dy) % 4 + 4) % 4 < 2 ? [0, 0, 0] : [255, 255, 255]) as [number, number, number];

describe('compare', () => {
  it('identical images pass with ratio 0', () => {
    const a = png(64, 64, row(0));
    const r = compare(a, a);
    expect(r).toMatchObject({ status: 'pass', ratio: 0, brokenBlocks: 0, sizeMismatch: null });
  });
  it('a text row moved by 1px fails on broken blocks even under the ratio budget', () => {
    const big = (dy: number) => (x: number, y: number) => (y < 16 ? row(dy)(x, y) : white());
    const r = compare(png(400, 400, big(0)), png(400, 400, big(1)));
    expect(r.ratio).toBeLessThan(0.05);
    expect(r.brokenBlocks).toBeGreaterThan(0);
    expect(r.status).toBe('fail');
  });
  it('a page 8px taller fails as a size mismatch', () => {
    const r = compare(png(64, 64, white), png(64, 72, white));
    expect(r.sizeMismatch).toEqual({ ref: [64, 64], app: [64, 72] });
    expect(r.status).toBe('fail');
  });
  it('refuses a mask that cites no conflict id', () => {
    const a = png(16, 16, white);
    expect(() => compare(a, a, [{ id: '', x: 0, y: 0, w: 4, h: 4, why: 'x' }])).toThrow(/conflict id/);
  });
  it('a difference inside a mask passes', () => {
    const a = png(64, 64, white);
    const b = png(64, 64, (x, y) => (x < 16 && y < 16 ? [0, 0, 0] : [255, 255, 255]));
    expect(compare(a, b).status).toBe('fail');
    expect(compare(a, b, [{ id: 'live-dot', x: 0, y: 0, w: 16, h: 16, why: 'test' }]).status).toBe('pass');
  });
  it('warns between 0.1% and 0.5%', () => {
    const a = png(100, 100, white);
    const b = png(100, 100, (x, y) => ((x * 7 + y * 13) % 400 === 0 ? [0, 0, 0] : [255, 255, 255]));
    const r = compare(a, b);
    expect(r.ratio).toBeGreaterThan(0.001);
    expect(r.ratio).toBeLessThanOrEqual(0.005);
    expect(r.status).toBe('warn');
  });
  it('rejects a screenshot with any alpha below 255', () => {
    const a = png(16, 16, white);
    const p = PNG.sync.read(a); p.data[3] = 254;
    expect(() => compare(a, PNG.sync.write(p))).toThrow(/alpha/);
    expect(() => compare(PNG.sync.write(p), a)).toThrow(/alpha/);
  });
  it('still compares real #FF00FF content outside the masks', () => {
    const magenta = () => [255, 0, 255] as [number, number, number];
    const r = compare(png(64, 64, magenta), png(64, 64, white));
    expect(r.status).toBe('fail');
    expect(r.ratio).toBe(1);
    // and content that happens to be magenta in one image does not count as masked
    const half = (x: number) => (x < 32 ? [255, 0, 255] : [255, 255, 255]) as [number, number, number];
    expect(compare(png(64, 64, half), png(64, 64, white)).brokenBlocks).toBe(32);
  });
  it('a sparse diff under BLOCK_BREAK in every block passes', () => {
    // One 8×8 block with 20 of 64 pixels changed (31%, under 40%) in an otherwise identical 100×100.
    const dots = new Set<string>();
    for (let y = 8; y < 16; y++) for (let x = 8; x < 16; x++) if ((x + y) % 3 === 0 && dots.size < 20) dots.add(`${x},${y}`);
    const b = png(100, 100, (x, y) => (dots.has(`${x},${y}`) ? [0, 0, 0] : [255, 255, 255]));
    const r = compare(png(100, 100, white), b);
    expect(r.diffPixels).toBe(20);
    expect(20 / 64).toBeLessThan(BLOCK_BREAK);
    expect(r.brokenBlocks).toBe(0);
    expect(r.status).not.toBe('fail');
  });
});

describe('assertNotBlank', () => {
  it('throws on a single-colour or near-single-colour shot', () => {
    expect(() => assertNotBlank(png(100, 100, white), 'x')).toThrow(/blank/);
    expect(() => assertNotBlank(png(100, 100, (x) => (x === 0 ? [250, 250, 250] : [255, 255, 255])), 'x')).toThrow(/blank/);
  });
  it('accepts a shot with real content', () => {
    expect(() => assertNotBlank(png(100, 100, (x, y) => (y % 10 < 2 && x < 60 ? [0, 0, 0] : [255, 255, 255])), 'x')).not.toThrow();
  });
});
