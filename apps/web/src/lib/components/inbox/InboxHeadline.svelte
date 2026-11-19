<!-- apps/web/src/lib/components/inbox/InboxHeadline.svelte -->
<script lang="ts">
  /**
   * The Inbox's one message (rule 1), its signature slot (§11.6): Daylight greets in a band, Studio
   * sets the count as its figure (vibekit Hero), Paper and Quiet say it plainly. While counting it
   * says so and claims no number; after a failed read it says nothing about counts.
   */
  import { Hero, useVibe } from '@superjackfruitlabs/vibekit-ui';
  import { viewport } from '$lib/viewport.svelte';
  import type { InboxStore } from './inbox-model.svelte';
  import { CHECKING, studioHeadline, studioKicker } from './inbox-words';

  let { store }: { store: InboxStore } = $props();
  const vibe = useVibe();
  const head = $derived(store.headlineFor(vibe.current));
  const n = $derived(store.needs.length);
  const heading = $derived(viewport.phone ? 'h2' : 'h1');
  // Studio's figure needs the page's h1; on a phone the header holds it, so Studio says it plainly there.
  const figure = $derived(vibe.current === 'studio' && !viewport.phone && !store.loading && !store.failed && n > 0);
</script>

<div class="ib-head" data-signature>
  {#if store.failed}
    <svelte:element this={heading} class="ib-head__h">Inbox</svelte:element>
  {:else if store.loading}
    <svelte:element this={heading} class="ib-head__h">Inbox</svelte:element>
    <p class="ib-head__lede">{CHECKING}</p>
  {:else if figure}
    <Hero figure={n} tone="needs" size="section" kicker={studioKicker(store.boardCount, store.running.length)} headline={studioHeadline(n)} lede={head.lede} />
  {:else}
    <svelte:element this={heading} class="ib-head__h">{head.h1}</svelte:element>
    <p class="ib-head__lede">{head.lede}</p>
  {/if}
</div>
