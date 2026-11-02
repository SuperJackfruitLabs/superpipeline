import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCard, archiveCard, unarchiveCard, splitCard, type Card } from './cards';
import { forgetHubToken } from '../hub-token';

beforeEach(() => {
  vi.restoreAllMocks();
  // `hubToken()` caches across calls by design; a token left over from one test
  // would let the next one pass without ever asking for authority.
  forgetHubToken();
});

/**
 * `Card` gains `projectId`/`milestoneId` (Task 19's `CardView` fields, never declared on the
 * client type until now). A compile-time lock: this card literal fails to typecheck if either
 * field goes missing or is widened away, which is the point — Step 3's filter and picker (20b)
 * read both directly off `Card`.
 */
describe('Card', () => {
  it('carries projectId and milestoneId, nullable, as a card shape', () => {
    const card: Card = {
      id: 'crd_1',
      title: 'Ship it',
      ownerUserId: 'u1',
      currentStageKey: 'todo',
      state: 'queued',
      priority: 0,
      costUsd: 0,
      overBudget: false,
      attemptCount: 0,
      // The three provenance fields. Required rather than optional on purpose: this literal is the
      // compile-time lock, and a fixture that still typechecks after a wire field is added is a
      // fixture that would not have noticed `queuedBy` going unrendered for as long as it did.
      queuedBy: 'u1',
      queuedByAgentId: null,
      queuedGrant: null,
      labels: [],
      dueAt: null,
      archivedAt: null,
      parentCardId: null,
      openChildCount: 0,
      costUsdRollup: 0,
      blockedBy: [],
      projectId: null,
      milestoneId: null,
      lastAgentId: null,
      queuedGrantOwner: null,
      stageSince: '2026-10-08T10:00:00Z',
      createdAt: '2026-10-08T09:00:00Z',
    };
    expect(card.projectId).toBeNull();
    expect(card.milestoneId).toBeNull();

    // A card bound to a project whose milestone it does NOT carry (not yet assigned one) — proves
    // the two are independently nullable, not a pair that must both be set or both be null.
    const bound: Card = { ...card, projectId: 'prj_1', milestoneId: null };
    expect(bound.projectId).toBe('prj_1');
    expect(bound.milestoneId).toBeNull();
  });
});

/**
 * `createCard` gaining `dueAt` (Task 6, Step 0b): the compose form can now set a due date at
 * creation instead of create-then-patch, so a failure between the two round trips can no longer
 * silently drop the date.
 */
describe('createCard', () => {
  // `createCard` sends its request through `withAuthority`, which itself asks `/hub/token` (and,
  // on a deployment with no back-end hand-off, the hub directly) before the real POST — so the
  // call under test is not necessarily `fetchSpy.mock.calls[0]`. Answering everything that is not
  // the cards route with a plain 404 keeps `hubToken()` on its "no authority" path without a
  // second fetch, and picking the call by URL is robust to how many precede it.
  function stubFetch() {
    const spy = vi.fn(async (url: string, _init?: RequestInit) => {
      if (String(url).includes('/cards')) return new Response(JSON.stringify({ card: {} }), { status: 201 });
      return new Response('not found', { status: 404 });
    });
    vi.stubGlobal('fetch', spy);
    return spy;
  }

  it('sends dueAt in the body when given', async () => {
    const fetchSpy = stubFetch();

    await createCard('brd_1', 'A card', { dueAt: '2026-12-01' });

    const call = fetchSpy.mock.calls.find((c) => String(c[0]).includes('/cards'))!;
    expect(JSON.parse(call[1]?.body as string)).toMatchObject({ dueAt: '2026-12-01' });
  });

  it('omits dueAt entirely when not given — a one-line dispatch stays exactly that', async () => {
    const fetchSpy = stubFetch();

    await createCard('brd_1', 'A card');

    const call = fetchSpy.mock.calls.find((c) => String(c[0]).includes('/cards'))!;
    expect(JSON.parse(call[1]?.body as string)).not.toHaveProperty('dueAt');
  });
});

describe('archiveCard', () => {
  it('PATCHes archivedAt with a real timestamp, so the existing "show archived" filter has something to filter', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ card: {} }), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    await archiveCard('brd_1', 'card_a');

    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('/v1/boards/brd_1/cards/card_a');
    expect(init?.method).toBe('PATCH');
    const body = JSON.parse(init?.body as string) as { archivedAt: string };
    expect(typeof body.archivedAt).toBe('string');
    expect(Number.isNaN(Date.parse(body.archivedAt))).toBe(false);
  });
});

/**
 * Whole-branch review, Minor: un-archiving named as one of three recoveries for a parent parked by
 * an archived child (`board-do.ts:3347`) — the other two had surfaces, this one didn't, so an
 * archived card was a one-way door through the web app even though the route/DO already accept
 * `archivedAt: null`.
 */
describe('unarchiveCard', () => {
  it('PATCHes archivedAt to null, clearing it rather than sending a fresh timestamp', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ card: {} }), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    await unarchiveCard('brd_1', 'card_a');

    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('/v1/boards/brd_1/cards/card_a');
    expect(init?.method).toBe('PATCH');
    expect(JSON.parse(init?.body as string)).toEqual({ archivedAt: null });
  });
});

/**
 * Task 17b: "Add sub-task" reuses Task 15's `POST …/cards/:cardId/split` (one title in, one
 * child out) rather than `createCard` + `addLink('parent')` — `createCard`'s wrapper discards the
 * response body, so it cannot hand back the new card's id to link as a child; `splitCard`'s
 * response already carries the created children in full.
 */
describe('splitCard', () => {
  it('POSTs titles to the card\'s split route', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ children: [] }), { status: 201 }));
    vi.stubGlobal('fetch', fetchSpy);

    await splitCard('brd_1', 'card_a', ['Write the doc']);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('/v1/boards/brd_1/cards/card_a/split');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ titles: ['Write the doc'] });
  });

  it('surfaces the server\'s own refusal rather than throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: { code: 'NOTHING_TO_SPLIT', message: 'every line was blank — nothing to split into' } }), { status: 400 })),
    );

    const res = await splitCard('brd_1', 'card_a', ['   ']);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('NOTHING_TO_SPLIT');
  });
});
