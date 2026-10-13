<!-- apps/web/src/lib/components/card/phone/PhoneRefs.svelte -->
<script lang="ts">
  import { Button } from '@superjackfruit/vibekit';
  import type { CardModel } from '../card-model.svelte';
  import type { PhoneCardView } from './phone-card-words';
  let { view, model }: { view: PhoneCardView; model: CardModel } = $props();
  const id = $props.id();
</script>

<ul class="refs">
  {#each view.refs as r (r.id)}
    <li><a class="rf" href={r.href}><b>{r.title}</b>{#if r.subtitle}<span>{r.subtitle}</span>{/if}<small class="mono">{r.source}</small></a></li>
  {/each}
</ul>
<form class="addrow" onsubmit={(e) => { e.preventDefault(); void model.refsForm.add(); }}>
  <label class="sr" for="rf-{id}">Attach a link or Superlibrary item</label>
  <input id="rf-{id}" class="inp" type="url" placeholder="Paste a link to attach" bind:value={model.refsForm.url} />
  <Button variant="secondary" class="sbtn" type="submit">Add</Button>
</form>
