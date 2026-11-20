// @vitest-environment jsdom
/**
 * What PlanView decides: an empty board draws the empty explanation (on a phone too), the page draws
 * its own top row (Board | List, Filter, the "Showing…" line), and the shell draws no greeting. The
 * shell, the board view and the store are the real ones.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { tick } from 'svelte';

const env = vi.hoisted(() => {
  const state = { phone: false };
  window.matchMedia = ((query: string) => ({ matches: state.phone && query.includes('max-width'), media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false })) as never;
  return state;
});
vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/b/brd_134a0ddb6d434478') } }));
vi.mock('$lib/viewport.svelte', () => ({ viewport: { get phone() { return env.phone; } }, PHONE_QUERY: '(max-width: 899.98px)', NARROW_QUERY: '(max-width: 639.98px)' }));
const usage = vi.hoisted(() => ({ calls: 0 }));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), getUsage: async () => { usage.calls++; return { totalCostUsd: 0 }; } }));

import PlanView from './PlanView.svelte';
import { app } from '$lib/stores/app.svelte';
import { appearance } from '$lib/appearance.svelte';
import { shellModel } from '$lib/components/shell/shell-model.svelte';
import { DX_AGENTS, DX_CARDS, DX_STAGES } from '$lib/components/shell/__fixtures__/dx';

const board = (cards = DX_CARDS) => ({ boardId: 'brd_134a0ddb6d434478', name: 'Developer Experience', stages: DX_STAGES, cards, gates: [], elicitations: [], references: [], intro: null }) as never;
const archived = DX_CARDS.map((c) => ({ ...c, archivedAt: '2026-10-10T00:00:00Z' }));

beforeEach(() => {
  app.user = { userId: 'usr_b19776fac3c94df4', tenantId: 'tnt_vibes', name: 'Ira Mehta' } as never;
  app.boardId = 'brd_134a0ddb6d434478';
  app.agents = DX_AGENTS;
  app.connected = true;
  app.view = 'board';
  appearance.set({ theme: 'light', vibe: 'daylight' });
  document.documentElement.dataset.vibe = 'daylight';
});
afterEach(() => { cleanup(); app.board = null; env.phone = false; delete document.documentElement.dataset.vibe; });

describe('PlanView: the empty board', () => {
  for (const [where, phone] of [['desktop', false], ['phone', true]] as const) {
    it(`draws the empty explanation on a ${where}, and no lanes`, () => {
      env.phone = phone;
      app.board = board(archived);
      const { container } = render(PlanView);
      expect(screen.getByRole('heading', { level: 2, name: 'No cards yet. Here is what this board does.' })).toBeTruthy();
      expect(container.querySelector('.bv')).toBeNull();
      expect(screen.queryAllByRole('region')).toHaveLength(0);
    });
  }
  it('draws the board, not the explanation, once a card is live', () => {
    app.board = board();
    const { container } = render(PlanView);
    expect(container.querySelector('.em')).toBeNull();
    expect(container.querySelector('.bv')).toBeTruthy();
  });
});

describe('PlanView: the greeting', () => {
  // The greeting ("Working late, …?") is the Inbox headline's, not the board's: the shell's Daylight signature is the sky alone.
  for (const [where, phone] of [['desktop', false], ['phone', true]] as const) {
    it(`is not drawn on a Daylight board on a ${where}`, () => {
      env.phone = phone;
      app.board = board();
      const { container } = render(PlanView);
      expect(container.querySelector('.dl-band, .pd-hello')).toBeNull();
      expect(screen.queryByRole('region', { name: 'Greeting' })).toBeNull();
      expect(container.querySelector('.bv')).toBeTruthy();
    });
  }
});

describe('PlanView: the top row', () => {
  for (const vibe of ['daylight', 'paper', 'studio', 'quiet'] as const) {
    it(`draws Board | List, Filter and the Showing line in ${vibe}, and offers F while it is there`, async () => {
      appearance.set({ theme: 'light', vibe });
      document.documentElement.dataset.vibe = vibe;
      app.board = board();
      app.filterOpen = false;
      render(PlanView);
      const views = screen.getByRole('navigation', { name: 'View' });
      expect(within(views).getByRole('link', { name: 'Board' }).getAttribute('aria-current')).toBe('page');
      expect(screen.getByText(shellModel.showing)).toBeTruthy();
      expect(shellModel.filterAvailable).toBe(true);
      await fireEvent.click(screen.getByRole('button', { name: /^Filter cards/ }));
      expect(app.filterOpen).toBe(true);
      app.filterOpen = false;
      cleanup();
      expect(shellModel.filterAvailable).toBe(false);
    });
  }
});

describe('PlanView: the week\'s spend', () => {
  // The Studio boards printed the week's spend; the one board composition does not, so it reads none
  // (was: "is read once per board, not again when a refresh replaces the board object").
  it('is not read: the board shows no spend figure', async () => {
    app.board = board();
    render(PlanView);
    await tick();
    expect(usage.calls).toBe(0);
  });
});
