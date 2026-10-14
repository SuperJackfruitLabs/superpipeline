// apps/web/src/lib/components/shell/ShellDaylight.svelte.test.ts
// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet, tick } from 'svelte';


// jsdom has no matchMedia; vibekit's AppShell asks it for the phone width. A desktop window.
vi.hoisted(() => {
  window.matchMedia = ((query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false })) as never;
});

const logout = vi.fn(async () => {});
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), logout: () => logout() }));

import ShellDaylight from './ShellDaylight.svelte';
import { app } from '$lib/stores/app.svelte';
import { appearance } from '$lib/appearance.svelte';
import type { StaleCard } from '$lib/api';
import { DX_AGENTS, DX_CARDS, DX_STAGES } from './__fixtures__/dx';

const children = createRawSnippet(() => ({ render: () => '<p>page</p>' }));
const props = (over: Record<string, unknown> = {}) => ({
  here: 'plan', section: 'board', boardName: 'Developer Experience', view: 'board', showing: 'Showing all 7 cards', children, ...over,
}) as never;
const four = ['card_ace250c9c25363ac', 'card_9ac2116a050858f8', 'card_e10fb4fe39a91dfc', 'card_05823a57e8224605'].map((cardId) => ({ cardId }) as StaleCard);

/** Open vibekit's account Menu from the account button itself: bits-ui opens on a primary-button pointerdown. */
async function openAccount(): Promise<void> {
  await fireEvent.pointerDown(screen.getByRole('button', { name: /Rakesh Gangwar/ }), { button: 0, pointerType: 'mouse' });
  await tick();
}

beforeEach(() => {
  logout.mockClear();
  app.user = { userId: 'usr_b19776fac3c94df4', tenantId: 'tnt_vibes', name: 'Rakesh Gangwar' } as never;
  app.boardId = 'brd_134a0ddb6d434478';
  app.attention = four;
  app.connected = true;
  app.boardSwitcherOpen = false;
  app.filterOpen = false;
  appearance.set({ theme: 'light' });
  Object.defineProperty(window, 'location', { value: { ...window.location, reload: vi.fn() }, writable: true });
});
afterEach(cleanup);

describe('ShellDaylight', () => {
  it('is vibekit’s AppNav, with no rail rule of the product’s own', () => {
    const { container } = render(ShellDaylight, props());
    const nav = screen.getByRole('navigation', { name: 'Superpipeline' });
    expect(nav.classList.contains('vk-appnav')).toBe(true);
    expect(container.querySelector('.vk-appshell')).toBeTruthy();
    const css = readFileSync(join(process.cwd(), 'src/lib/styles/shell/daylight.css'), 'utf8');
    expect(css).not.toMatch(/\.vk-(appnav|masthead|appshell|statusline|commandfield|tabs)/);
    expect(css).not.toMatch(/\.dy-(rail|dest|top|acct)\b/);
  });
  it('names the three destinations and marks the current one', () => {
    render(ShellDaylight, props({ here: 'inbox', section: 'inbox', boardName: null, view: null, showing: null }));
    const nav = screen.getByRole('navigation', { name: 'Superpipeline' });
    expect(nav.querySelector('a[aria-current="page"]')!.textContent).toContain('Inbox');
    expect(screen.getByRole('link', { name: 'Superpipeline home' }).getAttribute('href')).toBe('/inbox');
    expect(screen.getByRole('link', { name: /^Crew/ }).getAttribute('href')).toBe('/crew/agents');
  });
  it('shows the all-boards count on Inbox only when something needs you, and says it', () => {
    render(ShellDaylight, props({ here: 'crew', section: 'crew', boardName: null, view: null, showing: null }));
    expect(screen.getByRole('link', { name: /^Inbox\W+4 need you/ })).toBeTruthy();
    cleanup();
    app.attention = [];
    render(ShellDaylight, props({ here: 'crew', section: 'crew', boardName: null, view: null, showing: null }));
    expect(screen.getByRole('link', { name: /^Inbox$/ })).toBeTruthy();
  });
  it('the account button opens the menu: Dark theme is a checkbox, then Sign out', async () => {
    render(ShellDaylight, props());
    expect(screen.queryByRole('button', { name: /account menu/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Rakesh Gangwar/ }).getAttribute('aria-haspopup')).toBe('menu');
    await openAccount();
    const box = screen.getByRole('menuitemcheckbox', { name: 'Dark theme' });
    expect(box.getAttribute('aria-checked')).toBe('false');
    await fireEvent.click(box);
    expect(appearance.theme).toBe('dark');
    await tick();
    expect(screen.getByRole('menuitemcheckbox', { name: 'Dark theme' }).getAttribute('aria-checked')).toBe('true');
    if (!screen.queryByRole('menuitem', { name: 'Sign out' })) await openAccount();
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toBeTruthy();
    await fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
  it('the board name opens the switcher; Appearance opens the picker', async () => {
    render(ShellDaylight, props());
    await fireEvent.click(screen.getByRole('button', { name: /Switch board/ }));
    expect(app.boardSwitcherOpen).toBe(true);
    await fireEvent.click(screen.getByRole('button', { name: 'Appearance' }));
    expect(appearance.pickerOpen).toBe(true);
    appearance.pickerOpen = false;
  });
  it('search opens the palette', async () => {
    render(ShellDaylight, props());
    await fireEvent.click(screen.getByRole('button', { name: 'Search cards, agents and actions' }));
    expect(app.cmdkOpen).toBe(true);
    app.cmdkOpen = false;
  });
  it('the view switch is a Segmented on the current view and Filter opens the dialog', async () => {
    render(ShellDaylight, props());
    expect(screen.getByRole('radiogroup', { name: 'View' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Board' }).getAttribute('aria-checked')).toBe('true');
    await fireEvent.click(screen.getByRole('radio', { name: 'List' }));
    expect(app.view).toBe('list');
    await fireEvent.click(screen.getByRole('button', { name: /^Filter cards/ }));
    expect(app.filterOpen).toBe(true);
    app.setView('board');
  });
  it('Projects has no Filter; pages off Plan have no tabs; Crew has no switcher', () => {
    render(ShellDaylight, props({ here: 'plan', section: 'projects', boardName: null, view: null, plan: 'projects', showing: null }));
    expect(screen.queryByRole('button', { name: /^Filter cards/ })).toBeNull();
    expect(screen.queryByRole('radiogroup', { name: 'View' })).toBeNull();
    expect(screen.getByRole('radio', { name: 'Projects' }).getAttribute('aria-checked')).toBe('true');
    cleanup();
    render(ShellDaylight, props({ here: 'crew', section: 'crew', boardName: null, view: null, showing: null }));
    expect(screen.queryByRole('radiogroup', { name: 'View' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Switch board/ })).toBeNull();
  });
  it('draws the page’s tools right after Filter', () => {
    const subTools = createRawSnippet(() => ({ render: () => '<span class="tools">Group by</span>' }));
    const { container } = render(ShellDaylight, props({ subTools }));
    expect(container.querySelector('.dy-filter')!.nextElementSibling!.className).toBe('tools');
  });
  it('says Reconnecting… when the feed is down, and marks the frame off', () => {
    app.connected = false;
    app.feedOpened = true; // a drop: the feed had opened
    const { container } = render(ShellDaylight, props());
    const live = screen.getByRole('status');
    expect(live.textContent).toContain('Reconnecting…');
    expect(live.getAttribute('data-live')).toBe('off');
    expect(container.querySelectorAll('[data-live]')).toHaveLength(1);
  });
  it('the crew sits in vibekit’s crew slot', () => {
    app.board = { boardId: 'brd_134a0ddb6d434478', name: 'Developer Experience', stages: DX_STAGES, cards: DX_CARDS, gates: [], elicitations: [], references: [] } as never;
    app.agents = DX_AGENTS;
    try {
      const { container } = render(ShellDaylight, props());
      expect(container.querySelector('.vk-appnav__crew')!.textContent).toContain('4 agents');
    } finally {
      app.board = null;
      app.agents = [];
    }
  });
  it('draws the status line with the needs item in the signal tone', () => {
    const { container } = render(ShellDaylight, props({ status: { items: [{ text: '7 cards' }, { text: '4 need you', signal: true }], right: [] } }));
    expect(container.querySelector('.vk-statusline [data-tone="needs"]')!.textContent).toBe('4 need you');
  });
});
