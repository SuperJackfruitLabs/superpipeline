<!-- apps/web/src/lib/components/workspace/WorkspaceHeader.svelte -->
<script lang="ts">
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import { app } from '$lib/stores/app.svelte';
  import { viewport } from '$lib/viewport.svelte';
  import { backLink } from './workspace-copy';
  import { workspaceCounts, workspaceTabs, type WorkspaceTab } from './workspace-counts.svelte';
  let { current, description }: { current: WorkspaceTab; description: string } = $props();
  const back = $derived(backLink(app.boardId, app.board?.name ?? null));
  const tabs = $derived(workspaceTabs(workspaceCounts.value));
</script>

<div style="display: flex; flex-direction: column; gap: var(--vk-space-3);">
  <a class="t-meta" href={back.href} style="display: inline-flex; align-items: center; gap: 4px; min-height: 32px; width: fit-content; color: var(--vk-color-muted);"><LineIcon name="chev-left" size={16} />{back.label}</a>
  <div style="display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--vk-space-4); justify-content: space-between;">
    <div style="display: flex; flex-direction: column; gap: 6px; min-width: 0px;">
      <p class="t-eyebrow">Workspace · shared by every board</p>
      <svelte:element this={viewport.phone ? 'h2' : 'h1'} class="t-h1">Workspace</svelte:element>
      <p class="t-body" style="color: var(--vk-color-muted); max-width: 70ch;">{description}</p>
    </div>
  </div>
  <div class="tabs" role="tablist" aria-label="Workspace">
    {#each tabs as t (t.id)}
      <a class="tab" role="tab" aria-selected={t.id === current} href="/workspace/{t.id}">{t.label}{#if t.count !== null}{#if t.signal}<span class="count-signal">{t.count}</span><span class="sr"> waiting on you</span>{:else}<span class="count">{t.count}</span>{/if}{/if}</a>
    {/each}
  </div>
</div>
