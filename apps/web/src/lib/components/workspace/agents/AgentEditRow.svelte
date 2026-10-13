<!-- apps/web/src/lib/components/workspace/agents/AgentEditRow.svelte -->
<script lang="ts">
  import { Button, Face } from '@superjackfruit/vibekit';
  import type { AgentSummary } from '$lib/api';
  import { agentStatus } from '../agent-status';
  import type { AgentsModel } from '../agents-model.svelte';
  import CapabilityChips from './CapabilityChips.svelte';

  let { agent, model }: { agent: AgentSummary; model: AgentsModel } = $props();
</script>

<li class="arow arow-edit">
  <Face id={agent.name} label={agent.name} mood={agentStatus(agent).mood} size={32} src={agent.iconUrl ?? undefined} />
  <form class="editgrid" aria-label="Edit {agent.name}" aria-busy={model.saving} onsubmit={(e) => { e.preventDefault(); void model.saveEdit(); }}>
    <p class="t-h3" style="grid-column: 1 / -1;">Editing {agent.name}</p>
    <div class="field"><label for="ed-name">Name</label><input class="input" id="ed-name" bind:value={model.editName} /></div>
    <div class="field">
      <label for="ed-conc">Cards at once</label>
      <input class="input" id="ed-conc" type="number" min="1" bind:value={model.editConcurrency} />
      <p class="hint">How many cards it may hold at the same time.</p>
    </div>
    <div class="field" style="grid-column: 1 / -1;">
      <span class="lbl" id="ed-caps">Capabilities</span>
      <CapabilityChips bind:selected={() => model.editCaps, (v) => (model.editCaps = v)} bind:typed={() => model.editNewCap, (v) => (model.editNewCap = v)} registry={model.capabilities} labelledBy="ed-caps" inputId="ed-newcap" form="page" wrapInput />
      <p class="hint">Faint chips: no board stage asks for this yet, so an agent holding only it can claim nothing.</p>
    </div>
    <div class="field" style="grid-column: 1 / -1;">
      <label for="ed-av">Picture (optional)</label>
      <input class="input" id="ed-av" type="url" placeholder="https://… leave empty to keep the generated face" bind:value={model.editIcon} />
    </div>
    <div style="grid-column: 1 / -1; display: flex; gap: var(--vk-space-2);">
      <Button class="btn-sm" type="submit" disabled={model.saving || model.editName.trim() === ''}>{model.saving ? 'Saving…' : 'Save'}</Button>
      <Button class="btn-sm" variant="quiet" onclick={() => (model.editingId = null)}>Cancel</Button>
    </div>
    {#if model.error}<p class="hint" role="alert" style="grid-column: 1 / -1; color: var(--vk-color-signal-text);">{model.error}</p>{/if}
  </form>
</li>
