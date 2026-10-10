<script lang="ts">
  /** Daylight: the columns, with faces, under the sky (spec §5.1). The lanes are BoardKanban, unchanged. */
  import BoardKanban from '../BoardKanban.svelte';
  import { crewOf } from '../card-summary';
  import GreetingBand from '../GreetingBand.svelte';
  import type { BoardLayoutProps } from './types';

  let { summaries, attention, phase, vibe }: BoardLayoutProps = $props();

  const crew = $derived(crewOf(summaries));
</script>

<div class="flex h-full min-h-0 flex-col">
  <GreetingBand {phase} {vibe} needCount={attention.length} {crew} />
  <div class="flex min-h-0 flex-1">
    <div class="min-w-0 flex-1 overflow-auto"><BoardKanban /></div>
  </div>
</div>
