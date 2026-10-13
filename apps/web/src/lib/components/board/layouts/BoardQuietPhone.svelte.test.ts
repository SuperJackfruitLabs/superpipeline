// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';

const { store } = vi.hoisted(() => ({ store: { openCard: vi.fn(), moveCard: vi.fn(async () => {}), error: '', syncedAt: new Date('2026-10-11T08:21:00Z') } }));
vi.mock('$lib/stores/app.svelte', () => ({ app: store }));

import { DX, boardCtx } from '$lib/test/fixture-boards';
import { buildBoardModel } from '../board-model';

import BoardQuietPhone from './BoardQuietPhone.svelte';

afterEach(cleanup);
const props = () => ({ model: buildBoardModel(DX, DX.cards, boardCtx()), vibe: 'quiet' as const, phase: 'noon' as const, onCompose: vi.fn() });

describe('BoardQuietPhone', () => {
  it('groups the cards and says None. under an empty group; the board name is an h2 (the header owns the h1)', () => {
    const { container } = render(BoardQuietPhone, props());
    expect(container.querySelector('h1')).toBeNull();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Developer Experience', 'Needs your decision (4)', 'In progress (0)', 'Waiting to start (2)', 'Done (1)', 'Closed (0)',
    ]);
    expect(screen.getAllByText('None.')).toHaveLength(2);
    expect(screen.getByText('Superpipeline · 7 cards · 4 need your decision')).toBeTruthy();
  });
  it('offers the full reason only where there is more, and links Decide to the card', () => {
    render(BoardQuietPhone, props());
    expect(screen.getAllByText('Show the full reason')).toHaveLength(2);
    const decide = screen.getAllByRole('link', { name: 'Decide' });
    expect(decide).toHaveLength(3);
    expect(decide[0].getAttribute('href')).toBe('/b/brd_134a0ddb6d434478/c/card_05823a57e8224605');
  });
  it('tables the stages with Quiet owner words', () => {
    render(BoardQuietPhone, props());
    const table = screen.getByRole('table', { name: 'Stages' });
    const body = within(table).getAllByRole('row').slice(1).map((r) => [...r.children].map((c) => c.textContent));
    expect(body[2]).toEqual(['3. Failing test', '3, 2 blocked', 'testing: tester-tim']);
    expect(body[5]).toEqual(['6. Signed off', 'empty', 'gate: approval by a person']);
  });
});
