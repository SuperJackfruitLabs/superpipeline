import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setWorkspaceFleet, getWorkspace } from './workspace';
import { forgetHubToken } from '../hub-token';

beforeEach(() => {
  vi.restoreAllMocks();
  // `hubToken()` caches across calls by design; a token left over from one test
  // would let the next one pass without ever asking for authority.
  forgetHubToken();
});

describe('setWorkspaceFleet', () => {
  it('PATCHes /v1/tenant with the fleet id', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    await setWorkspaceFleet('fleet_0123456789abcdef0123');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('/v1/tenant');
    expect(init?.method).toBe('PATCH');
    expect(JSON.parse(init?.body as string)).toEqual({ externalId: 'fleet_0123456789abcdef0123' });
  });

  it('sends null to unlink — a real request, not a client-side no-op', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    await setWorkspaceFleet(null);

    const [, init] = fetchSpy.mock.calls[0]!;
    expect(JSON.parse(init?.body as string)).toEqual({ externalId: null });
  });

  it("surfaces the server's own refusal for a malformed fleet id", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'externalId must look like fleet_ followed by 20 lowercase hex characters' }), { status: 400 })),
    );

    const res = await setWorkspaceFleet('not-a-fleet');
    expect(res.ok).toBe(false);
    expect(((await res.json()) as { error: string }).error).toMatch(/fleet_/);
  });
});

describe('getWorkspace', () => {
  it('reads the workspace so an operator can see whether it is linked, and to what', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ tenant: { id: 't1', slug: 's', name: 'W', externalId: 'fleet_0123456789abcdef0123', externalSource: 'agentpod' } }), { status: 200 })),
    );

    const w = await getWorkspace();
    expect(w?.externalId).toBe('fleet_0123456789abcdef0123');
    expect(w?.externalSource).toBe('agentpod');
  });

  it('answers null rather than throwing when the workspace cannot be read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 401 })));
    expect(await getWorkspace()).toBeNull();
  });
});
