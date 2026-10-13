<!-- apps/web/src/lib/components/card/phone/PhoneEditForm.svelte -->
<script lang="ts">
  import { Button } from '@superjackfruit/vibekit';
  /** The edit form on a phone (not drawn: today's fields, in today's order, in the phone field style). */
  import type { CardModel } from '../card-model.svelte';
  let { model }: { model: CardModel } = $props();
  const e = $derived(model.edit);
  const id = $props.id();
</script>

<form class="fld" data-section="editForm" onsubmit={(ev) => { ev.preventDefault(); if (!e.saving) void e.save(); }}>
  <label for="et-{id}">Title</label><input id="et-{id}" class="inp" bind:value={e.title} required />
  <label for="ep-{id}">Priority</label>
  <select id="ep-{id}" class="sel" bind:value={e.priority}><option value={0}>None</option><option value={1}>P1</option><option value={2}>P2</option><option value={3}>P3</option></select>
  <label for="ed-{id}">Description</label><textarea id="ed-{id}" class="ta" rows="4" bind:value={e.desc}></textarea>
  <label for="ea-{id}">Acceptance criteria, one per line</label><textarea id="ea-{id}" class="ta" rows="4" bind:value={e.ac}></textarea>
  <label for="eu-{id}">Due</label><input id="eu-{id}" class="inp" type="date" bind:value={e.due} />
  <label for="el-{id}">Labels, comma-separated</label><input id="el-{id}" class="inp" bind:value={e.labels} placeholder="bug, frontend, urgent" disabled={e.labelsBlind} />
  {#if e.labelsBlind}<p class="muted small">Could not load this card's labels, so editing them is off; saving will not clear them. Reopen the card to retry.</p>{/if}
  <div class="addrow"><Button variant="secondary" class="sbtn" type="submit" aria-disabled={e.saving ? 'true' : undefined}>Save</Button><span class="sr" role="status">{e.saving ? 'Saving…' : ''}</span><Button variant="secondary" class="sbtn" type="button" onclick={() => e.cancel()}>Cancel</Button></div>
</form>
