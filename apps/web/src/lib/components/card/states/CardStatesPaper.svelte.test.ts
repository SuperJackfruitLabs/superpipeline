// apps/web/src/lib/components/card/states/CardStatesPaper.svelte.test.ts
// @vitest-environment jsdom
/** Paper's six cells; cell E keeps the local note error and the server's 409 together. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import GatePaper from '../gate/GatePaper.svelte';
import CardStatesPaper from './CardStatesPaper.svelte';
import { mountModel } from '../testing/mount-model.svelte';
import { BOARD_DX, CARD_4605 } from '../testing/card-4605';
import { fakeApi, fakeApp } from '../testing/fakes';

vi.mock('$lib/stores/app.svelte', async () => ({ app: (await import('../testing/fakes')).fakeApp }));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), ...(await import('../testing/fakes')).fakeApi }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
afterEach(() => cleanup());

const gate = { id: 'gate_fx_p4', cardId: CARD_4605.id, stageKey: 'reproduce', status: 'pending', options: [], producedBy: 'agt_fx_error_eric', summary: 'All done, ready for your review.' };
const board = { ...BOARD_DX, gates: [gate] } as never;
const CONFLICT = { error: { code: 'GATE_NOT_PENDING', reason: 'decided', message: 'gate is already resolved', decidedBy: 'usr_b19776fac3c94df4', decidedAt: '2026-10-11T07:32:00Z', via: 'matrix' } };

describe('decision error (cell E)', () => {
  it('shows the already-decided alert beside Send reply, and Refresh drops it', async () => {
    fakeApi.resolveGate.mockResolvedValueOnce(new Response(JSON.stringify(CONFLICT), { status: 409 }));
    const { model, dispose } = mountModel({ surface: 'gallery', holdDetail: true, source: { board, agents: fakeApp.agents } });
    const props = () => ({ ...model.gateBinding!, agent: model.agent, lead: model.lead!, vibe: 'paper' as const, part: 'controls' as const });
    const { container, rerender } = render(GatePaper, props());
    await fireEvent.click(screen.getByRole('radio', { name: 'Approve' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));
    await vi.waitFor(() => expect(model.gateConflict).not.toBeNull());
    await rerender(props());
    const alert = screen.getByRole('alert');
    expect(alert.textContent!.replace(/\s+/g, ' ')).toContain('Not recorded. This gate was already decided from Matrix by');
    expect(alert.textContent).toContain('at 13:02.');
    expect(container.querySelector('.pcs-row--alert'), 'the button and the alert share a row').toBeTruthy();
    await fireEvent.click(within(alert).getByRole('button', { name: 'Refresh to see it' }));
    await vi.waitFor(() => expect(model.gateConflict).toBeNull());
    dispose();
  });
});

describe('the gallery', () => {
  it('lays out six lettered cells under one heading', async () => {
    const { model, dispose } = mountModel({ surface: 'gallery' });
    await vi.waitFor(() => expect(model.detailLoaded).toBe(true));
    const cell = { model, gate: null, question: null };
    render(CardStatesPaper, { cells: { gate: cell, question: cell, archived: cell, done: cell, error: cell, loading: cell }, vibe: 'paper', phase: 'noon' });
    expect(screen.getByRole('heading', { level: 1, name: 'Card states, in Paper' })).toBeTruthy();
    expect([...document.querySelectorAll('[data-cell]')].map((c) => c.getAttribute('data-cell'))).toEqual(['gate', 'question', 'archived', 'done', 'error', 'loading']);
    expect([...document.querySelectorAll('.pcs-label')].map((l) => l.textContent)).toEqual(['A · Approval gate', 'B · Agent question', 'C · Archived', 'D · Done', 'E · Decision error', 'F · Loading']);
    expect(document.querySelector('[data-cell="loading"] .pcs-load')!.getAttribute('aria-busy')).toBe('true');
    dispose();
  });
});
