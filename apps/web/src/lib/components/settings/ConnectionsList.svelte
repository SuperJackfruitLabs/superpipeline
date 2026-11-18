<!-- apps/web/src/lib/components/settings/ConnectionsList.svelte -->
<script lang="ts">
  /**
   * Connections (composition contract, Settings; moved out of Crew, spec §7): one row per connection,
   * the forge agents push to and the AgentPod fleet they come from, each with a state label and
   * Manage. Manage opens that row's editor: the forge host; the fleet id, Connect to AgentPod and
   * bringing fleet agents in as workspace agents. Everything the old Crew tab did lives here.
   */
  import { Button, SectionHeader, StateLabel } from '@superjackfruitlabs/vibekit-ui';
  import SkeletonRows from '$lib/components/parts/SkeletonRows.svelte';
  import LoadFailed from '$lib/components/parts/LoadFailed.svelte';
  import CapabilityChips from '$lib/components/workspace/agents/CapabilityChips.svelte';
  import type { ConnectionsModel } from '$lib/components/workspace/connections-model.svelte';

  let { model, n }: { model: ConnectionsModel; n: number } = $props();
  let managing = $state<'forge' | 'agentpod' | null>(null);
  function manage(which: 'forge' | 'agentpod'): void {
    managing = managing === which ? null : which;
    if (managing === 'forge') model.startForge();
    if (managing === 'agentpod') model.startFleet();
  }
  async function saveForge(): Promise<void> {
    await model.saveForge();
    if (!model.editingForge) managing = null;
  }
  async function saveFleet(): Promise<void> {
    await model.saveFleet();
    if (!model.editingFleet) managing = null;
  }
  const linked = $derived(!!model.workspace?.externalId);
</script>

<section class="set-sec">
  <SectionHeader {n} title="Connections" meta="Where agents push code and where they come from." />
  {#if model.load.phase === 'failed'}
    <LoadFailed message="Couldn't load connections." onRetry={() => model.retry()} />
  {:else if model.loading}
    <SkeletonRows label="Loading connections…" rows={2} rowHeight={56} slow={model.load.phase === 'slow'} onRetry={() => model.retry()} />
  {:else}
    <ul class="set-rows">
      <li class="set-row" data-row="Forge">
        <div class="set-row-main">
          <p class="set-row-title">Forge</p>
          <p class="set-row-meta">
            {#if model.forgeHost}<StateLabel state="done" label="Connected" /> <span class="set-mono">{model.forgeHost}</span> · agents push branches here
            {:else}<StateLabel state="off" label="Not set" /> Agents push branches to the forge you name here.{/if}
          </p>
        </div>
        <Button variant="quiet" type="button" aria-expanded={managing === 'forge'} onclick={() => manage('forge')}>Manage</Button>
        {#if managing === 'forge'}
          <form class="set-manage" onsubmit={(e) => { e.preventDefault(); void saveForge(); }}>
            <div class="field"><label for="cn-forge">Forge host</label><input class="input" id="cn-forge" placeholder="forge.example.com" bind:value={model.forgeInput} /></div>
            <Button variant="secondary" type="submit">Save</Button>
            <Button variant="quiet" type="button" onclick={() => { model.editingForge = false; managing = null; }}>Cancel</Button>
            {#if model.forgeError}<p class="set-error" role="alert">{model.forgeError}</p>{/if}
          </form>
        {/if}
      </li>
      <li class="set-row" data-row="AgentPod">
        <div class="set-row-main">
          <p class="set-row-title">AgentPod</p>
          <p class="set-row-meta">
            {#if linked}<StateLabel state="done" label="Linked" /> Your agents run in this fleet
            {:else}<StateLabel state="off" label="Not linked" /> Link the fleet your agents run in{/if}
          </p>
        </div>
        <Button variant="quiet" type="button" aria-expanded={managing === 'agentpod'} onclick={() => manage('agentpod')}>Manage</Button>
        {#if managing === 'agentpod'}
          <div class="set-manage">
            <form class="set-form" onsubmit={(e) => { e.preventDefault(); void saveFleet(); }}>
              <div class="field"><label for="cn-fleet">Fleet id</label><input class="input" id="cn-fleet" placeholder="fleet_…" bind:value={model.fleetInput} /></div>
              <Button variant="secondary" type="submit" busy={model.saving}>Save</Button>
              <Button variant="secondary" type="button" data-testid="connect-hub" busy={model.connecting} onclick={() => void model.connect()}>{model.connecting ? 'Connecting…' : 'Connect to AgentPod'}</Button>
            </form>
            <div class="set-import">
              <p class="set-row-title">Add from AgentPod</p>
              {#if model.linkable.length === 0}
                <p class="set-row-meta">Every agent in the fleet already has one here.</p>
              {:else}
                <div class="set-import-body" data-testid="hub-principal-list">
                  <div class="caps">{#each model.linkable as p (p.id)}<button class="chip pick" type="button" aria-pressed={model.picked.includes(p.id)} title={p.id} onclick={() => model.togglePicked(p.id)}>{p.handle}</button>{/each}</div>
                  <span class="lbl" id="cn-caps">Capabilities they can claim</span>
                  <CapabilityChips bind:selected={model.importCaps} bind:typed={model.importTyped} registry={model.capabilities} labelledBy="cn-caps" inputId="cn-newcap" form="page" wrapInput />
                  <div><Button variant="secondary" type="button" data-testid="add-picked-agents" aria-disabled={model.importing || model.picked.length === 0 || model.importCaps.length === 0 ? 'true' : undefined} onclick={() => void model.addPicked()}>{model.importing ? 'Adding…' : `Add ${model.picked.length || ''}`.trim()}</Button></div>
                  {#if model.importResult}<p class="set-error" role="alert" data-testid="import-failures">{model.importResult}</p>{/if}
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </li>
    </ul>
    {#if model.error}<p class="set-error" role="alert">{model.error}</p>{/if}
    <span class="sr" role="status">{model.saving ? 'Saving the fleet…' : model.importing ? 'Adding the agents…' : model.connecting ? 'Connecting to AgentPod…' : ''}</span>
  {/if}
</section>
