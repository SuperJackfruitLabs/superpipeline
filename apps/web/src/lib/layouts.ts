/**
 * The ONE place a vibe picks a layout or a presentation (spec §3.5). Components below the layout
 * folders never ask which vibe is on; they are handed what this file chose.
 */
import type { Vibe } from '@superjackfruit/vibekit';
import type { Component } from 'svelte';
import BoardDaylight from '$lib/components/board/layouts/BoardDaylight.svelte';
import type { BoardLayoutProps } from '$lib/components/board/layouts/types';

export type FaceVariant = 'mood' | 'portrait' | 'light' | 'name';
export const FACE_VARIANT: Readonly<Record<Vibe, FaceVariant>> = { daylight: 'mood', paper: 'portrait', studio: 'light', quiet: 'name' };

/** Phase 1: every vibe uses the Daylight board, in its own tokens and words. Phases 2–4 swap one line each. */
export const BOARD_LAYOUTS: Readonly<Record<Vibe, Component<BoardLayoutProps>>> = {
  daylight: BoardDaylight,
  paper: BoardDaylight,
  studio: BoardDaylight,
  quiet: BoardDaylight,
};
