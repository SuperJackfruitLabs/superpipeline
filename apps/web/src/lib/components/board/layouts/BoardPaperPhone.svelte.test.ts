// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { tick } from 'svelte';

const { store } = vi.hoisted(() => ({ store: { openCard: vi.fn(), openMoveDialog: vi.fn(), moveCard: vi.fn(async () => {}), error: '', syncedAt: new Date('2026-10-11T08:21:00Z') } }));
vi.mock('$lib/stores/app.svelte', () => ({ app: store }));

import { DX, boardCtx } from '$lib/test/fixture-boards';
import { buildBoardModel } from '../board-model';

import BoardPaperPhone from './BoardPaperPhone.svelte';

afterEach(cleanup);
const props = (onCompose = vi.fn()) => ({ model: buildBoardModel(DX, DX.cards, boardCtx()), vibe: 'paper' as const, phase: 'noon' as const, onCompose });

describe('BoardPaperPhone', () => {
  it('prints the letters in the wants order, then the entries and the pipeline', () => {
    render(BoardPaperPhone, props());
    const wait = screen.getByRole('region', { name: 'Waiting on you · 4 letters' });
    expect(within(wait).getAllByRole('heading', { level: 3 }).map((h) => h.textContent?.slice(0, 12))).toEqual(['Diagnose Mel', 'AgentPod: co', 'Superpipelin', 'Fix the high']);
    expect(screen.getByText('Nobody is working on a card right now.')).toBeTruthy();
    expect(screen.getByText('Nothing closed.')).toBeTruthy();
    const pipe = screen.getByRole('region', { name: 'The pipeline' });
    expect(within(pipe).getAllByRole('listitem').map((li) => li.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      '1Reported · 1 · a person', '→Reproduce · 1 · diagnostics · error-eric', '→Failing test · 3 · 2 blocked · testing · tester-tim',
      '→Fix · 1 · code · 2 agents', '→Integrate · empty · integration', '→Signed off · empty · gate · approval by a person', '→Shipped · 1 · a person',
    ]);
  });
  it('composes from the write box', async () => {
    const onCompose = vi.fn();
    render(BoardPaperPhone, props(onCompose));
    const write = screen.getByRole('region', { name: 'Write a new card' });
    await fireEvent.click(within(write).getByRole('button', { name: 'Write a new card' }));
    expect(onCompose).toHaveBeenCalledOnce();
  });
  it('replies to a letter and opens the Move dialog for an entry', async () => {
    render(BoardPaperPhone, props());
    const wait = screen.getByRole('region', { name: 'Waiting on you · 4 letters' });
    await fireEvent.click(within(wait).getAllByRole('button', { name: 'Resume' })[0]!);
    expect(store.openCard).toHaveBeenCalled();
    const up = screen.getByRole('region', { name: 'Coming up · 2' });
    await fireEvent.click(within(up).getAllByRole('button', { name: /^Move .* to another stage$/ })[0]!);
    await tick();
    expect(store.openMoveDialog).toHaveBeenCalled(); // the Move dialog (SP-Dlg-Move) opens, not a menu
  });
});
