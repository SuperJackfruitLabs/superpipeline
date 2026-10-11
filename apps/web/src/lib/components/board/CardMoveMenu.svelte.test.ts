// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';

const { moveCard, store } = vi.hoisted(() => {
  const moveCard = vi.fn(async (_id: string, _key: string) => {});
  return { moveCard, store: { moveCard, error: '' as string } };
});
vi.mock('$lib/stores/app.svelte', () => ({ app: store }));

import CardMoveMenu from './CardMoveMenu.svelte';

const stages = [
  { key: 'a', name: 'Plan', order: 0 },
  { key: 'b', name: 'Build', order: 1 },
  { key: 'c', name: 'Review', order: 2 },
] as never;
const card = { id: 'crd_1', title: 'Launch post', currentStageKey: 'b' } as never;

beforeEach(() => { moveCard.mockClear(); store.error = ''; });
afterEach(cleanup);

describe('CardMoveMenu', () => {
  it('has a named button that opens a menu with the current stage disabled', async () => {
    render(CardMoveMenu, { card, stages });
    const btn = screen.getByRole('button', { name: 'Move Launch post to another stage' });
    expect(btn.getAttribute('title')).toBe('Move to…');
    expect(screen.queryByRole('menu')).toBeNull();
    await fireEvent.click(btn);
    expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['Plan', 'Build · here', 'Review']);
    expect((screen.getByRole('menuitem', { name: 'Build · here' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('is hover-only by default and always shown when asked', () => {
    const { unmount } = render(CardMoveMenu, { card, stages });
    expect(screen.getByRole('button', { name: /Move Launch post/ }).className).toContain('opacity-0');
    unmount();
    render(CardMoveMenu, { card, stages, visible: true });
    expect(screen.getByRole('button', { name: /Move Launch post/ }).className).not.toContain('opacity-0');
  });

  it('moves, closes and announces', async () => {
    const { container } = render(CardMoveMenu, { card, stages });
    await fireEvent.click(screen.getByRole('button', { name: /Move Launch post/ }));
    await fireEvent.click(screen.getByRole('menuitem', { name: 'Review' }));
    expect(moveCard).toHaveBeenCalledWith('crd_1', 'c');
    await waitFor(() => expect(container.querySelector('[aria-live="polite"]')!.textContent).toBe('Launch post moved to Review'));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('does not announce a refused move', async () => {
    store.error = 'WIP limit';
    const { container } = render(CardMoveMenu, { card, stages });
    await fireEvent.click(screen.getByRole('button', { name: /Move Launch post/ }));
    await fireEvent.click(screen.getByRole('menuitem', { name: 'Plan' }));
    await waitFor(() => expect(moveCard).toHaveBeenCalled());
    expect(container.querySelector('[aria-live="polite"]')!.textContent).toBe('');
  });

  it('closes on Escape', async () => {
    render(CardMoveMenu, { card, stages });
    await fireEvent.click(screen.getByRole('button', { name: /Move Launch post/ }));
    await fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
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
