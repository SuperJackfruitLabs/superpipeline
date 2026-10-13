// apps/web/src/lib/components/card/states/CardStatesDaylight.svelte.test.ts
// @vitest-environment jsdom
/** Cell E: the local note error and the server's 409 stand together; Refresh drops the alert. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import GateDaylight from '../gate/GateDaylight.svelte';
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
  it('shows the note error and the already-decided alert together, under the buttons', async () => {
    fakeApi.resolveGate.mockResolvedValueOnce(new Response(JSON.stringify(CONFLICT), { status: 409 }));
    const { model, dispose } = mountModel({ surface: 'gallery', holdDetail: true, source: { board, agents: fakeApp.agents } });
    const { container, rerender } = render(GateDaylight, { ...model.gateBinding!, agent: model.agent, lead: model.lead!, vibe: 'daylight', part: 'controls' });
    await fireEvent.click(screen.getByRole('button', { name: 'Request changes' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await vi.waitFor(() => expect(model.gateConflict).not.toBeNull());
    await rerender({ ...model.gateBinding!, agent: model.agent, lead: model.lead!, vibe: 'daylight', part: 'controls' });
    expect(screen.getByLabelText('Say what needs to change').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('Request changes needs a note: it threads into the agent’s next attempt.')).toBeTruthy();
    const alert = screen.getByRole('alert');
    expect(alert.textContent!.replace(/\s+/g, ' ')).toContain('Not recorded. This gate was already decided from Matrix by Rakesh Gangwar at 13:02.');
    const reject = screen.getByRole('button', { name: 'Reject' });
    expect(reject.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector('.ds-msg'), 'part="controls" draws no quote').toBeNull();
    await fireEvent.click(within(alert).getByRole('button', { name: 'Refresh to see it' }));
    await vi.waitFor(() => expect(model.gateConflict).toBeNull());
    dispose();
  });
});
