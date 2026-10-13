<!-- apps/web/src/lib/components/board/daylight/DlStrip.svelte -->
<script lang="ts">
  /** An empty stage, collapsed to a 60px strip; a click expands it into an empty lane. */
  import { Face } from '@superjackfruit/vibekit';
  import { app } from '$lib/stores/app.svelte';
  import { columnDropTarget } from '$lib/dnd';
  import type { BoardStage } from '../board-model';
  import { stripLabel, stripOwner } from '../board-words';

  let { stage, onExpand }: { stage: BoardStage; onExpand: () => void } = $props();
  let over = $state(false);
  const owner = $derived(stripOwner(stage));
</script>

<button
  class="dl-strip"
  type="button"
  aria-expanded="false"
  aria-label={stripLabel(stage)}
  title={stage.ownerLong}
  data-lane={stage.key}
  data-over={over || undefined}
  onclick={onExpand}
  use:columnDropTarget={{ stageKey: stage.key, onDrop: (cardId) => app.moveCard(cardId, stage.key), onOver: (o) => (over = o) }}
>
  <span class="n">{stage.count}</span>
  {#if owner === null && stage.declaredBy[0]}<Face id={stage.declaredBy[0]} label={stage.declaredBy[0]} mood="resting" size={28} />{/if}
  <span class="v">{stage.name}</span>
  {#if stage.gate}<span class="gate">gate</span>{/if}
  {#if owner}<span class="owner">{owner}</span>{/if}
</button>
