<!-- apps/web/src/lib/components/plan/PlanTopRow.svelte -->
<script lang="ts">
  /**
   * The board page's own controls, drawn by the page since the shell became one composition: the
   * Board | List switch, Filter (with how many filters are on), the List's page tools, and the
   * "Showing…" line. It registers the filter, so F opens the filter dialog while it is mounted.
   * Interim and plain: the Board task replaces it with BoardTopRow.
   */
  import { Button, Tabs } from '@superjackfruitlabs/vibekit-ui';
  import type { Snippet } from 'svelte';
  import Icon from '$lib/components/parts/Icon.svelte';
  import { app } from '$lib/stores/app.svelte';
  import { shellModel as m } from '$lib/components/shell/shell-model.svelte';
  import { VIEWS, type ShellView } from '$lib/components/shell/types';

  /** The List's tools (Daylight's Group by), drawn after Filter in the List. */
  let { tools }: { tools?: Snippet } = $props();

  $effect(() => m.registerFilter());
  const items = VIEWS.map(([value, label]) => ({ value, label, href: `?view=${value}` }));
</script>

{#snippet filterIcon()}<Icon name="filter" size={16} strokeWidth={1.8} />{/snippet}

<div class="pt-row">
  <Tabs label="View" {items} value={app.view} onchange={(v: ShellView) => m.setView(v)} />
  <Button variant="secondary" icon={filterIcon} aria-haspopup="dialog" onclick={m.openFilter}>Filter cards <span class="pt-cnt">· {m.filterSummary}</span></Button>
  {#if app.view === 'list'}{@render tools?.()}{/if}
  <p class="pt-note">{m.showing}</p>
</div>

<style>
  .pt-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--vk-space-2) var(--vk-space-3); padding: var(--vk-space-2) var(--vk-space-4); }
  .pt-cnt { font-weight: 400; color: var(--vk-color-muted); }
  .pt-note { margin: 0; color: var(--vk-color-muted); }
</style>
