// apps/web/src/lib/components/dialogs/ReconnectDialog.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';

const reconnect = vi.fn();
vi.mock('$lib/reconnect', () => ({ reconnect: () => reconnect() }));
vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/b/brd_1/c/crd_1') } }));
import ReconnectDialog from './ReconnectDialog.svelte';
import ReconnectToast from './ReconnectToast.svelte';
import { auth } from '$lib/auth-recovery.svelte';
import { app } from '$lib/stores/app.svelte';

beforeEach(() => {
  reconnect.mockClear();
  app.user = { userId: 'usr_b19776fac3c94df4', tenantId: 'tnt_vibes', name: 'Ira Mehta' };
  app.members = [];
  app.board = { name: 'Developer Experience', stages: [{ key: 'reproduce', name: 'Reproduce', order: 1 }], cards: [{ id: 'crd_1', title: 'Diagnose the silence', currentStageKey: 'reproduce' }] } as never;
  app.openCardId = 'crd_1';
});
afterEach(() => { cleanup(); auth.resolved(); });

describe('ReconnectDialog', () => {
  it('is an alertdialog with no way to dismiss it, focused on Sign in again', async () => {
    render(ReconnectDialog);
    auth.state = 'expired'; auth.reason = 'login_required'; auth.issuer = 'accounts.superjackfruit.com';
    await tick(); await tick();
    const d = screen.getByRole('alertdialog', { name: 'Sign in again to keep going' });
    expect(d.classList.contains('vk-dialog')).toBe(true);
    expect(document.activeElement?.textContent?.trim()).toBe('Sign in again');
    expect(screen.queryByRole('button', { name: /close/i })).toBeNull();
    await fireEvent.keyDown(d, { key: 'Escape' });
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(screen.getByText('Diagnose the silence')).toBeTruthy();
    expect(screen.getByText('Developer Experience · Reproduce')).toBeTruthy();
    expect(screen.getByText('IM')).toBeTruthy();
    expect(screen.getByText('Reason: refresh refused (login_required)')).toBeTruthy();
  });
  it('signs in again through reconnect(), which saves where you were', async () => {
    render(ReconnectDialog);
    auth.state = 'expired'; auth.reason = 'login_required';
    await tick();
    await fireEvent.click(screen.getByRole('link', { name: 'Sign in again' }));
    expect(reconnect).toHaveBeenCalledTimes(1);
    expect(app.user?.name).toBe('Ira Mehta');
  });
});

describe('ReconnectToast', () => {
  it('says so while renewing, and only then', async () => {
    render(ReconnectToast);
    expect(screen.queryByText(/Signing you back in/)).toBeNull();
    auth.state = 'renewing';
    await tick();
    expect(screen.getByRole('status').textContent).toContain('Signing you back in…');
    expect(screen.getByRole('status').textContent).toContain('You stay on this card.');
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});
