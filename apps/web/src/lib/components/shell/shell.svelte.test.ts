// apps/web/src/lib/components/shell/shell.svelte.test.ts
// @vitest-environment jsdom
/**
 * The shell, in every vibe: what a page can count on (landmarks, the three places, the Inbox
 * count, the skip link, the keys), and vibe parity (one accessibility tree outside the signature).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet, tick } from 'svelte';
import { VIBES } from '@superjackfruitlabs/vibekit-ui';

// jsdom has no matchMedia; vibekit's AppShell asks it for the phone width. A desktop window.
vi.hoisted(() => {
  window.matchMedia = ((query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false })) as never;
});

const goto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: (...a: unknown[]) => goto(...a) }));

import AppShell from './AppShell.svelte';
import { shellModel } from './shell-model.svelte';
import { app } from '$lib/stores/app.svelte';
import { appearance } from '$lib/appearance.svelte';
import type { StaleCard } from '$lib/api';
import { DX_AGENTS, DX_CARDS, DX_STAGES } from './__fixtures__/dx';

const children = createRawSnippet(() => ({ render: () => '<div id="content">page</div>' }));
const model = shellModel as unknown as { liveToggle?: unknown; registerFilter?: () => () => void };
/** A board page: the props every board-scoped caller passes. */
const board = (over: Record<string, unknown> = {}) => ({ here: 'plan', section: 'board', boardName: 'Developer Experience', view: 'board', showing: 'Showing all 7 cards', live: model.liveToggle, children, ...over }) as never;
/** Seven things wait on you across the workspace. */
const seven = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((cardId) => ({ cardId }) as StaleCard);
const settle = async () => { await tick(); await new Promise((r) => setTimeout(r, 0)); };

beforeEach(() => {
  goto.mockClear();
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
      const release = model.registerFilter?.();
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
      release?.();
      cleanup();
    }
  });
});
