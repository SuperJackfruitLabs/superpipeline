import { describe, expect, it, vi } from 'vitest';
import { AuthRecovery, RETRY_MS } from './auth-recovery.svelte';
import type { RenewResult } from './api';

function make(renewals: RenewResult[], restore: () => Promise<boolean> = async () => true) {
  const renew = vi.fn(async () => renewals.shift() ?? { ok: false as const, reason: 'login_required' as const });
  const sleep = vi.fn(async () => {});
  const onExpired = vi.fn();
  return { a: new AuthRecovery({ renew, restore: vi.fn(restore), sleep, onExpired }), renew, sleep, onExpired };
}

describe('AuthRecovery', () => {
  it('concurrent 401s share one renewal', async () => {
    const { a, renew } = make([{ ok: true }]);
    const p1 = a.recover(); const p2 = a.recover();
    a.noteUnauthorized();
    expect(a.state).toBe('renewing');
    expect(await p1).toBe(true);
    expect(await p2).toBe(true);
    expect(renew).toHaveBeenCalledTimes(1);
    expect(a.state).toBe('ok');
  });
  it('a renewal that succeeds restores once and stays ok', async () => {
    const restore = vi.fn(async () => true);
    const a = new AuthRecovery({ renew: async () => ({ ok: true }), restore, sleep: async () => {} });
    expect(await a.recover()).toBe(true);
    expect(restore).toHaveBeenCalledTimes(1);
    expect([a.state, a.reason]).toEqual(['ok', null]);
  });
  it('a second 401 while restoring ends expired: refused after renew', async () => {
    let a!: AuthRecovery;
    const made = make([{ ok: true }], async () => { a.noteUnauthorized(); return true; });
    a = made.a;
    expect(await a.recover()).toBe(false);
    expect([a.state, a.reason]).toEqual(['expired', 'unauthorized_after_renew']);
    expect(made.renew).toHaveBeenCalledTimes(1);
  });
  it('login_required ends expired with the reason and the issuer', async () => {
    const { a, onExpired } = make([{ ok: false, reason: 'login_required', issuer: 'accounts.superjackfruit.com', reauthorize: '/auth/login' }]);
    expect(await a.recover()).toBe(false);
    expect([a.state, a.reason, a.issuer]).toEqual(['expired', 'login_required', 'accounts.superjackfruit.com']);
    expect(onExpired).toHaveBeenCalledTimes(1);
  });
  it('an unavailable sign-in service is retried three times, five seconds apart, then expires', async () => {
    const down = { ok: false as const, reason: 'plane_unavailable' as const, retryable: true };
    const { a, renew, sleep } = make([down, down, down, down]);
    expect(await a.recover()).toBe(false);
    expect(renew).toHaveBeenCalledTimes(4);
    expect(sleep.mock.calls).toEqual([[RETRY_MS], [RETRY_MS], [RETRY_MS]]);
    expect(RETRY_MS).toBe(5000);
    expect(a.reason).toBe('plane_unavailable');
  });
  it('once expired, further 401s do nothing until resolved', async () => {
    const { a, renew } = make([{ ok: false, reason: 'no_refresh' }]);
    await a.recover();
    a.noteUnauthorized();
    expect(renew).toHaveBeenCalledTimes(1);
    a.resolved();
    expect([a.state, a.reason, a.issuer]).toEqual(['ok', null, null]);
  });
});
