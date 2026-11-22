// apps/web/e2e/visual/screens.ts — the screens the visual job captures at base and at head: per vibe,
// light theme, thirteen kinds (65 screens): Board, the rich card's page and its drawer over the board,
// the phone board, the Inbox, Crew, board settings and the six dialogs (New card, Move, the command
// palette, the board switcher, Appearance and Reconnect). Whole page, nothing masked: both sides are
// rendered by one machine in one job, so nothing needs hiding. Each screen keeps the size its retired
// pixel artboard had, so the capture covers what that artboard covered; a page taller than its size
// grows the shot (app.ts).
import type { Page } from '@playwright/test';
import { defaultTimeStrength, type Vibe } from '@superjackfruitlabs/vibekit-ui/appearance';
import { CARD_4605, DX, blurActive, expireSession, fillNewCard, openMoveStep } from './steps';

export type { Vibe };
export interface Screen {
  /** `SP-<kind>-<Vibe>`: the screenshot's file name and the row the verdict prints. */
  artboard: string;
  vibe: Vibe;
  route: string;
  strength?: 'strong' | 'subtle' | 'off';
  /** The theme word the appearance cookie carries (`sun` for the Appearance dialog). */
  lightTheme?: 'light' | 'sun';
  /** ISO instant the browser clock is frozen at; default DEFAULT_CLOCK. */
  clock?: string;
  steps?: (page: Page) => Promise<void>;
  hold?: string[];
  fulfil?: Record<string, { status: number; json: unknown }>;
  /** The screen writes to the API: re-seed the world before the next screen. */
  writes?: boolean;
  /** The viewport the page is rendered at; a taller page grows it. */
  size: { w: number; h: number };
}

export const DEFAULT_CLOCK = '2026-10-11T08:21:00.000Z';
export const VIBES = ['Daylight', 'Paper', 'Studio', 'Quiet', 'Console'] as const;
export const KINDS = [
  'Board', 'CardPage', 'Card', 'Phone-Board', 'Inbox', 'Crew', 'Settings',
  'Dlg-NewCard', 'Dlg-Move', 'Dlg-Palette', 'Dlg-BoardSwitcher', 'Dlg-Appearance', 'Dlg-Reconnect',
] as const;
export type Kind = (typeof KINDS)[number];
export const VISUAL_ARTBOARDS: string[] = VIBES.flatMap((V) => KINDS.map((k) => `SP-${k}-${V}`));

type PerVibe = Record<(typeof VIBES)[number], number>;
/** Each artboard name's vibe, typed both ways: a vibe added to one list and not the other fails the typecheck. */
const VIBE_OF: Record<(typeof VIBES)[number], Vibe> = { Daylight: 'daylight', Paper: 'paper', Studio: 'studio', Quiet: 'quiet', Console: 'console' };
const W = 1440;
/** Page heights per kind and vibe (the retired artboards'; 900 for a dialog over the board). */
const HEIGHT: Record<Exclude<Kind, 'Phone-Board'>, PerVibe> = {
  'Board': { Daylight: 1148, Paper: 1148, Studio: 1148, Quiet: 1148, Console: 1148 },
  'CardPage': { Daylight: 4192, Paper: 4011, Studio: 2964, Quiet: 4164, Console: 2964 },
  'Card': { Daylight: 3120, Paper: 3261, Studio: 3099, Quiet: 3712, Console: 3099 },
  'Inbox': { Daylight: 2093, Paper: 1900, Studio: 1910, Quiet: 3263, Console: 1910 },
  'Crew': { Daylight: 2971, Paper: 3079, Studio: 2900, Quiet: 3030, Console: 2900 },
  'Settings': { Daylight: 1967, Paper: 2074, Studio: 2083, Quiet: 2000, Console: 2083 },
  'Dlg-NewCard': { Daylight: 900, Paper: 900, Studio: 900, Quiet: 900, Console: 900 },
  'Dlg-Move': { Daylight: 900, Paper: 900, Studio: 900, Quiet: 900, Console: 900 },
  'Dlg-Palette': { Daylight: 900, Paper: 900, Studio: 900, Quiet: 900, Console: 900 },
  'Dlg-BoardSwitcher': { Daylight: 900, Paper: 900, Studio: 900, Quiet: 900, Console: 900 },
  'Dlg-Appearance': { Daylight: 1295, Paper: 1313, Studio: 1353, Quiet: 1299, Console: 1353 },
  'Dlg-Reconnect': { Daylight: 900, Paper: 900, Studio: 900, Quiet: 900, Console: 900 },
};

/** The board is ready when its feed says it is live. */
const waitLive: Screen['steps'] = async (p) => { await p.locator('[data-live="on"]').first().waitFor(); };
/** Park the pointer and drop focus, so no hover or focus ring is captured. */
const settle = async (p: Page) => {
  await p.mouse.move(0, 0);
  await blurActive(p);
  await p.clock.runFor(100);
};
/**
 * Superlibrary answers "nothing related": a library token the client can read the expiry of, and an
 * empty related list, so the card's related-work section draws the same on every run.
 */
const FAKE_JWT = `e30.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString('base64url')}.fixture`;
const LIBRARY_EMPTY = {
  '**/hub/token?library=1': { status: 200, json: { libraryToken: FAKE_JWT, libraryConfigured: true } },
  'https://app.superlibrary.dev/api/v1/related': { status: 200, json: { items: [] } },
};

type Def = Omit<Screen, 'artboard' | 'vibe' | 'size' | 'strength'>;
const DEFS: Record<Exclude<Kind, 'Phone-Board'>, Def> = {
  'Board': { route: DX, steps: waitLive },
  'CardPage': { route: `${CARD_4605}/page`, fulfil: LIBRARY_EMPTY, steps: settle },
  // The drawer over the board; vibekit's Drawer focuses its first control on open.
  'Card': { route: CARD_4605, fulfil: LIBRARY_EMPTY, steps: settle },
  'Inbox': { route: '/inbox', steps: settle },
  'Crew': { route: '/crew/agents', steps: settle },
  'Settings': { route: `${DX}/settings`, steps: settle },
  'Dlg-NewCard': { route: DX, steps: fillNewCard },
  'Dlg-Move': { route: DX, steps: openMoveStep },
  'Dlg-Palette': {
    route: DX,
    steps: async (p) => {
      await p.keyboard.press('Meta+k');
      await p.getByRole('combobox', { name: 'Search cards, boards, agents and actions' }).fill('agent');
      await blurActive(p);
    },
  },
  'Dlg-BoardSwitcher': {
    route: DX,
    steps: async (p) => { await p.getByRole('button', { name: /Change board|Switch board/ }).first().click(); await blurActive(p); },
  },
  'Dlg-Appearance': {
    route: DX, lightTheme: 'sun',
    steps: async (p) => { await p.getByRole('button', { name: /^Appearance/ }).first().click(); await blurActive(p); },
  },
  'Dlg-Reconnect': { route: CARD_4605, steps: expireSession },
};

function screen(kind: Kind, V: (typeof VIBES)[number]): Screen {
  const vibe = VIBE_OF[V];
  // A plain vibe (Quiet) has no time of day; every other vibe renders at the app's default (strong).
  const strength = defaultTimeStrength(vibe) === 'off' ? ('off' as const) : undefined;
  const artboard = `SP-${kind}-${V}`;
  if (kind === 'Phone-Board') return { artboard, vibe, route: DX, strength, steps: waitLive, size: { w: 390, h: 844 } };
  return { artboard, vibe, strength, ...DEFS[kind], size: { w: W, h: HEIGHT[kind][V] } };
}

export const VISUAL_SCREENS: Screen[] = VIBES.flatMap((V) => KINDS.map((k) => screen(k, V)));
