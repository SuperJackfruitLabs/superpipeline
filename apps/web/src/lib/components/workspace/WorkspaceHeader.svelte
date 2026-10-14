<!-- apps/web/src/lib/components/workspace/WorkspaceHeader.svelte -->
<script lang="ts">
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import { app } from '$lib/stores/app.svelte';
  import { viewport } from '$lib/viewport.svelte';
  import { backLink } from './workspace-copy';
  import { crewTabs, workspaceCounts, type WorkspaceTab } from './workspace-counts.svelte';
  let { current, description }: { current: WorkspaceTab; description: string } = $props();
  const back = $derived(backLink(app.boardId, app.board?.name ?? null));
  const tabs = $derived(crewTabs(workspaceCounts.value));
</script>

<div style="display: flex; flex-direction: column; gap: var(--vk-space-3);">
  <a class="t-meta ws-back" href={back.href} style="display: inline-flex; align-items: center; gap: 4px; width: fit-content; color: var(--vk-color-muted);"><LineIcon name="chev-left" size={16} />{back.label}</a>
  <div style="display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--vk-space-4); justify-content: space-between;">
    <div style="display: flex; flex-direction: column; gap: 6px; min-width: 0px;">
      <p class="t-eyebrow">Crew · shared by every board</p>
      <svelte:element this={viewport.phone ? 'h2' : 'h1'} class="t-h1">Crew</svelte:element>
      <p class="t-body" style="color: var(--vk-color-muted); max-width: 70ch;">{description}</p>
    </div>
  </div>
  <div class="tabs" role="tablist" aria-label="Crew">
    {#each tabs as t (t.id)}
      <a class="tab" role="tab" aria-selected={t.id === current} href="/crew/{t.id}">{t.label}{#if t.count !== null}<span class="count">{t.count}</span>{:else}<span class="count sp-count-pending" aria-hidden="true">–</span>{/if}</a>
    {/each}
  </div>
</div>
