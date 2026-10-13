// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import { flushSync } from 'svelte';

vi.mock('$app/state', () => ({ page: { params: { boardId: 'brd_fixture', cardId: 'crd_fixture' }, url: new URL('http://localhost/b/brd_fixture/c/crd_fixture/page') } }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

import { app } from '$lib/stores/app.svelte';
import Page from './+page@.svelte';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('the card page route', () => {
  it('a stale error from an earlier move does not read as "Board not available" while the board loads', async () => {
    let resolve!: () => void;
    vi.spyOn(app, 'openBoard').mockImplementation(() => new Promise<void>((r) => { resolve = r; }));
    app.error = 'Move failed (409)';
    app.board = null;
    app.boardId = null as unknown as string;
    app.authState = 'ready';
    render(Page);
    flushSync();
    expect(screen.queryByText('Board not available')).toBeNull();
    resolve();
    await Promise.resolve(); await Promise.resolve();
    flushSync();
    expect(screen.queryByText('Board not available')).toBeNull();
  });

  it('a board that fails to open on this page still says so', async () => {
    vi.spyOn(app, 'openBoard').mockImplementation(async () => { app.error = 'Board not found'; });
    app.error = null;
    app.board = null;
    app.boardId = null as unknown as string;
    app.authState = 'ready';
    render(Page);
    await vi.waitFor(() => expect(screen.getByText('Board not available')).toBeTruthy());
  });
});
