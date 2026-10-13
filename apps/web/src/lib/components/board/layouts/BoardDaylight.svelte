<!-- apps/web/src/lib/components/board/layouts/BoardDaylight.svelte -->
<script lang="ts">
  /** Daylight desktop board: lanes under the sky, empty stages as strips, the peek from 1440px (SB §3). */
  import '../daylight/daylight.css';
  import { onDestroy } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { app } from '$lib/stores/app.svelte';
  import { dlCols } from '../board-words';
  import DlLane from '../daylight/DlLane.svelte';
  import DlStrip from '../daylight/DlStrip.svelte';
  import type { BoardLayoutProps } from './types';

  let { model }: BoardLayoutProps = $props();

  const wide = new MediaQuery('min-width: 1440px');
  let expanded = $state<Record<string, boolean>>({});
  let peekId = $state<string | null>(null);
  /** The title focus goes back to after a close must not reopen the peek it just closed. */
  let quietFor: string | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function onPeek(id: string): void {
    clearTimeout(timer);
    if (id === quietFor) { quietFor = null; return; }
    if (!wide.current) return;
    timer = setTimeout(() => (peekId = id), 300);
  }
  function closePeek(): void {
    clearTimeout(timer);
    const id = peekId;
    peekId = null;
    if (!id) return;
    const title = [...document.querySelectorAll<HTMLElement>('[data-title-for]')].find((el) => el.dataset.titleFor === id);
    if (title && document.activeElement !== title) { quietFor = id; title.focus(); }
  }
  onDestroy(() => clearTimeout(timer));

  const cols = $derived(dlCols(model.stages, expanded));
  const firstNeedsId = $derived(model.needs[0]?.id ?? null);
  const peekLane = $derived(model.cards.find((s) => s.id === peekId)?.stageKey ?? null);
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape' && peekId && !e.defaultPrevented && !app.openCardId) closePeek(); }} />

<section class="dl-scope dl-board" aria-label="{model.boardName} stages" style="grid-template-columns: {cols}">
  {#each model.stages as stage (stage.key)}
    {@const cards = model.ordered.filter((s) => s.stageKey === stage.key)}
    {#if cards.length === 0 && !expanded[stage.key]}
      <DlStrip {stage} onExpand={() => (expanded[stage.key] = true)} />
    {:else}
      <DlLane
        {stage}
        {cards}
        stages={model.stageDefs}
        {peekId}
        {firstNeedsId}
        {onPeek}
        onPeekClose={closePeek}
        style={peekLane === stage.key ? 'z-index: 5;' : undefined}
        onCollapse={cards.length === 0 ? () => (expanded[stage.key] = false) : undefined}
      />
    {/if}
  {/each}
</section>
