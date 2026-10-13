<!-- apps/web/src/lib/components/board/paper/PaperLetterPhone.svelte -->
<script lang="ts">
  /** A letter that needs a reply (SP-Phone-Board-Paper `article.letter`). */
  import '../phone/phone-move.css';
  import { Button, Face } from '@superjackfruit/vibekit';
  import type { Stage } from '$lib/api';
  import CardMoveMenu from '../CardMoveMenu.svelte';
  import type { CardSummary } from '../card-summary';
  import PhoneIcon from '$lib/components/parts/PhoneIcon.svelte';
  import { cardKeys } from '../open-label';
  import { clampWatch } from '../phone/clamp';
  import { actionWord, paperFacts, paperQuote, paperSig, phoneTitleLabel } from '../phone/phone-words';
  import { app } from '$lib/stores/app.svelte';

  let { s, stages }: { s: CardSummary; stages: Stage[] } = $props();
  let moveOpen = $state(false);
  let clamped = $state(false);
  let expanded = $state(false);
  let menu = $state<ReturnType<typeof CardMoveMenu>>();
  const sig = $derived(paperSig(s));
</script>

<article class="letter">
  <h3><button class="lt" type="button" aria-label={phoneTitleLabel(s)} data-card-open={s.id} onclick={() => app.openCard(s.id)} onkeydown={(e) => cardKeys(e, { open: () => app.openCard(s.id), toggleMove: () => (moveOpen = !moveOpen), step: (d) => menu?.step(d) })}>{s.title}</button></h3>
  <p class="q" class:open={expanded} use:clampWatch={(v) => (clamped = v)}>{paperQuote(s)}</p>
  {#if clamped || expanded}<button class="rest" type="button" aria-expanded={expanded} onclick={() => (expanded = !expanded)}>{expanded ? 'Show less' : 'Read the rest'}</button>{/if}
  <p class="sig-line">
    <span class="portrait">{#if sig.face}<Face id={sig.face.name} label={sig.face.name} mood={sig.face.mood} size={24} />{/if}</span>
    <em>{sig.em}</em>{sig.rest}
  </p>
  <p class="facts">
    {#each paperFacts(s) as f, i (i)}<span class={f.cls} title={f.title}>{f.text}</span>{/each}
  </p>
  <div class="acts">
    <Button variant="signal" onclick={() => app.openCard(s.id)}>{actionWord(s)}</Button>
    <Button variant="ghost" aria-haspopup="menu" aria-expanded={moveOpen} aria-label="Move {s.title} to another stage" onclick={() => (moveOpen = !moveOpen)}>Move{#snippet icon()}<PhoneIcon name="move" size={16} />{/snippet}</Button>
  </div>
  <div class="ph-mvanchor"><CardMoveMenu bind:this={menu} card={s.card} {stages} bind:open={moveOpen} bare /></div>
</article>
