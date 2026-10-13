// apps/web/src/lib/viewport.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

type Listener = (e: { matches: boolean }) => void;
function stubMatchMedia(matching: Record<string, boolean>) {
  const listeners = new Map<string, Listener[]>();
  window.matchMedia = vi.fn((query: string) => ({
    matches: matching[query] ?? false,
    media: query,
    addEventListener: (_: string, fn: Listener) => listeners.set(query, [...(listeners.get(query) ?? []), fn]),
    removeEventListener: () => {},
  })) as never;
  return (query: string, matches: boolean) => listeners.get(query)?.forEach((fn) => fn({ matches }));
}

afterEach(() => vi.resetModules());

describe('viewport', () => {
  it('reads the phone and narrow breakpoints and follows changes', async () => {
    const fire = stubMatchMedia({ '(max-width: 899.98px)': true, '(max-width: 639.98px)': false });
    const { viewport, PHONE_QUERY, NARROW_QUERY } = await import('./viewport.svelte');
    expect([PHONE_QUERY, NARROW_QUERY]).toEqual(['(max-width: 899.98px)', '(max-width: 639.98px)']);
    expect(viewport.phone).toBe(true);
    expect(viewport.narrow).toBe(false);
    fire(NARROW_QUERY, true);
    fire(PHONE_QUERY, false);
    expect(viewport.narrow).toBe(true);
    expect(viewport.phone).toBe(false);
  });
  it('is desktop when matchMedia is missing', async () => {
    // @ts-expect-error jsdom without matchMedia
    delete window.matchMedia;
    const { viewport } = await import('./viewport.svelte');
    expect(viewport.phone).toBe(false);
  });
});
