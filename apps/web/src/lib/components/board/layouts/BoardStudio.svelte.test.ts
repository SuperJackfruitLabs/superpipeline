// apps/web/src/lib/components/board/layouts/BoardStudio.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';

const { store } = vi.hoisted(() => ({ store: { openCard: vi.fn(), moveCard: vi.fn(async () => {}), error: '' } }));
vi.mock('$lib/stores/app.svelte', () => ({ app: store }));

import { DX, DX_IDS, boardCtx } from '$lib/test/fixture-boards';
import { buildBoardModel } from '../board-model';
import BoardStudio from './BoardStudio.svelte';

afterEach(cleanup);
const props = () => ({ model: buildBoardModel(DX, DX.cards, boardCtx()), vibe: 'studio' as const, phase: 'noon' as const, onCompose: vi.fn() });
const rows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);
const panel = () => screen.getByRole('complementary', { name: /waiting for a decision$/ });

describe('BoardStudio', () => {
  it('the hero and the table, people needed first', () => {
    render(BoardStudio, props());
    expect(screen.getByRole('heading', { level: 2, name: /waiting on a person/ }).textContent).toBe('4 of 7 cards are waiting on a person');
    expect(rows().map((r) => r.querySelector('.ix')!.textContent)).toEqual(['01', '02', '03', '04', '05', '06', '07']);
    expect(rows()[0]!.getAttribute('data-card-id')).toBe(DX_IDS.c63ac);
    expect(rows()[2]!.querySelector('.m.sig')!.textContent).toBe('5');
  });
  it('the quick filter filters the table and the panel, not the figures', async () => {
    render(BoardStudio, props());
    await fireEvent.click(screen.getByRole('button', { name: 'Done 1' }));
    expect(screen.getByRole('button', { name: 'Done 1' }).getAttribute('aria-pressed')).toBe('true');
    expect(rows()).toHaveLength(1);
    expect(within(panel()).queryAllByRole('article')).toHaveLength(0);
    expect(screen.getByText('Nothing is waiting for a decision')).toBeTruthy();
    expect(screen.getByText('Cards').previousElementSibling!.textContent).toBe('7');
  });
  it('arrow keys move the selected row and focus its title', async () => {
    render(BoardStudio, props());
    const first = rows()[0]!.querySelector<HTMLButtonElement>('.ttl')!;
    first.focus();
    await fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(rows()[1]!.classList.contains('sel')).toBe(true);
    expect(rows()[1]!.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(rows()[1]!.querySelector('.ttl'));
  });
  it('the panel resumes a stopped card by opening it', async () => {
    render(BoardStudio, props());
    await fireEvent.click(within(panel()).getAllByRole('button', { name: 'Read why and resume' })[0]!);
    expect(store.openCard).toHaveBeenCalledWith(DX_IDS.c58f8);
  });
  it('a multiple names its stage for a screen reader', () => {
    render(BoardStudio, props());
    expect(screen.getByRole('link', { name: 'Stage 4, Fix: 1 card, waiting on you. Code, 2 agents' }).getAttribute('href')).toBe('#stage-4');
  });
});
