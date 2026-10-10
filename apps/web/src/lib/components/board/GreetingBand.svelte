<script lang="ts">
  /** Daylight's sky over the board: the greeting, how many cards want you, and who is working. */
  import { greeting, Sky, type Mood, type Phase, type Vibe } from '@superjackfruit/vibekit';
  import AgentFace from '$lib/components/AgentFace.svelte';
  import { wantYou } from '$lib/copy';

  let { phase, vibe, needCount, crew }: { phase: Phase; vibe: Vibe; needCount: number; crew: Array<{ id: string; name: string; iconUrl: string | null; mood: Mood }> } = $props();
  const shown = $derived(crew.slice(0, 5));
</script>

<Sky {phase}>
  <div class="flex min-h-[56px] flex-wrap items-center gap-3">
    <p class="font-display text-lg leading-tight">{greeting(phase, vibe)} {wantYou(needCount, vibe)}</p>
    {#if crew.length > 0}
      <ul class="ml-auto flex items-center gap-1" aria-label="Agents holding cards">
        {#each shown as a (a.id)}<li><AgentFace agentId={a.id} name={a.name} iconUrl={a.iconUrl} mood={a.mood} size={32} variant="mood" /></li>{/each}
        {#if crew.length > shown.length}<li class="text-sm">+{crew.length - shown.length}</li>{/if}
      </ul>
    {/if}
  </div>
</Sky>
