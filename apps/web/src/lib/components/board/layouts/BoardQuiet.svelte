<!-- apps/web/src/lib/components/board/layouts/BoardQuiet.svelte -->
<script lang="ts">
  /** Quiet desktop board: one reading column (SB §4.3). The shell's main is the page's one landmark. */
  import '../quiet/quiet-board.css';
  import { quietBlocks, quietLede, quietStageRow, quietSub } from '../board-words';
  import QuietItem from '../quiet/QuietItem.svelte';
  import type { BoardLayoutProps } from './types';

  let { model, onCompose }: BoardLayoutProps = $props();
  let showAll = $state<Record<string, boolean>>({});
  const blocks = $derived(quietBlocks(model));
</script>

<div class="qt">
  <header>
    <h2 class="qt-title">{model.boardName}</h2>
    <p class="qt-sub">{quietSub(model.counts.all, model.counts.needs)}</p>
    <p class="qt-lede">{quietLede(model)}</p>
    <button class="qt-newcard" type="button" onclick={onCompose}>Write a new card</button>
  </header>
  {#each blocks as b, i (i)}
    {#if b.kind === 'zero'}
      <ul class="qt-zero" aria-label={b.aria}>
        {#each b.labels as label (label)}<li><h2>{label} (0)</h2><span>None.</span></li>{/each}
      </ul>
    {:else}
      {@const all = showAll[b.urgency] === true}
      <section aria-labelledby="qt-{b.urgency}">
        <h2 id="qt-{b.urgency}">{b.label} ({b.total})</h2>
        {#if b.truncated && !all}<p class="qt-sub" style="margin-top: 4px;">The last 5, newest first.</p>{/if}
        <ul class="qt-list">
          {#each all ? b.cards : b.shown as s (s.id)}<QuietItem {s} stages={model.stageDefs} boardId={model.boardId} />{/each}
        </ul>
        {#if b.truncated}<button class="qt-more" type="button" aria-expanded={all} onclick={() => (showAll[b.urgency] = !all)}>{all ? 'Show the last 5 only' : b.moreLabel}</button>{/if}
      </section>
    {/if}
  {/each}
  <section aria-labelledby="qt-stages">
    <h2 id="qt-stages">Stages</h2>
    <table class="qt-table">
      <thead><tr><th scope="col">Stage</th><th scope="col">Cards</th><th scope="col">Who works it</th><th scope="col">Gate</th></tr></thead>
      <tbody>
        {#each model.stages as st (st.key)}
          {@const r = quietStageRow(st)}
          <tr><td>{r.name}</td><td class="n">{r.cards}</td><td>{r.who}</td><td>{r.gate}</td></tr>
        {/each}
      </tbody>
    </table>
  </section>
</div>
