<!-- apps/web/src/lib/components/workspace/dialogs/NewCapabilityDialog.svelte -->
<script lang="ts">
  /**
   * SP-Dlg-NewCapability: a name (with the "similar to …" hint, live, by the server's own rule) and a
   * description. No "Agents that have it": creating a capability cannot staff it; an agent takes it
   * on from Crew · Agents.
   */
  import './crew-dialogs.css';
  import { Button, Dialog, Field } from '@superjackfruit/vibekit';
  import type { CapabilitiesModel } from '../capabilities-model.svelte';
  import { similarText } from '../workspace-words';

  let { open = $bindable(false), model }: { open?: boolean; model: CapabilitiesModel } = $props();
  const hint = $derived(model.typedSimilar.length > 0 ? similarText(model.typedSimilar) : 'If the name is close to one you have, a “similar to …” hint appears here.');

  function close(): void { open = false; }
  async function create(): Promise<void> {
    if (await model.add()) close();
  }
</script>

<Dialog bind:open title="New capability" description="A board stage asks for a capability; an agent holding it claims the card." width="600px" frame="sectioned" class="crew-dlg" onclose={close}>
  <form class="cd-form" id="nc-cap-form" onsubmit={(e) => { e.preventDefault(); void create(); }}>
    <Field id="cap-new" label="Name" placeholder="e.g. diagnostics" autocomplete="off" {hint} bind:value={model.newKey} data-autofocus />
    <Field id="cap-desc" label="Description (optional)" control="textarea" rows={3} bind:value={model.newDescription} />
    <p class="cd-hint">You give it to agents from Crew · Agents. Until a board stage asks for it, it lets no agent claim anything.</p>
    {#if model.createError}<p class="cd-error" role="alert">{model.createError}</p>{/if}
  </form>
  {#snippet actions()}
    <Button variant="secondary" onclick={close}>Cancel</Button>
    <Button type="submit" form="nc-cap-form" disabled={model.newKey.trim() === ''}>Create capability</Button>
  {/snippet}
</Dialog>
