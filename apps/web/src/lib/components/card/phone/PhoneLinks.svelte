<!-- apps/web/src/lib/components/card/phone/PhoneLinks.svelte -->
<script lang="ts">
  import PhoneIcon from '$lib/components/parts/PhoneIcon.svelte';
  import LinkAddForm from '../LinkAddForm.svelte';
  import type { CardModel } from '../card-model.svelte';
  import type { PhoneCardView } from './phone-card-words';
  let { view, model }: { view: PhoneCardView; model: CardModel } = $props();
</script>

{#if view.links.length}
  <ul class="refs">
    {#each view.links as l (l.key)}
      <li><a class="rf" href={l.href}><b>{l.title}</b><span>{l.label}</span></a><button class="lnk" type="button" onclick={() => model.links.remove(l.remove)}>Remove</button></li>
    {/each}
  </ul>
{:else}
  <p class="muted">Nothing blocks this card and it blocks nothing.</p>
{/if}
<button class="lnk" type="button" onclick={() => model.links.openAdd()}><PhoneIcon name="plus" />Add link</button>
<LinkAddForm {model} />
