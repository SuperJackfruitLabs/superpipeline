import { VIBES } from '@superjackfruit/vibekit';
import { describe, expect, it } from 'vitest';
import { BOARD_LAYOUTS, CARD_LAYOUTS, FACE_VARIANT } from './layouts';
import BoardPaper from '$lib/components/board/layouts/BoardPaper.svelte';
import CardPaper from '$lib/components/card/layouts/CardPaper.svelte';
import BoardDaylight from '$lib/components/board/layouts/BoardDaylight.svelte';
import CardDaylight from '$lib/components/card/layouts/CardDaylight.svelte';

describe('the layout registry', () => {
  it('has a board layout and a face for every vibe', () => {
    for (const v of VIBES) {
      expect(BOARD_LAYOUTS[v], v).toBeTruthy();
      expect(FACE_VARIANT[v], v).toBeTruthy();
    }
  });
  it('Daylight is the board layout for the vibes without their own yet', () => {
    for (const v of ['daylight', 'studio', 'quiet'] as const) expect(BOARD_LAYOUTS[v], v).toBe(BoardDaylight);
  });
  it('Paper has its own board', () => expect(BOARD_LAYOUTS.paper).toBe(BoardPaper));
  it('each vibe has its own face variant', () => {
    expect(FACE_VARIANT).toEqual({ daylight: 'mood', paper: 'portrait', studio: 'light', quiet: 'name' });
  });
  it('has a card layout with a sized panel for every vibe', () => {
    for (const v of VIBES) {
      expect(CARD_LAYOUTS[v]?.component, v).toBeTruthy();
      expect(CARD_LAYOUTS[v].panel.trim(), v).not.toBe('');
      expect(['end', 'center'], v).toContain(CARD_LAYOUTS[v].align);
    }
  });
  it('Daylight is the card layout for the vibes without their own yet', () => {
    for (const v of ['daylight', 'studio', 'quiet'] as const) expect(CARD_LAYOUTS[v].component, v).toBe(CardDaylight);
  });
  it('Paper has its own card, centred', () => {
    expect(CARD_LAYOUTS.paper.component).toBe(CardPaper);
    expect(CARD_LAYOUTS.paper.align).toBe('center');
  });
});
