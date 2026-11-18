<!-- apps/web/src/lib/components/board/Lane.svelte -->
<script lang="ts">
  /**
   * One stage that holds cards (or the last stage): its name, how many cards and who works it, then
   * its tiles. Finished work folds after a few tiles. The lane is a drop target: a card released on
   * it moves to this stage.
   */
  import { Button } from '@superjackfruitlabs/vibekit-ui';
  import { app } from '$lib/stores/app.svelte';
  import { columnDropTarget } from '$lib/dnd';
  import type { LaneView } from './board-view-model';
  import Tile from './Tile.svelte';

  let { lane }: { lane: LaneView } = $props();
  let over = $state(false);
  let unfolded = $state(false);
  const shown = $derived(unfolded ? lane.cards : lane.cards.slice(0, lane.fold ?? lane.cards.length));
  const hidden = $derived(lane.cards.length - shown.length);
</script>

<section
  class="bv-lane"
  aria-label={lane.stage.name}
  data-lane={lane.stage.key}
  data-over={over || undefined}
  use:columnDropTarget={{ stageKey: lane.stage.key, onDrop: (cardId) => app.moveCard(cardId, lane.stage.key), onOver: (o) => (over = o) }}
>
  <header class="bv-lanehead">
    <h2>{lane.stage.name}</h2>
    <span class="bv-ct">{lane.count}<span class="vk-visually-hidden">{' '}{lane.count === 1 ? 'card' : 'cards'}</span></span>
    <span class="bv-who">{lane.who}</span>
  </header>
  {#if lane.cards.length === 0}<p class="bv-none">No cards here yet.</p>{/if}
  {#each shown as s (s.id)}
    <Tile {s} onmove={() => app.openMoveDialog(s.id)} />
  {/each}
  {#if hidden > 0}<span class="bv-more"><Button variant="text" size="sm" onclick={() => (unfolded = true)}>Show {hidden} more</Button></span>{/if}
</section>
