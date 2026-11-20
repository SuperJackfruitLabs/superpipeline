<!-- apps/web/src/lib/components/inbox/InboxView.svelte -->
<script lang="ts">
  /**
   * The Inbox, the home: what needs you, what is running, what it cost and what happened, on every
   * board by default or on the one chosen under Show. The model is built once here; InboxPage draws
   * it, the same composition in every vibe. The shell owns the page's one main; the page draws its
   * one h1. A card opens over the Inbox in the drawer.
   */
  import './inbox.css';
  import { app } from '$lib/stores/app.svelte';
  import AppShell from '$lib/components/shell/AppShell.svelte';
  import CardDrawer from '$lib/components/CardDrawer.svelte';
  import { shellModel } from '$lib/components/shell/shell-model.svelte';
  import { viewport } from '$lib/viewport.svelte';
  import { liveUpdates } from '$lib/live/live-updates.svelte';
  import LoadFailed from '$lib/components/parts/LoadFailed.svelte';
  import { UNREACHABLE_COPY } from '$lib/loading';
  import { InboxStore } from './inbox-model.svelte';
  import InboxHeadline from './InboxHeadline.svelte';
  import InboxPage from './InboxPage.svelte';
  import { InboxUi } from './inbox-ui.svelte';

  if (app.boards.length === 0) void app.loadBoards();
  const model = new InboxStore();
  const ui = new InboxUi(() => model);
  /** The open card's board: the Inbox row it was opened from, else the board the Inbox opened for it. */
  const drawerBoardId = $derived(
    model.needs.find((r) => r.card.id === app.openCardId)?.item.boardId ?? model.running.find((r) => r.cardId === app.openCardId)?.boardId ?? app.boardId,
  );
  /** A phone card is a full-screen sheet: the Inbox behind it is hidden, as on a board. */
  const phoneCard = $derived(viewport.narrow && !!app.openCardId);
</script>

<div style:display={phoneCard ? 'none' : 'contents'}>
  <AppShell live={shellModel.liveToggle} here="inbox" section="inbox" boardName={null} ownHeading>
    <div id="content" tabindex="-1" class="ib-view min-w-0">
      <!-- Keyed on loading: the counted page arrives as a fresh frame instead of pushing the waiting one down (phone CLS). -->
      {#key model.loading}
        {#if model.failed}
          <div class="ib">
            <InboxHeadline store={model} />
            <LoadFailed message={UNREACHABLE_COPY} onRetry={() => model.retry()} />
          </div>
        {:else}
          <InboxPage store={model} filters={model.filters} live={liveUpdates} {ui} />
        {/if}
      {/key}
    </div>
  </AppShell>
</div>
{#if app.openCardId && app.board}<CardDrawer boardId={drawerBoardId} />{/if}
