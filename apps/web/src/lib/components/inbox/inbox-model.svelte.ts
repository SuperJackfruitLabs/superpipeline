// apps/web/src/lib/components/inbox/inbox-model.svelte.ts
/**
 * The Inbox's data: what needs you, what is running, what it cost and what happened, on every
 * board or on the one chosen in the Show row (`inboxScope`, in memory only). The open board reads
 * live from the app store; every other board in scope is read once per visit and again after the
 * person acts on it. The four Operate layouts draw it unchanged; each row carries its board.
 */
import { goto } from '$app/navigation';
import { tick } from 'svelte';
import { app } from '$lib/stores/app.svelte';
import { appearance } from '$lib/appearance.svelte';
import {
  getBoard, getNotifications, getUsage, markNotificationRead, moveCard, resumeCard, setBudget,
  type BoardSnapshot, type Notification, type UsageSummary,
} from '$lib/api';
import { itemsFromBoard, sortAttention } from '$lib/components/attention/attention';
import { refusalOf } from '$lib/components/attention/refusal';
import { greetingName } from '../dialogs/person';
import { activityGroups, mergeUsage, needRows, parseCap, runningRows, spendView } from '../operate/operate-data';
import type { CapResult, NeedRow, OperateModel } from '../operate/layouts/types';
import { boardsNeedingFirst, inboxScope, scopeLabel } from './inbox-scope.svelte';

export const CHOOSE_A_BOARD_FOR_CAPS = 'Choose one board under Show to set its caps.';

export class InboxStore implements OperateModel {
  showRead = $state(false);
  #snaps = $state<Record<string, BoardSnapshot>>({});
  #notes = $state<Record<string, Notification[]>>({});
  #usage = $state<Record<string, UsageSummary>>({});
  #usageError = $state<string | null>(null);

  /** The boards in scope, the ones that need you first. */
  readonly boardIds = $derived.by(() => {
    const chosen = inboxScope.boardId;
    if (chosen) return [chosen];
    return boardsNeedingFirst(app.boards, app.attention).map((b) => b.id);
  });
  readonly #boards = $derived(this.boardIds.map((id) => this.#snap(id)).filter((b): b is BoardSnapshot => b !== null));

  readonly needs = $derived(this.#boards.flatMap((b) => needRows(b, app.agents, sortAttention(itemsFromBoard(b, app.agents, Date.now()), 'stage'), Date.now())));
  readonly needsUrgent = $derived.by(() => {
    const order = sortAttention(this.needs.map((r) => r.item), 'urgency').map((i) => i.id);
    return [...this.needs].sort((a, b) => order.indexOf(a.item.id) - order.indexOf(b.item.id));
  });
  readonly running = $derived(this.#boards.flatMap((b) => runningRows(b, app.agents)));
  readonly spend = $derived.by(() => {
    const usage = mergeUsage(this.boardIds.map((id) => this.#usage[id]).filter((u): u is UsageSummary => !!u));
    const one = this.scoped ? (this.#boards[0]?.usage ?? null) : null;
    return spendView(usage, one, app.agents);
  });
  readonly unread = $derived(this.boardIds.reduce((n, id) => n + this.#notesOf(id).filter((x) => !x.read).length, 0));
  readonly groups = $derived(
    this.#boards
      .flatMap((b) => activityGroups(this.#notesOf(b.boardId ?? ''), this.showRead, this.needs.filter((r) => r.boardId === b.boardId), b, app.agents))
      .sort((a, b) => b.latest.createdAt.localeCompare(a.latest.createdAt)),
  );
  readonly cardCount = $derived(this.#boards.reduce((n, b) => n + b.cards.filter((c) => !c.archivedAt).length, 0));
  readonly stages = $derived(this.scoped ? [...(this.#boards[0]?.stages ?? [])].sort((a, b) => a.order - b.order) : []);

  /** A string, so a fresh attention list that names the same boards does not read them all again. */
  readonly #idsKey = $derived(this.boardIds.join(','));

  constructor() {
    $effect(() => {
      const key = this.#idsKey;
      void this.#load(key ? key.split(',') : []);
    });
  }

  get scoped(): boolean { return inboxScope.boardId !== null; }
  get boardCount(): number { return this.boardIds.length; }
  get boardId(): string { return inboxScope.boardId ?? ''; }
  get boardName(): string { return scopeLabel(inboxScope.boardId, app.boards); }
  get agents() { return app.agents; }
  get usageError(): string | null { return this.#usageError; }
  get phase() { return appearance.phase; }
  get nowMs(): number { return Date.now(); }
  get firstName(): string { return greetingName(app.user, app.members); }

  #snap(id: string): BoardSnapshot | null {
    return id === app.boardId && app.board ? app.board : (this.#snaps[id] ?? null);
  }
  #notesOf(id: string): Notification[] {
    return id === app.boardId && app.board ? app.notifications : (this.#notes[id] ?? []);
  }

  /** Read every board in scope (the open one's snapshot is the store's, kept live by its socket). */
  #load(ids: readonly string[]): Promise<void> {
    return app.markBusy(Promise.all(ids.map((id) => this.#loadBoard(id))).then(() => undefined));
  }
  async #loadBoard(id: string): Promise<void> {
    this.#usageError = null;
    // The open board is read too: opening a card on another board makes this one a board like the rest.
    const [snap, notes, usage] = await Promise.allSettled([getBoard(id), getNotifications(id), getUsage(id, '7d')]);
    if (snap.status === 'fulfilled') this.#snaps[id] = snap.value;
    if (notes.status === 'fulfilled') this.#notes[id] = notes.value;
    if (usage.status === 'fulfilled') this.#usage[id] = usage.value;
    else this.#usageError = usage.reason instanceof Error ? usage.reason.message : String(usage.reason);
  }
  async #after(boardId: string): Promise<void> {
    if (boardId === app.boardId) await app.refresh();
    await Promise.all([this.#loadBoard(boardId), app.loadAttention()]);
  }

  cardHref(cardId: string, boardId?: string): string { return `/b/${boardId || this.boardId || app.boardId}/c/${cardId}`; }

  async resume(row: NeedRow, comment: string, toStageKey: string): Promise<string | null> {
    const to = toStageKey === row.item.stageKey ? undefined : toStageKey;
    const refused = await refusalOf(await resumeCard(row.item.boardId, row.item.cardId, comment, to));
    if (!refused) await this.#after(row.item.boardId);
    return refused;
  }

  async move(row: NeedRow, toStageKey: string): Promise<string | null> {
    const refused = await refusalOf(await moveCard(row.item.boardId, row.item.cardId, toStageKey));
    if (!refused) await this.#after(row.item.boardId);
    return refused;
  }

  async markRead(seq: number, boardId?: string): Promise<void> {
    const id = boardId || this.boardId || app.boardId;
    if (!id) return;
    await markNotificationRead(id, seq);
    await this.#after(id);
  }

  async setCaps(board: string, card: string): Promise<CapResult> {
    if (!this.scoped) return { board: null, card: null, refused: CHOOSE_A_BOARD_FOR_CAPS };
    const b = parseCap(board);
    const c = parseCap(card);
    if (!b.ok || !c.ok) return { board: b.ok ? null : b.error, card: c.ok ? null : c.error, refused: null };
    const refused = await refusalOf(await setBudget(this.boardId, { boardUsdCap: b.value, cardUsdCap: c.value }));
    if (refused) return { board: null, card: null, refused };
    await this.#after(this.boardId);
    return null;
  }

  /** The card opens over the Inbox; a card on another board opens that board first. */
  open(cardId: string, boardId?: string): void { void this.#open(cardId, boardId); }
  async #open(cardId: string, boardId?: string): Promise<void> {
    const id = boardId || this.boardId || app.boardId;
    if (!id) return;
    if (id !== app.boardId) {
      await app.openBoard(id);
      if (!app.board?.cards.some((c) => c.id === cardId)) { await goto(this.cardHref(cardId, id)); return; }
    }
    app.openCard(cardId);
  }

  /** Opens the card and brings its runs into view (OP-G11/G14). */
  openLog(cardId: string, boardId?: string): void {
    void this.#open(cardId, boardId).then(() => tick()).then(() => requestAnimationFrame(() => document.getElementById('card-section-attempts')?.scrollIntoView?.({ block: 'start' })));
  }
}
