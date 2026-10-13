import { describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import { compareShot, diffBox, verdict, type Row } from './verdict';

function png(w: number, h: number, paint?: (x: number, y: number) => [number, number, number] | null): Buffer {
  const img = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const c = paint?.(x, y) ?? [((x * 7) % 200) + 20, ((y * 5) % 200) + 20, 120];
      img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
    }
  return PNG.sync.write(img);
}

describe('visual compare', () => {
  it('identical screens are the same', () => {
    const { row } = compareShot('a', png(40, 30), png(40, 30));
    expect(row.changed).toBe(false);
    expect(row.box).toBeNull();
  });
  it('a single changed pixel is a change, with its bounding box', () => {
    const head = png(40, 30, (x, y) => (x === 12 && y === 7 ? [0, 0, 0] : null));
    const { row } = compareShot('a', png(40, 30), head);
    expect(row.changed).toBe(true);
    expect(row.diffPixels).toBe(1);
    expect(row.box).toEqual({ x: 12, y: 7, w: 1, h: 1 });
  });
  it('a block of change is boxed', () => {
    const head = png(40, 30, (x, y) => (x >= 5 && x < 15 && y >= 10 && y < 14 ? [255, 255, 255] : null));
    expect(compareShot('a', png(40, 30), head).row.box).toEqual({ x: 5, y: 10, w: 10, h: 4 });
  });
  it('a different size is a change', () => {
    const { row } = compareShot('a', png(40, 30), png(40, 31));
    expect(row.changed).toBe(true);
    expect(row.sizes).toEqual({ base: [40, 30], head: [40, 31] });
  });
  it('a screen on one side only is noted, not failed', () => {
    expect(compareShot('a', null, png(4, 4)).row).toMatchObject({ changed: false, note: 'new at head' });
  });
  it('diffBox is null on an empty diff', () => expect(diffBox(png(4, 4, () => [255, 255, 255]))).toBeNull());
});

const row = (name: string, changed: boolean): Row => ({ name, ratio: changed ? 0.01 : 0, diffPixels: changed ? 10 : 0, box: changed ? { x: 1, y: 2, w: 3, h: 4 } : null, sizes: null, changed });
describe('visual verdict', () => {
  it('passes when nothing changed', () => expect(verdict([row('a', false), row('b', false)], null).ok).toBe(true));
  it('fails on a change without the trailer, naming the screen, ratio and box', () => {
    const v = verdict([row('a', false), row('SP-Board-Paper', true)], null);
    expect(v.ok).toBe(false);
    expect(v.lines.join('\n')).toMatch(/CHANGED\s+SP-Board-Paper\s+1\.000% \(10 px\), box x=1 y=2 w=3 h=4/);
    expect(v.lines.join('\n')).toMatch(/Visual-Change: <why>/);
  });
  it('lists every changed screen, each with its ratio and box (the forge log is the report)', () => {
    const v = verdict([row('SP-Board-Paper', true), row('a', false), { ...row('SP-Phone-Board-Quiet', true), ratio: 0.5, diffPixels: 99, box: { x: 0, y: 10, w: 390, h: 20 } }], null);
    const text = v.lines.join('\n');
    expect(text).toMatch(/CHANGED\s+SP-Board-Paper\s+1\.000% \(10 px\), box x=1 y=2 w=3 h=4/);
    expect(text).toMatch(/CHANGED\s+SP-Phone-Board-Quiet\s+50\.000% \(99 px\), box x=0 y=10 w=390 h=20/);
    expect(text).not.toMatch(/CHANGED\s+a\b/);
  });
  it('passes a change the range explains, and lists it', () => {
    const v = verdict([row('SP-Board-Paper', true)], 'taller header');
    expect(v.ok).toBe(true);
    expect(v.lines.join('\n')).toMatch(/CHANGED\s+SP-Board-Paper[\s\S]*Visual-Change: taller header/);
  });
  it('fails when nothing could be compared (an empty capture is not a pass)', () => {
    expect(verdict([], null).ok).toBe(false);
    expect(verdict([{ ...row('a', false), ratio: null, note: 'new at head' }], null).ok).toBe(false);
  });
});
