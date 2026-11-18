// apps/web/e2e/pixel/screens.ts
import type { Page } from '@playwright/test';
import type { MaskSpec } from './masks';
import { MANIFEST } from './reference';
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
const C4605 = `${DX}/c/card_05823a57e8224605`;
const VIBES: Array<[Vibe, string]> = [['daylight', 'Daylight'], ['paper', 'Paper'], ['studio', 'Studio'], ['quiet', 'Quiet']];
const off = (v: Vibe) => (v === 'quiet' ? ('off' as const) : undefined);
const shared = (v: Vibe) => (v === 'quiet' ? ('off' as const) : ('subtle' as const));
const dialog: Part[] = [{ name: 'dialog', ref: 'section.dlg', app: 'section.dlg' }];
/** Park the pointer and drop focus, so no hover or focus ring is captured (Operate, List). */
export const settle = async (p: Page) => {
  await p.mouse.move(0, 0);
  await p.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await p.clock.runFor(100);
};
const agentpod = (p: Page) => p.getByRole('article', { name: /^AgentPod/ });
/** Operate draws two states: Daylight with the AgentPod quote expanded and its resume form filled; Quiet with the resume form open. */
const operateSteps = (v: Vibe): Screen['steps'] => {
  if (v === 'daylight') {
    return async (p) => {
      await agentpod(p).getByRole('button', { name: 'Show all', exact: true }).click();
      await agentpod(p).getByRole('button', { name: 'Resume', exact: true }).click();
      await p.getByRole('textbox', { name: /What changed/ }).fill('The Forge mirror is now writable and tester-tim has write access. Push the red-test commit and carry on.');
      await settle(p);
    };
  }
  if (v === 'quiet') {
    return async (p) => {
      await agentpod(p).getByRole('button', { name: 'Resume', exact: true }).click();
      await settle(p);
    };
  }
  return undefined;
};
/** List draws two states: Daylight with row 1's Move menu open; Studio with row 2 selected (J twice; the selection starts empty). */
const listSteps = (v: Vibe): Screen['steps'] => {
  if (v === 'daylight') {
    return async (p) => {
      await p.getByRole('row', { name: /Fix the highest-severity blocker/ }).getByRole('button', { name: /^Move$/ }).click();
      await settle(p);
    };
  }
  if (v === 'studio') {
    return async (p) => {
      await p.keyboard.press('j');
      await p.keyboard.press('j');
      await settle(p);
    };
  }
  return undefined;
};
/** The reference opens the create panel and the first project's milestones (PR-G2); the app opens neither by itself. */
async function openProjectsPanels(p: Page): Promise<void> {
  await p.locator('summary', { hasText: 'Milestones' }).first().click();
  await settle(p);
}
const blur = async (p: Page) => { await p.evaluate(() => (document.activeElement as HTMLElement | null)?.blur()); };

/** Drawer backdrop (C-08): the board behind the drawer is compared on the board screens. */
const backdrop = (v: Vibe, h: number): MaskSpec[] => ({
  daylight: [{ id: 'C-08', why: 'drawer backdrop', x: 0, y: 0, w: 760, h }],
  paper: [{ id: 'C-08', why: 'drawer backdrop', x: 0, y: 0, w: 330, h }, { id: 'C-08', why: 'drawer backdrop', x: 1110, y: 0, w: 330, h }],
  studio: [{ id: 'C-08', why: 'drawer backdrop', x: 0, y: 0, w: 500, h }],
  quiet: [{ id: 'C-08', why: 'drawer backdrop', x: 0, y: 0, w: 320, h }],
} as Record<Vibe, MaskSpec[]>)[v];
const LIVE: MaskSpec = { id: 'live-dot', why: 'pulsing Live dot', selector: '[data-live], .live-dot, .dy-livedot, .mh-livedot, .ar-live i, .qn-dot, .pd-live i, .pm-live i, .pq-dot', side: 'both' };
const GATE_409 = { '**/gates/gate_fx_p4/resolve': { status: 409, json: { error: { code: 'GATE_NOT_PENDING', reason: 'decided', message: 'gate is already resolved', decidedBy: 'usr_b19776fac3c94df4', decidedAt: '2026-10-11T07:32:00Z', via: 'matrix' } } } };
/**
 * Superlibrary answers "nothing related" (the references print "No related prior work found in
 * Superlibrary."): a library token the client can read the expiry of, and an empty related list.
 */
const FAKE_JWT = `e30.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString('base64url')}.fixture`;
const LIBRARY_EMPTY = {
  '**/hub/token?library=1': { status: 200, json: { libraryToken: FAKE_JWT, libraryConfigured: true } },
  'https://app.superlibrary.dev/api/v1/related': { status: 200, json: { items: [] } },
};

function forVibe(v: Vibe, V: string, h: (a: string) => number): Screen[] {
  return [
    { artboard: `SP-Card-${V}`, vibe: v, route: C4605, strength: off(v), fulfil: LIBRARY_EMPTY, masks: backdrop(v, h(`SP-Card-${V}`)),
      // vibekit's Drawer focuses its first control on open; the reference is drawn unfocused.
      steps: v === 'paper' ? undefined : blur },
    { artboard: `SP-CardPage-${V}`, vibe: v, route: `${C4605}/page`, strength: off(v), fulfil: LIBRARY_EMPTY,
      masks: v === 'studio' ? [LIVE] : undefined },
    { artboard: `SP-Card-States-${V}`, vibe: v, route: '/dev/card-states', strength: off(v), fulfil: GATE_409,
      hold: ['**/cards/card_05823a57e8224605/attempts', '**/cards/card_05823a57e8224605/activities'],
      // Cell E: Request changes with no note, then Approve, which the API refuses (already decided from Matrix).
      steps: v === 'daylight' ? async (p) => {
        const e = p.locator('.ds-cell').nth(4);
        await e.getByRole('button', { name: 'Request changes' }).click();
        await e.getByRole('button', { name: 'Approve' }).click();
        await e.getByRole('alert').waitFor();
        await blur(p);
      } : v === 'paper' ? async (p) => {
        const e = p.locator('[data-cell="error"]');
        await e.getByRole('radio', { name: 'Approve' }).check();
        await e.getByRole('button', { name: 'Send reply' }).click();
        await e.getByRole('alert').waitFor();
        await blur(p);
      } : v === 'studio' ? async (p) => {
        const e = p.locator('[data-cell="error"]');
        await e.getByRole('button', { name: 'Approve' }).click();
        await e.getByRole('alert').waitFor();
        await e.getByRole('button', { name: 'Request changes' }).click();
        await blur(p);
      } : v === 'quiet' ? async (p) => {
        const e = p.locator('[data-cell="error"]');
        await e.getByRole('radio', { name: 'Approve' }).check();
        await e.getByRole('button', { name: 'Submit decision' }).click();
        await e.getByRole('alert').waitFor();
        await e.getByRole('radio', { name: 'Request changes' }).check();
        await e.getByRole('button', { name: 'Submit decision' }).click();
        // The reference draws the choices unchecked (its defaultchecked is not an attribute): show the same.
        await e.getByRole('alert').first().waitFor();
        await p.evaluate(() => document.querySelectorAll<HTMLInputElement>('[data-cell="error"] input[type=radio]').forEach((r) => { r.checked = false; }));
        await blur(p);
      } : undefined },
    { artboard: `SP-Phone-Card-${V}`, vibe: v, route: C4605, strength: off(v) },
    // The old Operate address opens the Inbox showing Developer Experience, as the reference does.
    { artboard: `SP-Operate-${V}`, vibe: v, route: `${DX}/operate`, strength: off(v), masks: [LIVE], steps: operateSteps(v) },
    { artboard: `SP-List-${V}`, vibe: v, route: `${DX}?view=list`, strength: off(v), masks: [LIVE], steps: listSteps(v) },
    { artboard: `SP-Projects-${V}`, vibe: v, route: '/plan/projects', strength: shared(v), hold: ['**/v1/projects/*/rollup'], masks: [LIVE], steps: openProjectsPanels },
    { artboard: `SP-Spend-${V}`, vibe: v, route: `${DX}/operate/telemetry`, strength: shared(v), masks: [LIVE] },
    { artboard: `SP-Dlg-NewCard-${V}`, vibe: v, route: DX, strength: off(v), parts: VK_DIALOG_PART, steps: fillNewCard, refPatch: dropDraftRegion },
    { artboard: `SP-Dlg-Palette-${V}`, vibe: v, route: DX, strength: off(v), parts: VK_DIALOG_PART, steps: async (p) => { await p.keyboard.press('Meta+k'); await p.getByRole('combobox', { name: 'Search cards, boards, agents and actions' }).fill('agent'); await blur(p); } },
    { artboard: `SP-Dlg-Appearance-${V}`, vibe: v, route: DX, strength: v === 'quiet' ? 'off' : 'strong', lightTheme: 'sun', parts: VK_DIALOG_PART,
      steps: async (p) => { await p.getByRole('button', { name: /^Appearance/ }).first().click(); await blur(p); } },
    { artboard: `SP-Dlg-Move-${V}`, vibe: v, route: DX, strength: off(v), parts: VK_DIALOG_PART, steps: openMoveStep },
    { artboard: `SP-Dlg-BoardSwitcher-${V}`, vibe: v, route: DX, strength: off(v), parts: [...VK_DIALOG_PART, { name: 'trigger', ref: '.bs-trigger', app: '.bs-anchor .bs-trigger' }],
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
  SCREENS.push(...forVibe(v, V, (a) => MANIFEST[a]?.h ?? 4000));
}

export const screenKey = (s: Screen, theme: Theme): string =>
  `${s.artboard}${SHELL_CHECKS.includes(s) ? '#shell' : ''}·${theme}`;
