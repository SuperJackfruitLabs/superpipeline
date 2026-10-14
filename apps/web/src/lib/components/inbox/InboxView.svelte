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
  import { needsPart } from '$lib/components/shell/shell-words';
  import { viewport } from '$lib/viewport.svelte';
  import { plural } from '$lib/words';
  import { InboxStore } from './inbox-model.svelte';
  import { CapsUi, OperateUi } from '../operate/operate-ui.svelte';
  import OperateDaylightSky from '../operate/layouts/OperateDaylightSky.svelte';
  import InboxShow from './InboxShow.svelte';
  import LoadFailed from '$lib/components/parts/LoadFailed.svelte';
  import { UNREACHABLE_COPY } from '$lib/loading';

  if (app.boards.length === 0) void app.loadBoards();
  const model = new InboxStore();
  const ui = new OperateUi(() => model);
  const caps = new CapsUi(() => model);
  const vibe = $derived(appearance.value.vibe);
  const Layout = $derived(OPERATE_LAYOUTS[vibe]);
  const scope = $derived(model.scoped ? model.boardName : 'all boards');
  // Only Studio draws a status line on the Inbox (the other three references end with the page).
  const status = $derived(
    vibe !== 'studio' ? null : model.loading || model.failed ? shellModel.pageStatus([scope]) : shellModel.pageStatus([
      scope,
      plural(model.cardCount, 'card', 'cards'),
      needsPart(model.needs.length),
      `${model.running.length} running`,
      `${model.unread} unread`,
    ]),
  );
  /** A phone card is a full-screen sheet: the Inbox behind it is hidden, as on a board. */
  const phoneCard = $derived(viewport.narrow && !!app.openCardId);
</script>

{#snippet sky()}<OperateDaylightSky {model} />{/snippet}

<div style:display={phoneCard ? 'none' : 'contents'}>
  <AppShell here="inbox" section="inbox" boardName={null} view={null} showing={null} {status} sky={vibe === 'daylight' ? sky : undefined} bleed={vibe === 'quiet' || vibe === 'studio'} ownHeading>
    <div id="content" tabindex="-1" class="min-w-0">
      <div class="ib-pad"><InboxShow form={vibe === 'quiet' ? 'words' : 'chips'} /></div>
      {#if model.failed}
        <section class="ib-failed" aria-labelledby="ib-failed-h">
          <h1 id="ib-failed-h" class="vk-visually-hidden">Inbox</h1>
          <LoadFailed message={UNREACHABLE_COPY} onRetry={() => model.retry()} />
        </section>
      {:else}
        <Layout {model} {ui} {caps} />
      {/if}
    </div>
  </AppShell>
</div>
{#if app.openCardId && app.board}<CardDrawer />{/if}

<style>
  /* The phone shell draws no gutter of its own: the Show row keeps the page's 16px. */
  .ib-pad { padding-inline: 0; }
  .ib-failed { padding: var(--vk-space-6) var(--vk-space-4); }
  @media (max-width: 899.98px) { .ib-pad { padding-inline: 16px; } }
</style>
