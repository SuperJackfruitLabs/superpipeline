<!-- apps/web/src/lib/components/workspace/ConnectionsTab.svelte -->
<script lang="ts">
  import { Button } from '@superjackfruit/vibekit';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import CapabilityChips from './agents/CapabilityChips.svelte';
  import { ConnectionsModel } from './connections-model.svelte';
  import PanelTag from './PanelTag.svelte';
  import type { WorkspaceTabProps } from './types';

  let { review }: WorkspaceTabProps = $props();
  const model = new ConnectionsModel();
  // Loaded during init (ssr is off): the busy mark is held before the first paint.
  void model.refresh();
</script>

<section class="panel" aria-labelledby="cn-h">
  <div class="panel-head" style="flex-direction: column; align-items: flex-start;">
    {#if review}<PanelTag text={review.tag} />{/if}
    <h2 class="t-h2" id="cn-h">Connections</h2>
    <p class="t-meta">Where agents push code and where they come from.</p>
  </div>
  {#if model.loading}
    <p class="panel-body t-meta" role="status">Loading connections…</p>
  {:else}
    <div class="kv">
      <div><p class="t-h3">Forge host</p><p class="t-meta">Where agents push branches</p></div>
      {#if model.editingForge}
        <form style="display: flex; gap: var(--vk-space-2);" onsubmit={(e) => { e.preventDefault(); void model.saveForge(); }}>
          <label class="sr" for="cn-forge">Forge host</label><input class="input" id="cn-forge" placeholder="forge.example.com" bind:value={model.forgeInput} />
          <Button variant="primary" class="btn-sm" type="submit">Save</Button>
        </form>
        <Button variant="quiet" class="btn-sm" type="button" onclick={() => (model.editingForge = false)}>Cancel</Button>
      {:else}
        <p class="mono">{model.forgeHost ?? 'Not set'}</p>
        <Button variant="secondary" class="btn-sm" type="button" onclick={() => model.startForge()}>Change</Button>
      {/if}
    </div>
    {#if model.forgeError}<p class="hint" role="alert" style="padding: 0 var(--vk-space-5); color: var(--vk-color-signal-text);">{model.forgeError}</p>{/if}
    <div class="kv">
      <div><p class="t-h3">AgentPod fleet</p><p class="t-meta">Where your agents run</p></div>
      {#if model.editingFleet}
        <form style="display: flex; gap: var(--vk-space-2);" onsubmit={(e) => { e.preventDefault(); void model.saveFleet(); }}>
          <label class="sr" for="cn-fleet">Fleet id</label><input class="input" id="cn-fleet" placeholder="fleet_…" bind:value={model.fleetInput} />
          <Button variant="primary" class="btn-sm" type="submit" aria-disabled={model.saving ? 'true' : undefined} data-busy={model.saving ? 'true' : undefined}>Save</Button>
        </form>
        <Button variant="quiet" class="btn-sm" type="button" onclick={() => (model.editingFleet = false)}>Cancel</Button>
      {:else}
        {#if model.workspace?.externalId}
          <p class="t-body" title={model.workspace.externalId} style="display: flex; align-items: center; gap: 6px; color: var(--vk-color-success-text);"><LineIcon name="check" size={18} />Linked</p>
        {:else}
          <p class="t-body" style="color: var(--vk-color-muted);">Not linked</p>
        {/if}
        <Button variant="secondary" class="btn-sm" type="button" onclick={() => model.startFleet()}>Change</Button>
      {/if}
    </div>
    <div class="kv">
      <div><p class="t-h3">Add from AgentPod</p><p class="t-meta">Bring fleet agents in as workspace agents</p></div>
      {#if model.linkable.length === 0}
        <p class="t-body">Every agent in the fleet already has one here.</p>
      {:else}
        <div style="display: flex; flex-direction: column; gap: var(--vk-space-2); min-width: 0;" data-testid="hub-principal-list">
          <div class="caps">{#each model.linkable as p (p.id)}<button class="chip pick" type="button" aria-pressed={model.picked.includes(p.id)} title={p.id} onclick={() => model.togglePicked(p.id)}>{p.handle}</button>{/each}</div>
          <span class="lbl" id="cn-caps">Capabilities they can claim</span>
          <CapabilityChips bind:selected={model.importCaps} bind:typed={model.importTyped} registry={model.capabilities} labelledBy="cn-caps" inputId="cn-newcap" form="page" wrapInput />
          <Button variant="primary" class="btn-sm" type="button" data-testid="add-picked-agents" aria-disabled={model.importing || model.picked.length === 0 || model.importCaps.length === 0 ? 'true' : undefined} onclick={() => void model.addPicked()}>{model.importing ? 'Adding…' : `Add ${model.picked.length || ''}`.trim()}</Button>
          {#if model.importResult}<p class="hint" role="alert" data-testid="import-failures">{model.importResult}</p>{/if}
        </div>
      {/if}
      <Button variant="secondary" class="btn-sm" type="button" data-testid="connect-hub" aria-disabled={model.connecting ? 'true' : undefined} data-busy={model.connecting ? 'true' : undefined} onclick={() => void model.connect()}>{model.connecting ? 'Connecting…' : 'Connect to AgentPod'}</Button>
    </div>
    {#if model.error}<p class="hint" role="alert" style="padding: 0 var(--vk-space-5); color: var(--vk-color-signal-text);">{model.error}</p>{/if}
    <span class="sr" role="status">{model.saving ? 'Saving the fleet…' : model.importing ? 'Adding the agents…' : model.connecting ? 'Connecting to AgentPod…' : ''}</span>
  {/if}
  {#if review?.note}<p class="t-meta" style="padding: var(--vk-space-3) var(--vk-space-5); border-top: 1px solid var(--vk-color-line);">{review.note}</p>{/if}
</section>
