// apps/web/src/lib/components/operate/telemetry-model.svelte.ts
import { getUsage, getBoardEvents, type BoardEvent, type UsageSummary } from '$lib/api';
import { app } from '$lib/stores/app.svelte';
import { last7Days, newestFirst, zeroFill } from './spend-format';

export type SpendWindow = '7d' | '5h';
export interface BoardTotal { id: string; name: string; costUsd: number }
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export class TelemetryModel {
  window_ = $state<SpendWindow>('7d');
  usage = $state<UsageSummary | null>(null);
  usageError = $state<string | null>(null);
  loading = $state(false);
  boardTotals = $state<BoardTotal[] | null>(null);
  events = $state<BoardEvent[] | null>(null);
  eventsError = $state<string | null>(null);

  board = $derived(app.board);
  /** byDay is always the last seven UTC days, whatever the window. */
  days = $derived(zeroFill(this.usage?.byDay ?? [], last7Days(Date.now())));
  maxDay = $derived(Math.max(0, ...this.days.map((d) => d.costUsd)));
  spend = $derived(this.usage?.totalCostUsd ?? 0);
  budgetUsd = $derived(this.board?.usage.budgetUsd ?? null);
  overBudget = $derived(this.board?.usage.overBudget ?? false);

  async load(boardId: string, win: SpendWindow): Promise<void> {
    this.loading = true;
    this.usageError = null;
    const usage = getUsage(boardId, win);
    const totals = Promise.allSettled(app.boards.map((b) => getUsage(b.id, win).then((u) => ({ id: b.id, name: b.name, costUsd: u.totalCostUsd }))));
    const events = getBoardEvents(boardId, 60);
    app.markBusy(Promise.allSettled([usage, totals, events]));
    try { this.usage = await usage; } catch (e) { this.usage = null; this.usageError = message(e); } finally { this.loading = false; }
    this.boardTotals = (await totals).flatMap((r) => (r.status === 'fulfilled' ? [r.value] : [])).sort((a, b) => b.costUsd - a.costUsd);
    // The API answers oldest first; the log reads newest first.
    try { this.events = newestFirst(await events); this.eventsError = null; } catch (e) { this.events = []; this.eventsError = message(e); }
  }

  cardTitle(id: string): string | null { return this.board?.cards.find((c) => c.id === id)?.title ?? null; }
}
