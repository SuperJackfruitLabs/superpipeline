// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { AGENTS, BOARDS, DX_STAGES } from '../../../../e2e/pixel/fixture/dialog-cases';

// bits-ui's command list measures itself.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;
Element.prototype.scrollIntoView ??= function () {};
const goto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: (u: string) => goto(u) }));
const logout = vi.fn(async () => {});
vi.mock('$lib/components/shell/account', async (orig) => ({ ...(await orig<typeof import('$lib/components/shell/account')>()), signOut: () => logout() }));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), getBoard: vi.fn(async () => ({ stages: [] })) }));

import PaletteMount from './PaletteMount.svelte';
import { app } from '$lib/stores/app.svelte';
import { appearance } from '$lib/appearance.svelte';

const field = () => screen.getByRole('combobox', { name: 'Search cards, boards, agents and actions' });
async function openWith(q: string) {
  render(PaletteMount);
  app.cmdkOpen = true;
  await tick(); await tick();
  await fireEvent.input(field(), { target: { value: q } });
  await tick();
}

beforeEach(() => {
  goto.mockClear(); logout.mockClear();
  appearance.set({ theme: 'dark' });
  app.cmdkOpen = false;
  app.boardId = 'brd_134a0ddb6d434478';
  app.board = { boardId: 'brd_134a0ddb6d434478', name: 'Developer Experience', stages: DX_STAGES, cards: [], gates: [], elicitations: [], references: [] } as never;
  app.boards = BOARDS; app.agents = AGENTS; app.members = [];
  app.user = { userId: 'usr_b19776fac3c94df4', tenantId: 'tnt_vibes', name: 'Ira Mehta' };
});
afterEach(() => cleanup());

describe('PaletteMount', () => {
  it('is vibekit’s palette, and ⌘K opens it', async () => {
    render(PaletteMount);
    await fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await tick(); await tick();
    expect(field().closest('.vk-commandpalette')).toBeTruthy();
    expect(app.cmdkOpen).toBe(true);
  });
  it('signs out', async () => {
    await openWith('sign out');
    await fireEvent.click(screen.getByRole('option', { name: /Sign out/ }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
  it('switches to the light theme from dark, and closes', async () => {
    await openWith('theme');
    await fireEvent.click(screen.getByRole('option', { name: /Light theme/ }));
    expect(appearance.theme).toBe('light');
    expect(app.cmdkOpen).toBe(false);
  });
  it('goes to a board by name', async () => {
    await openWith('onboarding');
    const boards = screen.getByRole('group', { name: 'Boards' });
    await fireEvent.click(within(boards).getByRole('option', { name: /Agent Onboarding/ }));
    expect(goto).toHaveBeenCalledWith('/b/brd_f47143722126442c');
  });
  it('offers to dispatch what it could not find', async () => {
    const compose = vi.spyOn(app, 'requestCompose');
    await openWith('write the launch post');
    await fireEvent.click(screen.getByRole('option', { name: /Dispatch a card called “write the launch post”/ }));
    expect(compose).toHaveBeenCalledWith('write the launch post');
  });
});
