<!-- apps/web/src/lib/components/workspace/dialogs/NewAgentDialog.svelte -->
<script lang="ts">
  /**
   * SP-Dlg-NewAgent: the Crew page's New agent form, as a dialog over the list. The fields the edit row
   * uses (cards at once, picture), plus capabilities. No "Link to AgentPod": linking at creation needs
   * a principal id, which this page has no picker for (the API takes `externalId`, the UI never did).
   */
  import './crew-dialogs.css';
  import { Button, Dialog, Field } from '@superjackfruit/vibekit';
  import type { AgentsModel } from '../agents-model.svelte';
  import CapabilityChips from '../agents/CapabilityChips.svelte';

  let { open = $bindable(false), model }: { open?: boolean; model: AgentsModel } = $props();

  function close(): void { open = false; }
  async function create(): Promise<void> {
    if (await model.mint()) close();
  }
</script>

<Dialog bind:open title="New agent" description="An agent claims cards at the stages that ask for one of its capabilities." width="640px" frame="sectioned" class="crew-dlg" onclose={close}>
  <form class="cd-form" id="na-form" aria-busy={model.minting} onsubmit={(e) => { e.preventDefault(); void create(); }}>
    <div class="cd-row">
      <Field id="na-name" label="Name" hint="Lowercase, with a dash: role-name." placeholder="e.g. tester-tim" autocomplete="off" bind:value={model.newName} data-autofocus />
      <Field id="na-conc" label="Cards at once" type="number" min="1" hint="How many cards it may hold at the same time." bind:value={model.newConcurrency} />
    </div>
    <div class="vk-field">
      <span class="vk-field__label" id="na-caps">Capabilities</span>
      <CapabilityChips bind:selected={() => model.newCaps, (v) => (model.newCaps = v)} bind:typed={() => model.newCap, (v) => (model.newCap = v)} registry={model.capabilities} labelledBy="na-caps" inputId="na-new" form="dialog" wrapInput={false} />
      <p class="cd-hint">Faint chips: no board stage asks for this yet, so an agent holding only it can claim nothing.</p>
    </div>
    <Field id="na-av" label="Picture (optional)" type="url" placeholder="https://… leave empty for the generated face" bind:value={model.newIcon} />
    <p class="cd-hint">Creates the agent and issues its first token. You see the token once, above the list.</p>
    {#if model.createError}<p class="cd-error" role="alert">{model.createError}</p>{/if}
    <span class="vk-visually-hidden" role="status">{model.minting ? 'Creating…' : ''}</span>
  </form>
  {#snippet actions()}
    <Button variant="secondary" onclick={close}>Cancel</Button>
    <Button type="submit" form="na-form" disabled={!model.canCreate}>{model.minting ? 'Creating…' : 'Create agent and issue token'}</Button>
  {/snippet}
</Dialog>
