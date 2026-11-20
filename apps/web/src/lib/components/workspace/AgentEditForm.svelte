<!-- apps/web/src/lib/components/workspace/AgentEditForm.svelte -->
<script lang="ts">
  /** Edit agent, opened from a row's actions menu: name, cards at once, capabilities and picture. */
  import { Button } from '@superjackfruitlabs/vibekit-ui';
  import type { AgentSummary } from '$lib/api';
  import type { AgentsModel } from './agents-model.svelte';
  import CapabilityChips from './agents/CapabilityChips.svelte';

  let { agent, model }: { agent: AgentSummary; model: AgentsModel } = $props();
</script>

<form class="crew-form crew-edit" aria-label="Edit {agent.name}" aria-busy={model.saving} onsubmit={(e) => { e.preventDefault(); void model.saveEdit(); }}>
  <p class="crew-form-title crew-wide">Editing {agent.name}</p>
  <div class="crew-field"><label for="ed-name">Name</label><input class="vk-field__input" id="ed-name" bind:value={model.editName} /></div>
  <div class="crew-field">
    <label for="ed-conc">Cards at once</label>
    <input class="vk-field__input" id="ed-conc" type="number" min="1" bind:value={model.editConcurrency} />
    <p class="crew-hint">How many cards it may hold at the same time.</p>
  </div>
  <div class="crew-field crew-wide">
    <span class="crew-label" id="ed-caps">Capabilities</span>
    <CapabilityChips bind:selected={() => model.editCaps, (v) => (model.editCaps = v)} bind:typed={() => model.editNewCap, (v) => (model.editNewCap = v)} registry={model.capabilities} labelledBy="ed-caps" inputId="ed-newcap" form="dialog" wrapInput />
    <p class="crew-hint">Faint chips: no board stage asks for this yet, so an agent holding only it can claim nothing.</p>
  </div>
  <div class="crew-field crew-wide">
    <label for="ed-av">Picture (optional)</label>
    <input class="vk-field__input" id="ed-av" type="url" placeholder="https://… leave empty to keep the generated face" bind:value={model.editIcon} />
  </div>
  <div class="crew-form-acts crew-wide">
    <Button type="submit" disabled={model.saving || model.editName.trim() === ''}>{model.saving ? 'Saving…' : 'Save'}</Button>
    <Button variant="quiet" onclick={() => (model.editingId = null)}>Cancel</Button>
  </div>
  {#if model.error}<p class="crew-error crew-wide" role="alert">{model.error}</p>{/if}
</form>
