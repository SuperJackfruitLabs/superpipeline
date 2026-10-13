// apps/web/src/lib/components/board/paper/PaperStory.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';

const { store } = vi.hoisted(() => ({ store: { openCard: vi.fn(), openMoveDialog: vi.fn(), moveCard: vi.fn(async () => {}), error: '' } }));
vi.mock('$lib/stores/app.svelte', () => ({ app: store }));

import { DX, DX_IDS, boardCtx } from '$lib/test/fixture-boards';
import { buildBoardModel } from '../board-model';
import PaperStory from './PaperStory.svelte';

const m = buildBoardModel(DX, DX.cards, boardCtx());
const props = (id: string) => ({ s: m.cards.find((c) => c.id === id)!, size: 'lead' as const, stages: m.stageDefs, terminalName: 'Shipped', boardId: m.boardId });

beforeEach(() => store.openCard.mockClear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('PaperStory', () => {
  it('a long quote is clamped and offers "Read the rest", which toggles', async () => {
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(220);
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(83);
    const { container } = render(PaperStory, props(DX_IDS.c58f8));
    const more = await screen.findByRole('button', { name: 'Read the rest' });
    expect(more.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('blockquote')!.classList.contains('pp-clamp')).toBe(true);
    await fireEvent.click(more);
    expect(screen.getByRole('button', { name: 'Show less' }).getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('blockquote')!.classList.contains('pp-clamp')).toBe(false);
  });
  it('a quote that fits has no clamp and no toggle', () => {
    const { container } = render(PaperStory, props(DX_IDS.c1dfc));
    expect(container.querySelector('blockquote')!.textContent).toBe('“this stage was not finished twice — first: the handoff is missing commit; then, after one automatic rework: the handoff is missing commit”');
    expect(container.querySelector('blockquote')!.classList.contains('pp-clamp')).toBe(false);
    expect(screen.queryByRole('button', { name: 'Read the rest' })).toBeNull();
  });
  it('Open is a real link to the card that opens the drawer on a plain click', async () => {
    render(PaperStory, props(DX_IDS.c4605));
    const open = screen.getByRole('link', { name: 'Open Diagnose Melissa and Anna Supermessage silence — trace actual failing hop' });
    expect(open.getAttribute('href')).toBe(`/b/brd_134a0ddb6d434478/c/${DX_IDS.c4605}`);
    await fireEvent.click(open);
    expect(store.openCard).toHaveBeenCalledWith(DX_IDS.c4605);
  });
  it('the reply on an unowned card opens the Move dialog', async () => {
    render(PaperStory, props(DX_IDS.c63ac));
    await fireEvent.click(screen.getByRole('button', { name: 'Move to a stage someone works' }));
    await tick();
    expect(store.openMoveDialog).toHaveBeenCalled(); // the Move dialog (SP-Dlg-Move) opens, not a menu
  });
});
