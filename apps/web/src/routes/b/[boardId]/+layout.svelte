<script lang="ts">
  /**
   * A board, and everything that is true while you are in it.
   *
   * The board is opened here rather than in each page, so switching between Plan and Operate does
   * not tear down the WebSocket and re-fetch the snapshot — they are two views of one board, not
   * two boards.
   *
   * Isolation is inherited rather than added: `boardStub` names the Durable Object
   * `${tenantId}:${boardId}`, so a board id belonging to another tenant resolves to a different,
   * uninitialised object and the API answers 404 — the same answer a board that never existed
   * gets. A board id in a URL is therefore not an existence oracle.
   */
  import { page } from '$app/state';
  import { replaceState } from '$app/navigation';
  import { app } from '$lib/stores/app.svelte';
  import CardDrawer from '$lib/components/CardDrawer.svelte';
  import { viewport } from '$lib/viewport.svelte';
  import { appearance } from '$lib/appearance.svelte';
  import AppShell from '$lib/components/shell/AppShell.svelte';
  import BoardSkeleton from '$lib/components/board/BoardSkeleton.svelte';
  import { pending } from '$lib/loading.svelte';
  import { viewFromSearch } from '$lib/view-param';

  let { children } = $props();

  /** A phone card is a full-screen sheet in normal flow: the board behind it is hidden, so the page is the card alone. */
  const phoneCard = $derived(viewport.narrow && !!app.openCardId);
  const boardId = $derived(page.params.boardId!);

  /** What the page will be, so the waiting shell is already the right one (Board, List, a board page). */
  const route = $derived(page.route.id ?? '');
  const waitView = $derived(viewFromSearch(page.url.searchParams) ?? app.view);
  const wait = $derived.by(() => {
    if (route.endsWith('/settings')) return { section: 'settings' as const, view: null, form: 'page' as const };
    if (route.endsWith('/operate/log')) return { section: 'log' as const, view: null, form: 'page' as const };
    if (route.endsWith('/operate/telemetry')) return { section: 'spend' as const, view: null, form: 'page' as const };
    return { section: waitView, view: waitView, form: waitView === 'list' ? ('list' as const) : ('board' as const) };
  });
  /** The board's name from the board list, when it is in: the switcher shows it before the board arrives. */
  const knownName = $derived(app.boards.find((b) => b.id === boardId)?.name ?? '');
  const failure = $derived(app.boardId === boardId ? app.boardFailure : null);
  const shown = $derived(!!app.board && (app.board.boardId ?? boardId) === boardId);
  const gate = pending(() => !shown && !failure);

  $effect(() => {
    const id = boardId;
    if (app.authState !== 'ready' || !id || app.boardId === id) return;
    void app.openBoard(id);
  });

  /**
   * Keep the address bar honest.
   *
   * Without this half a link works when followed and starts lying the moment the reader clicks
   * anything — which is worse than no routing at all, because the URL now looks authoritative.
   * It lived in `BoardScreen.svelte` and came back here when that file was retired; the e2e suite
   * caught its absence, which is the entire reason that assertion exists.
   *
   * `replaceState` rather than `goto`: opening a card is not a navigation a reader expects Back to
   * undo one step at a time. Back should leave the board, not walk through every card they glanced
   * at.
   */
  $effect(() => {
    if (!app.board) return;
    const want = app.openCardId ? `/b/${boardId}/c/${app.openCardId}` : `/b/${boardId}`;
    if (location.pathname !== want && !location.pathname.includes('/operate') && !location.pathname.includes('/settings')) {
      replaceState(want, {});
    }
  });
</script>

{#if shown}
  <div style:display={phoneCard ? 'none' : 'contents'}>{@render children()}</div>
  {#if app.openCardId}
    <CardDrawer />
  {/if}
{:else}
  <!-- The real shell with the board's shape in it: no logo screen, no raw error text (loading-audit L4, L5). -->
  <AppShell here="plan" section={wait.section} boardName={knownName} view={wait.view} plan={wait.view ? 'boards' : undefined} showing={null} bleed={appearance.value.vibe === 'quiet'} ownHeading>
    <BoardSkeleton form={wait.form} {failure} slow={gate.slow} onRetry={() => app.retry()} />
  </AppShell>
{/if}
