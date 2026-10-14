<!-- apps/web/src/lib/components/workspace/dialogs/NewPersonDialog.svelte -->
<script lang="ts">
  /**
   * SP-Dlg-NewPerson: add someone to the workspace. Name, email and role are what the members API
   * records; there is no invite note, because nothing stores or shows one. Every role the API knows is
   * offered, as radio cards, so the dialog never takes away a choice the old form had.
   */
  import './crew-dialogs.css';
  import { Button, Choice, Dialog, Field } from '@superjackfruit/vibekit';
  import type { PeopleModel } from '../people-model.svelte';
  import { INVITE_ORDER, ROLE_HELP, ROLE_LABEL } from '../workspace-words';

  let { open = $bindable(false), model }: { open?: boolean; model: PeopleModel } = $props();
  const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1) + '.';

  function close(): void { open = false; }
  async function add(): Promise<void> {
    if (await model.invite()) close();
  }
</script>

<Dialog bind:open title="New person" description="Add someone who decides at gates and answers agents that wait on them." width="600px" frame="sectioned" class="crew-dlg" onclose={close}>
  <form class="cd-form" id="np-form" aria-busy={model.busy} onsubmit={(e) => { e.preventDefault(); void add(); }}>
    <div class="cd-row2">
      <Field id="np-name" label="Name (optional)" autocomplete="off" bind:value={model.name} data-autofocus />
      <Field id="np-email" label="Email" type="email" placeholder="name@example.com" autocomplete="off" bind:value={model.email} />
    </div>
    <fieldset class="vk-field cd-set">
      <legend class="vk-field__label">Role</legend>
      <div class="cd-roles">
        {#each INVITE_ORDER as r (r)}
          <Choice type="radio" card name="np-role" value={r} label={ROLE_LABEL[r]} description={sentence(ROLE_HELP[r])} bind:group={model.role} />
        {/each}
      </div>
    </fieldset>
    <p class="cd-hint">No email is sent. They sign in with this address and find the workspace waiting.</p>
    {#if model.error}<p class="cd-error" role="alert">{model.error}</p>{/if}
    <span class="vk-visually-hidden" role="status">{model.busy ? 'Adding…' : ''}</span>
  </form>
  {#snippet actions()}
    <Button variant="secondary" onclick={close}>Cancel</Button>
    <Button type="submit" form="np-form" disabled={model.busy}>Add person</Button>
  {/snippet}
</Dialog>
