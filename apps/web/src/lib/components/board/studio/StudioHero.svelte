<!-- apps/web/src/lib/components/board/studio/StudioHero.svelte -->
<script lang="ts">
  import type { BoardModel } from '../board-model';
  import { heroH1, heroSentence } from './studio-prose';
  let { model }: { model: BoardModel } = $props();
  const h1 = $derived(heroH1(model));
  const clauses = $derived(heroSentence(model));
</script>

<div class="ar-hero">
  <span class="big" class:ink={model.counts.needs === 0} aria-hidden="true">{model.counts.needs}</span>
  <div class="txt">
    <span class="kick">The state of the board</span>
    <h2>{#if h1.sr}<span class="sr">{h1.sr}</span>{/if}{h1.text}</h2>
    {#if clauses.length}<p>{#each clauses as c, i (i)}{c.text}<sup class="fn">{c.fn}</sup>{/each}</p>{/if}
  </div>
</div>
