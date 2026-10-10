<script lang="ts">
  /** Work in flight — visible today only as working cards scattered across the lanes. */
  import { app } from '$lib/stores/app.svelte';
  import AgentFace from '$lib/components/AgentFace.svelte';
  import { appearance } from '$lib/appearance.svelte';
  import { FACE_VARIANT } from '$lib/layouts';

  const running = $derived((app.board?.cards ?? []).filter((c) => c.state === 'working'));
  const stageName = $derived((key: string) => app.board?.stages.find((s) => s.key === key)?.name ?? key);
  const agentName = $derived((id: string | null) => (id ? (app.agents.find((a) => a.id === id)?.name ?? id) : '—'));
</script>

<section class="border-border bg-surface overflow-hidden rounded-[12px] border">
  <div class="border-border flex items-center gap-2 border-b px-3.5 py-2.5">
    <h2 class="text-sm font-semibold">Running</h2>
    <span class="mono text-muted-foreground text-[11px]">{running.length}</span>
  </div>

  {#if running.length === 0}
    <p class="text-muted-foreground px-3.5 py-4 text-sm">No agent is working anything right now.</p>
  {:else}
    {#each running as c (c.id)}
      <div class="border-border flex items-center gap-2.5 border-b px-3.5 py-2.5 last:border-b-0">
        {#if c.delegateAgentId}
          <AgentFace agentId={c.delegateAgentId} name={agentName(c.delegateAgentId)} iconUrl={app.agents.find((a) => a.id === c.delegateAgentId)?.iconUrl ?? null} mood="working" size={24} variant={FACE_VARIANT[appearance.value.vibe]} />
        {:else}
          <span class="text-muted-foreground w-6 shrink-0 text-center" aria-hidden="true">·</span>
        {/if}
        <button onclick={() => app.openCard(c.id)} class="min-w-0 flex-1 text-left">
          <span class="mono block truncate text-[12px]">{agentName(c.delegateAgentId ?? null)}</span>
          <span class="text-muted-foreground block truncate text-[11px]">{c.title} · {stageName(c.currentStageKey)}</span>
        </button>
        {#if c.costUsd > 0}
          <span class="mono text-muted-foreground shrink-0 text-[11px]">${c.costUsd.toFixed(2)}</span>
        {/if}
      </div>
    {/each}
  {/if}
</section>
