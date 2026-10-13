<!-- apps/web/src/lib/components/board/quiet/QuietItemPhone.svelte -->
<script lang="ts">
  /** One Quiet phone item (SP-Phone-Board-Quiet `article.it`). Plain text; no icons. */
  import '../phone/phone-move.css';
  import { Button, Face } from '@superjackfruit/vibekit';
  import type { Stage } from '$lib/api';
  import CardMoveMenu from '../CardMoveMenu.svelte';
  import type { CardSummary } from '../card-summary';
  import { cardKeys } from '../open-label';
  import { phoneTitleLabel, quietAction, quietFacts, quietMeta, quietReason } from '../phone/phone-words';
  import { app } from '$lib/stores/app.svelte';

  let { s, boardId, stages }: { s: CardSummary; boardId: string; stages: Stage[] } = $props();
  let moveOpen = $state(false);
  let menu = $state<ReturnType<typeof CardMoveMenu>>();
  const meta = $derived(quietMeta(s));
  const reason = $derived(quietReason(s));
  const action = $derived(quietAction(s));
  /** A plain click opens the drawer here; a modified click keeps the link's own behaviour (new tab). */
  function open(e: MouseEvent): void {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    app.openCard(s.id);
  }
</script>

<article class="it" class:nd={s.urgency === 'needs'} class:plain={s.urgency !== 'needs'}>
  <div class="tr">
    <h3 class="tth"><button class="tt" type="button" aria-label={phoneTitleLabel(s)} data-card-open={s.id} onclick={() => app.openCard(s.id)} onkeydown={(e) => cardKeys(e, { open: () => app.openCard(s.id), toggleMove: () => (moveOpen = !moveOpen), step: (d) => menu?.step(d) })}>{s.title}</button></h3>
    <div class="mvw"><Button variant="text" aria-haspopup="menu" aria-expanded={moveOpen} aria-label="Move {s.title} to another stage" onclick={() => (moveOpen = !moveOpen)}>Move</Button></div>
  </div>
  <div class="ph-mvanchor" style="top: 44px;"><CardMoveMenu bind:this={menu} card={s.card} {stages} bind:open={moveOpen} bare /></div>
  <p class="mt">{#if meta.face}<span class="face"><Face id={meta.face.name} label={meta.face.name} mood={meta.face.mood} size={20} /></span>{/if}{meta.text}</p>
  {#if reason}
    <p class="rs">{reason.lead}</p>
    {#if reason.more}<details class="full"><summary>Show the full reason</summary><p>{reason.more}</p></details>{/if}
  {/if}
  <p class="fs">{#each quietFacts(s) as f, i (i)}{#if f.od}<span class="od">{f.text}</span>{:else}{f.text}{/if}{/each}</p>
  {#if action === 'Answer' || action === 'Review'}
    <div class="acw"><Button variant="text" onclick={() => app.openCard(s.id)}>{action}</Button></div>
  {:else}
    <a class="ac" href="/b/{boardId}/c/{s.id}" onclick={open}>{action}</a>
  {/if}
</article>
