// @vitest-environment jsdom
/**
 * What PlanView decides: an empty board draws the empty explanation (on a phone too), and Daylight's
 * greeting sits in the shell's sky as the band on a desktop and the hello on a phone. The shells,
 * the board layouts and the store are the real ones.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';

const env = vi.hoisted(() => {
  const state = { phone: false };
  window.matchMedia = ((query: string) => ({ matches: state.phone && query.includes('max-width'), media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false })) as never;
  return state;
});
vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/b/brd_134a0ddb6d434478') } }));
vi.mock('$lib/viewport.svelte', () => ({ viewport: { get phone() { return env.phone; } }, PHONE_QUERY: '(max-width: 899.98px)', NARROW_QUERY: '(max-width: 639.98px)' }));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), getUsage: async () => ({ totalCostUsd: 0 }) }));

import PlanView from './PlanView.svelte';
import { app } from '$lib/stores/app.svelte';
import { appearance } from '$lib/appearance.svelte';
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
      expect(container.querySelector('.pd-board, .dl-board')).toBeNull();
    });
  }
  it('draws the board, not the explanation, once a card is live', () => {
    app.board = board();
    const { container } = render(PlanView);
    expect(container.querySelector('.em')).toBeNull();
    expect(container.querySelector('.dl-board')).toBeTruthy();
  });
});

describe('PlanView: the Daylight greeting', () => {
  it('is the band on a desktop', () => {
    app.board = board();
    const { container } = render(PlanView);
    expect(container.querySelector('.dl-band')).toBeTruthy();
    expect(container.querySelector('.pd-hello')).toBeNull();
  });
  it('is the hello in the sky on a phone, greeting the person by first name', () => {
    env.phone = true;
    app.board = board();
    const { container } = render(PlanView);
    expect(container.querySelector('.dl-band')).toBeNull();
    const hello = screen.getByRole('region', { name: 'Greeting' });
    expect(hello.querySelector('h2')!.textContent).toMatch(/, Ira[.?]$/);
    expect(container.querySelector('.pd-board')).toBeTruthy();
  });
  it('is not drawn on an empty board (O-13)', () => {
    env.phone = true;
    app.board = board(archived);
    const { container } = render(PlanView);
    expect(container.querySelector('.pd-hello, .dl-band')).toBeNull();
  });
  it('belongs to Daylight alone', () => {
    env.phone = true;
    appearance.set({ theme: 'light', vibe: 'quiet' });
    document.documentElement.dataset.vibe = 'quiet';
    app.board = board();
    const { container } = render(PlanView);
    expect(container.querySelector('.pd-hello')).toBeNull();
    expect(container.querySelector('.qb-board')).toBeTruthy();
  });
});
