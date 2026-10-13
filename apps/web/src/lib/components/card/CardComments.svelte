<script lang="ts">
  /**
   * A card's comment thread, inside the card drawer.
   *
   * Every body is rendered as TEXT with its line breaks kept (`white-space: pre-wrap`), never as
   * HTML. A comment is written by anyone with board read access, or by an agent, and read by
   * everyone who opens the card; `{@html}` here would let one comment run script in every viewer's
   * session. Markdown is stored as written and shown as its source — legible, and inert.
   *
   * Live: the board feed carries `card.comment.added` / `card.comment.deleted` naming the card (and
   * never the text), and this refetches the thread when one names this card.
   */
  import type { BoardFeedEvent, CardComment } from '$lib/api';
  import { Button } from '$lib/components/ui/button';
  import { CommentsModel } from './comments-model.svelte';

  let {
    boardId,
    cardId,
    currentUserId,
    onFeed,
    coalesceMs = 250,
  }: {
    boardId: string;
    cardId: string;
    /** The signed-in person, so their own comments offer Delete. Null hides it everywhere. */
    currentUserId: string | null;
    /** The board's live feed (`app.onFeed`); returns its own unsubscribe. */
    onFeed: (fn: (e: BoardFeedEvent) => void) => () => void;
    coalesceMs?: number;
  } = $props();

  const model = new CommentsModel(() => ({ boardId, cardId, onFeed, coalesceMs }));
  $effect(() => model.attach());

  function when(ts: string): string {
    try {
      return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return ts;
    }
  }
  const mine = (c: CardComment) => !c.deletedAt && c.author.kind === 'human' && !!currentUserId && c.author.id === currentUserId;
</script>

{#if model.comments.length > 0}
  <ul class="mb-2.5 space-y-1.5" data-testid="comment-list">
    {#each model.comments as c (c.id)}
      <li class="bg-inset border-border min-w-0 rounded-[8px] border px-3 py-2 text-[12px]">
        <div class="mono flex min-w-0 flex-wrap items-center gap-x-1.5 text-[10.5px]">
          <span class="truncate font-semibold" title={c.author.id}>{c.author.name ?? c.author.id}</span>
          {#if c.author.kind === 'agent'}
            <span class="border-border text-muted-foreground rounded-[4px] border px-1 text-[9.5px]">agent</span>
          {/if}
          <time class="text-muted-foreground" datetime={c.createdAt}>{when(c.createdAt)}</time>
          {#if mine(c)}
            <button
              type="button"
              class="text-muted-foreground hover:text-coral ml-auto min-h-6 px-1"
              aria-label="Delete your comment"
              onclick={() => void model.remove(c)}>Delete</button
            >
          {/if}
        </div>
        {#if c.deletedAt}
          <p class="text-muted-foreground mt-1 italic">Comment deleted</p>
        {:else}
          <p class="comment-body mt-1 leading-relaxed">{c.body}</p>
        {/if}
      </li>
    {/each}
  </ul>
{:else}
  <!-- The line holds its place while the thread loads, so the composer under it does not jump
       after someone has focused it (a focused control pushed under the card's sticky bars). -->
  <p class="text-muted-foreground mb-2 text-[11px]" aria-busy={!model.loaded}>{model.loaded ? 'No comments yet. The agent that works this card reads them.' : 'Loading comments…'}</p>
{/if}

<form
  class="flex flex-col gap-1.5 sm:flex-row sm:items-end"
  onsubmit={(e) => {
    e.preventDefault();
    void model.submit();
  }}
>
  <textarea
    bind:value={model.draft}
    aria-label="Add a comment"
    placeholder="Add a comment… (⌘/Ctrl+Enter to post)"
    rows="2"
    maxlength="8192"
    onkeydown={(e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void model.submit();
      }
    }}
    class="bg-inset border-border focus:border-marigold min-w-0 flex-1 resize-y rounded-[6px] border px-2.5 py-1.5 text-xs outline-none"
  ></textarea>
  <Button type="submit" size="sm" variant="outline" disabled={model.draft.trim() === '' || model.posting}>{model.posting ? 'Posting…' : 'Comment'}</Button>
</form>
{#if model.error}
  <p role="alert" class="text-coral mono mt-1.5 text-[11px]">{model.error}</p>
{/if}

<style>
  .comment-body {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
</style>
