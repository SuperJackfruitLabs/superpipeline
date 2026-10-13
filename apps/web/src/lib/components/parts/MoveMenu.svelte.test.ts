// apps/web/src/lib/components/parts/MoveMenu.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import MoveMenu from './MoveMenu.svelte';

afterEach(cleanup);
const items = [
  { key: 'reported', name: 'Reported', here: true },
  { key: 'reproduce', name: 'Reproduce', here: false },
  { key: 'test', name: 'Failing test', here: false },
];

describe('MoveMenu', () => {
  it('opens on the first stage it can move to, the current one marked here', () => {
    render(MoveMenu, { items, onpick: vi.fn(), onclose: vi.fn() });
    expect(screen.getByRole('menu', { name: 'Move to' })).toBeTruthy();
    expect(document.activeElement?.textContent).toBe('Reproduce');
    expect(screen.getByRole('menuitem', { name: /Reported/ }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('menuitem', { name: /Reported/ }).textContent).toBe('Reportedhere');
  });
  it('arrows move, the current stage cannot be picked, Escape closes', async () => {
    const onpick = vi.fn();
    const onclose = vi.fn();
    render(MoveMenu, { items, onpick, onclose });
    await fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(document.activeElement?.textContent).toBe('Failing test');
    await fireEvent.click(screen.getByRole('menuitem', { name: /Reported/ }));
    expect(onpick).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('menuitem', { name: 'Failing test' }));
    expect(onpick).toHaveBeenCalledWith('test');
    await fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(onclose).toHaveBeenCalled();
  });
  it('a click outside closes it', async () => {
    const onclose = vi.fn();
    render(MoveMenu, { items, onpick: vi.fn(), onclose });
    await fireEvent.pointerDown(document.body);
    expect(onclose).toHaveBeenCalled();
  });
});
