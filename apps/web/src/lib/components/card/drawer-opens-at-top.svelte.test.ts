// apps/web/src/lib/components/card/names-in-drawer.svelte.test.ts
// @vitest-environment jsdom
/** The drawer opens at the top (#1, #28): its first focus never scrolls the title and Close away. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import type { Component } from 'svelte';
import CardDaylight from './layouts/CardDaylight.svelte';
import CardPaper from './layouts/CardPaper.svelte';
import CardQuiet from './layouts/CardQuiet.svelte';
import CardStudio from './layouts/CardStudio.svelte';
import { mountModel } from './testing/mount-model.svelte';

vi.mock('$lib/stores/app.svelte', async () => ({ app: (await import('./testing/fakes')).fakeApp }));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), ...(await import('./testing/fakes')).fakeApi }));
vi.mock('$lib/superlibrary', async (orig) => ({ ...(await orig<typeof import('$lib/superlibrary')>()), relatedForCard: vi.fn(async () => []) }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-11T08:21:00.000Z')); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DRAWERS: Array<[string, Component<any>, string]> = [
  ['Daylight', CardDaylight, 'daylight'], ['Paper', CardPaper, 'paper'], ['Quiet', CardQuiet, 'quiet'], ['Studio', CardStudio, 'studio'],
];

describe.each(DRAWERS)('%s drawer opens at the top', (_n, C, vibe) => {
  it('first focus lands on the card container without scrolling', async () => {
    const calls: Array<{ el: Element; opts: FocusOptions | undefined }> = [];
    const real = HTMLElement.prototype.focus;
    vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (this: HTMLElement, opts?: FocusOptions) { calls.push({ el: this, opts }); real.call(this, opts); });
    const { model, dispose } = mountModel();
    await vi.waitFor(() => expect(model.detailLoaded).toBe(true));
    render(C, { model, vibe, phase: 'noon', personName: 'Ira Mehta', gate: model.gateBinding, question: model.questionBinding, pageHref: model.pageHref, onClose: vi.fn() });
    await vi.waitFor(() => expect(document.activeElement?.hasAttribute('data-autofocus')).toBe(true));
    const first = calls.find((c) => c.el.closest('[role="dialog"]'));
    expect(first?.el.hasAttribute('data-autofocus'), 'the first focus in the drawer is the card container').toBe(true);
    expect(first?.opts?.preventScroll, 'and it does not scroll').toBe(true);
    dispose();
  });
});

describe.each(DRAWERS)('%s drawer: Change project keeps the place', (_n, C, vibe) => {
  it('focuses the Project select, without scrolling, and lays the form out with space', async () => {
    const { model, dispose } = mountModel();
    await vi.waitFor(() => expect(model.detailLoaded).toBe(true));
    render(C, { model, vibe, phase: 'noon', personName: 'Ira Mehta', gate: model.gateBinding, question: model.questionBinding, pageHref: model.pageHref, onClose: vi.fn() });
    const tab = [...document.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent?.startsWith('Spec'));
    if (tab) await fireEvent.click(tab);
    const change = [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.trim() === 'Change project')!;
    const spy = vi.spyOn(HTMLElement.prototype, 'focus');
    await fireEvent.click(change);
    await vi.waitFor(() => expect((document.activeElement as HTMLElement | null)?.getAttribute('aria-label') ?? (document.activeElement as HTMLElement | null)?.id ?? '').toMatch(/project/i));
    expect(spy.mock.calls.at(-1)?.[0]?.preventScroll).toBe(true);
    expect(document.querySelector('[data-project-form]'), 'the inline form has its own spaced layout').toBeTruthy();
    dispose();
  });
});
