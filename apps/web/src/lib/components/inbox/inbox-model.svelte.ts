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
import { pending, type Pending } from '$lib/loading.svelte';

/** Boards read at once (each is three requests). */
const LOAD_AT_ONCE = 2;

export const CHOOSE_A_BOARD_FOR_CAPS = 'Choose one board under Show to set its caps.';

export class InboxStore implements OperateModel {
  showRead = $state(false);
  #snaps = $state<Record<string, BoardSnapshot>>({});
  #notes = $state<Record<string, Notification[]>>({});
  #usage = $state<Record<string, UsageSummary>>({});
  #usageError = $state<string | null>(null);
  /** Boards whose first read has finished, whether it worked or not. */
  #settled = $state<Record<string, true>>({});
  /** Boards whose first read failed. */
  #failed = $state<Record<string, true>>({});
  #gate: Pending;

  /** The boards in scope, the ones that need you first. */
  readonly boardIds = $derived.by(() => {
    const chosen = inboxScope.boardId;
    if (chosen) return [chosen];
    return boardsNeedingFirst(app.boards, app.attention).map((b) => b.id);
  });
  readonly #boards = $derived(this.boardIds.map((id) => this.#snap(id)).filter((b): b is BoardSnapshot => b !== null));

  /** Every row, counted or not; the page reads `needs` etc., which stay empty until the counting is done (no rows trickling in). */
  readonly #needsAll = $derived(this.#boards.flatMap((b) => needRows(b, app.agents, sortAttention(itemsFromBoard(b, app.agents, Date.now()), 'stage'), Date.now())));
  get needs(): NeedRow[] { return this.loading ? [] : this.#needsAll; }
  readonly #needsUrgentAll = $derived.by(() => {
    const order = sortAttention(this.#needsAll.map((r) => r.item), 'urgency').map((i) => i.id);
    return [...this.#needsAll].sort((a, b) => order.indexOf(a.item.id) - order.indexOf(b.item.id));
  });
  get needsUrgent(): NeedRow[] { return this.loading ? [] : this.#needsUrgentAll; }
  readonly #runningAll = $derived(this.#boards.flatMap((b) => runningRows(b, app.agents)));
  get running() { return this.loading ? [] : this.#runningAll; }
  readonly spend = $derived.by(() => {
    const usage = mergeUsage(this.boardIds.map((id) => this.#usage[id]).filter((u): u is UsageSummary => !!u));
    const one = this.scoped ? (this.#boards[0]?.usage ?? null) : null;
    return spendView(usage, one, app.agents);
  });
  readonly unread = $derived(this.boardIds.reduce((n, id) => n + this.#notesOf(id).filter((x) => !x.read).length, 0));
  readonly #groupsAll = $derived(
    this.#boards
      .flatMap((b) => activityGroups(this.#notesOf(b.boardId ?? ''), this.showRead, this.#needsAll.filter((r) => r.boardId === b.boardId), b, app.agents))
      .sort((a, b) => b.latest.createdAt.localeCompare(a.latest.createdAt)),
  );
  get groups() { return this.loading ? [] : this.#groupsAll; }
  readonly cardCount = $derived(this.#boards.reduce((n, b) => n + b.cards.filter((c) => !c.archivedAt).length, 0));
  readonly stages = $derived(this.scoped ? [...(this.#boards[0]?.stages ?? [])].sort((a, b) => a.order - b.order) : []);

  /** A sorted string: an attention list that only reorders the same boards reads nothing again. */
  readonly #idsKey = $derived([...this.boardIds].sort().join(','));
  /** Boards read (or being read) this visit; after an action only that board is read again. */
  #asked = new Set<string>();

  constructor() {
    this.#gate = pending(() => this.pendingNow);
    $effect(() => {
      const key = this.#idsKey;
      void this.#load(key ? key.split(',').filter((id) => !this.#asked.has(id)) : []);
    });
  }

  /**
   * The Inbox has not counted yet. Pending until the board list and the attention list have answered
   * and every board in scope that has something waiting has been read, so the counts appear once, not
   * in steps (4, then 7) as boards arrive. Before the board list arrives there are no boards in scope,
   * which is not the same as nothing needing you.
   */
  get pendingNow(): boolean {
    if (this.failed) return false;
    if (!app.boardsLoaded || !app.attentionSettled) return true;
    if (this.boardIds.length === 0) return false;
    const asking = new Set(app.attention.map((a) => a.boardId));
    if (inboxScope.boardId) asking.add(inboxScope.boardId);
    return this.boardIds.some((id) => asking.has(id) && !this.#settled[id]) || !this.boardIds.some((id) => this.#settled[id]);
  }
  /** The lists draw skeletons and the counts a dash ("–"), never "nothing is waiting" or 0. Held by the skeleton clock (150 ms in, 300 ms at least). */
  get loading(): boolean { return this.#gate.busy; }
  /** Still loading after 8 s. */
  get slow(): boolean { return this.#gate.slow; }
  /** The boards could not be read at all: the page says so, with Try again, instead of "nothing needs you". */
  get failed(): boolean {
    if (app.boardsFailed && !app.boardsLoaded) return true;
    return this.boardIds.length > 0 && this.boardIds.every((id) => this.#failed[id]);
  }
  /** Try every failed read again. */
  async retry(): Promise<void> {
    const again = Object.keys(this.#failed);
    this.#failed = {};
    for (const id of again) { delete this.#settled[id]; this.#asked.delete(id); }
    await app.retry();
    if (!app.attentionLoaded) await app.loadAttention();
    await this.#load(this.boardIds.filter((id) => !this.#asked.has(id)));
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

  /**
   * Read every board in scope not read yet, a few at a time: a browser holds six connections to a
   * host, and a workspace with many boards must not queue the person's own Resume behind them.
   */
  #load(ids: readonly string[]): Promise<void> {
    for (const id of ids) this.#asked.add(id);
    const queue = [...ids];
    const worker = async () => { for (let id = queue.shift(); id; id = queue.shift()) await this.#loadBoard(id); };
    return app.markBusy(Promise.all(Array.from({ length: Math.min(LOAD_AT_ONCE, queue.length) }, worker)).then(() => undefined));
  }
  async #loadBoard(id: string): Promise<void> {
    this.#usageError = null;
    // The open board is read too: opening a card on another board makes this one a board like the rest.
    const [snap, notes, usage] = await Promise.allSettled([getBoard(id), getNotifications(id), getUsage(id, '7d')]);
    if (snap.status === 'fulfilled') this.#snaps[id] = snap.value;
    else this.#failed[id] = true;
    if (notes.status === 'fulfilled') this.#notes[id] = notes.value;
    if (usage.status === 'fulfilled') this.#usage[id] = usage.value;
    else this.#usageError = 'try again in a moment';
    this.#settled[id] = true;
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
