// apps/web/src/lib/components/board/layouts/BoardPaper.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';

const { store } = vi.hoisted(() => ({ store: { openCard: vi.fn(), moveCard: vi.fn(async () => {}), error: '' } }));
vi.mock('$lib/stores/app.svelte', () => ({ app: store }));

import { DX, ONBOARDING, boardCtx } from '$lib/test/fixture-boards';
import { buildBoardModel } from '../board-model';
import BoardPaper from './BoardPaper.svelte';

afterEach(cleanup);
const props = (board = DX) => ({ model: buildBoardModel(board, board.cards, boardCtx()), vibe: 'paper' as const, phase: 'noon' as const, onCompose: vi.fn() });

describe('BoardPaper', () => {
  it('column 1 holds the four letters in board order', () => {
    const { container } = render(BoardPaper, props());
    const col = screen.getByRole('region', { name: 'Waiting on you · 4 letters' });
    expect(within(col).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Fix the highest-severity blocker found in the clean-room journey',
      'AgentPod: connector interface and generic effects ledger, state machine and executor',
      'Superpipeline: manual-delivery completion and approval-subject hardening',
      'Diagnose Melissa and Anna Supermessage silence — trace actual failing hop',
    ]);
    expect(container.querySelector('#pp-wait')!.classList.contains('live')).toBe(true);
  });
  it('columns 2 and 3, and the pipeline', () => {
    render(BoardPaper, props());
    const two = screen.getByRole('region', { name: 'In progress and coming up' });
    expect(within(two).getByText('Nothing in progress.')).toBeTruthy();
    expect(within(two).getByText('Coming up · 2')).toBeTruthy();
    const three = screen.getByRole('region', { name: 'Shipped and closed' });
    expect(within(three).getByText('Shipped · 1')).toBeTruthy();
    expect(within(three).getByText('No card has been closed.')).toBeTruthy();
    const pipe = screen.getByRole('region', { name: 'The pipeline · read left to right' });
    expect(within(pipe).getAllByRole('listitem')).toHaveLength(7);
  });
  it('Move is the ghost button beside Open (SP-Board-Paper .pp-btn.ghost, vibekit 0.0.4)', () => {
    render(BoardPaper, props());
    const moves = screen.getAllByRole('button', { name: /^Move .* to another stage$/ });
    expect(moves.length).toBeGreaterThan(0);
    for (const b of moves) expect(b.classList.contains('vk-button--ghost'), b.getAttribute('aria-label') ?? '').toBe(true);
    for (const a of screen.getAllByRole('link', { name: /^Open / })) expect(a.classList.contains('vk-button--ghost')).toBe(false);
  });
  it('the write box composes', async () => {
    const p = props();
    render(BoardPaper, p);
    await fireEvent.click(screen.getByRole('button', { name: 'New card' }));
    expect(p.onCompose).toHaveBeenCalled();
  });
  it('a board with nothing waiting says so, without the signal colour', () => {
    const { container } = render(BoardPaper, props(ONBOARDING));
    expect(screen.getByText('Nothing waits on you.')).toBeTruthy();
    expect(container.querySelector('#pp-wait')!.classList.contains('live')).toBe(false);
    expect(screen.getByText('Resident · 20')).toBeTruthy();
  });
});
