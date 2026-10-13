<!-- apps/web/src/lib/components/workspace/NeedsYouTab.svelte -->
<script lang="ts">
  import { untrack } from 'svelte';
  import { Button } from '@superjackfruit/vibekit';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import { NeedsModel } from './needs-model.svelte';
  import { needsHeadMeta, unansweredFoot } from './needs-row';
  import PanelTag from './PanelTag.svelte';
  import WorkspaceNeedsRow from './WorkspaceNeedsRow.svelte';
  import type { WorkspaceTabProps } from './types';

  let { review, initial }: WorkspaceTabProps = $props();
  const model = new NeedsModel(untrack(() => initial));
  // Loaded during init (ssr is off): the busy mark is held before the first paint.
  void model.load();
  const foot = $derived(model.unanswered > 0 ? unansweredFoot(model.unanswered) : (review?.note ?? null));
</script>

{#snippet refreshIcon()}<LineIcon name="refresh" />{/snippet}

<section class="panel" aria-labelledby="nt-h">
  <div class="panel-head">
    {#if review}<PanelTag text={review.tag} />{/if}
    <h2 class="t-h2" id="nt-h" style="flex-basis: 100%;">Waiting on you, across every board{#if model.cards !== null}{' '}{#if model.items.length > 0}<span class="count-signal" style="vertical-align: middle;">{model.items.length}</span>{:else}<span class="count" style="vertical-align: middle;">0</span>{/if}{/if}</h2>
    {#if model.cards !== null}<p class="t-meta" style="flex: 1 1 0%;">{needsHeadMeta(model.unanswered)}</p>{/if}
    <Button variant="secondary" class="btn-sm" type="button" icon={refreshIcon} aria-disabled={model.refreshing && model.cards !== null ? 'true' : undefined} onclick={() => { if (!model.refreshing) void model.load(); }}>{model.refreshing && model.cards !== null ? 'Refreshing…' : 'Refresh'}</Button>
  </div>
  {#if model.error}
    <p class="panel-body t-meta" role="alert">Could not load what is waiting: {model.error}</p>
  {:else if model.cards === null}
    <p class="panel-body t-meta" role="status">Loading…</p>
  {:else if model.items.length === 0}
    <p class="panel-body t-body">Nothing on any board is waiting on you.</p>
  {:else}
    <ol style="list-style: none; margin: 0px; padding: 0px;">
      {#each model.items as item (item.id)}<WorkspaceNeedsRow {item} {model} />{/each}
    </ol>
  {/if}
  {#if foot}<p class="t-meta" style="padding: var(--vk-space-3) var(--vk-space-5); border-top: 1px solid var(--vk-color-line);">{foot}</p>{/if}
</section>
