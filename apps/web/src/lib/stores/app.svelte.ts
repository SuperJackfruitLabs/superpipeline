/**
 * The single shared reactive store for the flight-deck UI (Svelte 5 runes in a module).
 *
 * It owns the *shared* state — board snapshot, auth, the board switcher, the active screen, the
 * view toggle, filters, the open card, the command palette — plus the mutation+refresh loop and the
 * live WebSocket. Modal-local transient state (budget inputs, agent-mint form, card-edit form) stays
 * inside the components that own it. Ported from the original monolithic `+page.svelte`.
 */
import type { ListSort } from '$lib/components/plan/list/types';
import {
  getMe,
  getBoard,
  getBoards,
  getNotifications,
  getAgents,
  createBoard,
  createCard,
  moveCard,
  openBoardSocket,
  setUnauthorizedHandler,
  renewSession,
  type BoardFeedEvent,
  deleteBoard,
  BOARD_TEMPLATES,
  type BoardSnapshot,
  type BoardSummary,
  type Card,
  type Gate,
  type Elicitation,
  type Reference,
  type Notification,
  type User,
  type AgentSummary,
  getMembers,
  type Member,
  listLabels,
  type Label,
  listProjects,
  type Project,
  listAttention,
  type StaleCard,
} from '$lib/api';
import { tick } from 'svelte';
import { auth } from '$lib/auth-recovery.svelte';
import { itemsFromBoard, type AttentionItem } from '$lib/components/attention/attention';
import { noFilters, passesArchivedFilter, passesProjectFilter } from './card-filters';
import { feedIsStalled, STALL_CHECK_MS } from '../feed-liveness';

const BOARD_KEY = 'superpipeline.boardId';
const ATTENTION_COALESCE_MS = 1000;

export type View = 'board' | 'list' | 'projects';
export type ListGroupBy = 'stage' | 'state' | 'owner' | 'priority';
export interface CardFilters {
  states: string[];
  owners: string[];
  minPriority: number | null;
  needsReview: boolean;
  live: boolean;
  overBudget: boolean;
  /** A card matches only when it carries EVERY selected label — narrowing is what a filter is for. */
  labels: string[];
  /** Archived cards are hidden by default; this is the one way back in. */
  showArchived: boolean;
  /** A card matches only when its `projectId` is exactly this one (Task 20, Step 3). `null` = off. */
  projectId: string | null;
}

class AppStore {
  #busy = 0;
  /** Track a load that the pixel suite must wait for (dev galleries, workspace tabs). */
  async markBusy<T>(p: Promise<T>): Promise<T> {
    this.#busy++;
    this.noteLoaded();
    try {
      return await p;
    } finally {
      this.#busy--;
      this.noteLoaded();
    }
  }
  /** Dev builds: `<html data-ready="true">` once the board and its catalogue are in and nothing is pending. */
  noteLoaded(): void {
    if (!import.meta.env.DEV || typeof document === 'undefined') return;
    const settled = this.authState !== 'ready' || this.needsBoard || this.board !== null;
    document.documentElement.dataset.ready = String(this.#busy === 0 && settled);
  }

  // auth + onboarding
  authState = $state<'loading' | 'signed-out' | 'ready'>('loading');
  user = $state<User | null>(null);
  needsBoard = $state(false);

  // boards
  boards = $state<BoardSummary[]>([]);
  boardId = $state<string | null>(null);
  board = $state<BoardSnapshot | null>(null);
  connected = $state(false);

  /**
   * The one request the command palette still makes of a component it does not own.
   *
   * Its other two — "open the agents panel" and "go to Triage" — are addresses now, so the palette
   * navigates instead of signalling. Composing is not an address: it is a sheet over whatever you
   * are looking at, and only the board header can open it.
   *
   * A counter rather than a boolean, so asking twice in a row is two requests: a flag that is
   * already true cannot be raised again.
   */
  composeRequest = $state(0);
  /** The sentence the composer opens with (the palette's "Dispatch a card called …" passes one). */
  composeSentence = $state('');
  /** The new card composer is showing (it sets this); the shell's single-key shortcuts stand down. */
  composeOpen = $state(false);

  requestCompose(sentence = ''): void {
    this.composeSentence = sentence;
    this.composeRequest += 1;
  }

  /**
   * What the last move did, said by the one page-level live region (+layout.svelte) in every vibe:
   * a row or tile that moved changes column or group and unmounts, so it cannot say it itself.
   * Cleared first, then set after a tick, so the same move twice is announced twice.
   */
  moveSaid = $state('');
  async announceMove(text: string): Promise<void> {
    this.moveSaid = '';
    await tick();
    this.moveSaid = text;
  }
  error = $state<string | null>(null);

  // collaboration data
  notifications = $state<Notification[]>([]);
  agents = $state<AgentSummary[]>([]);
  /**
   * The workspace's people, held for the same reason the agents are: so an id can be shown as a
   * name. A card's owner and a gate's decider are user ids, and printing one at a person is the
   * same complaint as printing an agent id.
   */
  members = $state<Member[]>([]);
  /**
   * The tenant's label catalogue (migration 0010), fetched once per board open rather than per
   * card or per render — a tile only ever needs to look an id up in it.
   */
  labels = $state<Label[]>([]);
  /**
   * The tenant's project catalogue (Task 18's `migration 0013`) — cross-board, fetched once per
   * board open the same way `labels` is, so the project filter and `CardDrawer`'s picker only ever
   * need to look an id up in it rather than fetch per card.
   */
  projects = $state<Project[]>([]);

  // navigation + view
  view = $state<View>('board');
  listGroupBy = $state<ListGroupBy>('stage');
  listSort = $state<ListSort>({ key: 'priority', ascending: true });
  /** The card the Move dialog is open for (SP-Dlg-Move, drawn by Task 37); null when closed. */
  moveCardId = $state<string | null>(null);
  filters = $state<CardFilters>(noFilters());

  // overlays
  openCardId = $state<string | null>(null);
  /**
   * Whether the navigation rail is showing on a narrow screen.
   *
   * Only meaningful below `md`, where the rail is an overlay. At desktop
   * widths it is always visible and this is ignored — the alternative was a
   * second piece of state meaning "collapsed on desktop", which is a different
   * feature nobody asked for.
   *
   * Lives here rather than inside `Rail.svelte` because more than the rail
   * closes it: choosing a screen does, and so should anything that navigates.
   */
  cmdkOpen = $state(false);
  /**
   * Every card in the workspace waiting on a person (`GET /v1/stale?attention=1`), for the shell's
   * Operate count. Workspace-wide on purpose: the count says "someone needs you", wherever.
   */
  attention = $state<StaleCard[]>([]);
  /** The Filter cards dialog (`plan/FilterDialog.svelte`); every shell's Filter button opens it. */
  filterOpen = $state(false);
  /** The board switcher; the board name in every shell opens it. */
  boardSwitcherOpen = $state(false);
  /** When the board was last known to be current: a snapshot arrived or the feed spoke. */
  syncedAt = $state<Date | null>(null);
  #attentionLoadedAt = 0;
  #attentionTimer: ReturnType<typeof setTimeout> | undefined;

  #socket: WebSocket | undefined;
  /**
   * Reconnection state for the live feed.
   *
   * A dropped WebSocket showed "offline" until the user reloaded the page — no retry, no polling
   * fallback. A live board that silently stops being live is worse than one that never claimed to
   * be: the cards on screen keep looking current.
   *
   * `#socketGeneration` is what makes a stale timer harmless. Switching boards or disposing
   * bumps it, so a reconnect scheduled for the previous board finds its generation stale and
   * returns rather than opening a socket onto a board nobody is looking at.
   */
  #reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  #reconnectAttempt = 0;
  #feedListeners = new Set<(event: BoardFeedEvent) => void>();
  #socketGeneration = 0;
  /**
   * When the socket last delivered anything, and the watchdog that reads it.
   *
   * `connected` was set true on `open` and false on `close`, and a socket that stops DELIVERING
   * without closing fires neither. Measured on a live card: the API went 311 → 318 activities over 45
   * seconds while the open panel sat at 298 and never caught up — `connected` still true, no
   * "offline", no reconnect, and a reload fixed it. An idle proxy dropping the connection or a Worker
   * rotating underneath does not necessarily produce a `close` the page sees, so liveness has to be
   * OBSERVED rather than trusted (`feed-liveness.ts`).
   */
  #lastMessageAt: number | null = null;
  #stallTimer: ReturnType<typeof setInterval> | undefined;

  // ---- derived reads (methods stay reactive when read in templates) ----
  boardStates(): string[] {
    return this.board ? [...new Set(this.board.cards.map((c) => c.state))].sort() : [];
  }
  boardOwners(): string[] {
    return this.board ? [...new Set(this.board.cards.map((c) => c.ownerUserId))].sort() : [];
  }
  /** id → {name, colour}, for a tile or filter that only knows a card's label ids. */
  labelById(): Map<string, { name: string; colour: string }> {
    return new Map(this.labels.map((l) => [l.id, { name: l.name, colour: l.colour }]));
  }
  /** id → Project, for a filter chip or a card's assignment that only knows the id. */
  projectById(): Map<string, Project> {
    return new Map(this.projects.map((p) => [p.id, p]));
  }
  filteredCards(): Card[] {
    const b = this.board;
    if (!b) return [];
    const f = this.filters;
    return b.cards.filter((c) => {
      if (f.states.length && !f.states.includes(c.state)) return false;
      if (f.owners.length && !f.owners.includes(c.ownerUserId)) return false;
      if (f.minPriority !== null && c.priority < f.minPriority) return false;
      if (f.needsReview && !b.gates.some((g) => g.cardId === c.id) && !b.elicitations.some((e) => e.cardId === c.id))
        return false;
      if (f.live && c.state !== 'working') return false;
      if (f.overBudget && !c.overBudget) return false;
      if (!passesArchivedFilter(f.showArchived, c.archivedAt)) return false;
      if (f.labels.length > 0 && !f.labels.every((l) => c.labels.includes(l))) return false;
      if (!passesProjectFilter(f.projectId, c.projectId)) return false;
      return true;
    });
  }
  unreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }
  cardById(id: string): Card | undefined {
    return this.board?.cards.find((c) => c.id === id);
  }
  gateForCard(id: string): Gate | undefined {
    return this.board?.gates.find((g) => g.cardId === id && g.status === 'pending');
  }
  /** The question an agent is waiting on a human to answer for this card, if any (docs/04 §4). */
  elicitationForCard(id: string): Elicitation | undefined {
    return this.board?.elicitations.find((e) => e.cardId === id && e.status === 'pending');
  }
  referencesForCard(id: string): Reference[] {
    return this.board?.references.filter((r) => r.cardId === id) ?? [];
  }
  /** The board's cards waiting on a person, as attention rows — one rule for every count. */
  needsYou(): AttentionItem[] {
    return this.board ? itemsFromBoard(this.board, this.agents) : [];
  }

  // ---- actions ----
  /**
   * Boot the board.
   *
   * `preferred` is what the URL asked for. **It wins over the remembered
   * board**, and that ordering is the whole point of addressable cards: a link
   * someone was sent has to open what it names, not whatever board they
   * happened to have open last. Getting this the other way round produces a
   * link that appears to work — it loads a board — while showing the wrong one.
   *
   * A preferred board that does not resolve falls back to the remembered one
   * rather than erroring. Stale links are the normal case: a gate lives in a
   * Matrix room forever, and the board it names can be deleted long after.
   */
  init(preferred?: { boardId?: string | null; cardId?: string | null }): Promise<void> {
    return this.markBusy(this.#init(preferred));
  }

  #watchingVisibility = false;

  /**
   * A 401 anywhere means the session this tab holds has lapsed. It is renewed quietly first, and
   * only if that fails does the app ask the person to sign in. The person, the route and any open
   * card stay as they are: the old "any 401 → signed out → Landing" path is gone.
   */
  watchAuth(): void {
    setUnauthorizedHandler(() => auth.noteUnauthorized());
    auth.configure({ restore: () => this.#restore(), onExpired: () => this.#closeSocket() });
    if (!this.#watchingVisibility && typeof document !== 'undefined') {
      this.#watchingVisibility = true;
      // Signed in again in another tab: back to work without a click.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible' || auth.state !== 'expired') return;
        void getMe().then(async (me) => { if (me) { auth.resolved(); await this.#restore(); } });
      });
    }
  }

  async #restore(): Promise<boolean> {
    const me = await getMe();
    if (!me) return false;
    this.user = me;
    await this.refresh();
    if (this.boardId) this.#connect(this.boardId);
    return true;
  }

  async #init(preferred?: { boardId?: string | null; cardId?: string | null }): Promise<void> {
    this.watchAuth();
    try {
      this.user = await getMe();
      // A session cookie that lapsed while the tab was closed: one quiet renewal before Landing.
      if (!this.user && (await renewSession()).ok) this.user = await getMe();
      if (!this.user) {
        this.authState = 'signed-out';
        return;
      }
      this.authState = 'ready';

      let id: string | null = null;
      if (preferred?.boardId) {
        try {
          await getBoard(preferred.boardId);
          id = preferred.boardId;
        } catch {
          // Deleted, or another tenant's — the API answers 404 to both, by
          // construction, so this cannot tell them apart and must not try.
          id = null;
        }
      }

      if (!id) {
        id = localStorage.getItem(BOARD_KEY);
        if (id) {
          try {
            await getBoard(id);
          } catch {
            id = null;
            localStorage.removeItem(BOARD_KEY);
          }
        }
      }
      if (!id) {
        await this.loadBoards();
        id = this.boards[0]?.id ?? null;
      }
      if (!id) {
        this.needsBoard = true;
        return;
      }
      await this.openBoard(id);

      // Only after the board is loaded, and only if the card is really on it.
      // A drawer opened on a card the snapshot does not contain renders empty,
      // which reads as a broken card rather than a stale link.
      if (preferred?.cardId && id === preferred.boardId) {
        this.openCardId = this.board?.cards.some((c) => c.id === preferred.cardId)
          ? preferred.cardId
          : null;
      }
    } catch (e) {
      this.error = String(e);
    }
  }

  async loadBoards(): Promise<void> {
    try {
      this.boards = await getBoards();
    } catch {
      /* the switcher list is best-effort */
    }
  }

  /** Read the workspace's attention now. A failed read keeps the last answer. */
  async loadAttention(): Promise<void> {
    this.#attentionLoadedAt = Date.now();
    try {
      this.attention = (await listAttention()).cards;
    } catch {
      /* best-effort: a count that is a little stale beats one that vanishes */
    }
  }

  /**
   * Load the attention now when the last load is over a second old, otherwise once, a second
   * after it. A burst of feed events costs two reads, not one per event.
   */
  scheduleAttention(): Promise<void> | void {
    const wait = this.#attentionLoadedAt + ATTENTION_COALESCE_MS - Date.now();
    if (wait <= 0) return this.loadAttention();
    if (this.#attentionTimer !== undefined) return;
    this.#attentionTimer = setTimeout(() => {
      this.#attentionTimer = undefined;
      void this.loadAttention();
    }, wait);
  }

  openBoard(id: string): Promise<void> {
    return this.markBusy(this.#openBoard(id));
  }

  async #openBoard(id: string): Promise<void> {
    this.boardId = id;
    this.needsBoard = false;
    localStorage.setItem(BOARD_KEY, id);
    await this.refresh();
    await this.loadBoards();
    // Best-effort and independent: a workspace where one read is refused should still resolve the
    // others rather than fall back to ids for everything.
    const [agents, members, labels, projects] = await Promise.allSettled([
      getAgents(),
      getMembers(),
      listLabels(),
      listProjects(),
    ]);
    this.agents = agents.status === 'fulfilled' ? agents.value : [];
    this.members = members.status === 'fulfilled' ? members.value : [];
    this.labels = labels.status === 'fulfilled' ? labels.value : [];
    this.projects = projects.status === 'fulfilled' ? projects.value : [];
    this.#connect(id);
  }

  /**
   * Open the live feed, and keep it open.
   *
   * Backoff is capped at 30s and jittered: every viewer of a board loses the socket at the same
   * moment when a Worker restarts, and a fixed delay would have them all return in the same
   * instant.
   */
  #connect(boardId: string): void {
    this.#closeSocket();
    const generation = this.#socketGeneration;
    const sock = openBoardSocket(boardId, (event) => {
      this.#lastMessageAt = Date.now();
      this.syncedAt = new Date();
      void this.refresh();
      // Fan the event out to whoever is watching one card. The board snapshot that `refresh`
      // reloads does not carry activities, so without this the open card learns nothing.
      if (event) for (const fn of this.#feedListeners) fn(event);
    });
    sock.addEventListener('open', () => {
      if (generation !== this.#socketGeneration) return;
      this.connected = true;
      this.#reconnectAttempt = 0;
      // Null, not now(): there is nothing to measure until the first event, and starting the clock
      // here would make a slow first message look like a stall.
      this.#lastMessageAt = null;
      this.#watchForStall(boardId, generation);
    });
    sock.addEventListener('close', () => {
      if (generation !== this.#socketGeneration) return;
      this.connected = false;
      const delay = Math.min(30_000, 1000 * 2 ** this.#reconnectAttempt) * (0.75 + Math.random() * 0.5);
      this.#reconnectAttempt += 1;
      this.#reconnectTimer = setTimeout(() => {
        if (generation !== this.#socketGeneration) return;
        // Refresh on the way back: whatever happened while the socket was down did not reach us,
        // and reconnecting to a live feed with a stale board is the same lie in slower form.
        void this.refresh();
        this.#connect(boardId);
      }, delay);
    });
    this.#socket = sock;
  }

  /**
   * Subscribers to the live feed, for things the board snapshot does not carry.
   *
   * The card drawer is the reason this exists: its activity list is a separate fetch, and it used
   * to refresh only when the open card CHANGED — so a run could post sixty-seven activities, every
   * one of them arriving on this socket, and the panel a person was watching showed none of them
   * until the card moved stage and remounted the drawer.
   *
   * Returns its own unsubscribe. A `Set` rather than a single callback because two components may
   * legitimately watch at once, and a second one silently replacing the first is the kind of bug
   * that only shows up when someone opens two panels.
   */
  onFeed(fn: (event: BoardFeedEvent) => void): () => void {
    this.#feedListeners.add(fn);
    return () => this.#feedListeners.delete(fn);
  }

  /**
   * Notice a feed that has stopped carrying anything, and treat it as the disconnection it is.
   *
   * Only ever acts while a card is `working`: a board with nothing running is legitimately silent for
   * hours, and reconnecting every viewer of every quiet board on a timer is a thundering herd this
   * class already jitters its backoff to avoid.
   *
   * It reconnects through the same path a `close` does — flip `connected` false so the UI stops
   * claiming to be live, then re-open — because the failure is indistinguishable from a close that
   * never fired, and inventing a second recovery route would mean two things to keep in step.
   */
  #watchForStall(boardId: string, generation: number): void {
    if (this.#stallTimer !== undefined) clearInterval(this.#stallTimer);
    this.#stallTimer = setInterval(() => {
      if (generation !== this.#socketGeneration) return;
      const working = (this.board?.cards ?? []).some((c) => c.state === 'working');
      if (!feedIsStalled({ now: Date.now(), lastMessageAt: this.#lastMessageAt, hasWorkInFlight: working })) {
        return;
      }
      this.connected = false;
      this.#connect(boardId);
    }, STALL_CHECK_MS);
  }

  /** Close the socket and cancel any pending reconnect, invalidating both for good measure. */
  #closeSocket(): void {
    this.#socketGeneration += 1;
    if (this.#reconnectTimer !== undefined) clearTimeout(this.#reconnectTimer);
    this.#reconnectTimer = undefined;
    if (this.#stallTimer !== undefined) clearInterval(this.#stallTimer);
    this.#stallTimer = undefined;
    this.#socket?.close();
    this.#socket = undefined;
  }

  async switchBoard(id: string): Promise<void> {
    if (id !== this.boardId) await this.openBoard(id);
  }

  refresh(): Promise<void> {
    return this.markBusy(this.#refresh());
  }

  async #refresh(): Promise<void> {
    if (!this.boardId) return;
    try {
      this.board = await getBoard(this.boardId);
      this.syncedAt = new Date();
      this.notifications = await getNotifications(this.boardId);
    } catch (e) {
      // While recovery owns a lapsed session, the toast or the dialog says so; the error bar stays quiet.
      if (auth.state === 'ok') this.error = String(e);
    }
    await this.scheduleAttention();
    // Best-effort, same as openBoard: the label catalogue used to load ONLY there, so a label
    // created (or renamed) after board load never updated `app.labels` — the drawer's editor then
    // resolved a stale catalogue against a fresher card and could silently wipe labels off a card
    // it could no longer see (finding 2, phase-1 fix wave). `refresh()` runs after every save
    // (including the one that just created a label) and on every live-feed event, so this keeps
    // the catalogue as current as the board itself. A failed reload here must not fail the whole
    // refresh — `resolveCardLabelsForEdit`'s `blind` guard is what protects a save when the
    // catalogue genuinely cannot be trusted.
    try {
      this.labels = await listLabels();
    } catch {
      /* stale catalogue is recoverable; failing refresh entirely is not */
    }
  }

  /**
   * Queue a card, with everything the composer holds. `boardId` may name another board: the card
   * goes there and this board does not navigate. True when the card was created; on failure `error`
   * says why and the composer stays open.
   */
  async dispatchCard(
    title: string,
    detail: { priority?: number; description?: string; due?: string; stageKey?: string; labelIds?: string[]; projectId?: string | null; boardId?: string | null } = {},
  ): Promise<boolean> {
    const boardId = detail.boardId ?? this.boardId;
    if (!boardId || title.trim() === '') return false;
    try {
      const spec: Record<string, unknown> = {};
      if (detail.description && detail.description.trim() !== '') spec.description = detail.description.trim();
      // The due date is `dueAt`, a first-class field on `createCard` — never `spec.due`.
      await createCard(boardId, title.trim(), {
        priority: detail.priority,
        spec: Object.keys(spec).length > 0 ? spec : undefined,
        dueAt: detail.due && detail.due.trim() !== '' ? detail.due.trim() : undefined,
        stageKey: detail.stageKey || undefined,
        labelIds: detail.labelIds?.length ? detail.labelIds : undefined,
        projectId: detail.projectId ?? undefined,
      });
      this.error = null;
      if (boardId === this.boardId) await this.refresh();
      return true;
    } catch (e) {
      this.error = String(e instanceof Error ? e.message : e);
      return false;
    }
  }

  async moveCard(cardId: string, toStageKey: string): Promise<void> {
    if (!this.boardId) return;
    const title = this.cardById(cardId)?.title ?? 'The card';
    const stage = this.board?.stages.find((s) => s.key === toStageKey)?.name ?? toStageKey;
    const res = await moveCard(this.boardId, cardId, toStageKey);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      this.error = body?.error?.message ?? `Move failed (${res.status})`;
      void this.announceMove(`${title} was not moved to ${stage}. ${this.error}`);
    } else {
      this.error = null;
      void this.announceMove(`${title} moved to ${stage}`);
    }
    await this.refresh();
  }

  async deleteBoard(id: string): Promise<void> {
    const res = await deleteBoard(id);
    if (!res.ok) {
      this.error = `Couldn't delete that board (${res.status})`;
      return;
    }
    await this.loadBoards();
    if (id === this.boardId) {
      const next = this.boards[0];
      if (next) {
        await this.openBoard(next.id);
      } else {
        this.boardId = null;
        this.board = null;
        localStorage.removeItem(BOARD_KEY);
        this.needsBoard = true;
        this.#socket?.close();
      }
    }
  }

  /** Returns the new board's id so the caller can navigate to it — every screen is a route now. */
  async createFirstBoard(): Promise<string | null> {
    try {
      const id = await createBoard('My first board', BOARD_TEMPLATES[0]!.stages);
      await this.openBoard(id);
      return id;
    } catch (e) {
      this.error = String(e);
      return null;
    }
  }

  openMoveDialog(cardId: string): void {
    this.moveCardId = cardId;
  }
  closeMoveDialog(): void {
    this.moveCardId = null;
  }
  openCard(id: string): void {
    this.openCardId = id;
  }
  closeCard(): void {
    this.openCardId = null;
  }
  setView(v: View): void {
    this.view = v;
  }
  toggleCmdk(): void {
    this.cmdkOpen = !this.cmdkOpen;
  }
  dispose(): void {
    // Through `#closeSocket`, so the pending reconnect goes with it. Closing the socket alone
    // would leave a timer that reopens one after the component that owned it is gone.
    this.#closeSocket();
    this.connected = false;
    if (this.#attentionTimer !== undefined) clearTimeout(this.#attentionTimer);
    this.#attentionTimer = undefined;
  }

  /**
   * Try again after a failure the operator can see.
   *
   * Errors were dead ends: a banner with no retry and no dismiss, so the only way past one was to
   * reload. This is the retry; `dismissError` is the other half.
   */
  async retry(): Promise<void> {
    this.error = null;
    await this.refresh();
    if (this.boardId && !this.connected) this.#connect(this.boardId);
  }

  dismissError(): void {
    this.error = null;
  }
}

export const app = new AppStore();

// Dev builds only: the pixel suite re-reads the board on demand instead of waiting for a poll.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __spDev: { refresh: () => Promise<void> } }).__spDev = { refresh: () => app.refresh() };
}
