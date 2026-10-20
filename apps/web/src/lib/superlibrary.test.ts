// apps/web/src/lib/superlibrary.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/hub-token', () => ({ libraryToken: vi.fn(async () => 'lib-token'), forgetLibraryToken: vi.fn(), libraryConfigured: vi.fn(() => true), libraryProblem: vi.fn(() => null) }));
import { forgetLibraryToken, libraryConfigured, libraryProblem, libraryToken } from '$lib/hub-token';
import { LibraryError, hasReason, embedCallbacks, libraryFetch, libraryRef, needsReconnect, reasonFor, sentenceFor } from './superlibrary';

afterEach(() => { vi.unstubAllGlobals(); vi.mocked(libraryToken).mockResolvedValue('lib-token'); });

describe('Superlibrary references (spec §11: the drawer previews linked artifacts)', () => {
  it('says the true reason a token is missing: a sign-in to refresh (Reconnect) apart from a plane that will not issue one (no Reconnect)', async () => {
    const store = new Map<string, string>();
    vi.stubGlobal('sessionStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) });
    vi.mocked(libraryToken).mockResolvedValue(null);
    vi.mocked(libraryProblem).mockReturnValue('reauthorize');
    const stale = await libraryFetch('/api/v1/me').catch((e: unknown) => e);
    expect(stale).toMatchObject({ code: 'reauthorize' });
    expect(sentenceFor(stale)).toBe('Your Superpipeline sign-in needs refreshing. Reconnect.');
    expect(needsReconnect(stale)).toBe(true);
    vi.mocked(libraryProblem).mockReturnValue('declined');
    const declined = await libraryFetch('/api/v1/me').catch((e: unknown) => e);
    expect(declined).toMatchObject({ code: 'declined' });
    // A sign-in made before previews were switched on is refused by the plane too: ONE Reconnect fixes it, so it is offered once.
    expect(needsReconnect(declined)).toBe(true);
    expect(sentenceFor(declined)).toBe('Your sign-in was made before Superlibrary previews were switched on. Sign in again to enable them. Reconnect.');
    // After this tab has reconnected once, a refusal is final: say so and offer no loop.
    sessionStorage.setItem('superpipeline.reconnected', '1');
    expect(needsReconnect(declined)).toBe(false);
    expect(hasReason(declined)).toBe(true);
    expect(sentenceFor(declined)).toContain('does not issue Superlibrary access to Superpipeline');
    sessionStorage.removeItem('superpipeline.reconnected');
    expect(reasonFor(declined)).toBe('Reason: declined (the sign-in system does not issue Superlibrary access to this app)');
    vi.mocked(libraryProblem).mockReturnValue(null);
  });
  it('libraryRef reads an item link on the library, with its version', () => {
    expect(libraryRef('https://app.superlibrary.dev/a/itm_0123456789abcdef')).toEqual({ itemId: 'itm_0123456789abcdef' });
    expect(libraryRef('https://app.superlibrary.dev/a/itm_0123456789abcdef/v/3')).toEqual({ itemId: 'itm_0123456789abcdef', version: 3 });
    expect(libraryRef('http://app.superlibrary.dev/a/itm_0123456789abcdef')).toBeNull();
    expect(libraryRef('https://app.superlibrary.dev.evil.test/a/itm_0123456789abcdef')).toBeNull();
    expect(libraryRef('https://app.superlibrary.dev/upload')).toBeNull();
    expect(libraryRef('not a url')).toBeNull();
  });
  it('calls Superlibrary with the person’s own library token, never cookies', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => { calls.push({ url, init }); return Response.json({ url: 'https://itm-x.superlibrarycontent.dev/_view?sig=s', version: 2 }); }));
    await embedCallbacks().getEmbedUrl({ itemId: 'itm_0123456789abcdef', version: 2 });
    expect(calls[0]!.url).toBe('https://app.superlibrary.dev/api/v1/items/itm_0123456789abcdef/embed');
    expect(new Headers(calls[0]!.init.headers).get('Authorization')).toBe('Bearer lib-token');
    expect(calls[0]!.init.credentials).toBe('omit');
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ version: 2 });
  });
  it('a 401 drops the library token; no token is a refusal in words', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: 'unauthenticated' }, { status: 401 })));
    await expect(embedCallbacks().getEmbedUrl({ itemId: 'itm_0123456789abcdef' })).rejects.toBeInstanceOf(LibraryError);
    expect(forgetLibraryToken).toHaveBeenCalled();
    vi.mocked(libraryToken).mockResolvedValue(null);
    await expect(embedCallbacks().getEmbedUrl({ itemId: 'itm_0123456789abcdef' })).rejects.toMatchObject({ code: 'no_token' });
    expect(sentenceFor(new LibraryError(0, 'no_token'))).toBe("The file's safe! I just couldn't confirm it's you. Reconnect?");
    expect(sentenceFor(new LibraryError(0, 'no_token'), 'quiet')).toBe('Preview hidden: your sign-in could not be confirmed. Reconnect to view it.');
    expect(needsReconnect(new LibraryError(0, 'no_token'))).toBe(true);
    expect(needsReconnect(new LibraryError(404, 'not_found'))).toBe(false);
    expect(reasonFor(new LibraryError(0, 'no_token'))).toBe('Reason: no_token (no Superlibrary access token was issued)');
    expect(sentenceFor(new LibraryError(403, 'product_not_enabled'))).toBe('Superlibrary is not enabled for this workspace.');
    expect(sentenceFor(new LibraryError(404, 'not_found'))).toBe('This artifact is not there, or you cannot see it.');
  });
  it('one mount reads the item once for its versions and its share info', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      urls.push(url);
      if (url.endsWith('/api/v1/me')) return Response.json({ principalId: 'prn_000000000000000000a2', role: 'member' });
      return Response.json({ item: { scope: 'workspace', title: 'T', createdBy: 'prn_000000000000000000a2' }, versions: [{ version: 1, revokedAt: null }] });
    }));
    const cb = embedCallbacks();
    await cb.getVersions!({ itemId: 'itm_0123456789abcdef' });
    await cb.getShareInfo!({ itemId: 'itm_0123456789abcdef' });
    expect(urls.filter((u) => u.endsWith('/api/v1/items/itm_0123456789abcdef'))).toHaveLength(1);
  });
  it('after a widen, share info is read again and shows the new scope', async () => {
    let scope = 'board:brd_00000000000000b1';
    let reads = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/scope')) { scope = 'workspace'; return Response.json({ scope }); }
      if (url.endsWith('/api/v1/me')) return Response.json({ principalId: 'prn_000000000000000000a2', role: 'owner' });
      reads += 1;
      return Response.json({ item: { scope, title: 'T', createdBy: 'prn_000000000000000000a2' }, versions: [] });
    }));
    const cb = embedCallbacks();
    expect((await cb.getShareInfo!({ itemId: 'itm_0123456789abcdef' })).scope).toBe('board:brd_00000000000000b1');
    await cb.setScope!({ itemId: 'itm_0123456789abcdef', scope: 'workspace' });
    expect((await cb.getShareInfo!({ itemId: 'itm_0123456789abcdef' })).scope).toBe('workspace');
    expect(reads).toBe(2);
  });
  it('names an unconfigured Superlibrary without calling it, and a hung one ends in a retryable error', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    vi.mocked(libraryConfigured).mockReturnValue(false);
    vi.mocked(libraryToken).mockResolvedValue(null);
    await expect(libraryFetch('/api/v1/me')).rejects.toMatchObject({ code: 'not_configured' });
    expect(f).not.toHaveBeenCalled();
    vi.mocked(libraryConfigured).mockReturnValue(true);
    vi.mocked(libraryToken).mockResolvedValue('lib-token');
    vi.stubGlobal('fetch', vi.fn((_u: string, init: RequestInit) => new Promise((_, rej) => init.signal!.addEventListener('abort', () => rej(new Error('aborted'))))));
    vi.useFakeTimers();
    try {
      const p = libraryFetch('/api/v1/me').catch((e) => e);
      await vi.advanceTimersByTimeAsync(10_001);
      const e = await p;
      expect(e).toBeInstanceOf(LibraryError);
      expect(sentenceFor(e)).toMatch(/could not be loaded/);
    } finally { vi.useRealTimers(); }
  });
});
