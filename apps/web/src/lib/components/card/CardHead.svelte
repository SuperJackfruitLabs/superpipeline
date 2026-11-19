<!-- apps/web/src/lib/components/card/CardHead.svelte -->
<script lang="ts">
  /**
   * The card's head: the crumb (board · stage · card 4605), the title, and the tools (Open in new
   * window, Edit card, Close). Editing opens the form under the title; a failed action says so here.
   * The empty `[data-signature]` rule is the card's one per-vibe slot (§11.6): each vibe draws its
   * headline mark there in card.css, never words.
   */
  import { Button } from '@superjackfruitlabs/vibekit-ui';
  import type { CardModel, CardSurface } from './card-model.svelte';
  import CardEditForm from './CardEditForm.svelte';
  import { cardCrumb } from './card-words';

  let { model: m, surface, onClose, boardHref, pageHref }: { model: CardModel; surface: CardSurface | 'phone'; onClose?: () => void; boardHref: string; pageHref: string } = $props();
  const card = $derived(m.card!);
</script>

<header class="cv-head" data-block="head">
  <div class="cv-sig" data-signature></div>
  <p class="cv-crumb">{cardCrumb(m.boardName, m.stageName, m.shortId)}</p>
  <svelte:element this={surface === 'page' ? 'h1' : 'h2'} class="cv-title" id={surface === 'gallery' ? undefined : 'drawer-title'}>{card.title}</svelte:element>
  <div class="cv-tools">
    {#if surface === 'drawer' || surface === 'phone'}<Button variant="tool" href={pageHref} target="_blank" rel="noopener">Open in new window</Button>{/if}
    <Button variant="tool" pressed={m.edit.editing} data-section="editButton" onclick={() => m.edit.start()}>Edit card</Button>
    {#if surface === 'page'}<Button variant="tool" href={boardHref}>Close</Button>
    {:else if onClose}<Button variant="tool" aria-label="Close (Esc)" onclick={() => onClose()}>Close</Button>{/if}
  </div>
  {#if m.edit.editing}<div class="cv-edit" data-section="editForm"><CardEditForm model={m} /></div>{:else}<span hidden data-section="editForm"></span>{/if}
  {#if m.localError}<p class="cv-alert" role="alert" data-section="error">{m.localError}</p>{:else}<span hidden data-section="error"></span>{/if}
</header>
