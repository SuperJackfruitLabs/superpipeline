// apps/web/src/lib/components/card/raw-json-every-vibe.svelte.test.ts
// @vitest-environment jsdom
/**
 * The brief's raw JSON, in every vibe, drawer and page: one toggle, and one Copy only while the JSON is
 * shown (O8).
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

const named = (re: RegExp) => [...document.querySelectorAll<HTMLElement>('button, summary, a[role="button"]')].filter((b) => re.test((b.getAttribute('aria-label') ?? b.textContent ?? '').trim()));

describe.each(LAYOUTS)('%s: raw JSON', (_n, C, surface, vibe) => {
  it('one toggle; Copy only while the JSON is shown, and only one', async () => {
    const { dispose } = await mount(C, surface, vibe);
    const spec = /^(Copy|Copied)$/;
    expect(named(/^(View|Hide) raw JSON$/), 'one toggle').toHaveLength(1);
    expect(named(spec), 'no Copy while the JSON is hidden').toHaveLength(0);
    // Studio's drawer keeps the brief on its Spec tab.
    const specTab = [...document.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent?.startsWith('Spec'));
    if (specTab) await fireEvent.click(specTab);
    await fireEvent.click(named(/^View raw JSON$/)[0]!);
    expect(named(/^(View|Hide) raw JSON$/).map((b) => b.textContent!.trim()), 'one toggle, now Hide').toEqual(['Hide raw JSON']);
    expect(named(spec), 'one Copy').toHaveLength(1);
    expect(document.querySelectorAll('[data-testid="raw-json"]')).toHaveLength(1);
    expect(document.querySelector('[data-testid="raw-json"]')!.textContent).toContain('"description"');
    await fireEvent.click(named(/^Hide raw JSON$/)[0]!);
    expect(named(spec)).toHaveLength(0);
    dispose();
  });
});
