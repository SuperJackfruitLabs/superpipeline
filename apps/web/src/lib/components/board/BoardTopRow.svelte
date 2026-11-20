<!-- apps/web/src/lib/components/board/BoardTopRow.svelte -->
<script lang="ts">
  /**
   * The board page's top row: Board | List, Filter (with how many filters are on) and what is shown,
   * the List's own tools, and on the board one attention line. It registers the filter, so F opens
   * the filter dialog while it is mounted. The same in every vibe.
   */
  import { Button, Tabs } from '@superjackfruitlabs/vibekit-ui';
  import type { Snippet } from 'svelte';
  import Icon from '$lib/components/parts/Icon.svelte';
  import { app, type CardFilters } from '$lib/stores/app.svelte';
  import { activeFilterCount } from '$lib/stores/card-filters';
  import { filterSummary } from '$lib/components/shell/shell-words';
  import { shellModel as m } from '$lib/components/shell/shell-model.svelte';
  import { VIEWS, type ShellView } from '$lib/components/shell/types';

  let { filters, attention, tools }: {
    filters: CardFilters;
    /** The board's attention line; "Show the first" appears while a card here wants you. */
    attention?: { text: string; needs: number; onfirst: () => void };
    /** The List's tools, drawn after Filter in the List. */
    tools?: Snippet;
  } = $props();

  $effect(() => m.registerFilter());
  const items = VIEWS.map(([value, label]) => ({ value, label, href: `?view=${value}` }));
</script>

{#snippet filterIcon()}<Icon name="filter" size={16} strokeWidth={1.8} />{/snippet}

<div class="bv-top">
  <Tabs label="View" {items} value={app.view} onchange={(v: ShellView) => m.setView(v)} />
  <Button variant="secondary" size="sm" icon={filterIcon} aria-haspopup="dialog" onclick={m.openFilter}>Filter cards <span class="bv-cnt">· {filterSummary(activeFilterCount(filters))}</span></Button>
  {@render tools?.()}
  <p class="bv-showing">{m.showing}</p>
  {#if attention}
    <p class="bv-attn" data-needs={attention.needs > 0 ? '1' : '0'}>
      <b>{attention.text}</b>
      {#if attention.needs > 0}<Button variant="text" size="sm" onclick={attention.onfirst}>Show the first</Button>{/if}
    </p>
  {/if}
</div>
