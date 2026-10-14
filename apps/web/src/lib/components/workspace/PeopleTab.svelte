<!-- apps/web/src/lib/components/workspace/PeopleTab.svelte -->
<script lang="ts">
  import { crewNewInPage, onCrewNew } from './crew-new';
  import { Button } from '@superjackfruit/vibekit';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import type { Role } from '$lib/api';
  import { PeopleModel } from './people-model.svelte';
  import { initials, lastOwner, peopleHeading, ROLE_LABEL, ROLE_ORDER, roleHelpTitle } from './workspace-words';
  import NewPersonDialog from './dialogs/NewPersonDialog.svelte';
  import PanelTag from './PanelTag.svelte';
  import type { WorkspaceTabProps } from './types';

  let { review }: WorkspaceTabProps = $props();
  const model = new PeopleModel();
  // Loaded during init (ssr is off): the busy mark is held before the first paint.
  void model.refresh();
  let creating = $state(false);
  function openNew(): void { model.resetNew(); creating = true; }
  $effect(() => onCrewNew('people', openNew));
</script>

{#snippet plusIcon()}<LineIcon name="plus" size={18} />{/snippet}

<section class="panel" aria-labelledby="pt-h">
  <div class="panel-head" style="flex-wrap: wrap; align-items: flex-start;">
    <div style="display: flex; flex-direction: column; align-items: flex-start; gap: inherit;">
      {#if review}<PanelTag text={review.tag} />{/if}
      <h2 class="t-h2" id="pt-h">{model.members === null ? 'People' : peopleHeading(model.members.length)}</h2>
    </div>
    {#if crewNewInPage()}<Button class="btn-sm" type="button" icon={plusIcon} style="margin-left: auto;" onclick={openNew}>New person</Button>{/if}
  </div>
  {#if model.error && !creating}<p class="hint" role="alert" style="padding: var(--vk-space-3) var(--vk-space-5) 0; color: var(--vk-color-signal-text);">{model.error}</p>{/if}
  {#if model.members === null}
    <p class="panel-body t-meta" role="status">Loading people…</p>
  {:else}
    {#each model.members as m, i (m.userId)}
      {@const locked = lastOwner(m, model.members)}
      <div class="lrow member" style="grid-template-columns: 36px minmax(0px, 1fr) 150px 44px;{i === 0 ? ' border-top: 0px;' : ''}">
        <span class="me" aria-hidden="true" style="margin: 0px;">{initials(m.name ?? m.email)}</span>
        <div><p class="t-h3">{m.name ?? m.email}</p><p class="t-meta">{model.isMe(m) ? 'You' : m.email}</p></div>
        <div class="field">
          <label class="sr" for="pr-{i + 1}">Role</label>
          <select class="input" id="pr-{i + 1}" title={roleHelpTitle(m.role)} value={m.role} onchange={(e) => void model.change(m, e.currentTarget.value as Role)}>
            {#each ROLE_ORDER as r (r)}<option value={r}>{ROLE_LABEL[r]}</option>{/each}
          </select>
        </div>
        <button class="iconbtn" aria-label="Remove {m.name ?? m.email}" type="button" disabled={locked} title={locked ? 'A workspace needs at least one owner' : undefined} onclick={() => void model.remove(m)}><LineIcon name="trash" /></button>
      </div>
    {/each}
  {/if}
</section>

<NewPersonDialog bind:open={creating} {model} />
