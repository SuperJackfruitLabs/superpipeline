// apps/web/src/lib/dev-hooks.test.ts
// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('dev-only overrides', () => {
  beforeEach(() => { localStorage.clear(); vi.resetModules(); });
  it('sends the override tenant and user in dev builds', async () => {
    localStorage.setItem('superpipeline.devTenant', 'tnt_vibes');
    localStorage.setItem('superpipeline.devUser', 'usr_b19776fac3c94df4');
    const seen: Headers[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init?: RequestInit) => { seen.push(new Headers(init?.headers)); return new Response('{"boards":[]}'); }));
    const { getBoards } = await import('./api');
    await getBoards();
    expect(seen[0]!.get('X-Tenant-Id')).toBe('tnt_vibes');
    expect(seen[0]!.get('X-User-Id')).toBe('usr_b19776fac3c94df4');
  });
  it('falls back to tnt_dev and sends no user when nothing is stored', async () => {
    const seen: Headers[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init?: RequestInit) => { seen.push(new Headers(init?.headers)); return new Response('{"boards":[]}'); }));
    const { getBoards } = await import('./api');
    await getBoards();
    expect(seen[0]!.get('X-Tenant-Id')).toBe('tnt_dev');
    expect(seen[0]!.has('X-User-Id')).toBe(false);
  });
  it('marks the document ready only when nothing is in flight', async () => {
    const { app } = await import('./stores/app.svelte');
    let release!: () => void;
    const p = app.markBusy(new Promise<void>((r) => (release = r)));
    app.noteLoaded();
    expect(document.documentElement.dataset.ready).not.toBe('true');
    release(); await p; app.noteLoaded();
    expect(document.documentElement.dataset.ready).toBe('true');
  });
  it('with a card open, is not ready until that card\'s log is in (the drawer mounts after the board)', async () => {
    const { app } = await import('./stores/app.svelte');
    app.openCard('card_a');
    expect(document.documentElement.dataset.ready).not.toBe('true');
    app.cardDetailFor = 'card_b'; app.noteLoaded();
    expect(document.documentElement.dataset.ready, 'another card\'s log does not count').not.toBe('true');
    app.cardDetailFor = 'card_a'; app.noteLoaded();
    expect(document.documentElement.dataset.ready).toBe('true');
    app.closeCard();
    expect(document.documentElement.dataset.ready).toBe('true');
  });
});
