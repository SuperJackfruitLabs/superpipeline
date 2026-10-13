// apps/web/src/lib/components/board/daylight/DlTile.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';

const { store } = vi.hoisted(() => ({ store: { openCard: vi.fn(), openMoveDialog: vi.fn(), moveCard: vi.fn(async () => {}), error: '' } }));
vi.mock('$lib/stores/app.svelte', () => ({ app: store }));

import { DX, DX_IDS, boardCtx } from '$lib/test/fixture-boards';
import { buildBoardModel } from '../board-model';
import DlTile from './DlTile.svelte';

const m = buildBoardModel(DX, DX.cards, boardCtx());
const s = (id: string) => m.cards.find((c) => c.id === id)!;
const props = (id: string, over: Record<string, unknown> = {}) => ({ s: s(id), stages: m.stageDefs, peekOpen: false, firstNeeds: false, peek: peekStub(), ...over });

const peekStub = () => ({ pointerEnter: vi.fn(), pointerLeave: vi.fn(), focusIn: vi.fn(), focusOut: vi.fn(), close: vi.fn() });

beforeEach(() => store.openCard.mockClear());
afterEach(cleanup);

describe('DlTile', () => {
  it('names its title for the keyboard and opens the card on Enter', async () => {
    render(DlTile, props(DX_IDS.c58f8));
    const title = screen.getByRole('button', { name: 'AgentPod: connector interface and generic effects ledger, state machine and executor, in Failing test. Enter to open, M to move, Alt with left or right arrow to move between stages.' });
    await fireEvent.keyDown(title, { key: 'Enter' });
    expect(store.openCard).toHaveBeenCalledWith(DX_IDS.c58f8);
  });
  it('63ac: priority for screen readers, three chips and "+1", asked-by, overdue, the move action', async () => {
    const { container } = render(DlTile, props(DX_IDS.c63ac));
    expect(container.querySelector('article')!.className).toMatch(/\bp1\b/);
    expect(container.querySelector('article')!.className).toMatch(/\bneeds\b/);
    expect(screen.getByText('Priority 1').className).toBe('vk-visually-hidden');
    expect(screen.getByText('+1').getAttribute('title')).toBe('1 more label');
    expect(screen.getByText('asked by super-chotu').closest('.dl-asked')!.getAttribute('title')).toBe('Queued by super-chotu, not by you');
    expect(screen.getByText('Overdue · due 6 Oct')).toBeTruthy();
    expect(screen.getByText('With you')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Move to another stage' }));
    await tick();
    expect(store.openMoveDialog).toHaveBeenCalled(); // the Move dialog (SP-Dlg-Move) opens, not a menu
  });
  it('1dfc has no priority and no chips row at all', () => {
    const { container } = render(DlTile, props(DX_IDS.c1dfc));
    expect(container.querySelector('.dl-chips')).toBeNull();
    expect(container.querySelector('.dl-ref')!.textContent).toBe('test(api): pin manual delivery reminder');
  });
  it('a blocked queued card says it is unclaimed and offers no action', () => {
    const { container } = render(DlTile, props(DX_IDS.c481f));
    expect(screen.getByText('Blocked').closest('.dl-chip')!.getAttribute('title')).toBe('Blocked by another card. This card will not be claimed');
    expect(screen.getByText('Unclaimed · starts when unblocked')).toBeTruthy();
    expect(container.querySelector('.dl-act')).toBeNull();
  });
  it('tells the board where the eye is, and shows the peek when asked', async () => {
    const peek = peekStub();
    const { container, rerender } = render(DlTile, props(DX_IDS.c58f8, { peek }));
    const article = container.querySelector('article')!;
    await fireEvent.pointerEnter(article);
    expect(peek.pointerEnter).toHaveBeenCalledWith(DX_IDS.c58f8);
    await fireEvent.pointerLeave(article);
    expect(peek.pointerLeave).toHaveBeenCalledWith(DX_IDS.c58f8);
    await fireEvent.focusIn(article.querySelector('.dl-title')!);
    expect(peek.focusIn).toHaveBeenCalledWith(DX_IDS.c58f8);
    // focus moving to another control inside the card is not leaving it; moving out of it is
    await fireEvent.focusOut(article.querySelector('.dl-title')!, { relatedTarget: article.querySelector('.dl-move') });
    expect(peek.focusOut).not.toHaveBeenCalled();
    await fireEvent.focusOut(article.querySelector('.dl-title')!, { relatedTarget: document.body });
    expect(peek.focusOut).toHaveBeenCalledWith(DX_IDS.c58f8);
    await rerender(props(DX_IDS.c58f8, { peek, peekOpen: true }));
    const open = screen.getByRole('complementary', { name: 'Peek' });
    expect(open.textContent).toContain('Peek · Failing test · 33h in this stage');
    expect(open.textContent).toContain('tester-tim · I’ve stopped and need you');
    expect(container.querySelector('article')!.className).toMatch(/\bfocused\b/);
  });
  it('the first needs tile is the jump target', () => {
    render(DlTile, props(DX_IDS.c63ac, { firstNeeds: true }));
    expect(document.getElementById('first-needs')!.textContent).toBe('Fix the highest-severity blocker found in the clean-room journey');
  });
});
