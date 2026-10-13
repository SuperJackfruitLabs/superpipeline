// apps/web/e2e/pixel/masks.ts
import type { Page } from '@playwright/test';

export interface Mask { id: string; x: number; y: number; w: number; h: number; why: string }
export type MaskSpec =
  | { id: string; why: string; selector: string; side?: 'ref' | 'app' | 'both'; pad?: number }
  | (Mask & { selector?: undefined });

/**
 * Every id a mask may cite. A mask hides pixels from the comparison, so each one is a claim that
 * the hidden region is not the app's fault. C-nn ids are open conflicts in fixtures-and-harness.md
 * §A.8 (masks.test.ts checks the spec still lists them); the rest are dynamic regions or scope cuts.
 */
export const MASK_IDS: Readonly<Record<string, string>> = {
  'live-dot': 'The Live dot pulses unless reduced motion stops it; a missed rule must not fail a screen (F §B.5).',
  'C-08': 'Card drawer backdrop: the board behind the drawer is compared on the board screens, not here (F §A.8 C-08).',
  'D-1': 'Agent-drafted new card is out of scope; the composer ships without drafting (dialogs D-1, plan Global Constraints).',
  'dialog-backdrop': 'The scrimmed screen behind a dialog is compared on its own screen; dialogs compare the dialog (DLG §0.5).',
  'token-secret': 'A freshly issued agent token is random; the box that shows it cannot match a fixed reference (operate-list-pages WA-G4).',
};

/** Masks relative to one compared element (parts mode): keep the parts of each rect inside `box`. */
export function masksForPart(masks: Mask[], box: { x: number; y: number; width: number; height: number }): Mask[] {
  const out: Mask[] = [];
  for (const m of masks) {
    const x0 = Math.max(m.x, box.x), y0 = Math.max(m.y, box.y);
    const x1 = Math.min(m.x + m.w, box.x + box.width), y1 = Math.min(m.y + m.h, box.y + box.height);
    if (x1 > x0 && y1 > y0) out.push({ ...m, x: Math.floor(x0 - box.x), y: Math.floor(y0 - box.y), w: Math.ceil(x1 - x0), h: Math.ceil(y1 - y0) });
  }
  return out;
}

/** Resolve selector masks to rectangles on the page that is open now (reference or app). */
export async function resolveMasks(page: Page, specs: MaskSpec[], side: 'ref' | 'app'): Promise<Mask[]> {
  const out: Mask[] = [];
  for (const s of specs) {
    if (!MASK_IDS[s.id]) throw new Error(`mask id ${s.id} is not in MASK_IDS`);
    if (s.selector === undefined) { out.push(s); continue; }
    if (s.side && s.side !== 'both' && s.side !== side) continue;
    const boxes = await page.locator(s.selector).evaluateAll((els) => els.map((e) => {
      const r = e.getBoundingClientRect();
      return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
    }));
    const pad = s.pad ?? 0;
    for (const b of boxes) out.push({ id: s.id, why: s.why, x: Math.floor(b.x - pad), y: Math.floor(b.y - pad), w: Math.ceil(b.w + 2 * pad), h: Math.ceil(b.h + 2 * pad) });
  }
  return out;
}
