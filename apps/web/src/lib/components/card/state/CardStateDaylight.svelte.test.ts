// apps/web/src/lib/components/card/state/CardStateDaylight.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import CardStateDaylight from './CardStateDaylight.svelte';
import { mountModel } from '../testing/mount-model.svelte';
import { BOARD_DX, CARD_4605 } from '../testing/card-4605';
import { fakeApi, fakeApp } from '../testing/fakes';

vi.mock('$lib/stores/app.svelte', async () => ({ app: (await import('../testing/fakes')).fakeApp }));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), ...(await import('../testing/fakes')).fakeApi }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
afterEach(() => cleanup());

const archived = { ...BOARD_DX, cards: [{ ...CARD_4605, archivedAt: '2026-10-09T05:30:00Z', state: 'submitted', needsHuman: undefined }] };

describe('CardStateDaylight', () => {
  it('loading: five bars, the agent’s name in the status sentence', () => {
    const { model, dispose } = mountModel({ holdDetail: true, surface: 'gallery', source: { board: BOARD_DX, agents: fakeApp.agents } });
    const { container } = render(CardStateDaylight, { kind: 'loading', model });
    expect([...container.querySelectorAll<HTMLElement>('.ds-row .ds-sk')].map((e) => e.style.flex)).toEqual(['1 1 0%', '2.8 1 0%', '1 1 0%', '1 1 0%', '1 1 0%']);
    expect(screen.getByRole('status').textContent).toBe('Loading what error-eric said and the card’s history…');
    dispose();
  });
  it('archived banner, then Restore that says where it goes back', async () => {
    fakeApi.getCardActivities.mockResolvedValueOnce({ activities: [], handoff: null, gates: [{ id: 'g', cardId: CARD_4605.id, stageKey: 'reproduce', status: 'cancelled', options: [], producedBy: 'agt', resolvedAt: '2026-10-09T05:30:00Z' }] as never });
    const { model, dispose } = mountModel({ surface: 'gallery', source: { board: archived, agents: fakeApp.agents } });
    await vi.waitFor(() => expect(model.detailLoaded).toBe(true));
    render(CardStateDaylight, { kind: 'archived', model });
    expect(screen.getByText('Archived 9 Oct')).toBeTruthy();
    expect(screen.getByText('Its pending review was cancelled when the card was archived.')).toBeTruthy();
    cleanup();
    render(CardStateDaylight, { kind: 'restore', model });
    expect(screen.getByText('Puts it back on the board at Reproduce.')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: /Restore/ }));
    expect(fakeApi.unarchiveCard).toHaveBeenCalledWith('brd_134a0ddb6d434478', CARD_4605.id);
    dispose();
  });
});
