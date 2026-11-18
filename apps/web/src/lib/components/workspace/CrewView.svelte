<!-- apps/web/src/lib/components/workspace/CrewView.svelte -->
<script lang="ts">
  /**
   * Crew, one composition in every vibe (composition contract, Crew): the page head (one-line lede and
   * one "How agents pick cards" link), the Agents / People / Capabilities tabs with their counts, and
   * the current tab's table. The head is the page's one `[data-signature]` slot: each vibe restyles it
   * in crew.css, and no words differ between vibes anywhere.
   */
  import './crew.css';
  import { Button, Tabs } from '@superjackfruitlabs/vibekit-ui';
  import { viewport } from '$lib/viewport.svelte';
  import { crewLists, crewTabs, workspaceCounts, type CrewTab } from './workspace-counts.svelte';
  import { CREW_NEW_LABEL, crewNewInPage, requestCrewNew } from './crew-new';
  import { CREW_EYEBROW, CREW_HELP, CREW_LEDE } from './workspace-words';
  import AgentsTable from './AgentsTable.svelte';
  import PeopleTable from './PeopleTable.svelte';
  import CapabilitiesTable from './CapabilitiesTable.svelte';

  let { tab }: { tab: CrewTab } = $props();
  const items = $derived(crewTabs(workspaceCounts.value).map((t) => ({ value: t.id, label: t.label, count: t.count ?? undefined, href: `/crew/${t.id}` })));
  // On a phone the header's title is the page's one h1.
  const heading = $derived(viewport.phone ? 'h2' : 'h1');
  // An empty tab's sentence carries its one New action; the page then draws no second one.
  const list = $derived(tab === 'agents' ? crewLists.agents : tab === 'people' ? crewLists.members : crewLists.capabilities);
  const pageNew = $derived(crewNewInPage() && list?.length !== 0);
</script>

<div class="crew">
  <div class="crew-head" data-signature>
    <p class="crew-eyebrow">{CREW_EYEBROW}</p>
    <svelte:element this={heading} class="crew-title">Crew</svelte:element>
    <p class="crew-lede">{CREW_LEDE} <a class="crew-help" href={CREW_HELP.href} target="_blank" rel="noopener">{CREW_HELP.label}</a></p>
  </div>
  {#if pageNew}<div class="crew-new"><Button onclick={() => requestCrewNew(tab)}>{CREW_NEW_LABEL[tab]}</Button></div>{/if}
  <Tabs label="Crew" {items} value={tab} />
  <div class="crew-body">
    {#key tab}
      {#if tab === 'agents'}<AgentsTable />{:else if tab === 'people'}<PeopleTable />{:else}<CapabilitiesTable />{/if}
    {/key}
  </div>
</div>
