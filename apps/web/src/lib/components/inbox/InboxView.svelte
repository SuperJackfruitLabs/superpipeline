<!-- apps/web/src/lib/components/inbox/InboxView.svelte -->
<script lang="ts">
  /**
   * The Inbox, the home: what needs you, what is running, what it cost and what happened, on every
   * board by default or on the one chosen in the Show row. The model is built once here; the vibe's
   * layout (layouts.ts, OPERATE_LAYOUTS) only draws it. The shell owns the page's one main; the
   * layout draws the page's one h1.
   */
  import { app } from '$lib/stores/app.svelte';
  import { appearance } from '$lib/appearance.svelte';
  import { OPERATE_LAYOUTS } from '$lib/layouts';
  import AppShell from '$lib/components/shell/AppShell.svelte';
  import CardDrawer from '$lib/components/CardDrawer.svelte';
  import { shellModel } from '$lib/components/shell/shell-model.svelte';
  import { viewport } from '$lib/viewport.svelte';
  import { InboxStore } from './inbox-model.svelte';
  import { CapsUi, OperateUi } from '../operate/operate-ui.svelte';
  import InboxShow from './InboxShow.svelte';
  import OperateDaylightSky from '../operate/layouts/OperateDaylightSky.svelte';
  import LoadFailed from '$lib/components/parts/LoadFailed.svelte';
  import { UNREACHABLE_COPY } from '$lib/loading';

  if (app.boards.length === 0) void app.loadBoards();
  const model = new InboxStore();
  const ui = new OperateUi(() => model);
  const caps = new CapsUi(() => model);
  const vibe = $derived(appearance.value.vibe);
  const Layout = $derived(OPERATE_LAYOUTS[vibe]);
  /** The open card's board: the Inbox row it was opened from, else the board the Inbox opened for it. */
  const drawerBoardId = $derived(
    model.needs.find((r) => r.card.id === app.openCardId)?.item.boardId ?? model.running.find((r) => r.cardId === app.openCardId)?.boardId ?? app.boardId,
  );
  /** A phone card is a full-screen sheet: the Inbox behind it is hidden, as on a board. */
  const phoneCard = $derived(viewport.narrow && !!app.openCardId);
</script>


<div style:display={phoneCard ? 'none' : 'contents'}>
  <AppShell live={shellModel.liveToggle} here="inbox" section="inbox" boardName={null} bleed={vibe === 'quiet' || vibe === 'studio'} ownHeading>
    <div id="content" tabindex="-1" class="min-w-0">
      <!-- Daylight's greeting is the Inbox's own headline (its h1), drawn by the page now that the shell's sky is decoration only; the Inbox headline task rebuilds it. -->
      {#if vibe === 'daylight'}<OperateDaylightSky {model} />{/if}
      <!-- Keyed on loading: the counted page arrives as a fresh frame instead of pushing the waiting one down (phone CLS). -->
      {#key model.loading}
      <div class="ib-pad ib-pad--{vibe}"><InboxShow form={vibe === 'quiet' ? 'words' : 'chips'} pending={model.loading} /></div>
      {#if model.failed}
        <section class="ib-failed" aria-labelledby="ib-failed-h">
          <h1 id="ib-failed-h" class="vk-visually-hidden">Inbox</h1>
          <LoadFailed message={UNREACHABLE_COPY} onRetry={() => model.retry()} />
        </section>
      {:else}
        <Layout {model} {ui} {caps} />
      {/if}
      {/key}
    </div>
  </AppShell>
</div>
{#if app.openCardId && app.board}<CardDrawer boardId={drawerBoardId} />{/if}

<style>
  /*
   * Studio and Quiet bleed (their layouts draw their own gutters), so the Show row, which sits above the
   * layout, takes the same gutter as the layout below it: Studio's .op-main, Quiet's .q. The phone shell
   * draws no gutter of its own: the Show row keeps the page's 16px.
   */
  .ib-pad { padding-inline: 0; }
  .ib-failed { padding: var(--vk-space-6) var(--vk-space-4); }
  .ib-pad--studio { padding: 24px 40px 0; }
  .ib-pad--quiet { padding: var(--vk-space-6) var(--vk-space-6) 0; }
  @media (max-width: 899.98px) { .ib-pad, .ib-pad--studio, .ib-pad--quiet { padding: 0 16px; } }
</style>
