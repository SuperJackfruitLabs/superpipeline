<script lang="ts">
  /**
   * A card on its own page (amendments §7.4): the card's one composition (CardView), with an h1. `@` resets to the root layout, whose bare slot
   * draws no shell. The page opens the board itself; links to it are shared, so it must stand alone.
   */
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { app } from '$lib/stores/app.svelte';
  import { viewport } from '$lib/viewport.svelte';
  import CardView from '$lib/components/card/CardView.svelte';
  import CardPageBar from '$lib/components/card/page/CardPageBar.svelte';
  import CardPhoneSheet from '$lib/components/card/phone/CardPhoneSheet.svelte';
  import { CardModel } from '$lib/components/card/card-model.svelte';
  import CardPageMissing from '$lib/components/card/page/CardPageMissing.svelte';

  const boardId = $derived(page.params.boardId!);
  const cardId = $derived(page.params.cardId!);
  // This page's own board-load failure (the store's, for this board): app.error is global, and one
  // left by an earlier move or delete must not read as a failure while a good board is still loading.
  $effect(() => {
    if (app.authState === 'ready' && app.boardId !== boardId) {
      app.error = null;
      void app.openBoard(boardId);
    }
  });
  const failure = $derived(app.boardId === boardId ? app.boardFailure : null);
  const model = new CardModel(() => ({ boardId, cardId, surface: 'page' }));
  const ready = $derived(app.board?.boardId === boardId);
</script>

<svelte:head><title>{model.card ? `${model.card.title} · ${model.boardName}` : 'Card · Superpipeline'}</title></svelte:head>

{#if !ready && failure}
  <CardPageMissing kind={failure === 'missing' ? 'gone' : 'error'} boardName="" boardHref="/" onRetry={() => app.retry()} />
{:else if !ready}
  <CardPageMissing kind="loading" boardName="" boardHref="/b/{boardId}" onRetry={() => app.retry()} />
{:else if !model.card}
  <CardPageMissing kind="missing" boardName={model.boardName} boardHref={model.boardHref} />
{:else if viewport.narrow}
  <!-- Below 640px every vibe's page is its phone card in the same modal sheet as the drawer's (§7.7); Close goes back to the board. The page's one
       main and h1 stay here, since the phone card titles itself with an h2. -->
  <main id="content"><h1 class="vk-visually-hidden">{model.card.title}</h1></main>
  <CardPhoneSheet {model} gate={model.gateBinding} question={model.questionBinding} pageHref={model.pageHref} boardHref={model.boardHref} onClose={() => void goto(model.boardHref)} />
{:else}
  <CardPageBar boardName={model.boardName} boardHref={model.boardHref} />
  <!-- Esc closes the page back to its board, as Close does and as the phone page's sheet does (CARD_KEYS). -->
  <main id="content" class="cv-page"><CardView {model} surface="page" gate={model.gateBinding} question={model.questionBinding} pageHref={model.pageHref} boardHref={model.boardHref} onClose={() => void goto(model.boardHref)} /></main>
{/if}
