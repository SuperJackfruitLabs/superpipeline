<!-- apps/web/src/lib/components/workspace/studio/PeopleStudio.svelte -->
<script lang="ts">
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import type { Role } from '$lib/api';
  import { PeopleModel } from '../people-model.svelte';
  import { initials, INVITE_ORDER, lastOwner, peopleHeading, ROLE_LABEL, ROLE_ORDER, roleHelpTitle, roleHint } from '../workspace-words';
  import type { WorkspaceTabProps } from '../types';

  let { review }: WorkspaceTabProps = $props();
  const model = new PeopleModel();
  // Loaded during init (ssr is off): the busy mark is held before the first paint.
  void model.refresh();
</script>

<section class="ar-sec" aria-labelledby="pt-h">
  <div class="hd"><span class="no">{review?.no ?? '01'}</span>{#if review}<span class="kick">{review.tag}</span>{/if}<h2 id="pt-h">{model.members === null ? 'People' : peopleHeading(model.members.length)}</h2></div>
  {#if model.members === null}
    <p class="ar-hint" role="status">Loading people…</p>
  {:else}
    <table class="ar-tbl wo-tbl">
      <caption class="sr">People</caption>
      <thead><tr><th scope="col">Person</th><th style="width: 160px;" scope="col">Role</th><th style="width: 54px;" scope="col"><span class="sr">Remove</span></th></tr></thead>
      <tbody>
        {#each model.members as m, i (m.userId)}
          {@const locked = lastOwner(m, model.members)}
          <tr>
            <td><div class="wo-person"><span class="ar-ini wo-ini" aria-hidden="true">{initials(m.name ?? m.email)}</span><div><b>{m.name ?? m.email}</b><span class="muted">{model.isMe(m) ? 'You' : m.email}</span></div></div></td>
            <td><label class="sr" for="pr-{i + 1}">Role</label><select class="ar-sel" id="pr-{i + 1}" title={roleHelpTitle(m.role)} value={m.role} onchange={(e) => void model.change(m, e.currentTarget.value as Role)}>{#each ROLE_ORDER as r (r)}<option value={r}>{ROLE_LABEL[r]}</option>{/each}</select></td>
            <td><button class="ar-ib wo-del" aria-label="Remove {m.name ?? m.email}" type="button" disabled={locked} title={locked ? 'A workspace needs at least one owner' : undefined} onclick={() => void model.remove(m)}><LineIcon name="trash" stroke={1.75} /></button></td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
  <form class="wo-inv" onsubmit={(e) => { e.preventDefault(); void model.invite(); }}>
    <div class="ar-field"><label for="inv-e">Invite by email</label><input class="ar-in" id="inv-e" type="email" placeholder="name@example.com" bind:value={model.email} /></div>
    <div class="ar-field"><label for="inv-r">Role</label><select class="ar-sel" id="inv-r" bind:value={model.role}>{#each INVITE_ORDER as r (r)}<option value={r}>{ROLE_LABEL[r]}</option>{/each}</select></div>
    <button class="ar-btn2" type="submit" disabled={model.busy}>Invite</button>
    <p class="ar-hint">{roleHint(model.role)}</p>
    {#if model.error}<p class="ar-hint" role="alert">{model.error}</p>{/if}
  </form>
</section>
