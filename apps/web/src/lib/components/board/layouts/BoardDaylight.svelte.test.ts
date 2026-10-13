// apps/web/src/lib/components/board/layouts/BoardDaylight.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';

const { store } = vi.hoisted(() => ({ store: { openCard: vi.fn(), moveCard: vi.fn(async () => {}), error: '', openCardId: null } }));
vi.mock('$lib/stores/app.svelte', () => ({ app: store }));

import { DX, DX_IDS, boardCtx } from '$lib/test/fixture-boards';
import { buildBoardModel } from '../board-model';
import BoardDaylight from './BoardDaylight.svelte';

beforeAll(() => {
  // The peek starts at 1440px; jsdom has no matchMedia.
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({ matches: q.includes('1440'), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
});
afterEach(cleanup);
const model = buildBoardModel(DX, DX.cards, boardCtx());
const props = { model, vibe: 'daylight' as const, phase: 'noon' as const, onCompose: vi.fn() };

describe('BoardDaylight', () => {
  it('draws five lanes and two strips, in stage order, with the formula grid', () => {
    const { container } = render(BoardDaylight, props);
    const board = screen.getByRole('region', { name: 'Developer Experience stages' });
    expect(board.getAttribute('style')).toBe('grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.15fr) minmax(0, 1fr) 60px 60px minmax(0, 1fr);');
    expect([...container.querySelectorAll('[data-lane]')].map((e) => `${e.tagName.toLowerCase()}:${e.getAttribute('data-lane')}`)).toEqual([
      'section:reported', 'section:reproduce', 'section:test', 'section:fix', 'button:integrate', 'button:signed-off', 'section:shipped',
    ]);
    expect([...container.querySelectorAll('section[data-lane="test"] [data-card-id]')].map((e) => e.getAttribute('data-card-id')!.slice(-4))).toEqual(['58f8', 'f83f', '481f']);
    expect(screen.getByText('2 blocked').closest('.dl-blocked')!.getAttribute('title')).toBe('Blocked cards are skipped when agents claim work');
  });
  it('a strip expands into an empty lane and collapses again', async () => {
    render(BoardDaylight, props);
    const strip = screen.getByRole('button', { name: /^Integrate, no cards\./ });
    expect(strip.getAttribute('aria-expanded')).toBe('false');
    await fireEvent.click(strip);
    expect(screen.getByText('No cards in this stage.')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Collapse stage' }));
    expect(screen.getByRole('button', { name: /^Integrate, no cards\./ })).toBeTruthy();
  });
  it('pointing opens the peek after 300 ms; Esc closes it and keeps focus on the title', async () => {
    vi.useFakeTimers();
    const { container } = render(BoardDaylight, props);
    const tile = container.querySelector(`[data-card-id="${DX_IDS.c58f8}"]`)!;
    await fireEvent.pointerEnter(tile);
    expect(screen.queryByRole('complementary', { name: 'Peek' })).toBeNull();
    await vi.advanceTimersByTimeAsync(300);
    expect(screen.getByRole('complementary', { name: 'Peek' })).toBeTruthy();
    expect(tile.closest('section')!.getAttribute('style')).toBe('z-index: 5;');
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('complementary', { name: 'Peek' })).toBeNull();
    expect(document.activeElement).toBe(tile.querySelector('.dl-title'));
    await vi.advanceTimersByTimeAsync(400);
    expect(screen.queryByRole('complementary', { name: 'Peek' })).toBeNull();
    vi.useRealTimers();
  });
});
