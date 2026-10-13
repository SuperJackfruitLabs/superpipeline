<!-- apps/web/src/lib/components/workspace/WorkspaceHeaderStudio.svelte -->
<script lang="ts">
  /** Agents opens on a figure (`wa-hero`, 120px agent count); every other tab on a plain head (`wo-head`). */
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import { app } from '$lib/stores/app.svelte';
  import { viewport } from '$lib/viewport.svelte';
  import { backLink } from './workspace-copy';
  import { workspaceCounts, workspaceTabs, type WorkspaceTab } from './workspace-counts.svelte';
  let { current, description, form }: { current: WorkspaceTab; description: string; form: 'agents' | 'other' } = $props();
  const back = $derived(backLink(app.boardId, app.board?.name ?? null));
  const tabs = $derived(workspaceTabs(workspaceCounts.value));
  const p = $derived(form === 'agents' ? 'wa' : 'wo');
  const heading = $derived(viewport.phone ? 'h2' : 'h1');
</script>

{#snippet tabRow()}
  <div class="{p}-tabs" role="tablist" aria-label="Workspace">
    {#each tabs as t (t.id)}
      <a class="ar-tab" role="tab" aria-selected={t.id === current} href="/workspace/{t.id}">{t.label}{#if t.count !== null}{#if t.signal}<span class="{p}-ct">{t.count}</span><span class="sr"> waiting on you</span>{:else}<span class="mono">{t.count}</span>{/if}{/if}</a>
    {/each}
  </div>
{/snippet}

{#if form === 'agents'}
  <div class="wa-head">
    <a class="ar-lk quiet" href={back.href}><LineIcon name="chev-left" size={16} stroke={1.75} />{back.label}</a>
    <div class="wa-hero">
      <span class="big" aria-hidden="true">{workspaceCounts.value.agents ?? ''}</span>
      <div class="txt">
        <span class="kick">Workspace · shared by every board</span>
        <svelte:element this={heading}>Workspace</svelte:element>
        <p>{description}</p>
      </div>
    </div>
    {@render tabRow()}
  </div>
{:else}
  <div class="wo-head">
    <a class="ar-lk quiet back" href={back.href}><LineIcon name="chev-left" size={16} stroke={1.75} />{back.label}</a>
    <span class="kick">Workspace · shared by every board</span>
    <svelte:element this={heading}>Workspace</svelte:element>
    <p class="lede">{description}</p>
    {@render tabRow()}
  </div>
{/if}
