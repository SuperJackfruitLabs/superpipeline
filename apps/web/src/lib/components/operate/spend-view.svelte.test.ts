// apps/web/src/lib/components/operate/spend-view.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';

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
import { VIBES } from '@superjackfruitlabs/vibekit-ui';
import SpendView from './SpendView.svelte';
import BoardLogView from './BoardLogView.svelte';
import { parityTree, primaryActionsPerRow, rawMachineText, repeatedParagraphs } from '$lib/composition/guards';
import { renderInVibes, type VibeRoots } from '$lib/composition/render-vibes';

const ZERO = { totalCostUsd: 0, estimatedCostUsd: 0, totalInputTokens: 0, totalOutputTokens: 0, unpricedRecords: 0, byModel: [], byAgent: [], byCard: [], byDay: [] };
const events = (n: number) => Array.from({ length: n }, (_, i) => ({ seq: n - i, type: 'cards.stale_digest', payload: {}, ts: `2026-10-10T22:${String(50 - i).padStart(2, '0')}:12Z` }));

beforeEach(() => {
  for (const f of Object.values(api)) f.mockReset();
  api.getBoardEvents.mockResolvedValue(events(10));
});
let roots: VibeRoots | null = null;
afterEach(() => { roots?.unmount(); roots = null; cleanup(); });
const settle = async () => { for (let i = 0; i < 4; i++) { await tick(); await new Promise((r) => setTimeout(r, 0)); } };

const SPEND = {
  totalCostUsd: 14.2, estimatedCostUsd: 0, totalInputTokens: 1_600_000, totalOutputTokens: 300_000, unpricedRecords: 2,
  byModel: [{ model: 'gpt-5-codex', costUsd: 10.9, inputTokens: 1_300_000, outputTokens: 240_000 }, { model: 'kimi-k2', costUsd: 3.3, inputTokens: 300_000, outputTokens: 60_000 }],
  byAgent: [{ agentId: 'agt_fx_coder_kai', costUsd: 6.1 }, { agentId: 'agt_fx_tester_tim', costUsd: 4.05 }],
  byCard: [{ cardId: 'card_9ac2116a050858f8', costUsd: 6.35 }, { cardId: 'card_e10fb4fe39a91dfc', costUsd: 4.9 }],
  byDay: [{ day: '2026-10-09', costUsd: 4.1 }, { day: '2026-10-10', costUsd: 1.0 }],
};

describe('SpendView and BoardLogView in every vibe', () => {
  it('Spend: the same accessibility tree in all four vibes outside the signature, and the guards pass', async () => {
    api.getUsage.mockResolvedValue(SPEND);
    roots = await renderInVibes(SpendView, {});
    await settle();
    const day = parityTree(roots.daylight);
    expect(day).toContain('gpt-5-codex');
    for (const v of VIBES) {
      expect(parityTree(roots[v]), `${v} vibe`).toBe(day);
      expect(primaryActionsPerRow(roots[v]), `${v}: one primary per row`).toEqual([]);
      expect(rawMachineText(roots[v]), `${v}: no raw ids`).toEqual([]);
      expect(repeatedParagraphs(roots[v]), `${v}: nothing said twice`).toEqual([]);
      expect(roots[v].querySelectorAll('[data-signature]'), `${v}: one signature slot`).toHaveLength(1);
    }
    const r = roots;
    const head = (v: (typeof VIBES)[number]) => r[v].querySelector('[data-signature]')?.textContent;
    for (const v of VIBES) expect(head(v)).toBe(head('daylight'));
  });
  it('the log page: the same tree in every vibe, paged by fifty with Show N more', async () => {
    const log = Array.from({ length: 120 }, (_, i) => ({ seq: 120 - i, type: 'cards.stale_digest', payload: {}, ts: new Date(Date.UTC(2026, 9, 10, 22, 0, 0) - i * 60_000).toISOString() }));
    roots = await renderInVibes(BoardLogView, { boardId: 'brd_134a0ddb6d434478', events: log, error: null });
    const day = parityTree(roots.daylight);
    for (const v of VIBES) {
      expect(parityTree(roots[v]), `${v} vibe`).toBe(day);
      expect(primaryActionsPerRow(roots[v]), `${v}: one primary per row`).toEqual([]);
      expect(rawMachineText(roots[v]), `${v}: no raw ids`).toEqual([]);
      expect(repeatedParagraphs(roots[v]), `${v}: nothing said twice`).toEqual([]);
      // The masthead names the board: the log page has no signature slot.
      expect(roots[v].querySelectorAll('[data-signature]'), `${v}: no signature slot`).toHaveLength(0);
    }
    roots.unmount();
    roots = null;
    const { container } = render(BoardLogView, { props: { boardId: 'brd_134a0ddb6d434478', events: log, error: null } });
    const rows = () => container.querySelectorAll('section[aria-labelledby="log-h"] > ol.log > li').length;
    expect(rows()).toBe(50);
    await fireEvent.click(screen.getByRole('button', { name: /^Show 50 more/ }));
    expect(rows()).toBe(100);
    await fireEvent.click(screen.getByRole('button', { name: /^Show 20 more/ }));
    expect(rows()).toBe(120);
    expect(screen.queryByRole('button', { name: /^Show \d+ more/ })).toBeNull();
  });
});

describe('SpendView', () => {
  it('shows dashes and a loading line before any figure, never a fake $0.00', () => {
    api.getUsage.mockReturnValue(new Promise(() => {}));
    const { container } = render(SpendView);
    expect([...container.querySelectorAll('.tile .big')].map((b) => b.textContent)).toEqual(['—', '—', '—', '—']);
    expect(screen.getAllByText('Loading spend…').length).toBeGreaterThan(0);
  });
  it('says the spend failed to load and offers to try again', async () => {
    api.getUsage.mockRejectedValue(new Error('usage 500'));
    render(SpendView);
    // Each panel that needs the figures says so (four of them).
    expect((await screen.findAllByText("Couldn't load spend.")).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/usage 500|No (agent|model|card) cost data yet/);
    expect(screen.getAllByRole('button', { name: 'Try again' }).length).toBeGreaterThan(0);
  });
  it('sends "Set a cap" to the board cap field', async () => {
    api.getUsage.mockResolvedValue(ZERO);
    render(SpendView);
    await fireEvent.click(await screen.findByRole('link', { name: 'Set a cap' }));
    expect(document.activeElement?.id).toBe('cap-b1');
  });
  it('collapses the log to eight rows and opens it on request', async () => {
    api.getUsage.mockResolvedValue(ZERO);
    const { container } = render(SpendView);
    await screen.findByText('last 10 events, newest first');
    const rows = () => container.querySelectorAll('section[aria-labelledby="log-h"] > ol.log > li').length;
    expect(rows()).toBe(8);
    await fireEvent.click(screen.getByRole('button', { name: 'Show all 10 events' }));
    expect(rows()).toBe(10);
    expect(screen.getByRole('button', { name: 'Show the latest 8' })).toBeTruthy();
  });
  it('refuses a cap that is not an amount, and sends nothing', async () => {
    api.getUsage.mockResolvedValue(ZERO);
    render(SpendView);
    await fireEvent.input(await screen.findByLabelText('Board cap'), { target: { value: 'abc' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save caps' }));
    expect(screen.getByRole('alert').textContent).toBe('Enter an amount in dollars, like 25 or 12.50, or leave it empty for no cap.');
    expect(api.setBudget).not.toHaveBeenCalled();
  });
});
