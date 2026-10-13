// apps/web/e2e/pixel/parts.test.ts
import { describe, expect, it } from 'vitest';
import { partClip, phaseShift } from './parts';

describe('partClip — a part is cropped on its box geometry', () => {
  it('a 44px box below content that ends on a fractional pixel crops 44px, as on a whole-pixel page', () => {
    // Studio's rail-theme in the reference: the page above it ends at a fractional y.
    const ref = partClip({ x: 22, y: 2450.67, width: 44, height: 44 });
    const app = partClip({ x: 22, y: 2451, width: 44, height: 44 });
    expect(ref).toEqual({ x: 22, y: 2451, width: 44, height: 44 });
    expect([ref.width, ref.height]).toEqual([app.width, app.height]);
  });
  it('the fractional-height page foot (Daylight rail-foot at 929.23, 110 tall) crops 110, not 111', () => {
    expect(partClip({ x: 22, y: 929.23, width: 44, height: 110 }).height).toBe(110);
  });
  it('a box with fractional size takes its rounded size, and never collapses to nothing', () => {
    expect(partClip({ x: 0.4, y: 10.5, width: 1316.2, height: 71.6 })).toEqual({ x: 0, y: 11, width: 1317, height: 71 });
    expect(partClip({ x: 3, y: 3, width: 0.2, height: 0.2 })).toEqual({ x: 3, y: 3, width: 1, height: 1 });
  });
  it('a whole-pixel box is cropped exactly', () => {
    expect(partClip({ x: 64, y: 0, width: 1316, height: 72 })).toEqual({ x: 64, y: 0, width: 1316, height: 72 });
  });
});

describe('phaseShift — the app part moves onto the reference part’s sub-pixel phase', () => {
  it('a tab bar the reference draws at y 3389.703 and the app at 3647 moves the app by −0.297', () => {
    expect(phaseShift({ x: 12, y: 3389.703125, width: 366, height: 70 }, { x: 12, y: 3647, width: 366, height: 70 })).toEqual({ dx: 0, dy: -0.297 });
  });
  it('then both crop to the same rows of the same size', () => {
    const ref = { x: 12, y: 3389.703125, width: 366, height: 70 };
    const { dy } = phaseShift(ref, { x: 12, y: 3647, width: 366, height: 70 });
    const app = partClip({ x: 12, y: 3647 + dy, width: 366, height: 70 });
    expect([app.width, app.height]).toEqual([partClip(ref).width, partClip(ref).height]);
    expect(app.y - (3647 + dy)).toBeCloseTo(partClip(ref).y - ref.y, 3);
  });
  it('whole-pixel boxes, or boxes on the same phase, do not move', () => {
    expect(phaseShift({ x: 0, y: 76, width: 1, height: 1 }, { x: 0, y: 80, width: 1, height: 1 })).toEqual({ dx: 0, dy: 0 });
    expect(phaseShift({ x: 0.25, y: 10.4, width: 1, height: 1 }, { x: 3.25, y: 2.4, width: 1, height: 1 })).toEqual({ dx: 0, dy: 0 });
  });
  it('takes the short way round: 0.9 against 0.1 is −0.2, not 0.8', () => {
    expect(phaseShift({ x: 0, y: 5.9, width: 1, height: 1 }, { x: 0, y: 7.1, width: 1, height: 1 }).dy).toBeCloseTo(-0.2, 3);
  });
});
