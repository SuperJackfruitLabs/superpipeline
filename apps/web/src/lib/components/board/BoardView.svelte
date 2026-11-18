<!-- apps/web/src/lib/components/board/BoardView.svelte -->
<script lang="ts">
  /**
   * The board page, one composition for every vibe (composition contract, Board variant A): the top
   * row with the attention line, the stage track (every stage, always), lanes only where cards are,
   * and the footer line. Outside the one `[data-signature]` slot the markup and words are the same
   * in all four vibes; each vibe's look is CSS on the vibe root (board.css).
   */
  import './board.css';
  import type { CardFilters } from '$lib/stores/app.svelte';
  import { shellModel } from '$lib/components/shell/shell-model.svelte';
  import type { BoardModel } from './board-model';
  import { boardView, footerLine } from './board-view-model';
  import BoardTopRow from './BoardTopRow.svelte';
  import BoardTrack from './BoardTrack.svelte';
  import Lane from './Lane.svelte';

  // onCompose: the board itself offers no compose control (the shell's New card does); kept for the page's callers.
  let { model, filters }: { model: BoardModel; filters: CardFilters; onCompose: () => void } = $props();

  const view = $derived(boardView(model));
  let root = $state<HTMLElement | null>(null);

  /** "Show the first": focus the first card that wants you, and bring it into view. */
  function showFirst(): void {
    const first = root?.querySelector<HTMLElement>('[data-needs="1"] [data-card-open]');
    if (!first) return;
    first.scrollIntoView?.({ block: 'center' });
    first.focus({ preventScroll: true });
  }
</script>

<div class="bv" bind:this={root}>
  <BoardTopRow {filters} attention={{ text: view.attention, needs: view.needs, onfirst: showFirst }} />
  <BoardTrack keys={model.stages.map((s) => s.key)} names={view.stageNames} details={view.details} />
  <div class="bv-sig" data-signature></div>
  <div class="bv-lanes">
    {#each view.lanes as lane (lane.stage.key)}
      <Lane {lane} />
    {/each}
  </div>
  <p class="bv-foot">{footerLine(shellModel.boardStatus)}</p>
</div>
