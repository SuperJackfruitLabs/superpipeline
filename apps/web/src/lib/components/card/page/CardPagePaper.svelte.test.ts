// apps/web/src/lib/components/card/page/CardPagePaper.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import CardPagePaper from './CardPagePaper.svelte';
import { mountModel } from '../testing/mount-model.svelte';
import { fakeApp } from '../testing/fakes';

vi.mock('$lib/stores/app.svelte', async () => ({ app: (await import('../testing/fakes')).fakeApp }));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), ...(await import('../testing/fakes')).fakeApi }));
vi.mock('$lib/superlibrary', async (orig) => ({ ...(await orig<typeof import('$lib/superlibrary')>()), relatedForCard: vi.fn(async () => []) }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;
// The fixture world's clock: 4605 has waited 2 days.
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-11T08:21:00.000Z')); });
afterEach(() => { delete document.documentElement.dataset.vibe; cleanup(); vi.useRealTimers(); });

/** A track step's drawn words: vibekit's hidden status words removed. */
const drawn = (li: Element) => { const c = li.cloneNode(true) as Element; c.querySelectorAll('.vk-visually-hidden').forEach((n) => n.remove()); return c.textContent!.trim(); };

describe('CardPagePaper (4605)', () => {
  it('is a letter: kicker, Re: title, deck, salutation, signature, reply', async () => {
    fakeApp.agents = fakeApp.agents.map((a) => (a.id === 'agt_fx_error_eric' ? { ...a, role: 'Diagnostics' } : a));
    document.documentElement.dataset.vibe = 'paper';
    const { model, dispose } = mountModel({ surface: 'page' });
    await vi.waitFor(() => expect(model.detailLoaded).toBe(true));
    const { container } = render(CardPagePaper, { model, vibe: 'paper', phase: 'noon', personName: 'Ira Mehta', gate: model.gateBinding, question: model.questionBinding, pageHref: model.pageHref, boardHref: model.boardHref });
    expect(screen.getByText('A letter that needs your reply · 2 days')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Re: Diagnose Melissa and Anna Supermessage silence — trace actual failing hop');
    expect(screen.getByText('Dear Ira,')).toBeTruthy();
    expect(screen.getByText(/^Diagnostics, attempt 2 · Thursday 8 October, 19:41$/)).toBeTruthy();
    expect([...(screen.getByLabelText('Resume at stage') as HTMLSelectElement).options].map((o) => o.textContent)).toEqual(['I · Reported', 'II · Reproduce (this stage)']);
    expect([...container.querySelectorAll('.vk-stages li')].map(drawn)).toEqual(['I · doneReported', 'II · stopped hereReproduce', 'III · nextFailing test', 'IVFix', 'VIntegrate', 'VISigned off', 'VIIShipped']);
    expect(screen.getByText('5 items, listed under Things to prove.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Show tool calls · all 14 events' })).toBeTruthy();
    expect(container.querySelector('.pg-colophon')!.textContent!.replace(/\s+/g, ' ')).toContain('Opened from Developer Experience · Back to the board · card 4605');
    dispose();
  });
});
