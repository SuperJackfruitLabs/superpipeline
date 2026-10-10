/**
 * The ONE place a vibe picks a layout or a presentation (spec §3.5). Components below the layout
 * folders never ask which vibe is on; they are handed what this file chose.
 */
import type { Vibe } from '@superjackfruit/vibekit';
import type { Component } from 'svelte';
import BoardDaylight from '$lib/components/board/layouts/BoardDaylight.svelte';
import type { BoardLayoutProps } from '$lib/components/board/layouts/types';
import CardDaylight from '$lib/components/card/layouts/CardDaylight.svelte';
import type { CardLayoutProps } from '$lib/components/card/layouts/types';

export type FaceVariant = 'mood' | 'portrait' | 'light' | 'name';
export const FACE_VARIANT: Readonly<Record<Vibe, FaceVariant>> = { daylight: 'mood', paper: 'portrait', studio: 'light', quiet: 'name' };

/** Phase 1: every vibe uses the Daylight board, in its own tokens and words. Phases 2–4 swap one line each. */
export const BOARD_LAYOUTS: Readonly<Record<Vibe, Component<BoardLayoutProps>>> = {
  daylight: BoardDaylight,
  paper: BoardDaylight,
  studio: BoardDaylight,
  quiet: BoardDaylight,
};

/**
 * The card drawer's layout per vibe, with the panel's width and where it sits. The drawer shell
 * (`CardDrawer.svelte`) picks one by the person's vibe and hands it every section.
 * Phase 1: every vibe uses Daylight's card.
 */
export interface CardLayout {
  component: Component<CardLayoutProps>;
  /** Classes sizing the panel. */
  panel: string;
  /** Where the panel sits: against the right edge, or centred. */
  align: 'end' | 'center';
}
const DAYLIGHT_CARD: CardLayout = { component: CardDaylight, panel: 'sm:max-w-[520px]', align: 'end' };
export const CARD_LAYOUTS: Readonly<Record<Vibe, CardLayout>> = {
  daylight: DAYLIGHT_CARD,
  paper: DAYLIGHT_CARD,
  studio: DAYLIGHT_CARD,
  quiet: DAYLIGHT_CARD,
};
