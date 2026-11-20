// apps/web/src/lib/components/shell/AppShell.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';


// jsdom has no matchMedia; vibekit's AppShell asks it for the phone width. A desktop window.
vi.hoisted(() => {
  window.matchMedia = ((query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false })) as never;
});

const goto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: (...a: unknown[]) => goto(...a) }));

import AppShell from './AppShell.svelte';
import { shellModel } from './shell-model.svelte';
import type { ShellProps } from './types';
import { app } from '$lib/stores/app.svelte';
import { appearance } from '$lib/appearance.svelte';

const page = createRawSnippet(() => ({ render: () => '<div><input aria-label="Note" /></div>' }));
const props = (over: Partial<ShellProps> = {}): ShellProps => ({ here: 'plan', section: 'board', boardName: 'Developer Experience', live: shellModel.liveToggle, children: page, ...over });

beforeEach(() => {
  goto.mockClear();
  appearance.set({ vibe: 'daylight', theme: 'light' });
  app.boardId = 'brd_134a0ddb6d434478';
  app.filterOpen = false;
  app.openCardId = null;
  app.cmdkOpen = false;
});
afterEach(cleanup);

describe('AppShell', () => {
  it('draws the one shell (vibekit’s AppShell) on a desktop', () => {
    const { container } = render(AppShell, props());
    expect(container.querySelector('.vk-appshell')).toBeTruthy();
  });
  it('G then I goes to the Inbox; G then C to Crew; G then P to the board', async () => {
    render(AppShell, props());
    await fireEvent.keyDown(window, { key: 'g' });
    await fireEvent.keyDown(window, { key: 'i' });
    expect(goto).toHaveBeenLastCalledWith('/inbox');
    await fireEvent.keyDown(window, { key: 'g' });
    await fireEvent.keyDown(window, { key: 'c' });
    expect(goto).toHaveBeenLastCalledWith('/crew/agents');
    await fireEvent.keyDown(window, { key: 'g' });
    await fireEvent.keyDown(window, { key: 'p' });
    expect(goto).toHaveBeenLastCalledWith('/b/brd_134a0ddb6d434478');
  });
  it('N opens the composer; F opens the filter while the page offers one (the board’s top row), not on Plan · Projects', async () => {
    render(AppShell, props());
    const before = app.composeRequest;
    await fireEvent.keyDown(window, { key: 'n' });
    expect(app.composeRequest).toBe(before + 1);
    cleanup();
    const release = shellModel.registerFilter();
    render(AppShell, props());
    await fireEvent.keyDown(window, { key: 'f' });
    expect(app.filterOpen).toBe(true);
    app.filterOpen = false;
    release();
    release(); // withdrawing twice does not withdraw another page's filter
    expect(shellModel.filterAvailable).toBe(false);
    await fireEvent.keyDown(window, { key: 'f' });
    expect(app.filterOpen).toBe(false);
    cleanup();
    render(AppShell, props({ here: 'plan', section: 'projects', boardName: null, plan: 'projects' }));
    await fireEvent.keyDown(window, { key: 'f' });
    expect(app.filterOpen).toBe(false);
  });
  it('typing in a field is never a shortcut', async () => {
    render(AppShell, props());
    const before = app.composeRequest;
    await fireEvent.keyDown(screen.getByLabelText('Note'), { key: 'n' });
    expect(app.composeRequest).toBe(before);
  });
  it('keys are off while a card is open', async () => {
    render(AppShell, props());
    app.openCardId = 'card_05823a57e8224605';
    await fireEvent.keyDown(window, { key: 'f' });
    expect(app.filterOpen).toBe(false);
    app.openCardId = null;
  });
  it('mounting after an earlier compose does not reopen the composer', () => {
    app.requestCompose();
    render(AppShell, props());
    expect(screen.queryByLabelText('Card title')).toBeNull();
  });
});
