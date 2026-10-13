// apps/web/src/lib/components/card/card-actions-every-vibe.svelte.test.ts
// @vitest-environment jsdom
/**
 * The brief's card's actions in every vibe, drawer and page: Archive secondary, Delete quiet (#9).
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

describe.each(LAYOUTS)('%s: card actions', (_n, C, surface, vibe) => {
  it('Archive is the secondary action; Delete is a quiet button, never the primary', async () => {
    const { dispose } = await mount(C, surface, vibe);
    const del = [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.trim() === 'Delete card')!;
    const arch = [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.trim() === 'Archive card')!;
    expect(del.className, 'Delete is vibekit\'s quiet Button').toContain('vk-button--quiet');
    expect(del.className).not.toMatch(/vk-button--(primary|danger|signal)/);
    expect(del.getAttribute('style') ?? '', 'no inline restyle').toBe('');
    expect(arch.className).toMatch(/vk-button--secondary|ar-btn2/);
    dispose();
  });
});
