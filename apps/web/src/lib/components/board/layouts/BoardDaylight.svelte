<script lang="ts">
  /** Daylight: the columns, with faces, under the sky (spec §5.1). The lanes are BoardKanban, unchanged. */
  import { onDestroy, setContext } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { app } from '$lib/stores/app.svelte';
  import BoardKanban from '../BoardKanban.svelte';
  import { crewOf } from '../card-summary';
  import GreetingBand from '../GreetingBand.svelte';
  import Peek from '../Peek.svelte';
  import { PEEK_KEY } from '../peek';
  import type { BoardLayoutProps } from './types';

  let { summaries, attention, phase, vibe }: BoardLayoutProps = $props();

  const crew = $derived(crewOf(summaries));

  // The peek starts at 1440px; below that the board is the whole screen and no title appears twice.
  const wide = new MediaQuery('min-width: 1440px');
  let looked = $state<string | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  setContext(PEEK_KEY, (id: string) => {
    clearTimeout(timer);
    timer = setTimeout(() => (looked = id), 150);
  });
  onDestroy(() => clearTimeout(timer));
  const peeked = $derived(summaries.find((s) => s.id === looked) ?? summaries.find((s) => s.urgency === 'needs') ?? null);
</script>

<div class="flex h-full min-h-0 flex-col">
  <GreetingBand {phase} {vibe} needCount={attention.length} {crew} />
  <div class="flex min-h-0 flex-1">
    <div class="min-w-0 flex-1 overflow-auto"><BoardKanban /></div>
    {#if wide.current}<Peek summary={peeked} {vibe} onOpen={(id) => app.openCard(id)} />{/if}
  </div>
</div>
