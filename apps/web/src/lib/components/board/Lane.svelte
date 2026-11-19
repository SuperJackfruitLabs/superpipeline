<!-- apps/web/src/lib/components/board/Lane.svelte -->
<script lang="ts">
  /**
   * One stage that holds cards (or the last stage): its name, how many cards and who works it, then
   * its tiles. Finished work folds after a few tiles; any other lane is a list (rule 7): its first
   * LANE_PAGE tiles in the lane's order, then "Show N more" a step at a time, as the Inbox's groups do,
   * saying how many of the cards it would show want you. The header counts the whole lane. The whole lane is the
   * drop target, folded or not: a card released on it moves to this stage.
   */
  import { Button, LoadMore } from '@superjackfruitlabs/vibekit-ui';
  import { app } from '$lib/stores/app.svelte';
  import { columnDropTarget } from '$lib/dnd';
  import { LANE_STEP, type LaneView } from './board-view-model';
  import { laneMore } from './board-words';
  import Tile from './Tile.svelte';

  let { lane }: { lane: LaneView } = $props();
  let over = $state(false);
  let unfolded = $state(false);
  /** Tiles added by "Show N more" on a paged lane. */
  let extra = $state(0);
  let root = $state<HTMLElement | null>(null);
  const limit = $derived(lane.fold === null ? lane.cards.length : lane.paged ? lane.fold + extra : unfolded ? lane.cards.length : lane.fold);
  const shown = $derived(lane.cards.slice(0, limit));
  const rest = $derived(lane.cards.slice(shown.length));
  const hidden = $derived(rest.length);
  /** What the next press shows, and how many of those want you, so the label's two numbers agree. Needs come first in a lane, so no wanting card waits behind a page that says none. */
  const next = $derived(rest.slice(0, LANE_STEP));
  const wanting = $derived(next.filter((s) => s.urgency === 'needs').length);
</script>

<section
  bind:this={root}
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
  {#if lane.paged && lane.fold !== null}
    <div class="bv-more">
      <LoadMore shown={shown.length} total={lane.cards.length} label={laneMore(next.length, wanting)} onmore={() => { extra += LANE_STEP; }} focusTarget={(i) => root?.querySelectorAll<HTMLElement>('[data-card-open]')[i]} />
    </div>
  {:else if hidden > 0}<span class="bv-more"><Button variant="text" size="sm" onclick={() => (unfolded = true)}>Show {hidden} more</Button></span>{/if}
</section>
