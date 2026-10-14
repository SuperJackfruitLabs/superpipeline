// apps/web/src/lib/components/shell/phone/PhoneShells.svelte.test.ts
// @vitest-environment jsdom
/**
 * The phone's navigation must reach the account (the 2026-10-07 responsive audit's one P1, first
 * pinned by the old bottom bar's tests): every phone frame's "You" opens a menu with sign-out, the
 * theme and Appearance, and names who is signed in. vibekit draws the header and the tab bar.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { createRawSnippet, tick, type Component } from 'svelte';

// jsdom has no matchMedia; vibekit's AppShell asks it for the phone width. A phone window.
vi.hoisted(() => {
  window.matchMedia = ((query: string) => ({ matches: query.includes('max-width'), media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false })) as never;
});

const logout = vi.fn(async () => {});
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), logout: () => logout() }));

import PhoneShellDaylight from './PhoneShellDaylight.svelte';
import PhoneShellPaper from './PhoneShellPaper.svelte';
import PhoneShellStudio from './PhoneShellStudio.svelte';
import PhoneShellQuiet from './PhoneShellQuiet.svelte';
import { app } from '$lib/stores/app.svelte';
import { appearance } from '$lib/appearance.svelte';
import type { StaleCard } from '$lib/api';
import { DX_AGENTS, DX_CARDS, DX_STAGES } from '../__fixtures__/dx';

const children = createRawSnippet(() => ({ render: () => '<div id="content">page</div>' }));
const props = (over: Record<string, unknown> = {}) => ({ here: 'plan', section: 'board', boardName: 'Developer Experience', view: 'board', showing: 'Showing all 7 cards', editionCount: '7 cards', children, ...over }) as never;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SHELLS: Array<[string, Component<any>]> = [['daylight', PhoneShellDaylight], ['paper', PhoneShellPaper], ['studio', PhoneShellStudio], ['quiet', PhoneShellQuiet]];
const inVibe = (v: string) => { document.documentElement.dataset.vibe = v; };

beforeEach(() => {
  logout.mockClear();
  app.user = { userId: 'usr_b19776fac3c94df4', tenantId: 'tnt_vibes', name: 'Ada Lovelace' } as never;
  app.boardId = 'brd_134a0ddb6d434478';
  app.board = { boardId: 'brd_134a0ddb6d434478', name: 'Developer Experience', stages: DX_STAGES, cards: DX_CARDS, gates: [], elicitations: [], references: [] } as never;
  app.agents = DX_AGENTS;
  // Seven wait on you across all boards; four of them on this board.
  app.attention = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((cardId) => ({ cardId }) as StaleCard);
  app.connected = true;
  app.cmdkOpen = false;
  app.boardSwitcherOpen = false;
  app.filterOpen = false;
  appearance.set({ theme: 'dark' });
  Object.defineProperty(window, 'location', { value: { ...window.location, reload: vi.fn() }, writable: true });
});
afterEach(() => { cleanup(); app.board = null; delete document.documentElement.dataset.vibe; });

const you = () => within(screen.getByRole('navigation', { name: 'Superpipeline' })).getByRole('button', { name: /^You/ });

describe.each(SHELLS)('the %s phone shell', (vibe, Shell) => {
  beforeEach(() => inVibe(vibe));

  it('is vibekit’s phone frame: PhoneTabBar, and PhoneHeader whose one h1 is the board name', () => {
    const { container } = render(Shell, props());
    expect(container.querySelector(`.ph-root[data-shell="${vibe}-phone"] .vk-appshell--phone`)).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Superpipeline' }).classList.contains('vk-phonetabbar')).toBe(true);
    expect(screen.getByRole('navigation', { name: 'Superpipeline' }).classList.contains(`vk-phonetabbar--${vibe}`)).toBe(true);
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    // Daylight and Studio make the title the switcher: "Developer Experience: Switch board".
    expect(h1s[0]!.textContent).toMatch(/^Developer Experience(: Switch board)?$/);
    expect(h1s[0]!.closest('.vk-phoneheader')).toBeTruthy();
  });

  it('has Inbox (the all-boards count), Plan, Crew and You, in that order', () => {
    render(Shell, props());
    const nav = screen.getByRole('navigation', { name: 'Superpipeline' });
    expect(within(nav).getByRole('link', { name: 'Plan' }).getAttribute('aria-current')).toBe('page');
    const inbox = within(nav).getByRole('link', { name: /^Inbox/ });
    expect(inbox.getAttribute('href')).toBe('/inbox');
    expect(inbox.textContent).toContain('7 need you');
    expect(within(nav).getByRole('link', { name: 'Crew' }).getAttribute('href')).toBe('/crew/agents');
    expect([...nav.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['/inbox', '/b/brd_134a0ddb6d434478', '/crew/agents']);
    expect(you().getAttribute('aria-haspopup')).toBe('menu');
    expect(you().getAttribute('aria-label')).toBe('You, Ada Lovelace');
  });

  it('You opens a menu that names who is signed in and signs out', async () => {
    render(Shell, props());
    await fireEvent.pointerDown(you(), { button: 0, pointerType: 'mouse' });
    await tick();
    expect(you().getAttribute('aria-expanded')).toBe('true');
    const menu = screen.getByRole('menu');
    expect(within(menu).getByText('Ada Lovelace')).toBeTruthy();
    await fireEvent.click(within(menu).getByRole('menuitem', { name: 'Sign out' }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('You opens from the keyboard, switches the theme and offers Appearance', async () => {
    render(Shell, props());
    await fireEvent.keyDown(you(), { key: 'Enter' });
    await tick();
    await fireEvent.click(screen.getByRole('menuitem', { name: 'Light theme' }));
    expect(appearance.theme).toBe('light');
    await fireEvent.keyDown(you(), { key: ' ' });
    await tick();
    await fireEvent.click(screen.getByRole('menuitem', { name: 'Appearance…' }));
    expect(appearance.pickerOpen).toBe(true);
    appearance.pickerOpen = false;
  });

  it('focus returns to You when the account menu closes', async () => {
    render(Shell, props());
    you().focus();
    await fireEvent.keyDown(you(), { key: 'Enter' });
    await tick();
    expect(screen.getByRole('menu')).toBeTruthy();
    await fireEvent.keyDown(document.activeElement ?? screen.getByRole('menu'), { key: 'Escape' });
    await tick();
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(you());
  });

  it('the header switches board, searches and writes a new card', async () => {
    render(Shell, props());
    await fireEvent.click(screen.getByRole('button', { name: /^(Developer Experience: Switch board|Change board: Developer Experience)$/ }));
    expect(app.boardSwitcherOpen).toBe(true);
    await fireEvent.click(screen.getByRole('button', { name: 'Search cards, agents and actions (⌘K)' }));
    expect(app.cmdkOpen).toBe(true);
    expect(screen.getByRole('button', { name: /^(New card|Write a new card)$/ })).toBeTruthy();
  });

  it('the view switch and Filter are there on Plan, and gone elsewhere', () => {
    render(Shell, props());
    expect(screen.getByRole('button', { name: 'Filter' })).toBeTruthy();
    cleanup();
    render(Shell, props({ here: 'inbox', section: 'inbox', boardName: null, view: null, showing: null }));
    expect(screen.queryByRole('button', { name: 'Filter' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'View' })).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'View' })).toBeNull();
  });

  it('says Reconnecting… when the feed is down', () => {
    app.connected = false;
    const { container } = render(Shell, props());
    const live = container.querySelector('[role="status"][data-live]')!;
    expect(live.getAttribute('data-live')).toBe('off');
    expect(live.textContent).toContain('Reconnecting…');
  });

  it('no count when nothing needs you', () => {
    app.attention = [];
    app.board = null;
    render(Shell, props());
    expect(screen.getByRole('link', { name: /^Inbox/ }).textContent!.trim()).toBe('Inbox');
  });

  it('a Crew page has no switcher and its h1 is Crew', () => {
    render(Shell, props({ here: 'crew', section: 'crew', boardName: null, view: null, showing: null }));
    expect(screen.queryByRole('button', { name: /Switch board|Change board/ })).toBeNull();
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Crew']);
    expect(screen.getByRole('link', { name: /^Inbox/ }).textContent).toContain('7 need you');
  });
});

describe('the phone stylesheets', () => {
  it('restyle none of vibekit', () => {
    const css = readFileSync(join(process.cwd(), 'src/lib/styles/phone-base.css'), 'utf8');
    expect(css).not.toMatch(/\.vk-/);
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});

describe('the phone headers', () => {
  it('Paper prints the dateline with the edition count; Studio names the section; Quiet says Board:', () => {
    inVibe('paper');
    const paper = render(PhoneShellPaper, props());
    expect(paper.container.querySelector('.vk-phoneheader__eyebrow')!.textContent).toBe('Superpipeline');
    expect(paper.container.querySelector('.vk-phoneheader__dateline')!.textContent).toMatch(/^\w+day \d+ \w+ · .+ · 7 cards$/);
    cleanup();
    inVibe('studio');
    const studio = render(PhoneShellStudio, props());
    expect(studio.container.querySelector('.vk-phoneheader__eyebrow')!.textContent).toBe('Superpipeline · board');
    cleanup();
    inVibe('quiet');
    const quiet = render(PhoneShellQuiet, props());
    expect(quiet.container.querySelector('.vk-phoneheader__eyebrow')!.textContent).toBe('Board:');
  });
  it('Daylight draws the header on the phase’s sky in light, and at dusk in dark (the dark phone mockup)', () => {
    inVibe('daylight');
    appearance.set({ theme: 'light' });
    const light = render(PhoneShellDaylight, props());
    const h = light.container.querySelector('.vk-phoneheader')!;
    expect(h.classList.contains('vk-sky')).toBe(true);
    expect(h.getAttribute('data-phase')).toBe(appearance.phase);
    cleanup();
    appearance.set({ theme: 'dark' });
    const dark = render(PhoneShellDaylight, props());
    expect(dark.container.querySelector('.vk-phoneheader')!.getAttribute('data-phase')).toBe('dusk');
  });
  it('Live sits in the header: on the eyebrow row in Paper and Studio, ending the row below in Daylight, for screen readers in Quiet', () => {
    const where: Record<string, string> = { paper: '.vk-phoneheader__top', studio: '.vk-phoneheader__top', daylight: '.vk-phoneheader__below', quiet: '.vk-visually-hidden' };
    for (const [vibe, Shell] of SHELLS) {
      inVibe(vibe);
      const { container } = render(Shell, props());
      const live = container.querySelectorAll('[data-live]');
      expect(live, vibe).toHaveLength(1);
      expect(live[0]!.closest(where[vibe]!), vibe).toBeTruthy();
      cleanup();
    }
  });
  it('Studio draws its sub-bar after the header’s rule', () => {
    inVibe('studio');
    const { container } = render(PhoneShellStudio, props());
    const below = container.querySelector('.vk-phoneheader__below--outside')!;
    expect(below.closest('.vk-phoneheader')).toBeNull();
    expect(below.querySelector('nav[aria-label="View"]')).toBeTruthy();
  });
});
