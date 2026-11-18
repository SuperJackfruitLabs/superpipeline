// apps/web/src/lib/components/shell/shell.svelte.test.ts
// @vitest-environment jsdom
/**
 * The shell, in every vibe: what a page can count on (landmarks, the three places, the Inbox
 * count, the skip link, the keys), and vibe parity (one accessibility tree outside the signature).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { createRawSnippet, tick } from 'svelte';
import { VIBES, type Vibe } from '@superjackfruitlabs/vibekit-ui';

// jsdom has no matchMedia; vibekit's AppShell asks it for the phone width. A desktop window.
vi.hoisted(() => {
  window.matchMedia = ((query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false })) as never;
});

const goto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: (...a: unknown[]) => goto(...a) }));
const logout = vi.fn(async () => {});
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), logout: () => logout() }));

import AppShell from './AppShell.svelte';
import { shellModel } from './shell-model.svelte';
import { app } from '$lib/stores/app.svelte';
import { appearance } from '$lib/appearance.svelte';
import type { StaleCard } from '$lib/api';
import type { ShellProps } from './types';
import { DX_AGENTS, DX_CARDS, DX_STAGES } from './__fixtures__/dx';
import { parityTree } from '$lib/composition/guards';
import { renderInVibes } from '$lib/composition/render-vibes';
import { realisticWorkspace } from '$lib/fixtures/realistic';
import { liveUpdates } from '$lib/live/live-updates.svelte';

const children = createRawSnippet(() => ({ render: () => '<div id="content">page</div>' }));
/** A board page: what every board-scoped caller passes. */
const board = (over: Partial<ShellProps> = {}): ShellProps => ({ here: 'plan', section: 'board', boardName: 'Developer Experience', live: shellModel.liveToggle, children, ...over });
const waiting = (cardId: string) => ({ cardId }) as StaleCard;
/** Seven things wait on you across the workspace. */
const seven = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(waiting);
const settle = async () => { await tick(); await new Promise((r) => setTimeout(r, 0)); };

beforeEach(() => {
  goto.mockClear();
  logout.mockClear();
  app.feedOpened = true;
  liveUpdates.resume();
  app.user = { userId: 'usr_b19776fac3c94df4', tenantId: 'tnt_vibes', name: 'Rakesh Gangwar' } as never;
  app.boardId = 'brd_134a0ddb6d434478';
  app.board = { boardId: 'brd_134a0ddb6d434478', name: 'Developer Experience', stages: DX_STAGES, cards: DX_CARDS, gates: [], elicitations: [], references: [] } as never;
  app.agents = DX_AGENTS;
  app.attention = seven;
  app.connected = true;
  app.cmdkOpen = false;
  app.boardSwitcherOpen = false;
  app.filterOpen = false;
  app.openCardId = null;
});
afterEach(() => { cleanup(); app.board = null; delete document.documentElement.dataset.vibe; appearance.set({ vibe: 'daylight', theme: 'light' }); });

describe('the shell', () => {
  it('the shell keeps its landmarks, nav items, badge and chord keys in every vibe', async () => {
    for (const vibe of VIBES) {
      appearance.set({ vibe, theme: 'light' });
      document.documentElement.dataset.vibe = vibe;
      // A page that offers a filter registers it (the board's top row does); the old shell read `view`.
      const release = shellModel.registerFilter();
      const { container } = render(AppShell, board());
      await settle();

      expect(screen.getAllByRole('banner').length, `${vibe}: a banner`).toBeGreaterThanOrEqual(1);
      const nav = screen.getByRole('navigation', { name: 'Superpipeline' });
      const links = [...nav.querySelectorAll('.vk-appnav__list a')];
      expect(links.map((a) => a.textContent!.match(/Inbox|Plan|Crew/)?.[0]), vibe).toEqual(['Inbox', 'Plan', 'Crew']);
      expect(links.map((a) => a.getAttribute('href')), vibe).toEqual(['/inbox', '/b/brd_134a0ddb6d434478', '/crew/agents']);
      expect(screen.getByRole('link', { name: /^Inbox\W+7 need you/ }), `${vibe}: the Inbox count`).toBeTruthy();
      expect(container.querySelectorAll('main#main'), `${vibe}: one main`).toHaveLength(1);
      expect(screen.getByRole('link', { name: 'Skip to content' }).getAttribute('href')).toBe('#main');

      await fireEvent.keyDown(window, { key: 'g' });
      await fireEvent.keyDown(window, { key: 'i' });
      expect(goto).toHaveBeenLastCalledWith('/inbox');
      await fireEvent.keyDown(window, { key: 'g' });
      await fireEvent.keyDown(window, { key: 'p' });
      expect(goto).toHaveBeenLastCalledWith('/b/brd_134a0ddb6d434478');
      await fireEvent.keyDown(window, { key: 'g' });
      await fireEvent.keyDown(window, { key: 'c' });
      expect(goto).toHaveBeenLastCalledWith('/crew/agents');
      const before = app.composeRequest;
      await fireEvent.keyDown(window, { key: 'n' });
      expect(app.composeRequest, `${vibe}: N composes`).toBe(before + 1);
      await fireEvent.keyDown(window, { key: 'f' });
      expect(app.filterOpen, `${vibe}: F filters`).toBe(true);
      app.filterOpen = false;
      app.composeOpen = false;
      release();
      cleanup();
    }
  });
});

/** The realistic workspace: Planning & Roadmap open, its agents, every board's asks in the Inbox count. */
function realistic(): void {
  const w = realisticWorkspace();
  const planning = w.boards[0]!;
  app.boardId = planning.boardId ?? null;
  app.board = planning;
  app.agents = w.agents;
  app.agentsLoaded = true;
  app.attention = w.boards.flatMap((b) => b.cards).filter((c) => c.state === 'needs_input' || c.state === 'submitted').map((c) => waiting(c.id));
}
/** Where each vibe draws its signature: the one `[data-signature]` element. */
const signature = (c: Element) => c.querySelectorAll('[data-signature]');

describe('vibe parity', () => {
  const PAGES: Array<[string, Partial<ShellProps>]> = [
    ['a board', { here: 'plan', section: 'board', boardName: 'Planning & Roadmap', plan: 'boards' }],
    ['the Inbox', { here: 'inbox', section: 'inbox', boardName: null, ownHeading: true }],
    ['Plan · Projects', { here: 'plan', section: 'projects', boardName: null, plan: 'projects', ownHeading: true, primary: { label: 'New project', onclick: () => {} } }],
    ['Crew', { here: 'crew', section: 'crew', boardName: null, ownHeading: true, primary: { label: 'New agent', onclick: () => {} } }],
  ];
  it.each(PAGES)('renders the same accessibility tree in all four vibes outside the signature slot (%s)', async (_name, page) => {
    realistic();
    const roots = await renderInVibes(AppShell, { ...page, live: shellModel.liveToggle, children } as never);
    try {
      await settle();
      const trees = Object.fromEntries(VIBES.map((v) => [v, parityTree(roots[v])]));
      for (const v of VIBES) expect(trees[v], `${v} against daylight`).toBe(trees.daylight);
      expect(trees.daylight).toMatch(/^§$/m);
      expect(trees.daylight).toContain('navigation "Superpipeline"');
      expect(trees.daylight).toContain('main ""');
    } finally {
      roots.unmount();
    }
  });
});

/** Render the shell as a page would, in one vibe (vibekit reads <html>'s data-vibe outside a VibeRoot). */
function inVibe(vibe: Vibe, over: Partial<ShellProps> = {}) {
  appearance.set({ vibe, theme: 'light' });
  document.documentElement.dataset.vibe = vibe;
  return render(AppShell, board(over));
}
const CREW: Partial<ShellProps> = { here: 'crew', section: 'crew', boardName: null, ownHeading: true };

describe.each(VIBES)('the shell in %s', (vibe) => {
  it('the board name opens the switcher; search opens the palette and says its visible word in its name', async () => {
    inVibe(vibe);
    await fireEvent.click(screen.getByRole('button', { name: 'Developer Experience: Switch board' }));
    expect(app.boardSwitcherOpen).toBe(true);
    const search = screen.getByRole('button', { name: 'Search cards, agents and actions' });
    expect(search.textContent).toContain('Search');
    await fireEvent.click(search);
    expect(app.cmdkOpen).toBe(true);
  });
  it('a board page has one h1, the board name; a page with its own heading gets a plain title line', () => {
    inVibe(vibe);
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Developer Experience: Switch board']);
    cleanup();
    inVibe(vibe, CREW);
    expect(screen.queryAllByRole('heading', { level: 1 })).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /Switch board/ })).toBeNull();
  });
  it('the masthead draws no board view switch and no Filter: the page draws its own', () => {
    inVibe(vibe);
    expect(screen.queryByRole('navigation', { name: 'View' })).toBeNull();
    expect(screen.queryByRole('radiogroup', { name: 'View' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Filter/ })).toBeNull();
  });
  it('Plan has two sections, Boards and Projects, as links with the current one marked', () => {
    inVibe(vibe, { plan: 'projects', section: 'projects', boardName: null, ownHeading: true, primary: { label: 'New project', onclick: () => {} } });
    const plan = screen.getByRole('navigation', { name: 'Plan' });
    expect(within(plan).getByRole('link', { name: 'Projects' }).getAttribute('aria-current')).toBe('page');
    expect(within(plan).getByRole('link', { name: 'Boards' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('button', { name: 'New project' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'New card' })).toBeNull();
  });
  it('says Connecting…, not Reconnecting…, before the feed ever opened, on the one data-live element', () => {
    app.connected = false;
    app.feedOpened = false;
    const { container } = inVibe(vibe);
    const live = container.querySelectorAll('[data-live]');
    expect(live).toHaveLength(1);
    expect(live[0]!.getAttribute('data-live')).toBe('off');
    expect(live[0]!.textContent).toContain('Connecting…');
    expect(live[0]!.textContent).not.toContain('Reconnecting');
  });
  it('says Reconnecting… after a drop', () => {
    app.connected = false;
    const { container } = inVibe(vibe);
    expect(container.querySelector('[data-live]')!.textContent).toContain('Reconnecting…');
  });
  it('Live is a toggle: pausing reads Paused, and resuming reads Live again', async () => {
    // A page passes `live={shellModel.liveToggle}` in its markup, so it follows the toggle; here the test hands it in again.
    const { rerender } = inVibe(vibe);
    await fireEvent.click(screen.getByRole('button', { name: 'Live, pause live updates' }));
    expect(liveUpdates.live).toBe(false);
    await rerender({ live: shellModel.liveToggle });
    expect(screen.getByRole('button', { name: 'Paused, resume live updates' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Paused');
    await fireEvent.click(screen.getByRole('button', { name: 'Paused, resume live updates' }));
    expect(liveUpdates.live).toBe(true);
    await rerender({ live: shellModel.liveToggle });
    expect(screen.getByRole('button', { name: 'Live, pause live updates' })).toBeTruthy();
  });
  it('the account menu holds Dark theme, Appearance, Settings and Sign out; the foot opens Appearance', async () => {
    inVibe(vibe);
    await fireEvent.click(screen.getByRole('button', { name: 'Appearance' }));
    expect(appearance.pickerOpen).toBe(true);
    appearance.pickerOpen = false;
    const account = screen.getByRole('button', { name: 'Account: Rakesh Gangwar' });
    expect(account.getAttribute('aria-haspopup')).toBe('menu');
    await fireEvent.pointerDown(account, { button: 0, pointerType: 'mouse' });
    await tick();
    const menu = screen.getByRole('menu');
    expect(within(menu).getByRole('menuitemcheckbox', { name: 'Dark theme' }).getAttribute('aria-checked')).toBe('false');
    expect(within(menu).getByRole('menuitem', { name: 'Settings' })).toBeTruthy();
    await fireEvent.click(within(menu).getByRole('menuitem', { name: 'Sign out' }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
  it('the Inbox count is every board’s, on a board page and off it, and absent when nothing needs you', async () => {
    inVibe(vibe, CREW);
    await settle();
    expect(screen.getByRole('link', { name: 'Inbox, 7 need you across all boards' })).toBeTruthy();
    cleanup();
    app.attention = [];
    inVibe(vibe);
    await settle();
    expect(screen.getByRole('link', { name: /^Inbox$/ })).toBeTruthy();
  });
});

describe('the signature slot', () => {
  it('every vibe draws exactly one, under the masthead', () => {
    for (const vibe of VIBES) {
      const { container } = inVibe(vibe);
      expect(signature(container), vibe).toHaveLength(1);
      expect(signature(container)[0]!.previousElementSibling!.classList.contains('vk-masthead'), vibe).toBe(true);
      cleanup();
    }
  });
  it('Daylight: the sky of the hour behind the masthead, hidden from readers', () => {
    const { container } = inVibe('daylight');
    const sky = signature(container)[0]!.querySelector('.vk-sky')!;
    expect(sky.getAttribute('data-phase')).toBe(appearance.phase);
    expect(sky.closest('[aria-hidden="true"]')).toBeTruthy();
  });
  it('Paper: the dateline', () => {
    const { container } = inVibe('paper');
    expect(signature(container)[0]!.textContent).toMatch(/^\w+day \d+ \w+ · .+$/);
  });
  it('Studio: the page’s status line, the needs item in the signal tone and the keys in its end group; none without one', () => {
    const release = shellModel.showStatus(() => ({ items: [{ text: '7 cards' }, { text: '4 need you', signal: true }, { text: 'synced 13:51' }], right: ['⌘K commands', 'N new card'] }));
    try {
      const { container } = inVibe('studio');
      const line = signature(container)[0]!.querySelector('.vk-statusline')!;
      expect(line.querySelector('[data-tone="needs"]')!.textContent).toBe('4 need you');
      const end = line.querySelector('.vk-statusline__end')!;
      expect(end.textContent).toContain('N new card');
      expect(end.textContent).not.toContain('7 cards');
    } finally {
      release();
    }
    cleanup();
    const { container } = inVibe('studio');
    expect(signature(container)[0]!.querySelector('.vk-statusline')).toBeNull();
  });
  it('Quiet: nothing', () => {
    const { container } = inVibe('quiet');
    expect(signature(container)[0]!.childElementCount).toBe(0);
  });
});
