<!-- apps/web/src/lib/components/board/paper/PaperPipeline.svelte -->
<script lang="ts">
  import type { BoardStage } from '../board-model';
  import { pipelineParts } from '../board-words';
  let { stages }: { stages: BoardStage[] } = $props();
</script>

<section class="pp-pipe" aria-labelledby="pp-pipe">
  <h2 id="pp-pipe">The pipeline · read left to right</h2>
  <ol style="--pp-stages: {stages.length}">
    {#each stages as st (st.key)}
      {@const p = pipelineParts(st)}
      <li><b>{st.name}</b><span class="n">{p.n}</span>{#each p.extra as x, i (i)}<span>{x}</span>{/each}</li>
    {/each}
  </ol>
</section>
