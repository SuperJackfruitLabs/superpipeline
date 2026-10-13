<!-- apps/web/src/lib/components/workspace/studio/ConnectionsStudio.svelte -->
<script lang="ts">
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import CapabilityChips from '../agents/CapabilityChips.svelte';
  import { ConnectionsModel } from '../connections-model.svelte';
  import type { WorkspaceTabProps } from '../types';

  let { review }: WorkspaceTabProps = $props();
  const model = new ConnectionsModel();
  // Loaded during init (ssr is off): the busy mark is held before the first paint.
  void model.refresh();
</script>

<section class="ar-sec" aria-labelledby="cn-h">
  <div class="hd"><span class="no">{review?.no ?? '01'}</span>{#if review}<span class="kick">{review.tag}</span>{/if}<h2 id="cn-h">Connections</h2></div>
  <p class="wo-lede">Where agents push code and where they come from.</p>
  {#if model.loading}
    <p class="ar-hint" role="status">Loading connections…</p>
  {:else}
    <dl class="ar-kv wo-kv">
      <dt>Forge host<span>Where agents push branches</span></dt>
      {#if model.editingForge}
        <dd><form style="display: flex; gap: 8px;" onsubmit={(e) => { e.preventDefault(); void model.saveForge(); }}><label class="sr" for="cn-forge">Forge host</label><input class="ar-in" id="cn-forge" placeholder="forge.example.com" bind:value={model.forgeInput} /><button class="ar-btn" type="submit">Save</button></form></dd>
        <dd><button class="ar-lk quiet" type="button" onclick={() => (model.editingForge = false)}>Cancel</button></dd>
      {:else}
        <dd><span class="mono">{model.forgeHost ?? 'Not set'}</span></dd>
        <dd><button class="ar-btn2" type="button" onclick={() => model.startForge()}>Change</button></dd>
      {/if}
      <dt>AgentPod fleet<span>Where your agents run</span></dt>
      {#if model.editingFleet}
        <dd><form style="display: flex; gap: 8px;" onsubmit={(e) => { e.preventDefault(); void model.saveFleet(); }}><label class="sr" for="cn-fleet">Fleet id</label><input class="ar-in" id="cn-fleet" placeholder="fleet_…" bind:value={model.fleetInput} /><button class="ar-btn" type="submit" disabled={model.saving}>Save</button></form></dd>
        <dd><button class="ar-lk quiet" type="button" onclick={() => (model.editingFleet = false)}>Cancel</button></dd>
      {:else}
        <dd>{#if model.workspace?.externalId}<p class="ok" title={model.workspace.externalId}><LineIcon name="check" stroke={1.75} />Linked</p>{:else}<span class="muted">Not linked</span>{/if}</dd>
        <dd><button class="ar-btn2" type="button" onclick={() => model.startFleet()}>Change</button></dd>
      {/if}
      <dt>Add from AgentPod<span>Bring fleet agents in as workspace agents</span></dt>
      <dd>
        {#if model.linkable.length === 0}
          <span class="serif" style="font-size: 15px;">Every agent in the fleet already has one here.</span>
        {:else}
          <div style="display: flex; flex-direction: column; gap: 8px; min-width: 0;" data-testid="hub-principal-list">
            <div class="wa-caps">{#each model.linkable as p (p.id)}<button class="wa-pick" type="button" aria-pressed={model.picked.includes(p.id)} title={p.id} onclick={() => model.togglePicked(p.id)}>{p.handle}</button>{/each}</div>
            <span class="lab" id="cn-caps">Capabilities they can claim</span>
            <CapabilityChips bind:selected={model.importCaps} bind:typed={model.importTyped} registry={model.capabilities} labelledBy="cn-caps" inputId="cn-newcap" form="studio" wrapInput />
            <button class="ar-btn" type="button" data-testid="add-picked-agents" disabled={model.importing || model.picked.length === 0 || model.importCaps.length === 0} onclick={() => void model.addPicked()}>{model.importing ? 'Adding…' : `Add ${model.picked.length || ''}`.trim()}</button>
            {#if model.importResult}<p class="ar-hint" role="alert" data-testid="import-failures">{model.importResult}</p>{/if}
          </div>
        {/if}
      </dd>
      <dd><button class="ar-btn2" type="button" data-testid="connect-hub" disabled={model.connecting} onclick={() => void model.connect()}>{model.connecting ? 'Connecting…' : 'Connect to AgentPod'}</button></dd>
    </dl>
    {#if model.forgeError}<p class="ar-hint" role="alert">{model.forgeError}</p>{/if}
    {#if model.error}<p class="ar-hint" role="alert">{model.error}</p>{/if}
  {/if}
  {#if review?.note}<p class="wo-foot">{review.note}</p>{/if}
</section>
