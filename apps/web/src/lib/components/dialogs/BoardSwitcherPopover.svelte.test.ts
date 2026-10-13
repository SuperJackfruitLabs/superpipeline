// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { BOARDS } from '../../../../e2e/pixel/fixture/dialog-cases';

// bits-ui's command list measures itself.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;
Element.prototype.scrollIntoView ??= function () {};
const goto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: (u: string) => goto(u) }));
import BoardSwitcherPopover from './BoardSwitcherPopover.svelte';
import { app } from '$lib/stores/app.svelte';

beforeEach(() => {
  goto.mockClear();
  app.boards = BOARDS;
  app.boardId = 'brd_134a0ddb6d434478';
  app.board = { name: 'Developer Experience', stages: [], cards: [] } as never;
  app.boardSwitcherOpen = false;
});
afterEach(cleanup);

async function open() {
  render(BoardSwitcherPopover);
  app.boardSwitcherOpen = true;
  await tick(); await tick();
}

describe('BoardSwitcherPopover', () => {
  it('is vibekit’s switcher form: this board first, needs you, then the rest', async () => {
    await open();
    const q = screen.getByRole('combobox', { name: 'Find a board' });
    expect(q.closest('.vk-commandpalette--switcher')).toBeTruthy();
    const rows = screen.getAllByRole('option');
    expect(rows).toHaveLength(12);
    expect(rows[0]!.textContent).toContain('Developer Experience');
    expect(rows[0]!.textContent).toContain('You are here');
    expect(rows[0]!.textContent).toContain('4 need you');
  });
  it('picking a board goes there and closes', async () => {
    await open();
    await fireEvent.click(screen.getByRole('option', { name: /Research & Intelligence/ }));
    expect(goto).toHaveBeenCalledWith('/b/brd_fa33a0a0721d4d18');
    expect(app.boardSwitcherOpen).toBe(false);
  });
  it('puts the outline on the destructive control, and renames in place', async () => {
    await open();
    expect(screen.getByRole('button', { name: 'Delete board…' }).className).toBe('bs-del');
    expect(screen.getByRole('button', { name: 'Rename' }).className).toBe('link');
    await fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
    const input = screen.getByRole('textbox', { name: 'Board name' }) as HTMLInputElement;
    expect(input.value).toBe('Developer Experience');
    await fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Rename' })).toBeTruthy();
    expect(app.boardSwitcherOpen).toBe(true);
  });
});
