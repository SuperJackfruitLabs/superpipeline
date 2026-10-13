<script lang="ts">
  /** The add-a-link form (pre-sweep, shared by every vibe until a reference redraws it). */
  import { app } from '$lib/stores/app.svelte';
  import { Button } from '$lib/components/ui/button';
  import type { CardModel } from './card-model.svelte';
  let { model: m }: { model: CardModel } = $props();
  const card = $derived(m.card!);
</script>

{#if m.links.open}
  <div class="bg-inset border-border mt-2.5 space-y-2 rounded-[8px] border p-3 text-xs">
    <!--
      Re-review N3: the dialogue always creates an edge pointing AT this card ("picked
      card → this card") — there is no way, here, to create the reverse. That used to be
      implicit in generic Board/Card/Kind fields sitting directly under a visible "blocks"
      (outgoing) group, which invites exactly the wrong expectation. Said outright instead
      of left to be inferred, per the reviewer's finding — the symmetry argument for NOT
      adding an outgoing-creation path stands (that edge is always reachable from the
      other card's own drawer), so this fixes the wording, not the architecture.
    -->
    <p class="text-muted-foreground mono text-[10.5px]">
      The card you pick below will point <strong>at "{card.title}"</strong> — e.g. picking "blocks" creates
      "picked card blocks this card", never the other way around.
    </p>
    <div>
      <label for="blocker-board" class="text-muted-foreground mono mb-1 block text-[11px] uppercase tracking-widest">Board</label>
      <select
        id="blocker-board"
        bind:value={m.links.boardId}
        onchange={() => void m.links.onBoardChange()}
        class="bg-surface border-border focus:border-marigold w-full rounded-[6px] border px-2 py-1.5 text-xs outline-none"
      >
        {#each app.boards as b (b.id)}
          <option value={b.id}>{b.name}</option>
        {/each}
      </select>
    </div>

    {#if m.links.crossBoardNotice}
      <!-- Shown the moment a different board is picked — BEFORE any request, never after. -->
      <p class="mono text-[11px]" style="color:var(--marigold)">⚑ {m.links.crossBoardNotice}</p>
    {/if}

    <div>
      <label for="blocker-card" class="text-muted-foreground mono mb-1 block text-[11px] uppercase tracking-widest">Card (the one that will act on this one)</label>
      <select
        id="blocker-card"
        bind:value={m.links.cardId}
        class="bg-surface border-border focus:border-marigold w-full rounded-[6px] border px-2 py-1.5 text-xs outline-none"
      >
        <option value="">Pick a card…</option>
        {#each m.links.boardCards as c (c.id)}
          <option value={c.id}>{c.title}</option>
        {/each}
      </select>
    </div>

    <div>
      <label for="blocker-kind" class="text-muted-foreground mono mb-1 block text-[11px] uppercase tracking-widest">Kind</label>
      <select
        id="blocker-kind"
        bind:value={m.links.kind}
        class="bg-surface border-border focus:border-marigold w-full rounded-[6px] border px-2 py-1.5 text-xs outline-none"
      >
        <option value="blocks">blocks this card — this card will not be claimed while it is open</option>
        <option value="relates">relates to this card — informational only</option>
      </select>
    </div>

    <div class="flex gap-1.5">
      <Button size="sm" onclick={() => void m.links.add()} disabled={m.links.cardId === '' || m.links.adding}>
        {m.links.adding ? 'Adding…' : 'Add'}
      </Button>
      <Button size="sm" variant="ghost" onclick={() => (m.links.open = false)}>Cancel</Button>
    </div>

    {#if m.links.error}
      <p role="alert" class="text-coral mono text-[11px]">{m.links.error}</p>
    {/if}
  </div>
{/if}
