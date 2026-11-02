import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renewSession } from './session';
import { forgetHubToken } from '../hub-token';

beforeEach(() => {
  vi.restoreAllMocks();
  // `hubToken()` caches across calls by design; a token left over from one test
  // would let the next one pass without ever asking for authority.
  forgetHubToken();
});

describe('renewSession', () => {
  it('posts same-origin to /hub/session and reads each answer', async () => {
    const fetchSpy = vi.fn(async () => Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchSpy);
    expect(await renewSession()).toEqual({ ok: true });
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/hub/session');
    expect(init).toMatchObject({ method: 'POST', credentials: 'same-origin' });

    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ ok: false, reason: 'login_required', issuer: 'accounts.superjackfruit.com', reauthorize: '/auth/login' })));
    expect(await renewSession()).toEqual({ ok: false, reason: 'login_required', issuer: 'accounts.superjackfruit.com', reauthorize: '/auth/login' });
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ ok: false, reason: 'plane_unavailable', retryable: true }, { status: 503 })));
    expect(await renewSession()).toEqual({ ok: false, reason: 'plane_unavailable', retryable: true });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    expect(await renewSession()).toEqual({ ok: false, reason: 'plane_unavailable', retryable: true });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>', { status: 404 })));
    expect(await renewSession()).toEqual({ ok: false, reason: 'no_refresh' });
  });
});
