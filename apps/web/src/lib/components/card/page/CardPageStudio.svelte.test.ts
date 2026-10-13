// apps/web/src/lib/components/card/page/CardPageStudio.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import CardPageStudio from './CardPageStudio.svelte';
import { mountModel } from '../testing/mount-model.svelte';

vi.mock('$lib/stores/app.svelte', async () => ({ app: { ...(await import('../testing/fakes')).fakeApp, syncedAt: new Date('2026-10-11T08:21:00Z'), connected: true } }));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), ...(await import('../testing/fakes')).fakeApi }));
vi.mock('$lib/superlibrary', async (orig) => ({ ...(await orig<typeof import('$lib/superlibrary')>()), relatedForCard: vi.fn(async () => []) }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-11T08:21:00.000Z')); });
afterEach(() => { delete document.documentElement.dataset.vibe; cleanup(); vi.useRealTimers(); });

describe('CardPageStudio (4605)', () => {
  it('figures, numbered sections, the log table and the status bar', async () => {
    document.documentElement.dataset.vibe = 'studio';
    const { model, dispose } = mountModel({ surface: 'page' });
    await vi.waitFor(() => expect(model.detailLoaded).toBe(true));
    const { container } = render(CardPageStudio, { model, vibe: 'studio', phase: 'noon', personName: 'Ira Mehta', gate: model.gateBinding, question: model.questionBinding, pageHref: model.pageHref, boardHref: model.boardHref });
    expect([...container.querySelectorAll('.cp-body > .ar-figs > div > span')].map((s) => s.textContent)).toEqual(['Stage', 'Attempts', 'Waiting on you', 'In Reproduce', 'Cost · no estimate', 'Blocks', 'Sub-tasks open']);
    expect([...container.querySelectorAll('.ar-sec .hd h2')].map((h) => h.textContent)).toEqual(['Why it stopped', 'Send it back to work', 'Talk', 'Spec', 'Links', 'Log', 'Cost', 'Card actions']);
    expect(screen.getByText('Card 4605 · stage 02 Reproduce')).toBeTruthy();
    expect(screen.getByText('5 items, listed under Things to prove.')).toBeTruthy();
    expect(screen.getByText('Oct 8 12:11')).toBeTruthy();
    expect(screen.getByText('waiting on you 2d')).toBeTruthy();
    expect(screen.getByText('synced 13:51')).toBeTruthy();
    dispose();
  });
});
