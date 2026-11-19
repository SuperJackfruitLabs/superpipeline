// apps/web/e2e/pixel/screens.ts
import type { Page } from '@playwright/test';
import type { MaskSpec } from './masks';
import { CARD_4605, VK_DIALOG_PART, dropDraftRegion, expireSession, fillNewCard, openMoveStep } from './dialog-steps';

export type Vibe = 'daylight' | 'paper' | 'studio' | 'quiet';
export type Theme = 'light' | 'dark';
/** `graphic`: the part is only a glyph (a logo), so it is checked for an svg or img instead of text. */
export interface Part { name: string; ref: string; app: string; graphic?: boolean }
export interface Screen {
  artboard: string;
  vibe: Vibe;
  route: string;
  strength?: 'strong' | 'subtle' | 'off';
  /** The theme word the appearance cookie carries for the light run (`sun` for the Appearance dialog). */
  lightTheme?: 'light' | 'sun';
  /** ISO instant the browser clock is frozen at; default DEFAULT_CLOCK. No screen overrides it since Board settings' references were retired. */
  clock?: string;
  steps?: (page: Page) => Promise<void>;
  hold?: string[];
  fulfil?: Record<string, { status: number; json: unknown }>;
  /** Compare these elements instead of the whole page. */
  parts?: Part[];
  masks?: MaskSpec[];
  /** Applied to the reference page after loading (out-of-scope regions, theme branches). */
  refPatch?: (page: Page) => Promise<void>;
  /** The screen writes to the API (decides, resumes): re-seed the world before the next screen. */
  writes?: boolean;
  /** The page size, for a screen with no reference artboard (the visual job's board screens); default the manifest's. */
  size?: { w: number; h: number };
}

export const DEFAULT_CLOCK = '2026-10-11T08:21:00.000Z';
const DX = '/b/brd_134a0ddb6d434478';
const VIBES: Array<[Vibe, string]> = [['daylight', 'Daylight'], ['paper', 'Paper'], ['studio', 'Studio'], ['quiet', 'Quiet']];
const off = (v: Vibe) => (v === 'quiet' ? ('off' as const) : undefined);
const dialog: Part[] = [{ name: 'dialog', ref: 'section.dlg', app: 'section.dlg' }];
/** Park the pointer and drop focus, so no hover or focus ring is captured. */
export const settle = async (p: Page) => {
  await p.mouse.move(0, 0);
  await p.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await p.clock.runFor(100);
};
/** List draws two states: Daylight with row 1's Move menu open; Studio with row 2 selected (J twice; the selection starts empty). */
const blur = async (p: Page) => { await p.evaluate(() => (document.activeElement as HTMLElement | null)?.blur()); };

const LIVE: MaskSpec = { id: 'live-dot', why: 'pulsing Live dot', selector: '[data-live], .live-dot, .dy-livedot, .mh-livedot, .ar-live i, .qn-dot, .pd-live i, .pm-live i, .pq-dot', side: 'both' };
function forVibe(v: Vibe, V: string): Screen[] {
  return [
    { artboard: `SP-Dlg-NewCard-${V}`, vibe: v, route: DX, strength: off(v), parts: VK_DIALOG_PART, steps: fillNewCard, refPatch: dropDraftRegion },
    { artboard: `SP-Dlg-Palette-${V}`, vibe: v, route: DX, strength: off(v), parts: VK_DIALOG_PART, steps: async (p) => { await p.keyboard.press('Meta+k'); await p.getByRole('combobox', { name: 'Search cards, boards, agents and actions' }).fill('agent'); await blur(p); } },
    { artboard: `SP-Dlg-Appearance-${V}`, vibe: v, route: DX, strength: v === 'quiet' ? 'off' : 'strong', lightTheme: 'sun', parts: VK_DIALOG_PART,
      steps: async (p) => { await p.getByRole('button', { name: /^Appearance/ }).first().click(); await blur(p); } },
    { artboard: `SP-Dlg-Move-${V}`, vibe: v, route: DX, strength: off(v), parts: VK_DIALOG_PART, steps: openMoveStep },
    { artboard: `SP-Dlg-BoardSwitcher-${V}`, vibe: v, route: DX, strength: off(v), parts: VK_DIALOG_PART,
      steps: async (p) => { await p.getByRole('button', { name: /Change board|Switch board/ }).first().click(); await blur(p); } },
    { artboard: `SP-Dlg-Reconnect-${V}`, vibe: v, route: CARD_4605, strength: off(v), steps: expireSession, parts: VK_DIALOG_PART },
  ];
}

export const SCREENS: Screen[] = [];
/**
 * The shells were compared, part by part, on the board artboards. The composition contract retired
 * those references (the board and its shell are one composition in every vibe), so no shell check
 * is left; the list stays so a key can still say `#shell`.
 */
export const SHELL_CHECKS: Screen[] = [];
for (const [v, V] of VIBES) {
  SCREENS.push(...forVibe(v, V));
}

export const screenKey = (s: Screen, theme: Theme): string =>
  `${s.artboard}${SHELL_CHECKS.includes(s) ? '#shell' : ''}·${theme}`;
