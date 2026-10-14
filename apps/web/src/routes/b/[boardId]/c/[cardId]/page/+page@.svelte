<script lang="ts">
  /**
   * A card on its own page (amendments §7.4). `@` resets to the root layout, whose bare slot
   * draws no shell. The page opens the board itself; links to it are shared, so it must stand alone.
   */
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { app } from '$lib/stores/app.svelte';
  import { cardPersonName } from '$lib/components/dialogs/person';
  import { appearance } from '$lib/appearance.svelte';
  import { viewport } from '$lib/viewport.svelte';
  import { CARD_PAGE_LAYOUTS } from '$lib/layouts';
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
  const vibe = $derived(appearance.value.vibe);
  const Page = $derived(CARD_PAGE_LAYOUTS[vibe]);
  const ready = $derived(app.board?.boardId === boardId);
  const personName = $derived(cardPersonName(app.user, app.members));
</script>

<svelte:head><title>{model.card ? `${model.card.title} · ${model.boardName}` : 'Card · Superpipeline'}</title></svelte:head>

{#if !ready && failure}
  <CardPageMissing kind={failure === 'missing' ? 'gone' : 'error'} boardName="" boardHref="/" onRetry={() => app.retry()} />
{:else if !ready}
  <CardPageMissing kind="loading" boardName="" boardHref="/b/{boardId}" />
{:else if !model.card}
  <CardPageMissing kind="missing" boardName={model.boardName} boardHref={model.boardHref} />
{:else if viewport.narrow}
  <!-- Below 640px every vibe's page is its phone card in the same modal sheet as the drawer's (§7.7); Close goes back to the board. The page's one
       main and h1 stay here, since the phone card titles itself with an h2. -->
  <main id="content"><h1 class="vk-visually-hidden">{model.card.title}</h1></main>
  <CardPhoneSheet {model} {vibe} phase={appearance.phase} {personName} gate={model.gateBinding} question={model.questionBinding} pageHref={model.pageHref} onClose={() => void goto(model.boardHref)} />
{:else}
  <Page {model} {vibe} phase={appearance.phase} {personName} gate={model.gateBinding} question={model.questionBinding} pageHref={model.pageHref} boardHref={model.boardHref} />
{/if}
