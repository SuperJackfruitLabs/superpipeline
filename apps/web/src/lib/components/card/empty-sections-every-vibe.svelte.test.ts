// apps/web/src/lib/components/card/empty-sections-every-vibe.svelte.test.ts
// @vitest-environment jsdom
/**
 * The brief's empty sections in every vibe, drawer and page (O7, operator ruling 2026-10-13).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { Component } from 'svelte';
import CardDaylight from './layouts/CardDaylight.svelte';
import CardPaper from './layouts/CardPaper.svelte';
import CardQuiet from './layouts/CardQuiet.svelte';
import CardStudio from './layouts/CardStudio.svelte';
import CardPageDaylight from './page/CardPageDaylight.svelte';
import CardPagePaper from './page/CardPagePaper.svelte';
import CardPageQuiet from './page/CardPageQuiet.svelte';
import CardPageStudio from './page/CardPageStudio.svelte';
import { mountModel } from './testing/mount-model.svelte';
import { fakeApi, fakeApp } from './testing/fakes';
import { BOARD_DX, CARD_4605 } from './testing/card-4605';

vi.mock('$lib/stores/app.svelte', async () => ({ app: (await import('./testing/fakes')).fakeApp }));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), ...(await import('./testing/fakes')).fakeApi }));
vi.mock('$lib/superlibrary', async (orig) => ({ ...(await orig<typeof import('$lib/superlibrary')>()), relatedForCard: vi.fn(async () => []) }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-11T08:21:00.000Z'));
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

const LAYOUTS: Array<[string, Component<any>, 'drawer' | 'page', string, boolean]> = [
  ['Daylight drawer', CardDaylight, 'drawer', 'daylight', true],
  ['Paper drawer', CardPaper, 'drawer', 'paper', true],
  ['Quiet drawer', CardQuiet, 'drawer', 'quiet', false],
  ['Studio drawer', CardStudio, 'drawer', 'studio', true],
  ['Daylight page', CardPageDaylight, 'page', 'daylight', true],
  ['Paper page', CardPagePaper, 'page', 'paper', true],
  ['Quiet page', CardPageQuiet, 'page', 'quiet', true],
  ['Studio page', CardPageStudio, 'page', 'studio', true],
];

async function mount(C: Component<any>, surface: 'drawer' | 'page', vibe: string) {
  const { model, dispose } = mountModel({ surface });
  await vi.waitFor(() => expect(model.detailLoaded).toBe(true));
  const r = render(C, { model, vibe, phase: 'noon', personName: 'Ira Mehta', gate: model.gateBinding, question: model.questionBinding, pageHref: model.pageHref, boardHref: model.boardHref, onClose: vi.fn() } as never);
  return { model, dispose, ...r };
}

describe.each(LAYOUTS)('%s: empty sections', (_n, C, surface, vibe) => {
  it('a section with nothing to show and nothing to do stays out of the way; one with an action stays', async () => {
    const { dispose } = await mount(C, surface, vibe);
    // 4605 has no plan and no decisions: both are hidden markers, not "none yet" blocks.
    for (const key of ['plan', 'decisions']) {
      const els = [...document.querySelectorAll<HTMLElement>(`[data-section="${key}"]`)];
      if (!document.querySelector('[role="tab"]')) expect(els.length, `${key} keeps its marker`).toBeGreaterThan(0);
      expect(els.every((e) => e.hidden || !!e.closest('[hidden]')), `${key} is hidden`).toBe(true);
    }
    const text = document.body.textContent!;
    expect(text).not.toMatch(/did not post a plan|Agent plan|Decisions:? ?none yet/i);
    // Sections that offer an action stay: the comment box and Add link.
    expect([...document.querySelectorAll('textarea')].some((t) => /comment|write to/i.test(document.querySelector(`label[for="${t.id}"]`)?.textContent ?? t.getAttribute('aria-label') ?? '')) || !!document.querySelector('[role="tab"]'), 'the comment box stays').toBe(true);
    expect([...document.querySelectorAll('button, a[role="button"]')].some((b) => /Add link/.test(b.textContent!)) || !!document.querySelector('[role="tab"]'), 'Add link stays').toBe(true);
    dispose();
  });
});

describe.each(LAYOUTS)('%s: an empty card', (_n, C, surface, vibe) => {
  it('draws no placeholder for a section with nothing to show and nothing to do (R2)', async () => {
    const was = fakeApp.board;
    fakeApp.board = { ...BOARD_DX, cards: [{ ...CARD_4605, spec: {}, dueAt: null, labels: [] }], references: [] };
    fakeApi.getCardActivities.mockResolvedValueOnce({ activities: [], handoff: null, gates: [] } as never);
    fakeApi.getAttempts.mockResolvedValueOnce([] as never);
    try {
      const { dispose } = await mount(C, surface, vibe);
      const text = document.body.textContent!;
      expect(text).not.toMatch(/No approved delivery|No other details|No recorded activity|did not post a plan|No decisions on this card|No references attached|No references\.|Nothing listed to prove/);
      if (vibe === 'paper') expect(text).not.toMatch(/No due date|No labels/);
      const keys = { daylight: surface === 'drawer' ? ['details', 'delivery'] : ['details'], paper: ['criteria', 'delivery'], quiet: ['description', 'criteria', 'references'], studio: [] as string[] }[vibe as 'daylight']!;
      for (const key of keys) {
        for (const el of document.querySelectorAll<HTMLElement>(`[data-section="${key}"]`)) {
          expect(el.hidden || !!el.closest('[hidden]'), `${key} is hidden: "${el.textContent}"`).toBe(true);
        }
      }
      dispose();
    } finally {
      fakeApp.board = was;
    }
  });
});
