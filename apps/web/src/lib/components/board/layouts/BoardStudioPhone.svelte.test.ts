// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';

const { store } = vi.hoisted(() => ({ store: { openCard: vi.fn(), moveCard: vi.fn(async () => {}), error: '', syncedAt: new Date('2026-10-11T08:21:00Z') } }));
vi.mock('$lib/stores/app.svelte', () => ({ app: store }));

import { DX, boardCtx } from '$lib/test/fixture-boards';
import { buildBoardModel } from '../board-model';

import { clockHM } from '$lib/when';
import BoardStudioPhone from './BoardStudioPhone.svelte';

afterEach(cleanup);
const props = () => ({ model: buildBoardModel(DX, DX.cards, boardCtx()), vibe: 'studio' as const, phase: 'noon' as const, onCompose: vi.fn() });
const rows = () => screen.getAllByRole('button', { name: /Enter to open, M to move/ }).map((b) => b.textContent?.slice(0, 12));

describe('BoardStudioPhone', () => {
  it('numbers the rows in the wants order and the multiples by stage; the shell owns the main and the h1', () => {
    const { container } = render(BoardStudioPhone, props());
    expect(rows()).toEqual(['Diagnose Mel', 'AgentPod: co', 'Superpipelin', 'Fix the high', 'Integrate ed', 'agentpod-con', 'Build immuta']);
    expect(screen.getByRole('link', { name: 'Stage 3, Failing test: 3 cards' }).getAttribute('href')).toBe('#stage-3');
    expect(container.querySelector('main, h1')).toBeNull();
    expect(container.querySelector('.pb-hero .kick')!.textContent).toBe(`${clockHM(store.syncedAt.toISOString())} · midday`);
    expect(screen.getByRole('heading', { level: 2, name: /of 7 cards are waiting on a person$/ }).textContent).toBe('4 of 7 cards are waiting on a person');
  });
  it('filters the rows with the quick filter and keeps their numbers', async () => {
    render(BoardStudioPhone, props());
    const qf = screen.getByRole('group', { name: 'Quick filter' });
    await fireEvent.click(within(qf).getByRole('button', { name: 'Done 1' }));
    expect(within(qf).getByRole('button', { name: 'Done 1' }).getAttribute('aria-pressed')).toBe('true');
    expect(rows()).toEqual(['Build immuta']);
    const row = screen.getByRole('button', { name: /^Build immutable/ }).closest('article')!;
    expect(within(row as HTMLElement).getByText('07')).toBeTruthy();
  });
  it('flips the stages summary between show and hide', async () => {
    const { container } = render(BoardStudioPhone, props());
    const details = container.querySelector('details.pb-stages') as HTMLDetailsElement;
    expect(within(details).getByText('2 blocked · show')).toBeTruthy();
    details.open = true;
    await fireEvent(details, new Event('toggle'));
    expect(within(details).getByText('2 blocked · hide')).toBeTruthy();
  });
});
