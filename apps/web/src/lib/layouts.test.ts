import { VIBES } from '@superjackfruit/vibekit';
import { describe, expect, it } from 'vitest';
import { BOARD_LAYOUTS, FACE_VARIANT } from './layouts';
import BoardDaylight from '$lib/components/board/layouts/BoardDaylight.svelte';

describe('the layout registry', () => {
  it('has a board layout and a face for every vibe', () => {
    for (const v of VIBES) {
      expect(BOARD_LAYOUTS[v], v).toBeTruthy();
      expect(FACE_VARIANT[v], v).toBeTruthy();
    }
  });
  it('Phase 1: Daylight is the board layout every vibe falls back to', () => {
    expect(BOARD_LAYOUTS.daylight).toBe(BoardDaylight);
  });
});
