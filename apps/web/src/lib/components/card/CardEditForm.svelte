<script lang="ts">
  /** The card's edit form, as it was (not mocked in the sweep); every vibe renders this one. */
  import { Button } from '$lib/components/ui/button';
  import type { CardModel } from './card-model.svelte';
  let { model }: { model: CardModel } = $props();
  const f = $derived(model.edit);
</script>

<div class="min-w-0 flex-1">
  <div class="eyebrow mb-2">edit card</div>
  <input bind:value={f.title} placeholder="Title" class="bg-inset border-border focus:border-marigold w-full rounded-[6px] border px-2.5 py-1.5 text-sm outline-none" />
  <div class="mt-2 flex flex-wrap items-center gap-3">
    <label class="text-muted-foreground mono flex items-center gap-1.5 text-[11px]">
      priority
      <input type="number" bind:value={f.priority} class="bg-inset border-border focus:border-marigold w-16 rounded-[5px] border px-1.5 py-1 outline-none" />
    </label>
    <label class="text-muted-foreground mono flex items-center gap-1.5 text-[11px]">
      due
      <input type="date" bind:value={f.due} aria-label="Due date" class="bg-inset border-border focus:border-marigold rounded-[5px] border px-1.5 py-1 outline-none" />
    </label>
    {#if f.due !== ''}
      <button onclick={() => (f.due = '')} class="text-muted-foreground hover:text-foreground mono text-[11px]">clear</button>
    {/if}
  </div>
  <textarea bind:value={f.desc} rows="3" placeholder="Description / brief for the agent…" class="bg-inset border-border focus:border-marigold mt-2 w-full resize-none rounded-[6px] border px-2.5 py-2 text-xs outline-none"></textarea>
  <label for="edit-labels" class="text-muted-foreground mono mt-3 block text-[11px] uppercase tracking-widest">Labels <span class="normal-case">(comma-separated)</span></label>
  <input id="edit-labels" bind:value={f.labels} placeholder="bug, frontend, urgent" disabled={f.labelsBlind}
    class="bg-inset border-border focus:border-marigold mt-1 w-full rounded-[6px] border px-2.5 py-1.5 text-xs outline-none disabled:opacity-60" />
  {#if f.labelsBlind}
    <p class="text-muted-foreground mono mt-1 text-[10px]">Couldn't load this card's labels from the catalogue — editing is disabled so saving does not clear them. Reopen the card to retry.</p>
  {/if}
  <label for="edit-ac" class="text-muted-foreground mono mt-3 block text-[11px] uppercase tracking-widest">Acceptance Criteria <span class="normal-case">(one per line)</span></label>
  <textarea id="edit-ac" bind:value={f.ac} rows="3" placeholder={"User can log in\nError messages are shown\nAll tests pass"}
    class="bg-inset border-border focus:border-marigold mt-1 w-full resize-none rounded-[6px] border px-2.5 py-2 text-xs outline-none"></textarea>
  <div class="mt-2.5 flex gap-1.5">
    <Button size="sm" onclick={() => f.save()} disabled={f.saving || f.title.trim() === ''}>{f.saving ? 'Saving…' : 'Save'}</Button>
    <Button size="sm" variant="ghost" onclick={() => f.cancel()}>Cancel</Button>
  </div>
</div>
