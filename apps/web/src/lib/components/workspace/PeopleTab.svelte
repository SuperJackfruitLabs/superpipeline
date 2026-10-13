<!-- apps/web/src/lib/components/workspace/PeopleTab.svelte -->
<script lang="ts">
  import { Button } from '@superjackfruit/vibekit';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import type { Role } from '$lib/api';
  import { PeopleModel } from './people-model.svelte';
  import { initials, INVITE_ORDER, lastOwner, peopleHeading, ROLE_LABEL, ROLE_ORDER, roleHelpTitle, roleHint } from './workspace-words';
  import PanelTag from './PanelTag.svelte';
  import type { WorkspaceTabProps } from './types';

  let { review }: WorkspaceTabProps = $props();
  const model = new PeopleModel();
  // Loaded during init (ssr is off): the busy mark is held before the first paint.
  void model.refresh();
</script>

<section class="panel" aria-labelledby="pt-h">
  <div class="panel-head" style="flex-direction: column; align-items: flex-start;">
    {#if review}<PanelTag text={review.tag} />{/if}
    <h2 class="t-h2" id="pt-h">{model.members === null ? 'People' : peopleHeading(model.members.length)}</h2>
  </div>
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
  <form class="panel-body invite" style="border-top: 1px solid var(--vk-color-line); display: grid; grid-template-columns: minmax(0px, 1fr) 150px auto; gap: var(--vk-space-2); align-items: end;" onsubmit={(e) => { e.preventDefault(); void model.invite(); }}>
    <div class="field"><label for="inv-e">Invite by email</label><input class="input" id="inv-e" type="email" placeholder="name@example.com" bind:value={model.email} /></div>
    <div class="field"><label for="inv-r">Role</label><select class="input" id="inv-r" bind:value={model.role}>{#each INVITE_ORDER as r (r)}<option value={r}>{ROLE_LABEL[r]}</option>{/each}</select></div>
    <Button variant="secondary" class="btn-sm" type="submit" aria-disabled={model.busy ? 'true' : undefined}>Invite</Button>
    <p class="hint" style="grid-column: 1 / -1;">{roleHint(model.role)}</p>
    <span class="sr" role="status">{model.busy ? 'Inviting…' : ''}</span>
    {#if model.error}<p class="hint" role="alert" style="grid-column: 1 / -1; color: var(--vk-color-signal-text);">{model.error}</p>{/if}
  </form>
</section>
