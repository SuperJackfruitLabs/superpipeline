// apps/web/src/lib/components/card/comments-model.svelte.ts
/**
 * A card's comment thread (moved from CardComments.svelte). Bodies stay text; the components never
 * use {@html}. Nothing is fetched until a component calls `attach()` inside an `$effect`, so a
 * model that no surface draws costs nothing.
 */
import { deleteComment, getComments, postComment, type BoardFeedEvent, type CardComment } from '$lib/api';

export interface CommentsContext {
  boardId: string | null;
  cardId: string | null;
  onFeed: (fn: (e: BoardFeedEvent) => void) => () => void;
  coalesceMs?: number;
}

async function refusal(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } | string };
    const msg = typeof body.error === 'string' ? body.error : body.error?.message;
    if (msg) return msg;
  } catch {
    // fall through to the status
  }
  return `the server answered ${res.status}`;
}

export class CommentsModel {
  comments = $state<CardComment[]>([]);
  loaded = $state(false);
  draft = $state('');
  posting = $state(false);
  error = $state<string | null>(null);
  #ctx: () => CommentsContext;

  constructor(ctx: () => CommentsContext) {
    this.#ctx = ctx;
  }
  get summary(): string {
    const n = this.comments.filter((c) => !c.deletedAt).length;
    return n ? `${n} comment${n === 1 ? '' : 's'}` : 'No comments yet';
  }
  async load(bid: string, id: string): Promise<void> {
    try {
      const got = await getComments(bid, id);
      const now = this.#ctx();
      if (bid === now.boardId && id === now.cardId) this.comments = got;
    } catch {
      // A failed read keeps what is on screen rather than blanking the thread.
    } finally {
      this.loaded = true;
    }
  }
  /** Call inside an `$effect`; re-runs when the card changes; returns the cleanup. */
  attach(): () => void {
    const { boardId: bid, cardId: id, onFeed, coalesceMs = 250 } = this.#ctx();
    this.comments = [];
    this.loaded = false;
    this.error = null;
    if (!bid || !id) return () => {};
    void this.load(bid, id);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = onFeed((event) => {
      if (!event.type.startsWith('card.comment.') || event.payload?.cardId !== id) return;
      if (timer !== undefined) return;
      timer = setTimeout(() => {
        timer = undefined;
        void this.load(bid, id);
      }, coalesceMs);
    });
    return () => {
      stop();
      if (timer !== undefined) clearTimeout(timer);
    };
  }
  async submit(): Promise<void> {
    const { boardId, cardId } = this.#ctx();
    const text = this.draft.trim();
    if (!boardId || !cardId || !text || this.posting) return;
    this.posting = true;
    this.error = null;
    try {
      const res = await postComment(boardId, cardId, text);
      if (!res.ok) {
        this.error = `Not posted: ${await refusal(res)}`;
        return;
      }
      this.draft = '';
      await this.load(boardId, cardId);
    } finally {
      this.posting = false;
    }
  }
  async remove(c: CardComment): Promise<void> {
    const { boardId, cardId } = this.#ctx();
    if (!boardId || !cardId) return;
    if (!confirm('Delete this comment? The thread will show that a comment was deleted.')) return;
    const res = await deleteComment(boardId, cardId, c.id);
    if (!res.ok) {
      this.error = `Not deleted: ${await refusal(res)}`;
      return;
    }
    await this.load(boardId, cardId);
  }
}
