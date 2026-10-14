/**
 * Every board's cards, read once per visit to Projects, so a project can say which boards its
 * cards live on and the project page can list them (nav v2, N2).
 *
 * Computed in the web app from the endpoints that already exist (`GET /v1/boards`,
 * `GET /v1/boards/:id`, `GET /v1/boards/:id/events`) rather than a new cross-board API: a
 * workspace has a handful of boards, the Inbox already reads them the same way, and the rollup's
 * own numbers stay the server's (`GET /v1/projects/:id/rollup`).
 */
import { app } from '$lib/stores/app.svelte';
import { getBoard, getBoardEvents, getBoards, type BoardEvent, type BoardSnapshot } from '$lib/api';
import type { ProjectCard } from './project-detail';

/** Boards read at once: a browser holds six connections to a host. */
const LOAD_AT_ONCE = 3;

export interface ActivityLine { key: string; ts: string; boardId: string; boardName: string; cardId: string; cardTitle: string; event: BoardEvent; stages: BoardSnapshot['stages'] }

class ProjectWorkspace {
  snaps = $state<Record<string, BoardSnapshot>>({});
  events = $state<Record<string, BoardEvent[]>>({});
  loading = $state(false);
  #loaded: Promise<void> | null = null;

  /** Read every board once (again with `force`); the open board is read too, it may be stale. */
  load(force = false): Promise<void> {
    if (this.#loaded && !force) return this.#loaded;
    this.#loaded = app.markBusy(this.#read());
    return this.#loaded;
  }

  async #read(): Promise<void> {
    this.loading = true;
    try {
      const boards = app.boards.length > 0 ? app.boards : await getBoards().catch(() => []);
      const queue = boards.map((b) => b.id);
      const next: Record<string, BoardSnapshot> = {};
      const worker = async () => {
        for (let id = queue.shift(); id; id = queue.shift()) {
          try { next[id] = await getBoard(id); } catch { /* a board that does not answer is left out */ }
        }
      };
      await Promise.all(Array.from({ length: Math.min(LOAD_AT_ONCE, queue.length) }, worker));
      this.snaps = next;
    } finally {
      this.loading = false;
    }
  }

  cardsOf(projectId: string): ProjectCard[] {
    return Object.values(this.snaps).flatMap((b) =>
      b.cards
        .filter((c) => c.projectId === projectId && !c.archivedAt)
        .map((c) => ({ card: c, boardId: b.boardId ?? '', boardName: b.name ?? 'Untitled board', stageName: b.stages.find((s) => s.key === c.currentStageKey)?.name ?? c.currentStageKey })),
    );
  }

  /** The boards a project's cards live on, by name, in the order the boards were read. */
  boardsOf(projectId: string): Array<{ id: string; name: string }> {
    const seen = new Map<string, string>();
    for (const c of this.cardsOf(projectId)) seen.set(c.boardId, c.boardName);
    return [...seen].map(([id, name]) => ({ id, name }));
  }

  /** Read the event logs of the boards this project's cards live on. */
  async loadEvents(projectId: string): Promise<void> {
    const ids = this.boardsOf(projectId).map((b) => b.id);
    const read = await Promise.all(ids.map(async (id) => [id, await getBoardEvents(id, 100).catch(() => [])] as const));
    this.events = { ...this.events, ...Object.fromEntries(read) };
  }

  /** The project's cards' recent events across boards, newest first. */
  activityOf(projectId: string, limit = 8): ActivityLine[] {
    const cards = new Map(this.cardsOf(projectId).map((c) => [c.card.id, c]));
    const out: ActivityLine[] = [];
    for (const [boardId, evs] of Object.entries(this.events)) {
      for (const e of evs) {
        const cardId = typeof e.payload.cardId === 'string' ? e.payload.cardId : '';
        const c = cards.get(cardId);
        if (!c || c.boardId !== boardId) continue;
        out.push({ key: `${boardId}:${e.seq}`, ts: e.ts, boardId, boardName: c.boardName, cardId, cardTitle: c.card.title, event: e, stages: this.snaps[boardId]?.stages ?? [] });
      }
    }
    return out.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, limit);
  }
}

export const projectWorkspace = new ProjectWorkspace();
