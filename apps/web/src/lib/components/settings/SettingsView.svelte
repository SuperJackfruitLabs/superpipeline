<!-- apps/web/src/lib/components/settings/SettingsView.svelte -->
<script lang="ts">
  /**
   * Settings, one composition in every vibe (composition contract, Settings): the page head (the page's
   * one `[data-signature]` slot, restyled per vibe in settings.css, same words everywhere), then the
   * sections as tabs with counts: Labels (a compact table), Connections (rows with a state label),
   * Appearance and Account (facts with one action each). The hash names the tab (`/settings#labels`);
   * `ontab` lets the route keep it in step.
   */
  import './settings.css';
  import { Tabs } from '@superjackfruitlabs/vibekit-ui';
  import { app } from '$lib/stores/app.svelte';
  import { viewport } from '$lib/viewport.svelte';
  import { LabelsModel } from '$lib/components/workspace/labels-model.svelte';
  import { ConnectionsModel } from '$lib/components/workspace/connections-model.svelte';
  import { SETTINGS_LEDE } from './account-settings-words';
  import { SETTINGS_TABS, type SettingsTab } from './settings-words';
  import LabelsTable from './LabelsTable.svelte';
  import ConnectionsList from './ConnectionsList.svelte';
  import AppearanceFacts from './AppearanceFacts.svelte';
  import AccountFacts from './AccountFacts.svelte';

  let { initial = 'labels', ontab }: { initial?: SettingsTab; ontab?: (t: SettingsTab) => void } = $props();
  // svelte-ignore state_referenced_locally
  let tab = $state<SettingsTab>(initial);
  const labels = new LabelsModel();
  const connections = new ConnectionsModel();
  // Loaded during init (ssr is off): the busy mark is held before the first paint.
  void labels.refresh();
  void connections.refresh();

  /** Connections are two rows, whatever their state. */
  const CONNECTIONS = 2;
  const counts = $derived<Partial<Record<SettingsTab, number>>>({ labels: labels.labels?.length, connections: CONNECTIONS });
  const items = $derived(SETTINGS_TABS.map((t) => ({ value: t.id, label: t.label, count: counts[t.id] })));
  const order = (t: SettingsTab) => SETTINGS_TABS.findIndex((x) => x.id === t) + 1;
  // On a phone the header's title is the page's one h1.
  const heading = $derived(viewport.phone ? 'h2' : 'h1');
  function choose(t: SettingsTab): void { tab = t; ontab?.(t); }
</script>

{#snippet panel(t: SettingsTab)}
  {#if t === 'labels'}<LabelsTable model={labels} n={order('labels')} cards={app.board?.cards ?? null} boardName={app.board?.name ?? null} />
  {:else if t === 'connections'}<ConnectionsList model={connections} n={order('connections')} />
  {:else if t === 'appearance'}<AppearanceFacts n={order('appearance')} />
  {:else}<AccountFacts n={order('account')} />{/if}
{/snippet}

<div class="page set scr-settings">
  <div class="set-head" data-signature>
    <p class="set-eyebrow">Workspace</p>
    <svelte:element this={heading} class="set-title">Settings</svelte:element>
    <p class="set-lede">{SETTINGS_LEDE}</p>
  </div>
  <Tabs label="Settings" mode="panels" {items} value={tab} onchange={choose} {panel} />
</div>
