// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';

const { moveCard, openMoveDialog, store } = vi.hoisted(() => {
  const moveCard = vi.fn(async (_id: string, _key: string) => {});
  const openMoveDialog = vi.fn();
  return { moveCard, openMoveDialog, store: { moveCard, openMoveDialog, error: '' as string } };
});
vi.mock('$lib/stores/app.svelte', () => ({ app: store }));

import CardMoveMenu from './CardMoveMenu.svelte';

const stages = [
  { key: 'a', name: 'Plan', order: 0 },
  { key: 'b', name: 'Build', order: 1 },
  { key: 'c', name: 'Review', order: 2 },
] as never;
const card = { id: 'crd_1', title: 'Launch post', currentStageKey: 'b' } as never;

beforeEach(() => { moveCard.mockClear(); openMoveDialog.mockClear(); store.error = ''; });
afterEach(cleanup);

describe('CardMoveMenu', () => {
  it('has a named button that opens the Move dialog for this card', async () => {
    render(CardMoveMenu, { card, stages });
    const btn = screen.getByRole('button', { name: 'Move Launch post to another stage' });
    expect(btn.getAttribute('title')).toBe('Move to…');
    expect(btn.getAttribute('aria-haspopup')).toBe('dialog');
    await fireEvent.click(btn);
    expect(openMoveDialog).toHaveBeenCalledWith('crd_1');
    expect(screen.queryByRole('menu')).toBeNull();
  });
  it('opening it from the tile’s M key (or a bare caller’s trigger) also opens the dialog', async () => {
    render(CardMoveMenu, { card, stages, open: true, bare: true });
    await tick();
    expect(openMoveDialog).toHaveBeenCalledWith('crd_1');
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('is hover-only by default and always shown when asked', () => {
    const { unmount } = render(CardMoveMenu, { card, stages });
    expect(screen.getByRole('button', { name: /Move Launch post/ }).className).toContain('opacity-0');
    unmount();
    render(CardMoveMenu, { card, stages, visible: true });
    expect(screen.getByRole('button', { name: /Move Launch post/ }).className).not.toContain('opacity-0');
  });
  it('steps to the neighbouring stage, and stops at the ends', async () => {
    const r = render(CardMoveMenu, { card, stages });
    r.component.step(1);
    expect(moveCard).toHaveBeenLastCalledWith('crd_1', 'c');
    r.component.step(-1);
    expect(moveCard).toHaveBeenLastCalledWith('crd_1', 'a');
    moveCard.mockClear();
    r.rerender({ card: { ...(card as object), currentStageKey: 'c' } as never, stages });
    r.component.step(1);
    expect(moveCard).not.toHaveBeenCalled();
  });
});
