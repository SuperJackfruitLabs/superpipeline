// apps/web/src/lib/components/shell/ShellPhone.svelte.test.ts
// @vitest-environment jsdom
/**
 * The one shell below PHONE_QUERY, in every vibe. The phone's navigation must reach the account (the
 * 2026-10-07 responsive audit's one P1): "You" opens a menu with sign-out, the theme and Appearance,
 * and names who is signed in. vibekit draws the header and the tab bar.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { createRawSnippet, tick } from 'svelte';
import { VIBES, type Vibe } from '@superjackfruitlabs/vibekit-ui';

// jsdom has no matchMedia; vibekit's AppShell asks it for the phone width. A phone window.
vi.hoisted(() => {
  window.matchMedia = ((query: string) => ({ matches: query.includes('max-width'), media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false })) as never;
});

const logout = vi.fn(async () => {});
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), logout: () => logout() }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

import AppShell from './AppShell.svelte';
import { shellModel } from './shell-model.svelte';
import { app } from '$lib/stores/app.svelte';
import { appearance } from '$lib/appearance.svelte';
import type { StaleCard } from '$lib/api';
import type { ShellProps } from './types';
import { DX_AGENTS, DX_CARDS, DX_STAGES } from './__fixtures__/dx';

const children = createRawSnippet(() => ({ render: () => '<div id="content">page</div>' }));
const page = (over: Partial<ShellProps> = {}): ShellProps => ({ here: 'plan', section: 'board', boardName: 'Developer Experience', plan: 'boards', live: shellModel.liveToggle, children, ...over });
const show = (vibe: Vibe, over: Partial<ShellProps> = {}) => {
  appearance.set({ vibe, theme: 'dark' });
  document.documentElement.dataset.vibe = vibe;
  return render(AppShell, page(over));
};
const settle = async () => { await tick(); await new Promise((r) => setTimeout(r, 0)); };
const you = () => within(screen.getByRole('navigation', { name: 'Superpipeline' })).getByRole('button', { name: /^You/ });

beforeEach(() => {
  logout.mockClear();
  app.user = { userId: 'usr_b19776fac3c94df4', tenantId: 'tnt_vibes', name: 'Ada Lovelace' } as never;
  app.boardId = 'brd_134a0ddb6d434478';
  app.board = { boardId: 'brd_134a0ddb6d434478', name: 'Developer Experience', stages: DX_STAGES, cards: DX_CARDS, gates: [], elicitations: [], references: [] } as never;
  app.agents = DX_AGENTS;
  // Seven wait on you across all boards.
  app.attention = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((cardId) => ({ cardId }) as StaleCard);
  app.connected = true;
  app.feedOpened = true;
  app.cmdkOpen = false;
  app.boardSwitcherOpen = false;
  Object.defineProperty(window, 'location', { value: { ...window.location, reload: vi.fn() }, writable: true });
});
afterEach(() => { cleanup(); app.board = null; delete document.documentElement.dataset.vibe; appearance.set({ vibe: 'daylight', theme: 'light' }); });

describe.each(VIBES)('the shell on a phone, in %s', (vibe) => {
  it('is vibekit’s phone frame, in the same component: PhoneTabBar, and PhoneHeader whose one h1 is the board name', () => {
    const { container } = show(vibe);
    expect(container.querySelector('.sh-root.ph-root[data-shell="phone"] .vk-appshell--phone')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Superpipeline' }).classList.contains(`vk-phonetabbar--${vibe}`)).toBe(true);
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]!.textContent).toMatch(/^Developer Experience(: Switch board)?$/);
    expect(h1s[0]!.closest('.vk-phoneheader')).toBeTruthy();
    expect(container.querySelector('.vk-appnav')).toBeNull();
  });

  it('has Inbox (the all-boards count, named for its scope), Plan, Crew and You, in that order', async () => {
    show(vibe);
    await settle();
    const nav = screen.getByRole('navigation', { name: 'Superpipeline' });
    expect(within(nav).getByRole('link', { name: 'Plan' }).getAttribute('aria-current')).toBe('page');
    expect(within(nav).getByRole('link', { name: 'Inbox, 7 need you across all boards' }).getAttribute('href')).toBe('/inbox');
    expect([...nav.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['/inbox', '/b/brd_134a0ddb6d434478', '/crew/agents']);
    expect(you().getAttribute('aria-haspopup')).toBe('menu');
    expect(you().getAttribute('aria-label')).toBe('You, Ada Lovelace');
  });

  it('You opens a menu that names who is signed in and signs out', async () => {
    show(vibe);
    await fireEvent.pointerDown(you(), { button: 0, pointerType: 'mouse' });
    await tick();
    const menu = screen.getByRole('menu');
    expect(within(menu).getByText('Ada Lovelace')).toBeTruthy();
    await fireEvent.click(within(menu).getByRole('menuitem', { name: 'Sign out' }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('You opens from the keyboard, switches the theme and offers Appearance', async () => {
    show(vibe);
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

  it('the header switches board, searches and writes a new card on a board; Plan’s switch sits under it', async () => {
    show(vibe);
    await fireEvent.click(screen.getByRole('button', { name: /^(Developer Experience: Switch board|Switch board: Developer Experience)$/ }));
    expect(app.boardSwitcherOpen).toBe(true);
    await fireEvent.click(screen.getByRole('button', { name: 'Search cards, agents and actions (⌘K)' }));
    expect(app.cmdkOpen).toBe(true);
    expect(screen.getByRole('button', { name: 'New card' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Plan' })).toBeTruthy();
  });

  it('says Reconnecting… when the feed is down', () => {
    app.connected = false;
    const { container } = show(vibe);
    const live = container.querySelector('[data-live]')!;
    expect(live.getAttribute('data-live')).toBe('off');
    expect(live.textContent).toContain('Reconnecting…');
  });

  it('a Crew page has no switcher and no New card, and its h1 is Crew', () => {
    show(vibe, { here: 'crew', section: 'crew', boardName: null, plan: undefined, ownHeading: true });
    expect(screen.queryByRole('button', { name: /Switch board/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'New card' })).toBeNull();
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Crew']);
  });
});

describe('the phone header', () => {
  it('Daylight draws it on the phase’s sky in light, and at dusk in dark', () => {
    appearance.set({ vibe: 'daylight', theme: 'light' });
    document.documentElement.dataset.vibe = 'daylight';
    const light = render(AppShell, page({ plan: undefined }));
    const h = light.container.querySelector('.vk-phoneheader')!;
    expect(h.classList.contains('vk-sky')).toBe(true);
    expect(h.getAttribute('data-phase')).toBe(appearance.phase);
    cleanup();
    const dark = show('daylight');
    expect(dark.container.querySelector('.vk-phoneheader')!.getAttribute('data-phase')).toBe('dusk');
  });
});

describe('the phone stylesheet', () => {
  it('restyles none of vibekit', () => {
    const css = readFileSync(join(process.cwd(), 'src/lib/styles/phone-base.css'), 'utf8');
    expect(css).not.toMatch(/\.vk-/);
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});
