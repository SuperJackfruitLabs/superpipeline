<!-- apps/web/src/lib/components/board/Tile.svelte -->
<script lang="ts">
  /**
   * One card on the board: its title (which opens the card), priority and labels, one state line and
   * a quiet Move. Never a primary button: what a card needs is said in words, and the vibe marks a
   * card that waits on you (`data-needs`) in its own way, never with words of its own. A tile can be dragged to any stage.
   */
  import { Button } from '@superjackfruitlabs/vibekit-ui';
  import { app } from '$lib/stores/app.svelte';
  import { cardDraggable } from '$lib/dnd';
  import { cardKeys, openLabel } from './open-label';
  import { moreLabelsTitle } from './board-words';
  import type { CardSummary } from './card-summary';
  import { stateLine } from './tile-state';

  let { s, onmove }: { s: CardSummary; onmove: () => void } = $props();

  const line = $derived(stateLine(s));
  /** Alt with an arrow moves the card one stage along, as on every board before. */
  function step(delta: -1 | 1): void {
    const stages = [...(app.board?.stages ?? [])].sort((a, b) => a.order - b.order);
    const next = stages[stages.findIndex((st) => st.key === s.stageKey) + delta];
    if (next) void app.moveCard(s.id, next.key);
  }
</script>

<article class="bv-tile" data-row="card" data-card-id={s.id} data-needs={line.needs ? '1' : '0'} use:cardDraggable={{ cardId: s.id }}>
  <h3 class="bv-t">
    <button
      type="button"
      class="bv-open"
      data-card-open={s.id}
      aria-label={openLabel({ title: s.title, stageName: s.stageName })}
      onclick={() => app.openCard(s.id)}
      onkeydown={(e) => cardKeys(e, { open: () => app.openCard(s.id), toggleMove: onmove, step })}
    >{s.title}</button>
  </h3>
  {#if s.priority > 0 || s.labels.length > 0 || s.moreLabels > 0}
    <ul class="bv-chips" aria-label="Priority and labels">
      {#if s.priority > 0}<li class="bv-chip bv-pri"><span class="vk-visually-hidden">Priority{' '}</span><span aria-hidden="true">P</span>{s.priority}</li>{/if}
      {#each s.labels as l (l.id)}<li class="bv-chip">{l.name}</li>{/each}
      {#if s.moreLabels > 0}<li class="bv-chip" title={moreLabelsTitle(s.moreLabels)}>+{s.moreLabels}</li>{/if}
    </ul>
  {/if}
  <p class="bv-st">{line.text}</p>
  <span class="bv-mv"><Button variant="quiet" size="sm" aria-haspopup="dialog" aria-label="Move {s.title} to another stage" onclick={onmove}>Move</Button></span>
</article>
