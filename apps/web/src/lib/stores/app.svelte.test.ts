// apps/web/src/lib/stores/app.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BoardSnapshot, StaleCard } from '$lib/api';

const api = vi.hoisted(() => ({
  getBoard: vi.fn(),
  getNotifications: vi.fn(async () => []),
  listLabels: vi.fn(async () => []),
  listAttention: vi.fn(),
  moveCard: vi.fn(async () => new Response('{}', { status: 200 })),
}));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), ...api }));

import { app } from './app.svelte';
import { DX_CARDS, DX_STAGES } from '$lib/components/shell/__fixtures__/dx';

const SNAP = {
  boardId: 'brd_134a0ddb6d434478', tenantId: 'tnt_vibes', name: 'Developer Experience', stages: DX_STAGES, cards: DX_CARDS,
  gates: [], elicitations: [], references: [], usage: { totalCostUsd: 0, estimatedCostUsd: 0, budgetUsd: null, cardUsdCap: null, overBudget: false },
  github: { issueTrigger: false, webhookConfigured: false, triggerGrantCount: null }, stale: { enabled: true, afterHours: 24 },
} as unknown as BoardSnapshot;
const STALE = (cardId: string) => ({ boardId: 'brd_134a0ddb6d434478', boardName: 'Developer Experience', cardId }) as StaleCard;

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-10-11T08:21:00Z'), toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  api.getBoard.mockResolvedValue(SNAP);
  api.listAttention.mockResolvedValue({ cards: ['card_ace250c9c25363ac', 'card_9ac2116a050858f8', 'card_e10fb4fe39a91dfc', 'card_05823a57e8224605'].map(STALE), boardsUnanswered: 0 });
  app.boardId = 'brd_134a0ddb6d434478';
});
afterEach(() => vi.useRealTimers());

describe('app store: the shell’s state', () => {
  it('refresh loads the workspace attention at once, then at most once a second', async () => {
    await vi.advanceTimersByTimeAsync(5_000);
    api.listAttention.mockClear();
    await app.refresh();
    expect(api.listAttention).toHaveBeenCalledTimes(1);
    expect(app.attention).toHaveLength(4);
    await app.refresh();
    await app.refresh();
    expect(api.listAttention).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(api.listAttention).toHaveBeenCalledTimes(2);
  });
  it('keeps the last attention when the read fails', async () => {
    await vi.advanceTimersByTimeAsync(5_000);
    await app.refresh();
    api.listAttention.mockRejectedValueOnce(new Error('offline'));
    await vi.advanceTimersByTimeAsync(5_000);
    await app.refresh();
    expect(app.attention).toHaveLength(4);
  });
  it('stamps syncedAt when the snapshot arrives', async () => {
    await app.refresh();
    expect(app.syncedAt?.toISOString()).toBe('2026-10-11T08:21:00.000Z');
  });
  it('needsYou is the board’s attention items', async () => {
    await app.refresh();
    app.agents = [];
    const ids = app.needsYou().map((i) => i.cardId);
    expect(ids).toEqual(expect.arrayContaining(['card_9ac2116a050858f8', 'card_e10fb4fe39a91dfc', 'card_05823a57e8224605']));
    expect(ids).not.toContain('card_47630a307f58426f'); // archived scratch card
  });
  it('opens with the filter dialog and the switcher closed', () => {
    expect(app.filterOpen).toBe(false);
    expect(app.boardSwitcherOpen).toBe(false);
  });
});

describe('app store: every move is said once, in one place', () => {
  const first = () => DX_CARDS[0]!;
  it('says a move, says the same move again, and says a refusal', async () => {
    app.board = SNAP;
    const card = first();
    const stage = DX_STAGES.find((x) => x.key !== card.currentStageKey)!;
    const seen: string[] = [];
    const stop = $effect.root(() => { $effect(() => { seen.push(app.moveSaid); }); });
    await app.moveCard(card.id, stage.key);
    await vi.advanceTimersByTimeAsync(0);
    expect(app.moveSaid).toBe(`${card.title} moved to ${stage.name}`);
    await app.moveCard(card.id, stage.key);
    await vi.advanceTimersByTimeAsync(0);
    // Cleared, then set again: a live region only speaks when its text changes.
    expect(seen.filter((t) => t === `${card.title} moved to ${stage.name}`)).toHaveLength(2);
    api.moveCard.mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'Fix is at its limit of 1 card.' } }), { status: 409 }));
    await app.moveCard(card.id, stage.key);
    await vi.advanceTimersByTimeAsync(0);
    expect(app.moveSaid).toBe(`${card.title} was not moved to ${stage.name}. Fix is at its limit of 1 card.`);
    expect(app.error).toBe('Fix is at its limit of 1 card.');
    stop();
  });
});

describe('app store: a move shows at once and rolls back when refused', () => {
  it('moves the card before the server answers, then puts it back where it was on a refusal', async () => {
    app.board = { ...SNAP, cards: DX_CARDS.map((c) => ({ ...c })) } as BoardSnapshot;
    const card = DX_CARDS[0]!;
    const to = DX_STAGES.find((x) => x.key !== card.currentStageKey)!;
    let answer!: (r: Response) => void;
    api.moveCard.mockImplementationOnce(() => new Promise<Response>((r) => (answer = r)));
    api.getBoard.mockImplementationOnce(() => new Promise(() => {})); // the refresh never lands: what shows is the rollback
    void app.moveCard(card.id, to.key);
    await vi.advanceTimersByTimeAsync(0);
    expect(app.cardById(card.id)!.currentStageKey).toBe(to.key);
    answer(new Response(JSON.stringify({ error: { message: 'Fix is at its limit of 1 card.' } }), { status: 409 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(app.cardById(card.id)!.currentStageKey).toBe(card.currentStageKey);
    expect(app.error).toBe('Fix is at its limit of 1 card.');
  });
  it('keeps the move when the server takes it', async () => {
    app.board = { ...SNAP, cards: DX_CARDS.map((c) => ({ ...c })) } as BoardSnapshot;
    const card = DX_CARDS[0]!;
    const to = DX_STAGES.find((x) => x.key !== card.currentStageKey)!;
    api.getBoard.mockImplementationOnce(() => new Promise(() => {}));
    void app.moveCard(card.id, to.key);
    await vi.advanceTimersByTimeAsync(0);
    expect(app.cardById(card.id)!.currentStageKey).toBe(to.key);
    expect(app.error).toBeNull();
  });
});
