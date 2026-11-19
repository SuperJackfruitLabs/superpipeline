<!-- apps/web/src/lib/components/inbox/InboxPage.svelte -->
<script lang="ts">
  /**
   * The Inbox, one composition in every vibe (composition contract §7, Inbox): the headline, the
   * board scope, the tabs (Needs you, Running, Spend, Activity, each with its count) with the Filter
   * control at the row's end and the filter row hidden under it, the tab's content, and the footer
   * line. Needs you is the groups in the order of what the person must do. Outside the signature
   * slots (the headline, the scope control, the section ordinals) the markup and words are the same
   * in every vibe; each vibe's look is CSS on the vibe root (inbox.css).
   */
  import './inbox.css';
  import { Badge, Button, Tabs } from '@superjackfruitlabs/vibekit-ui';
  import { tick, untrack } from 'svelte';
  import { shellModel } from '$lib/components/shell/shell-model.svelte';
  import SkeletonRows from '$lib/components/parts/SkeletonRows.svelte';
  import type { LiveUpdates } from '$lib/live/live-updates.svelte';
  import { usd } from '../operate/operate-words';
  import type { InboxFilters } from './inbox-filters.svelte';
  import { inboxGroups, type InboxGroupKey } from './inbox-groups';
  import type { InboxStore } from './inbox-model.svelte';
  import { InboxUi, type InboxTab } from './inbox-ui.svelte';
  import { CHECKING, footerLine, NEEDS_HEADING, NEEDS_NONE, NO_MATCH } from './inbox-words';
  import InboxHeadline from './InboxHeadline.svelte';
  import InboxScope from './InboxScope.svelte';
  import InboxFilterRow from './InboxFilterRow.svelte';
  import InboxGroup from './InboxGroup.svelte';
  import RunningTab from './tabs/RunningTab.svelte';
  import SpendTab from './tabs/SpendTab.svelte';
  import ActivityTab from './tabs/ActivityTab.svelte';

  /** `ui` (the tab, an open resume form): InboxView owns it, so the counted frame that replaces the waiting one keeps it. */
  let { store, filters, live, ui: given }: { store: InboxStore; filters: InboxFilters; live: LiveUpdates; ui?: InboxUi } = $props();
  const ui = untrack(() => given) ?? new InboxUi(() => store);
  const FILTER_ROW = 'ib-filter-row';

  const loading = $derived(store.loading);
  const groups = $derived(store.needGroups);
  /** Every group before the filters: the chips' counts. */
  const allGroups = $derived(inboxGroups(store.needs.map((r) => r.item)));
  const rows = $derived(new Map(store.needs.map((r) => [r.item.cardId, r])));
  const dash = '–';
  const items = $derived<{ value: InboxTab; label: string; count: number | string }[]>([
    { value: 'needs', label: 'Needs you', count: loading ? dash : store.needs.length },
    { value: 'running', label: 'Running', count: loading ? dash : store.running.length },
    { value: 'spend', label: 'Spend', count: loading ? dash : usd(store.spend.total) },
    { value: 'activity', label: 'Activity', count: loading ? dash : store.unread },
  ]);

  /** The Filter control (and F): the filters narrow Needs you, so it opens there. */
  async function openFilter(): Promise<void> {
    ui.tab = 'needs';
    filters.open = true;
    await tick();
    document.querySelector<HTMLInputElement>(`#${FILTER_ROW} input`)?.focus();
  }
  function toggleFilter(): void {
    if (filters.open && ui.tab === 'needs') filters.open = false;
    else void openFilter();
  }
  $effect(() => shellModel.registerFilter(() => void openFilter()));

  /** An Activity row's "In Needs you": that group, in view. */
  async function showGroup(key: InboxGroupKey): Promise<void> {
    ui.tab = 'needs';
    await tick();
    document.getElementById(`ib-g-${key}`)?.scrollIntoView?.({ block: 'start' });
  }
</script>

{#snippet filterControl()}
  <Button variant="ghost" size="sm" aria-expanded={filters.open && ui.tab === 'needs' ? 'true' : 'false'} aria-controls={FILTER_ROW} onclick={toggleFilter}>Filter{#if filters.active > 0}{' '}<Badge count={filters.active} needs words="{filters.active} on" />{/if}</Button>
{/snippet}

{#snippet panel(tab: InboxTab)}
  {#if loading}
    <SkeletonRows label={CHECKING} rows={4} rowHeight={72} slow={store.slow} onRetry={() => store.retry()} />
  {:else if tab === 'needs'}
    <InboxFilterRow {filters} groups={allGroups} choices={store.filterChoices} id={FILTER_ROW} />
    <h2 class="vk-visually-hidden">{NEEDS_HEADING}</h2>
    {#if groups.length === 0}<p class="ib-why">{store.needs.length === 0 ? NEEDS_NONE : NO_MATCH}</p>{/if}
    {#each groups as g, i (g.key)}
      <InboxGroup group={g} n={i + 1} {rows} {store} {ui} />
    {/each}
  {:else if tab === 'running'}
    <RunningTab {store} />
  {:else if tab === 'spend'}
    <SpendTab {store} />
  {:else}
    <ActivityTab {store} {ui} onneeds={(k) => void showGroup(k)} />
  {/if}
{/snippet}

<div class="ib" aria-busy={loading ? 'true' : undefined}>
  <InboxHeadline {store} />
  <InboxScope pending={loading} />
  <div class="ib-tabs">
    <Tabs label="Inbox" mode="panels" {items} value={ui.tab} onchange={(v) => (ui.tab = v)} {panel} end={filterControl} />
  </div>
  {#if !loading}
    <p class="ib-foot">{footerLine({ needs: store.needs.length, running: store.running.length, spendUsd: store.spend.total, syncedAt: store.syncedAt, paused: !live.live, queued: live.queued.length })}</p>
  {/if}
</div>
