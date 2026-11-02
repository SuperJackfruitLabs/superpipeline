import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addLink, removeLink, listLinks } from './links';
import { forgetHubToken } from '../hub-token';

beforeEach(() => {
  vi.restoreAllMocks();
  // `hubToken()` caches across calls by design; a token left over from one test
  // would let the next one pass without ever asking for authority.
  forgetHubToken();
});

/**
 * Task 17a: the client for the link routes Task 12 (`addLink`/`removeLink`/`listLinks` on the
 * DO) and Task 16 (cross-board advisory rows in D1) each shipped with no HTTP surface. `addLink`
 * and `removeLink` return the raw response, like `setStages`/`patchStage` do, so a caller can
 * surface the DO's own refusal sentence (a cycle, an existing parent) rather than a generic one.
 */
describe('addLink', () => {
  it('POSTs fromCardId/toCardId/kind to the board\'s links route', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ link: {} }), { status: 201 }));
    vi.stubGlobal('fetch', fetchSpy);

    await addLink('brd_1', 'card_a', 'card_b', 'blocks');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('/v1/boards/brd_1/links');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ fromCardId: 'card_a', toCardId: 'card_b', kind: 'blocks' });
  });

  it("surfaces the server's own refusal — a cycle says so, not \"invalid link\"", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: { code: 'LINK_WOULD_CYCLE', message: 'linking card_a -> card_b (blocks) would close a cycle' } }), { status: 409 })),
    );

    const res = await addLink('brd_1', 'card_a', 'card_b', 'blocks');
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('LINK_WOULD_CYCLE');
    expect(body.error.message).toContain('cycle');
  });

  /**
   * Task 17d: `toBoardId` rides the same route — the server decides whether the edge is enforced
   * (the DO) or advisory (Task 16's D1 store) by comparing it to the path's own board, so the
   * wrapper's only job is to pass it through when the caller names one.
   */
  it('includes toBoardId in the body when a cross-board target is named', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ link: { enforced: false } }), { status: 201 }));
    vi.stubGlobal('fetch', fetchSpy);

    await addLink('brd_1', 'card_a', 'card_b', 'blocks', 'brd_2');

    const [, init] = fetchSpy.mock.calls[0]!;
    expect(JSON.parse(init?.body as string)).toEqual({ fromCardId: 'card_a', toCardId: 'card_b', kind: 'blocks', toBoardId: 'brd_2' });
  });

  it('omits toBoardId from the body when no cross-board target is given', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ link: {} }), { status: 201 }));
    vi.stubGlobal('fetch', fetchSpy);

    await addLink('brd_1', 'card_a', 'card_b', 'blocks');

    const [, init] = fetchSpy.mock.calls[0]!;
    expect(JSON.parse(init?.body as string)).toEqual({ fromCardId: 'card_a', toCardId: 'card_b', kind: 'blocks' });
  });
});

describe('removeLink', () => {
  it('DELETEs fromCardId/toCardId/kind against the board\'s links route', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    await removeLink('brd_1', 'card_a', 'card_b', 'parent');

    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('/v1/boards/brd_1/links');
    expect(init?.method).toBe('DELETE');
    expect(JSON.parse(init?.body as string)).toEqual({ fromCardId: 'card_a', toCardId: 'card_b', kind: 'parent' });
  });

  it('includes toBoardId in the body when removing a cross-board edge', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    await removeLink('brd_1', 'card_a', 'card_b', 'blocks', 'brd_2');

    const [, init] = fetchSpy.mock.calls[0]!;
    expect(JSON.parse(init?.body as string)).toEqual({ fromCardId: 'card_a', toCardId: 'card_b', kind: 'blocks', toBoardId: 'brd_2' });
  });
});

describe('listLinks', () => {
  it('reads a card\'s same-board (enforced) and cross-board (advisory) edges', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            links: [{ fromCardId: 'card_a', toCardId: 'card_b', kind: 'blocks', createdAt: '2026-01-01', createdBy: null, enforced: true }],
            externalLinks: [
              {
                fromBoardId: 'brd_1',
                fromCardId: 'card_a',
                toBoardId: 'brd_2',
                toCardId: 'card_c',
                kind: 'blocks',
                enforced: false,
                otherCardTitle: 'Fix the layout',
                otherBoardName: 'Design board',
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await listLinks('brd_1', 'card_a');
    expect(result.links).toHaveLength(1);
    expect(result.links[0]!.enforced).toBe(true);
    expect(result.externalLinks).toHaveLength(1);
    expect(result.externalLinks[0]!.enforced).toBe(false);
    // 17b follow-up: the route resolves the other end's title/board name per row, typed here so
    // a consumer (`buildLinkGroups`) doesn't have to fall back to a bare id in the common case.
    expect(result.externalLinks[0]!.otherCardTitle).toBe('Fix the layout');
    expect(result.externalLinks[0]!.otherBoardName).toBe('Design board');
  });

  it('carries otherCardTitle/otherBoardName as null when the route could not resolve them — a real state, not a missing field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            links: [],
            externalLinks: [
              {
                fromBoardId: 'brd_1',
                fromCardId: 'card_a',
                toBoardId: 'brd_2',
                toCardId: 'card_c',
                kind: 'blocks',
                enforced: false,
                otherCardTitle: null,
                otherBoardName: null,
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await listLinks('brd_1', 'card_a');
    expect(result.externalLinks[0]!.otherCardTitle).toBeNull();
    expect(result.externalLinks[0]!.otherBoardName).toBeNull();
  });

  /**
   * Whole-branch review fix wave (`166abfe`): a same-board `relates` edge is decoration —
   * `blockedWhere` never consults it — so the route now stamps `enforced: kind !== 'relates'`
   * rather than `true` unconditionally, and `Link.enforced` here was corrected from the literal
   * type `true` to `boolean` to match. Kept as a runtime regression check for the pass-through
   * (nothing in `listLinks` computes `enforced`; it is a bare `res.json() as CardLinks`, so this
   * mainly documents the shape a consumer can rely on). NOT a compile-time proof, despite the
   * intuitive appeal of one: `@vitest/expect`'s `toBe<E>(expected: E): void` carries its OWN
   * generic parameter, unconstrained by the assertion subject's type — `expect(x).toBe(false)`
   * type-checks for any `x`, regardless of `x`'s declared type. Verified directly: temporarily
   * reverting `Link.enforced` to the literal `true` and re-running `svelte-check` produced ZERO
   * errors — confirmed against this exact file, whose type-checking `svelte-check` does otherwise
   * catch (sanity-checked with a deliberately bad assignment in the same file, which DID error).
   * So the literal-vs-boolean type fix stands on its own reasoning (already given where `Link` is
   * declared in `api.ts`), not on this test.
   */
  it('a same-board `relates` edge is NOT enforced — the type is `boolean`, not always `true`', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            links: [{ fromCardId: 'card_a', toCardId: 'card_b', kind: 'relates', createdAt: '2026-01-01', createdBy: null, enforced: false }],
            externalLinks: [],
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await listLinks('brd_1', 'card_a');
    expect(result.links[0]!.kind).toBe('relates');
    expect(result.links[0]!.enforced).toBe(false);
  });

  it('answers empty arrays rather than throwing when the read is refused', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 401 })));
    expect(await listLinks('brd_1', 'card_a')).toEqual({ links: [], externalLinks: [] });
  });
});
