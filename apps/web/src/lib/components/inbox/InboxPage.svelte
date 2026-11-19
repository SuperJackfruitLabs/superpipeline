<!-- apps/web/src/lib/components/inbox/InboxPage.svelte -->
<script lang="ts">
  /**
   * The Inbox, one composition in every vibe (composition contract §7, Inbox): the headline, the
   * board scope, the tabs (Needs you, Running, Spend, Activity, each with its count) with the Filter
   * control at the row's end and the filter row hidden under it, the tab's content, and the footer
   * line, which ends with the page's keys (rule 13). Needs you is the groups in the order of what the person must do. Outside the signature
   * slots (the headline, the scope control, the section ordinals) the markup and words are the same
   * in every vibe; each vibe's look is CSS on the vibe root (inbox.css).
   */
  import './inbox.css';
  import { Badge, Button, Tabs } from '@superjackfruitlabs/vibekit-ui';
  import { tick, untrack } from 'svelte';
  import { shellModel } from '$lib/components/shell/shell-model.svelte';
  import { app } from '$lib/stores/app.svelte';
  import { appearance } from '$lib/appearance.svelte';
  import { moveTargets } from '../operate/operate-data';
  import KeysLine from '$lib/components/shell/KeysLine.svelte';
  import { INBOX_KEYS } from '$lib/keys';
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

  /** Every Needs you row with its group, in the page's order: what O, M and R look up. */
  const entries = $derived(groups.flatMap((g) => g.items.map((item) => ({ item, group: g }))));
  let root = $state<HTMLElement | null>(null);

  /** The Needs you rows drawn now, in order (each group shows its first page): what J and K walk. */
  function drawn(): string[] {
    return [...(root?.querySelectorAll<HTMLElement>('.ib-needs .ib-row[data-row]') ?? [])].map((el) => el.dataset.row ?? '');
  }
  function select(step: 1 | -1): boolean {
    const ids = drawn();
    if (ids.length === 0) return false;
    const i = ui.selected ? ids.indexOf(ui.selected) : -1;
    ui.selected = ids[i === -1 ? 0 : Math.max(0, Math.min(ids.length - 1, i + step))] ?? null;
    queueMicrotask(() => root?.querySelector('.ib-needs .ib-row[aria-current="true"]')?.scrollIntoView?.({ block: 'nearest' }));
    return true;
  }
  /** Focus in a Needs you row (Tab) selects it, so O, M and R act on what has focus, as on the List. */
  function onfocusin(e: FocusEvent): void {
    const id = (e.target as Element | null)?.closest<HTMLElement>('.ib-needs .ib-row[data-row]')?.dataset.row;
    if (id) ui.selected = id;
  }

  /**
   * The Inbox's row keys (INBOX_KEYS): J / K pick a row, O opens its card, R opens Resume's form on a
   * row that offers Resume, M opens the Move menu on a row that offers Move. Never while typing (the
   * filter's find field), in a dialog or menu, with a modifier, or over an open dialog; a key it does not
   * use (G, F, N: the shell's) is left alone.
   */
  function onkeydown(e: KeyboardEvent): void {
    const t = e.target;
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || loading || ui.tab !== 'needs') return;
    if (t instanceof Element && t.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="menu"]')) return;
    if (app.openCardId || app.composeOpen || app.moveCardId || app.filterOpen || app.boardSwitcherOpen || app.cmdkOpen || appearance.pickerOpen) return;
    const at = entries.find((x) => x.item.id === ui.selected);
    const row = at ? rows.get(at.item.cardId) : undefined;
    switch (e.key) {
      case 'j': case 'J': if (!select(1)) return; break;
      case 'k': case 'K': if (!select(-1)) return; break;
      case 'o': case 'O': if (!at) return; store.open(at.item.cardId, at.item.boardId); break;
      case 'r': case 'R': if (!row || at?.group.key !== 'resume') return; void ui.openResume(row); break;
      case 'm': case 'M':
        if (!row || at?.group.key !== 'unclaimed' || moveTargets(row.stages, row.item.stageKey).length === 0) return;
        ui.moveOpen = at.item.id;
        break;
      default: return;
    }
    e.preventDefault();
  }

  /** An Activity row's "In Needs you": that group, in view. */
  async function showGroup(key: InboxGroupKey): Promise<void> {
    ui.tab = 'needs';
    await tick();
    document.getElementById(`ib-g-${key}`)?.scrollIntoView?.({ block: 'start' });
  }
</script>

{#snippet filterControl()}
  <Button variant="ghost" aria-expanded={filters.open && ui.tab === 'needs' ? 'true' : 'false'} aria-controls={FILTER_ROW} onclick={toggleFilter}>Filter{#if filters.active > 0}{' '}<Badge count={filters.active} needs words="{filters.active} on" />{/if}</Button>
{/snippet}

{#snippet panel(tab: InboxTab)}
  {#if loading}
    <SkeletonRows label={CHECKING} rows={4} rowHeight={72} slow={store.slow} onRetry={() => store.retry()} />
  {:else if tab === 'needs'}
    <InboxFilterRow {filters} groups={allGroups} choices={store.filterChoices} id={FILTER_ROW} />
    <section class="ib-needs" aria-labelledby="ib-needs-h">
      <h2 class="vk-visually-hidden" id="ib-needs-h">{NEEDS_HEADING}</h2>
      {#if groups.length === 0}<p class="ib-why">{store.needs.length === 0 ? NEEDS_NONE : NO_MATCH}</p>{/if}
      {#each groups as g, i (g.key)}
        <InboxGroup group={g} n={i + 1} {rows} {store} {ui} />
      {/each}
    </section>
  {:else if tab === 'running'}
    <RunningTab {store} />
  {:else if tab === 'spend'}
    <SpendTab {store} />
  {:else}
    <ActivityTab {store} {ui} onneeds={(k) => void showGroup(k)} />
  {/if}
{/snippet}

<svelte:window {onkeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="ib" aria-busy={loading ? 'true' : undefined} bind:this={root} {onfocusin}>
  <InboxHeadline {store} />
  <InboxScope pending={loading} />
  <div class="ib-tabs">
    <Tabs label="Inbox" mode="panels" {items} value={ui.tab} onchange={(v) => (ui.tab = v)} {panel} end={filterControl} />
  </div>
  {#if !loading}
    <p class="ib-foot">{footerLine({ needs: store.needs.length, running: store.running.length, spendUsd: store.spend.total, syncedAt: store.syncedAt, paused: !live.live })} <KeysLine keys={INBOX_KEYS} /></p>
  {/if}
</div>
