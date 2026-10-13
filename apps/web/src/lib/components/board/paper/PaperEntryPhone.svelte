<!-- apps/web/src/lib/components/board/paper/PaperEntryPhone.svelte -->
<script lang="ts">
  /** A short entry: in progress, coming up, shipped or closed (SP-Phone-Board-Paper `article.entry`). */
  import '../phone/phone-move.css';
  import { Button } from '@superjackfruit/vibekit';
  import type { Stage } from '$lib/api';
  import CardMoveMenu from '../CardMoveMenu.svelte';
  import type { CardSummary } from '../card-summary';
  import PhoneIcon from '$lib/components/parts/PhoneIcon.svelte';
  import { cardKeys } from '../open-label';
  import { paperEntryBy, paperEntryFacts, phoneTitleLabel } from '../phone/phone-words';
  import { app } from '$lib/stores/app.svelte';

  let { s, stages }: { s: CardSummary; stages: Stage[] } = $props();
  let moveOpen = $state(false);
  let menu = $state<ReturnType<typeof CardMoveMenu>>();
  const by = $derived(paperEntryBy(s));
</script>

<article class="entry">
  <h3><button class="lt" type="button" aria-label={phoneTitleLabel(s)} data-card-open={s.id} onclick={() => app.openCard(s.id)} onkeydown={(e) => cardKeys(e, { open: () => app.openCard(s.id), toggleMove: () => (moveOpen = !moveOpen), step: (d) => menu?.step(d) })}>{s.title}</button></h3>
  <p class="by">{#if by.em}<em>{by.em}</em>{/if}{by.rest}</p>
  <p class="facts">{#each paperEntryFacts(s) as f, i (i)}<span>{f}</span>{/each}</p>
  <div class="acts"><Button variant="ghost" aria-haspopup="menu" aria-expanded={moveOpen} aria-label="Move {s.title} to another stage" onclick={() => (moveOpen = !moveOpen)}>Move{#snippet icon()}<PhoneIcon name="move" size={16} />{/snippet}</Button></div>
  <div class="ph-mvanchor"><CardMoveMenu bind:this={menu} card={s.card} {stages} bind:open={moveOpen} bare /></div>
</article>
