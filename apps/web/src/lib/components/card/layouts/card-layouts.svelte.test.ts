// apps/web/src/lib/components/card/layouts/card-layouts.svelte.test.ts
// @vitest-environment jsdom
/**
 * Every card surface shows everything (spec §7.5): each of the 23 sections exactly once, counted
 * by `[data-section]` in the rendered DOM. A layout with tabs is counted tab by tab and the union
 * must cover every key; the edit form is counted while editing. The dev gallery is exempt.
 * Pages count too: a vibe still borrowing another vibe's page or phone form is counted once.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import { flushSync, type Component } from 'svelte';
import { VIBES, type Vibe } from '@superjackfruit/vibekit';
import { CARD_LAYOUTS, CARD_PAGE_LAYOUTS } from '$lib/layouts';
import { CARD_SECTION_KEYS } from './types';
import { mountModel } from '../testing/mount-model.svelte';

vi.mock('$lib/stores/app.svelte', async () => ({ app: (await import('../testing/fakes')).fakeApp }));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), ...(await import('../testing/fakes')).fakeApi }));
vi.mock('$lib/superlibrary', async (orig) => ({ ...(await orig<typeof import('$lib/superlibrary')>()), relatedForCard: vi.fn(async () => []) }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;
afterEach(() => cleanup());

type Surface = { name: string; vibe: Vibe; component: Component<any> };
const all: Surface[] = VIBES.flatMap((v) => [
  { name: `${v} drawer`, vibe: v, component: CARD_LAYOUTS[v].drawer },
  { name: `${v} phone`, vibe: v, component: CARD_LAYOUTS[v].phone },
  { name: `${v} page`, vibe: v, component: CARD_PAGE_LAYOUTS[v] },
]);
/** One row per distinct component: a vibe still borrowing another's form is tested once. */
export const SURFACES: Surface[] = [...new Map(all.map((s) => [s.component, s])).values()];

function counts(root: HTMLElement): Map<string, number> {
  const m = new Map<string, number>();
  for (const el of root.querySelectorAll('[data-section]')) m.set(el.getAttribute('data-section')!, (m.get(el.getAttribute('data-section')!) ?? 0) + 1);
  return m;
}

describe.each(SURFACES)('$name', ({ vibe, component }) => {
  it('renders each of the 23 sections exactly once', async () => {
    const { model, dispose } = mountModel();
    await vi.waitFor(() => expect(model.detailLoaded).toBe(true));
    render(component, { model, vibe, phase: 'noon', personName: 'Ira', gate: model.gateBinding, question: model.questionBinding, pageHref: model.pageHref, boardHref: model.boardHref, onClose: () => {} });
    const seen = new Set<string>();
    const check = (editing = false) => {
      const c = counts(document.body);
      for (const [k, n] of c) expect(n, `${k} rendered ${n} times`).toBe(1);
      // Edit mode adds only the edit form: its hidden markers (facts, status…) hold the swapped-out
      // sections' places and must never stand in for a view that lost its own.
      for (const k of c.keys()) if (!editing || k === 'editForm') seen.add(k);
    };
    check();
    for (const tab of [...document.body.querySelectorAll<HTMLElement>('[role="tab"]')]) {
      tab.click();
      flushSync();
      check();
    }
    model.edit.start();
    flushSync();
    check(true);
    expect([...CARD_SECTION_KEYS].filter((k) => !seen.has(k))).toEqual([]);
    dispose();
  });
});

describe('an agent the board does not list', () => {
  it('reads "an agent" in every legacy layout, never a short id or "an agent (an agent)"', async () => {
    const { BOARD_DX, CARD_4605 } = await import('../testing/card-4605');
    const { fakeApp } = await import('../testing/fakes');
    const stranger = { ...CARD_4605, queuedByAgentId: 'agt_1111eeee1111eeee', queuedBy: 'prn_unknown_x' };
    for (const v of VIBES) {
      const { model, dispose } = mountModel({ surface: 'gallery', holdDetail: true, source: { board: { ...BOARD_DX, cards: [stranger] }, agents: fakeApp.agents } });
      render(CARD_LAYOUTS[v].drawer, { model, vibe: v, phase: 'noon', personName: 'Rakesh', gate: null, question: null, pageHref: model.pageHref, onClose: () => {} });
      // A framed layout portals its vibekit Drawer to <body>.
      const text = document.body.textContent ?? '';
      expect(text, v).toContain('an agent');
      expect(text, v).not.toMatch(/\b(?:agt|prn)_|an agent \(an agent\)/);
      cleanup();
      dispose();
    }
  });
});
