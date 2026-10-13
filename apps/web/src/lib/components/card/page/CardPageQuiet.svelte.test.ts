// apps/web/src/lib/components/card/page/CardPageQuiet.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import CardPageQuiet from './CardPageQuiet.svelte';
import { mountModel } from '../testing/mount-model.svelte';

vi.mock('$lib/stores/app.svelte', async () => ({ app: (await import('../testing/fakes')).fakeApp }));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), ...(await import('../testing/fakes')).fakeApi, logout: vi.fn(async () => {}) }));
vi.mock('$lib/superlibrary', async (orig) => ({ ...(await orig<typeof import('$lib/superlibrary')>()), relatedForCard: vi.fn(async () => []) }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-11T08:21:00.000Z')); });
afterEach(() => { delete document.documentElement.dataset.vibe; cleanup(); vi.useRealTimers(); });

/** A track step's drawn words: vibekit's hidden status words removed. */
const drawn = (li: Element) => { const c = li.cloneNode(true) as Element; c.querySelectorAll('.vk-visually-hidden').forEach((n) => n.remove()); return c.textContent!.trim(); };

describe('CardPageQuiet (4605)', () => {
  it('reads top to bottom in plain sentences', async () => {
    document.documentElement.dataset.vibe = 'quiet';
    const { model, dispose } = mountModel({ surface: 'page' });
    await vi.waitFor(() => expect(model.detailLoaded).toBe(true));
    const { container } = render(CardPageQuiet, { model, vibe: 'quiet', phase: 'noon', personName: 'Ira Mehta', gate: model.gateBinding, question: model.questionBinding, pageHref: model.pageHref, boardHref: model.boardHref });
    expect(screen.getByRole('link', { name: 'Skip to content' }).getAttribute('href')).toBe('#content');
    expect(screen.getByText('Waiting on you for 2 days · Stage 2 of 7: Reproduce · Attempt 2 · Priority P3 · No due date · No labels')).toBeTruthy();
    expect([...container.querySelectorAll('.vk-stages li')].map(drawn)).toEqual(['Reported (done)', 'Reproduce (stopped here)', 'Failing test (next)', 'Fix', 'Integrate', 'Signed off', 'Shipped']);
    expect(container.querySelectorAll('.qp-said .qp-id')).toHaveLength(1);
    expect(screen.getByText('You must write a note before sending. Up to 8000 characters.')).toBeTruthy();
    expect(screen.getByText('Acceptance criteria (5)')).toBeTruthy();
    expect(screen.getByText('Brief details (10)')).toBeTruthy();
    expect(screen.getByText('History (2 runs)')).toBeTruthy();
    expect(screen.getByText('1: error-eric, $0.00, sent back. 2: error-eric, $0.00, stopped.')).toBeTruthy();
    expect(screen.getByText('5 items, listed under Things to prove.')).toBeTruthy();
    dispose();
  });
});
