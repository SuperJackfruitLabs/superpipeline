// apps/web/src/lib/components/operate/operate-model.svelte.ts
/**
 * Operate's data, read from the app store. One instance per OperateView; the four layouts only
 * draw it. Spend comes from the 7-day usage route (OP-G8), loaded through `app.markBusy` so the
 * page is not "ready" before it lands.
 */
import { tick } from 'svelte';
import { app } from '$lib/stores/app.svelte';
import { appearance } from '$lib/appearance.svelte';
import { getUsage, markNotificationRead, moveCard, resumeCard, setBudget, type UsageSummary } from '$lib/api';
import { itemsFromBoard, sortAttention } from '$lib/components/attention/attention';
import { refusalOf } from '$lib/components/attention/refusal';
import { greetingName } from '../dialogs/person';
import { activityGroups, needRows, parseCap, runningRows, spendView } from './operate-data';
import type { CapResult, NeedRow, OperateModel } from './layouts/types';

export class OperateStore implements OperateModel {
  showRead = $state(false);
  #usage = $state<UsageSummary | null>(null);
  #usageError = $state<string | null>(null);

  readonly #items = $derived(app.board ? itemsFromBoard(app.board, app.agents, Date.now()) : []);
  readonly needs = $derived(app.board ? needRows(app.board, app.agents, sortAttention(this.#items, 'stage'), Date.now()) : []);
  readonly needsUrgent = $derived(app.board ? needRows(app.board, app.agents, sortAttention(this.#items, 'urgency'), Date.now()) : []);
  readonly running = $derived(app.board ? runningRows(app.board, app.agents) : []);
  readonly spend = $derived(spendView(this.#usage, app.board?.usage ?? null, app.agents));
  readonly unread = $derived(app.notifications.filter((n) => !n.read).length);
  readonly groups = $derived(app.board ? activityGroups(app.notifications, this.showRead, this.needs, app.board, app.agents) : []);
  readonly cardCount = $derived((app.board?.cards ?? []).filter((c) => !c.archivedAt).length);
  readonly stages = $derived([...(app.board?.stages ?? [])].sort((a, b) => a.order - b.order));

  constructor() {
    $effect(() => {
      const id = app.boardId;
      if (id) this.#loadUsage(id);
    });
  }

  get boardId(): string { return app.boardId ?? ''; }
  get boardName(): string { return app.board?.name ?? ''; }
  get agents() { return app.agents; }
  get usageError(): string | null { return this.#usageError; }
  get phase() { return appearance.phase; }
  get nowMs(): number { return Date.now(); }
  get firstName(): string { return greetingName(app.user, app.members); }

  #loadUsage(id: string): void {
    this.#usageError = null;
    app.markBusy(
      getUsage(id, '7d')
        .then((u) => { this.#usage = u; })
        .catch((e: unknown) => { this.#usage = null; this.#usageError = e instanceof Error ? e.message : String(e); }),
    );
  }

  cardHref(cardId: string): string { return `/b/${this.boardId}/c/${cardId}`; }

  async resume(row: NeedRow, comment: string, toStageKey: string): Promise<string | null> {
    const to = toStageKey === row.item.stageKey ? undefined : toStageKey;
    const refused = await refusalOf(await resumeCard(row.item.boardId, row.item.cardId, comment, to));
    if (!refused) await app.refresh();
    return refused;
  }

  async move(row: NeedRow, toStageKey: string): Promise<string | null> {
    const refused = await refusalOf(await moveCard(row.item.boardId, row.item.cardId, toStageKey));
    if (!refused) await app.refresh();
    return refused;
  }

  async markRead(seq: number): Promise<void> {
    if (!app.boardId) return;
    await markNotificationRead(app.boardId, seq);
    await app.refresh();
  }

  async setCaps(board: string, card: string): Promise<CapResult> {
    const b = parseCap(board);
    const c = parseCap(card);
    if (!b.ok || !c.ok) return { board: b.ok ? null : b.error, card: c.ok ? null : c.error, refused: null };
    const refused = await refusalOf(await setBudget(this.boardId, { boardUsdCap: b.value, cardUsdCap: c.value }));
    if (refused) return { board: null, card: null, refused };
    await app.refresh();
    this.#loadUsage(this.boardId);
    return null;
  }

  open(cardId: string): void { app.openCard(cardId); }

  /** Opens the card and brings its runs into view (OP-G11/G14). */
  openLog(cardId: string): void {
    app.openCard(cardId);
    void tick().then(() => requestAnimationFrame(() => document.getElementById('card-section-attempts')?.scrollIntoView?.({ block: 'start' })));
  }
}
