// apps/web/e2e/pixel/parts.ts
/**
 * Where a part is cropped. A locator screenshot takes the box's enclosing pixels (floor of the top,
 * ceiling of the bottom), so a 44px box that starts at y 2450.67 (a reference whose content above
 * it ends on a fractional pixel) is cropped 45px tall, while the same box on a whole-pixel page is
 * 44px: the comparison then fails on size alone. The part is cropped on its box geometry instead:
 * each edge rounded to the nearest pixel, so a box crops to its own rounded size wherever it sits.
 */
export interface Box { x: number; y: number; width: number; height: number }

export function partClip(box: Box): Box {
  const x = Math.round(box.x), y = Math.round(box.y);
  const width = Math.max(1, Math.round(box.x + box.width) - x);
  const height = Math.max(1, Math.round(box.y + box.height) - y);
  return { x, y, width, height };
}

/**
 * How far to move the app's part so it sits on the reference part's sub-pixel phase. Text and
 * edges are drawn differently at y 3389.70 than at y 3647.00 even when the boxes are the same
 * size, so the app's part is moved (by less than a pixel, in layout) to the reference's fraction.
 */
export function phaseShift(ref: Box, app: Box): { dx: number; dy: number } {
  const frac = (n: number) => n - Math.floor(n);
  const d = (r: number, a: number) => { let v = frac(r) - frac(a); if (v > 0.5) v -= 1; if (v <= -0.5) v += 1; return Math.round(v * 1000) / 1000; };
  return { dx: d(ref.x, app.x), dy: d(ref.y, app.y) };
}
