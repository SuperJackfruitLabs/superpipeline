<!-- apps/web/src/lib/components/card/phone/PhoneSubtasks.svelte -->
<script lang="ts">
  import { Button } from '@superjackfruit/vibekit';
  import type { CardModel } from '../card-model.svelte';
  import type { PhoneCardView } from './phone-card-words';
  let { view, model }: { view: PhoneCardView; model: CardModel } = $props();
  const id = $props.id();
</script>

<p class="muted">{view.subtasks.line}</p>
<form class="addrow" onsubmit={(e) => { e.preventDefault(); if (!model.subtasks.adding) void model.subtasks.add(); }}>
  <label class="sr" for="st-{id}">New sub-task title</label>
  <input id="st-{id}" class="inp" type="text" placeholder="Add a sub-task" bind:value={model.subtasks.title} />
  <Button variant="secondary" class="sbtn" type="submit" aria-disabled={model.subtasks.adding ? 'true' : undefined}>Add</Button><span class="sr" role="status">{model.subtasks.adding ? 'Adding…' : ''}</span>
</form>
{#if model.subtasks.error}<p class="hint" role="alert">{model.subtasks.error}</p>{/if}
