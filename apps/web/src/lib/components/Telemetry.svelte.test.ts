// apps/web/src/lib/components/Telemetry.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';

const api = vi.hoisted(() => ({ getUsage: vi.fn(), getBoardEvents: vi.fn(), setBudget: vi.fn() }));
vi.mock('$lib/api', () => api);
const store = vi.hoisted(() => ({
  app: {
    boardId: 'brd_134a0ddb6d434478', boards: [{ id: 'brd_134a0ddb6d434478', name: 'Developer Experience' }], agents: [],
    board: { boardId: 'brd_134a0ddb6d434478', name: 'Developer Experience', stages: [], cards: [], usage: { totalCostUsd: 0, estimatedCostUsd: 0, budgetUsd: null, cardUsdCap: null, overBudget: false } },
    markBusy: <T,>(p: Promise<T>) => p, refresh: async () => {},
  },
}));
vi.mock('$lib/stores/app.svelte', () => store);
import Telemetry from './Telemetry.svelte';

const ZERO = { totalCostUsd: 0, estimatedCostUsd: 0, totalInputTokens: 0, totalOutputTokens: 0, unpricedRecords: 0, byModel: [], byAgent: [], byCard: [], byDay: [] };
const events = (n: number) => Array.from({ length: n }, (_, i) => ({ seq: n - i, type: 'cards.stale_digest', payload: {}, ts: `2026-10-10T22:${String(50 - i).padStart(2, '0')}:12Z` }));

beforeEach(() => {
  for (const f of Object.values(api)) f.mockReset();
  api.getBoardEvents.mockResolvedValue(events(10));
});
afterEach(cleanup);

describe('Telemetry', () => {
  it('shows dashes and a loading line before any figure, never a fake $0.00', () => {
    api.getUsage.mockReturnValue(new Promise(() => {}));
    const { container } = render(Telemetry, { vibe: 'daylight' });
    expect([...container.querySelectorAll('.tile .big')].map((b) => b.textContent)).toEqual(['—', '—', '—', '—']);
    expect(screen.getAllByText('Loading spend…').length).toBeGreaterThan(0);
  });
  it('says the spend failed to load and offers to try again', async () => {
    api.getUsage.mockRejectedValue(new Error('usage 500'));
    render(Telemetry, { vibe: 'daylight' });
    // Each panel that needs the figures says so (four of them).
    expect((await screen.findAllByText(/Couldn't load spend — usage 500\./)).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Try again' }).length).toBeGreaterThan(0);
  });
  it('sends "Set a cap" to the board cap field', async () => {
    api.getUsage.mockResolvedValue(ZERO);
    render(Telemetry, { vibe: 'daylight' });
    await fireEvent.click(await screen.findByRole('link', { name: 'Set a cap' }));
    expect(document.activeElement?.id).toBe('cap-b1');
  });
  it('collapses the log to eight rows and opens it on request', async () => {
    api.getUsage.mockResolvedValue(ZERO);
    const { container } = render(Telemetry, { vibe: 'daylight' });
    await screen.findByText('last 10 events, newest first · times in UTC');
    const rows = () => container.querySelectorAll('section[aria-labelledby="log-h"] > ol.log > li').length;
    expect(rows()).toBe(8);
    await fireEvent.click(screen.getByRole('button', { name: 'Show all 10 events' }));
    expect(rows()).toBe(10);
    expect(screen.getByRole('button', { name: 'Show the latest 8' })).toBeTruthy();
  });
  it('refuses a cap that is not an amount, and sends nothing', async () => {
    api.getUsage.mockResolvedValue(ZERO);
    render(Telemetry, { vibe: 'daylight' });
    await fireEvent.input(await screen.findByLabelText('Board cap'), { target: { value: 'abc' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save caps' }));
    expect(screen.getByRole('alert').textContent).toBe('Enter an amount in dollars, like 25 or 12.50, or leave it empty for no cap.');
    expect(api.setBudget).not.toHaveBeenCalled();
  });
});
