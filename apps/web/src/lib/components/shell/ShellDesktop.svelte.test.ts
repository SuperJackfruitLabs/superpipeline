// apps/web/src/lib/components/shell/ShellDesktop.svelte.test.ts
// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { createRawSnippet, tick, type Component } from 'svelte';

// jsdom has no matchMedia; vibekit's AppShell asks it for the phone width. A desktop window.
vi.hoisted(() => {
  window.matchMedia = ((query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false })) as never;
});

const logout = vi.fn(async () => {});
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), logout: () => logout() }));

import ShellDaylight from './ShellDaylight.svelte';
import ShellPaper from './ShellPaper.svelte';
import ShellStudio from './ShellStudio.svelte';
import ShellQuiet from './ShellQuiet.svelte';
import { app } from '$lib/stores/app.svelte';
import { appearance } from '$lib/appearance.svelte';
import type { StaleCard } from '$lib/api';
import { DX_AGENTS, DX_CARDS, DX_STAGES } from './__fixtures__/dx';

const children = createRawSnippet(() => ({ render: () => '<div id="content">page</div>' }));
const props = (over: Record<string, unknown> = {}) => ({
  here: 'plan', section: 'board', boardName: 'Developer Experience', view: 'board', showing: 'Showing all 7 cards',
  paperShowing: 'Showing all 7 cards · 4 wait on you · 1 shipped', studioSubRight: 'The board at 13:51 · midday · Sunday 11 October',
  status: { items: [{ text: '7 cards' }, { text: '4 need you', signal: true }, { text: 'synced 13:51' }], right: ['⌘K commands', 'N new card'] },
  children, ...over,
}) as never;
const WORKSPACE = { here: 'workspace', section: 'workspace', boardName: null, view: null, showing: null, status: null };
/** Seven things wait on you across the workspace; four of them on this board. */
const seven = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((cardId) => ({ cardId }) as StaleCard);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SHELLS: Array<[string, Component<any>]> = [['daylight', ShellDaylight], ['paper', ShellPaper], ['studio', ShellStudio], ['quiet', ShellQuiet]];

const inVibe = (v: string) => { document.documentElement.dataset.vibe = v; };

beforeEach(() => {
  logout.mockClear();
  app.user = { userId: 'usr_b19776fac3c94df4', tenantId: 'tnt_vibes', name: 'Rakesh Gangwar' } as never;
  app.boardId = 'brd_134a0ddb6d434478';
  app.board = { boardId: 'brd_134a0ddb6d434478', name: 'Developer Experience', stages: DX_STAGES, cards: DX_CARDS, gates: [], elicitations: [], references: [] } as never;
  app.agents = DX_AGENTS;
  app.attention = seven;
  app.connected = true;
  app.cmdkOpen = false;
  app.boardSwitcherOpen = false;
  app.filterOpen = false;
  appearance.set({ theme: 'light' });
  Object.defineProperty(window, 'location', { value: { ...window.location, reload: vi.fn() }, writable: true });
});
afterEach(() => { cleanup(); app.board = null; delete document.documentElement.dataset.vibe; });

describe.each(SHELLS)('the %s desktop shell', (vibe, Shell) => {
  beforeEach(() => inVibe(vibe));
  it('is vibekit’s AppShell, AppNav and Masthead, and its product CSS restyles none of vibekit', () => {
    const { container } = render(Shell, props());
    expect(container.querySelector('.vk-appshell')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Superpipeline' }).classList.contains(`vk-appnav--${vibe}`)).toBe(true);
    expect(container.querySelector(`.vk-masthead--${vibe}`)).toBeTruthy();
    const css = readFileSync(join(process.cwd(), `src/lib/styles/shell/${vibe}.css`), 'utf8');
    expect(css).not.toMatch(/\.vk-(appnav|masthead|appshell|statusline|commandfield|tabs|button|menu)/);
  });
  it('the Operate badge counts this board’s needs on a board page and the workspace’s elsewhere', () => {
    render(Shell, props());
    expect(screen.getByRole('link', { name: /^Operate\W+4 need you/ })).toBeTruthy();
    cleanup();
    render(Shell, props(WORKSPACE));
    expect(screen.getByRole('link', { name: /^Operate\W+7 need you/ })).toBeTruthy();
  });
  it('the board name opens the switcher; search opens the palette', async () => {
    render(Shell, props());
    await fireEvent.click(screen.getByRole('button', { name: /^Developer Experience/ }));
    expect(app.boardSwitcherOpen).toBe(true);
    await fireEvent.click(screen.getByRole('button', { name: /^Search/ }));
    expect(app.cmdkOpen).toBe(true);
  });
  it('Filter opens the dialog and the page tools follow it; Projects has no Filter', async () => {
    const subTools = createRawSnippet(() => ({ render: () => '<span class="tools">Group by</span>' }));
    const { container } = render(Shell, props({ subTools }));
    const filter = screen.getByRole('button', { name: /^Filter cards/ });
    // Paper draws Filter on the edition line (with Search and Write); the page tools stay in the sub-bar.
    if (vibe === 'paper') expect(filter.closest('.vk-masthead__actions')).toBeTruthy();
    else expect(filter.nextElementSibling!.className).toBe('tools');
    await fireEvent.click(filter);
    expect(app.filterOpen).toBe(true);
    expect(container.querySelector('.vk-masthead__tabs .tools')).toBeTruthy();
    cleanup();
    render(Shell, props({ view: 'projects', section: 'projects' }));
    expect(screen.queryByRole('button', { name: /^Filter cards/ })).toBeNull();
  });
  it('Workspace has no board switcher and no view switch', () => {
    render(Shell, props(WORKSPACE));
    expect(screen.queryByRole('button', { name: /Change board|Switch board/ })).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'View' })).toBeNull();
    expect(screen.queryByRole('radiogroup', { name: 'View' })).toBeNull();
  });
  it('says Reconnecting… when the feed is down, on the one data-live element', () => {
    app.connected = false;
    const { container } = render(Shell, props());
    const live = container.querySelectorAll('[data-live]');
    expect(live).toHaveLength(1);
    expect(live[0]!.getAttribute('data-live')).toBe('off');
    expect(live[0]!.textContent).toContain('Reconnecting…');
  });
  it('the account button opens a menu; Sign out is in it or right after the account (Studio, Quiet)', async () => {
    render(Shell, props());
    const account = screen.getByRole('button', { name: /^Account: Rakesh Gangwar/ });
    if (vibe === 'studio' || vibe === 'quiet') {
      const out = screen.getByRole('button', { name: 'Sign out' });
      expect(out.closest('.vk-appnav__foot'), 'Sign out sits in the nav foot').toBeTruthy();
      expect(account.compareDocumentPosition(out) & Node.DOCUMENT_POSITION_FOLLOWING, 'after the account').toBeTruthy();
      await fireEvent.click(out);
    } else {
      await fireEvent.pointerDown(account, { button: 0, pointerType: 'mouse' });
      await tick();
      await fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Sign out' }));
    }
    expect(logout).toHaveBeenCalledTimes(1);
  });
  it('the search control says its visible words inside its longer name (WCAG 2.5.3)', () => {
    render(Shell, props());
    const search = screen.getByRole('button', { name: /^Search/ });
    const name = search.getAttribute('aria-label') ?? search.textContent!;
    const visible = search.textContent!.replace(/⌘\s*K/, '').trim();
    expect(name.toLowerCase()).toContain(visible.toLowerCase());
    if (vibe !== 'studio') expect(name).toBe('Search cards, agents and actions');
  });
});

describe.each([['paper', ShellPaper], ['quiet', ShellQuiet]] as const)('the %s view and theme controls', (vibe, Shell) => {
  beforeEach(() => inVibe(vibe));
  it('the views are links with the current one marked; Dark theme is a pressed toggle', async () => {
    appearance.set({ theme: 'dark' });
    render(Shell, props());
    const views = screen.getByRole('navigation', { name: 'View' });
    expect(within(views).getByRole('link', { name: 'Board' }).getAttribute('aria-current')).toBe('page');
    await fireEvent.click(within(views).getByRole('link', { name: 'List' }));
    expect(app.view).toBe('list');
    app.setView('board');
    const dark = screen.getByRole('button', { name: 'Dark theme' });
    expect(dark.getAttribute('aria-pressed')).toBe('true');
    await fireEvent.click(dark);
    expect(appearance.theme).toBe('light');
  });
});

describe('ShellPaper', () => {
  beforeEach(() => inVibe('paper'));
  it('prints the count in brackets, says it in words, and notes the edition', () => {
    render(ShellPaper, props());
    const operate = screen.getByRole('link', { name: /^Operate/ });
    expect(operate.textContent).toContain('(4)');
    expect(screen.getByText('Showing all 7 cards · 4 wait on you · 1 shipped')).toBeTruthy();
  });
  it('the dateline and Live sit in the navigation (the nameplate row and the section bar), not the masthead', () => {
    const { container } = render(ShellPaper, props());
    const nav = screen.getByRole('navigation', { name: 'Superpipeline' });
    expect(nav.querySelector('[data-live="on"]')!.textContent).toContain('changes appear as they happen');
    expect(container.querySelector('.vk-masthead [data-live]')).toBeNull();
    expect(nav.textContent).toMatch(/·/);
  });
  it('Filter, Search and Write a new card share the edition line', () => {
    const { container } = render(ShellPaper, props());
    const acts = container.querySelector('.vk-masthead__actions')!;
    expect([...acts.querySelectorAll('button')].map((b) => b.textContent!.trim().match(/^[A-Z][a-z]+/)![0])).toEqual(['Filter', 'Search', 'Write']);
  });
  it('one frame: Settings, Spend and Operate draw no sub-bar', () => {
    for (const section of ['settings', 'spend'] as const) {
      const page = render(ShellPaper, props({ section, view: null, showing: null, paperShowing: undefined }));
      expect(page.container.querySelector('.vk-masthead__tabs')).toBeNull();
      cleanup();
    }
    const operate = render(ShellPaper, props({ here: 'operate', section: 'operate', view: null, showing: null, paperShowing: undefined }));
    expect(operate.container.querySelector('.vk-masthead__tabs')).toBeNull();
  });
});

describe('ShellStudio', () => {
  beforeEach(() => inVibe('studio'));
  it('sits in the Annual base and says the section in the eyebrow', () => {
    const { container } = render(ShellStudio, props());
    expect(container.querySelector('.ar[data-shell="studio"] .vk-appshell')).toBeTruthy();
    expect(container.querySelector('.vk-masthead__eyebrow')!.textContent).toBe('Superpipeline · board');
  });
  it('the status line marks only the needs item, and the keys sit in its end group', () => {
    const { container } = render(ShellStudio, props());
    const line = container.querySelector('.vk-statusline')!;
    for (const t of ['7 cards', '4 need you', 'synced 13:51']) expect(line.textContent).toContain(t);
    const end = line.querySelector('.vk-statusline__end')!;
    expect(end.textContent).toContain('⌘K commands');
    expect(end.textContent).toContain('N new card');
    expect(end.textContent).not.toContain('7 cards');
  });
  it('off Plan there is no sub-bar; with no status, no status line', () => {
    const { container } = render(ShellStudio, props(WORKSPACE));
    expect(container.querySelector('.vk-masthead__tabs')).toBeNull();
    expect(container.querySelector('.vk-statusline')).toBeNull();
  });
  it('Dark theme and Appearance sit in the rail foot', async () => {
    render(ShellStudio, props());
    const dark = screen.getByRole('button', { name: 'Dark theme' });
    expect(dark.getAttribute('aria-pressed')).toBe('false');
    await fireEvent.click(dark);
    expect(appearance.theme).toBe('dark');
    await fireEvent.click(screen.getByRole('button', { name: 'Appearance' }));
    expect(appearance.pickerOpen).toBe(true);
    appearance.pickerOpen = false;
  });
});

describe('ShellQuiet', () => {
  beforeEach(() => inVibe('quiet'));
  it('skips to the content and says the count in words', () => {
    render(ShellQuiet, props());
    expect(screen.getByRole('link', { name: 'Skip to content' }).getAttribute('href')).toBe('#main');
    expect(screen.getByRole('link', { name: /^Operate/ }).textContent).toMatch(/4 need you/);
  });
  it('a board page has one h1, the board name, and not the hidden Workspace heading', () => {
    render(ShellQuiet, props());
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]!.textContent).toContain('Developer Experience');
    expect(screen.queryByRole('heading', { name: 'Workspace' })).toBeNull();
  });
  it('Workspace has one row: no board row, and the page is still named', () => {
    const { container } = render(ShellQuiet, props(WORKSPACE));
    expect(container.querySelector('.vk-masthead')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Workspace' })).toBeTruthy();
  });
});
