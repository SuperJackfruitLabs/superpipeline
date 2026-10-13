// apps/web/src/lib/components/board/layouts/BoardQuiet.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { tick } from 'svelte';

const { store } = vi.hoisted(() => ({ store: { openCard: vi.fn(), openMoveDialog: vi.fn(), moveCard: vi.fn(async () => {}), error: '' } }));
vi.mock('$lib/stores/app.svelte', () => ({ app: store }));

import { DX, DX_IDS, ONBOARDING, boardCtx } from '$lib/test/fixture-boards';
import { buildBoardModel } from '../board-model';
import BoardQuiet from './BoardQuiet.svelte';

afterEach(cleanup);
const props = (board = ONBOARDING) => ({ model: buildBoardModel(board, board.cards, boardCtx()), vibe: 'quiet' as const, phase: 'noon' as const, onCompose: vi.fn() });

describe('BoardQuiet', () => {
  it('is a plain column with the board name and the lede; the shell owns the main landmark', () => {
    render(BoardQuiet, props());
    expect(screen.queryByRole('main')).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'Agent Onboarding' })).toBeTruthy();
    expect(screen.getByText('Nothing needs you. All 20 cards are done.')).toBeTruthy();
  });
  it('shows the newest five done cards and reveals the rest', async () => {
    render(BoardQuiet, props());
    const done = screen.getByRole('region', { name: 'Done (20)' });
    expect(within(done).getAllByRole('listitem')).toHaveLength(5);
    const more = screen.getByRole('button', { name: 'Show all 20 done cards' });
    expect(more.getAttribute('aria-expanded')).toBe('false');
    await fireEvent.click(more);
    expect(within(done).getAllByRole('listitem')).toHaveLength(20);
    expect(more.getAttribute('aria-expanded')).toBe('true');
  });
  it('empty groups read None.', () => {
    render(BoardQuiet, props());
    const zero = screen.getByRole('list', { name: 'Empty groups' });
    expect(within(zero).getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Needs your decision (0)', 'In progress (0)', 'Waiting to start (0)']);
    expect(within(screen.getByRole('list', { name: 'Closed' })).getByText('None.')).toBeTruthy();
  });
  it('an item opens, and opens the Move dialog', async () => {
    render(BoardQuiet, props());
    const open = screen.getAllByRole('link', { name: 'Open' })[0]!;
    expect(open.getAttribute('href')).toBe('/b/brd_f47143722126442c/c/card_9d48db2717044b69');
    await fireEvent.click(screen.getByRole('button', { name: 'Move Run and record the clean-room SuperPipeline operator journey to another stage' }));
    await tick();
    expect(store.openMoveDialog).toHaveBeenCalled(); // the Move dialog (SP-Dlg-Move) opens, not a menu
  });
  it('a needs item offers its decision on a board that has them', async () => {
    render(BoardQuiet, props(DX));
    expect(screen.getByRole('region', { name: 'Needs your decision (4)' })).toBeTruthy();
    await fireEvent.click(screen.getAllByRole('button', { name: 'Resume' })[0]!);
    expect(store.openCard).toHaveBeenCalledWith(DX_IDS.c58f8);
  });
});
