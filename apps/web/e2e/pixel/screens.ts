// apps/web/e2e/pixel/screens.ts
import { expect, type Page } from '@playwright/test';
import { MASK_IDS, type MaskSpec } from './masks';
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
  /** ISO instant the browser clock is frozen at; default DEFAULT_CLOCK. Only Board settings overrides it. */
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
  await p.getByText('Name it and, if you like, give it a target date.').click();
  await p.locator('summary', { hasText: 'Milestones' }).first().click();
  await settle(p);
}
/** Crew has no board in its URL; the reference's back link and need-you count are Developer Experience's. */
async function onDx(p: Page): Promise<void> {
  await p.evaluate(() => localStorage.setItem('superpipeline.boardId', 'brd_134a0ddb6d434478'));
  await p.reload();
  await p.waitForFunction(() => document.documentElement.dataset.ready === 'true');
}
/** writer-quill gets a fresh token (banner open, its count 2 → 3); analyst-echo opens for editing. super-chotu stays closed (MC #11). */
async function agentsMenus(p: Page): Promise<void> {
  await onDx(p);
  await p.locator('summary[aria-label="Actions for writer-quill"]').click();
  await p.getByRole('menuitem', { name: 'Issue a token', exact: true }).click();
  // The token is issued under the busy mark: wait for it before opening the next menu.
  await p.locator('.banner, .wa-tok').first().waitFor();
  await p.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  await p.locator('summary[aria-label="Actions for analyst-echo"]').click();
  await p.getByRole('menuitem', { name: 'Edit agent' }).click();
  await p.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  await p.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}
const TOKEN_MASK: MaskSpec = { id: 'token-secret', why: MASK_IDS['token-secret']!, selector: '.tokbox, .wa-tok .box', side: 'both' };
const blur = async (p: Page) => { await p.evaluate(() => (document.activeElement as HTMLElement | null)?.blur()); };

/**
 * Plan ruling: start at 08:19Z, save the Reproduce rule twice (append " x", blur, remove it, blur —
 * two real PATCHes, text back to the fixture's), let two minutes pass, refresh so "synced" reads 13:51.
 */
async function ruleSavedTwoMinutesAgo(p: Page): Promise<void> {
  const summary = p.locator('details.stage > summary, details.st-stage > summary').filter({ has: p.locator('.t-h3, .st-name', { hasText: /^Reproduce$/ }) });
  await summary.click();
  const rule = p.locator('#st-rule-reproduce');
  const patched = () => p.waitForResponse((r) => r.url().includes('/stages/reproduce') && r.request().method() === 'PATCH');
  const toEnd = () => rule.evaluate((el: HTMLTextAreaElement) => { el.focus(); el.setSelectionRange(el.value.length, el.value.length); });
  await toEnd();
  await p.keyboard.type(' x');
  await Promise.all([patched(), rule.blur()]);
  await toEnd();
  await p.keyboard.press('Backspace');
  await p.keyboard.press('Backspace');
  await Promise.all([patched(), rule.blur()]);
  await p.clock.fastForward('02:00');
  await p.evaluate(() => (window as unknown as { __spDev: { refresh: () => Promise<void> } }).__spDev.refresh());
  await p.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  await expect(p.getByText('Rule saved · 2 min ago')).toBeVisible();
  await p.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}
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

/** The board's own content, per swept vibe (the shell around it is compared on `#shell`). */
const BOARD_PARTS: Partial<Record<Vibe, Part[]>> = {
  daylight: [{ name: 'greeting', ref: '.dl-band', app: '.dl-band' }, { name: 'board', ref: '.dl-board', app: '.dl-board' }],
  studio: [{ name: 'board', ref: '.bd-grid', app: '.bd-grid' }],
  quiet: [{ name: 'board', ref: 'main.qt', app: 'div.qt' }],
  paper: [{ name: 'columns', ref: '.pp-cols', app: '.pp-cols' }, { name: 'pipeline', ref: '.pp-pipe', app: '.pp-pipe' }],
};

function forVibe(v: Vibe, V: string, h: (a: string) => number): Screen[] {
  return [
    { artboard: `SP-Board-${V}`, vibe: v, route: v === 'quiet' ? '/b/brd_f47143722126442c' : DX, strength: off(v), masks: [LIVE],
      // Daylight (Task 14): the board's own content, part by part; the shell around it is compared on `#shell`.
      parts: BOARD_PARTS[v],
      // Daylight draws the peek open on 58f8: point at its title and let the 300 ms debounce pass.
      steps: v === 'daylight' ? async (p) => { await p.getByRole('button', { name: /^AgentPod: connector interface/ }).first().hover(); await p.clock.runFor(400); await p.locator('.dl-peek').waitFor({ state: 'visible' }); } : undefined },
    { artboard: `SP-Board-Empty-${V}`, vibe: v, route: '/b/brd_2441b5578f704b93', strength: off(v), masks: [LIVE],
      // The board's own card, like the other swept boards; the shell around it is compared on `#shell` (the reference world's "4 need you" is not this empty board's).
      parts: [{ name: 'empty-card', ref: '.em-card', app: '.em-card' }] },
    { artboard: `SP-Phone-Board-${V}`, vibe: v, route: DX, strength: off(v), masks: [LIVE] },
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
    { artboard: `SP-Projects-${V}`, vibe: v, route: `${DX}?view=projects`, strength: shared(v), hold: ['**/v1/projects/*/rollup'], masks: [LIVE], steps: openProjectsPanels },
    { artboard: `SP-Workspace-Agents-${V}`, vibe: v, route: '/crew/agents', strength: shared(v), steps: agentsMenus, masks: [LIVE, TOKEN_MASK], writes: true },
    { artboard: `SP-Workspace-Other-${V}`, vibe: v, route: '/dev/workspace-review', strength: shared(v), masks: [LIVE], steps: onDx },
    { artboard: `SP-Settings-${V}`, vibe: v, route: `${DX}/settings`, strength: shared(v), clock: '2026-10-11T08:19:00.000Z', masks: [LIVE], writes: true, steps: ruleSavedTwoMinutesAgo },
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
const liveDot = (selector: string): MaskSpec => ({ id: 'live-dot', why: MASK_IDS['live-dot']!, selector, side: 'both' });
/** The shell says Live only once the board's socket is open; wait for it, not a timeout. */
const waitLive = async (page: Page) => { await page.locator('[data-live="on"]').first().waitFor(); };
const part = (name: string, ref: string, app: string): Part => ({ name, ref, app });

/**
 * The shell of each vibe, compared part by part on its board artboard. A rail that spans the page
 * is compared by its pieces: its height follows the board below it, which the board tasks own.
 * Daylight's app side is vibekit's AppNav and Masthead (preflight ruling), so its parts name
 * vibekit's elements; the reference keeps the mockup's hand-drawn rail and top bar.
 */
const DESKTOP_SHELL: Screen[] = [
  {
    artboard: 'SP-Board-Daylight', vibe: 'daylight', route: DX, steps: waitLive,
    parts: [
      { ...part('rail-logo', 'nav.dy-rail > .dy-logo', 'nav.vk-appnav > .vk-appnav__mark'), graphic: true },
      part('rail-destinations', 'nav.dy-rail > .dy-dests', 'nav.vk-appnav > .vk-appnav__list'),
      part('rail-crew', 'nav.dy-rail > .dy-crew', 'nav.vk-appnav > .vk-appnav__crew'),
      part('rail-foot', 'nav.dy-rail > .dy-foot', 'nav.vk-appnav > .vk-appnav__foot'),
      part('top-bar', '.dy-sky > header.dy-top', '.vk-masthead header.vk-masthead__bar'),
      part('sub-bar', '.dy-sky > .dy-sub', '.vk-masthead .vk-masthead__tabs'),
    ],
    masks: [liveDot('.dy-livedot, .vk-live__dot')],
  },
  // Paper, Studio and Quiet: the app side is vibekit's AppNav, Masthead and StatusLine (preflight
  // ruling), so the app selectors name vibekit's elements; the references keep the mockups' markup.
  {
    artboard: 'SP-Board-Paper', vibe: 'paper', route: DX, steps: waitLive,
    parts: [
      part('nameplate', 'header.mh .mh-name', 'nav.vk-appnav > .vk-appnav__mark'),
      part('quiet-controls', 'header.mh .mh-quiet', 'nav.vk-appnav > .vk-appnav__foot'),
      part('sections', 'header.mh .mh-sections > nav', 'nav.vk-appnav > .vk-appnav__list'),
      part('edition', 'header.mh > .mh-ed', '.vk-masthead header.vk-masthead__bar'),
      part('sub-bar', 'header.mh > .mh-tabs', '.vk-masthead > .vk-masthead__tabs'),
    ],
    masks: [liveDot('.mh-livedot, .vk-live__dot')],
  },
  {
    artboard: 'SP-Board-Studio', vibe: 'studio', route: DX, steps: waitLive,
    // Studio's rail is icons with tooltips: those parts are glyphs, checked for an svg, not text.
    parts: [
      { ...part('rail-mark', 'nav.ar-rail .ar-mark', 'nav.vk-appnav > .vk-appnav__mark'), graphic: true },
      // Nav v2 reorders the rail (Inbox, Plan, Crew); the frozen reference still draws Plan, Operate, Workspace.
      { ...part('rail-plan', 'nav.ar-rail a.ar-nav[aria-keyshortcuts="G P"]', 'nav.vk-appnav .vk-appnav__list > li:nth-child(2) > .vk-appnav__item'), graphic: true },
      { ...part('rail-operate', 'nav.ar-rail a.ar-nav[aria-keyshortcuts="G O"]', 'nav.vk-appnav .vk-appnav__list > li:nth-child(1) > .vk-appnav__item'), graphic: true },
      { ...part('rail-workspace', 'nav.ar-rail a.ar-nav[aria-keyshortcuts="G W"]', 'nav.vk-appnav .vk-appnav__list > li:nth-child(3) > .vk-appnav__item'), graphic: true },
      { ...part('rail-theme', 'nav.ar-rail button.ar-nav[aria-label="Dark theme"]', 'nav.vk-appnav .vk-appnav__foot button[aria-label="Dark theme"]'), graphic: true },
      { ...part('rail-appearance', 'nav.ar-rail button.ar-nav[aria-label="Appearance"]', 'nav.vk-appnav .vk-appnav__foot button[aria-label="Appearance"]'), graphic: true },
      part('rail-account', 'nav.ar-rail .ar-acct', 'nav.vk-appnav .vk-appnav__account'),
      { ...part('rail-signout', 'nav.ar-rail button[aria-label="Sign out"]', 'nav.vk-appnav .vk-appnav__foot button[aria-label="Sign out"]'), graphic: true },
      part('masthead', '.bd-body > header.ar-top', '.vk-masthead header.vk-masthead__bar'),
      part('sub-bar', '.bd-body > .ar-sub', '.vk-masthead > .vk-masthead__tabs'),
      part('status', '.bd-body footer.ar-status', '.vk-statusline'),
    ],
    masks: [liveDot('header.ar-top .ar-live > i, .vk-live__dot')],
  },
  {
    artboard: 'SP-Board-Quiet', vibe: 'quiet', strength: 'off', route: '/b/brd_f47143722126442c', steps: waitLive,
    parts: [
      part('nav-row', 'header.qn > .qn-row:nth-child(1)', 'nav.vk-appnav'),
      part('board-row', 'header.qn > .qn-row:nth-child(2)', 'div.vk-masthead'),
    ],
  },
];

/**
 * The phone shells (Task 13), compared on each phone board artboard (390 wide, from the manifest):
 * the header and the tab bar. The app side is vibekit's PhoneHeader and PhoneTabBar (preflight
 * ruling); the references keep the mockups' hand-drawn header and bar.
 */
const PHONE_SHELL: Screen[] = [
  {
    artboard: 'SP-Phone-Board-Daylight', vibe: 'daylight', route: DX, steps: waitLive,
    parts: [part('header', '.greet', 'header.vk-phoneheader'), part('tab-bar', 'nav.nav', 'nav.vk-phonetabbar')],
    masks: [liveDot('.pd-live, .vk-live__dot')],
  },
  {
    artboard: 'SP-Phone-Board-Paper', vibe: 'paper', route: DX, steps: waitLive,
    parts: [part('masthead', 'header.pm', 'header.vk-phoneheader'), part('tab-bar', 'nav.nav', 'nav.vk-phonetabbar')],
    masks: [liveDot('.pm-live, .vk-live__dot')],
  },
  {
    artboard: 'SP-Phone-Board-Studio', vibe: 'studio', route: DX, steps: waitLive,
    parts: [part('header', 'header.ph-top', 'header.vk-phoneheader'), part('tab-bar', 'nav.ph-nav', 'nav.vk-phonetabbar')],
    masks: [liveDot('header.ph-top .ar-live > i, .vk-live__dot')],
  },
  {
    artboard: 'SP-Phone-Board-Quiet', vibe: 'quiet', strength: 'off', route: DX, steps: waitLive,
    parts: [part('header', 'header.pq', 'header.vk-phoneheader'), part('tab-bar', 'nav.pqb', 'nav.vk-phonetabbar')],
  },
];

export const SHELL_CHECKS: Screen[] = [...DESKTOP_SHELL, ...PHONE_SHELL];
for (const [v, V] of VIBES) {
  SCREENS.push(...forVibe(v, V, (a) => MANIFEST[a]?.h ?? 4000));
}

export const screenKey = (s: Screen, theme: Theme): string =>
  `${s.artboard}${SHELL_CHECKS.includes(s) ? '#shell' : ''}·${theme}`;
