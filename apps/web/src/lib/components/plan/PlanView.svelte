<script lang="ts">
  /**
   * Plan · Boards: the board or the list, inside the shell. The board draws its own top row
   * (`BoardView`); the List draws the same row (`BoardTopRow`) with its tools; `?view=` picks the view from a link. Projects is Plan's other section
   * (`/plan/projects`, nav v2): an old `?view=projects` link is sent there.
   */
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { app } from '$lib/stores/app.svelte';
  import { appearance } from '$lib/appearance.svelte';
  import { LIST_LAYOUTS } from '$lib/layouts';
  import { isOldProjectsLink, viewFromSearch } from '$lib/view-param';
  import BoardEmpty from '$lib/components/board/BoardEmpty.svelte';
  import BoardTopRow from '$lib/components/board/BoardTopRow.svelte';
  import BoardView from '$lib/components/board/BoardView.svelte';
  import { buildBoardModel } from '$lib/components/board/board-model';
  import { stageSummaries, summarize } from '$lib/components/board/card-summary';
  import AppShell from '$lib/components/shell/AppShell.svelte';
  import { shellModel } from '$lib/components/shell/shell-model.svelte';
  import { buildRows, filtersActive, groupRows, nextSort, quickCounts } from './list/list-model';
  import { ListUi } from './list/list-ui.svelte';
  import type { ListLayoutProps } from './list/types';

  $effect(() => {
    if (isOldProjectsLink(page.url.searchParams)) { void goto('/plan/projects', { replaceState: true }); return; }
    const v = viewFromSearch(page.url.searchParams);
    if (v) app.setView(v);
  });

  const vibe = $derived(appearance.value.vibe);

  const me = $derived(app.user ? { id: app.user.userId, name: shellModel.userName, initials: shellModel.initials } : null);
  const model = $derived(
    app.board ? buildBoardModel(app.board, app.filteredCards(), { agents: app.agents, members: app.members, labels: app.labelById(), nowMs: Date.now(), me, spend7d: undefined }) : null,
  );
  /** No live card at all (filters ignored): the board explains itself instead of drawing empty lanes. */
  const empty = $derived(!!app.board && app.board.cards.every((c) => c.archivedAt !== null));

  const List = $derived(LIST_LAYOUTS[vibe]);
  /** The List's transient state lives here, so a re-mounted layout keeps it. */
  const listUi = new ListUi();
  const listProps = $derived.by((): ListLayoutProps | null => {
    const board = app.board;
    if (!board || app.view !== 'list') return null;
    const cards = app.filteredCards();
    const stageList = stageSummaries(board, cards, app.agents);
    const rows = buildRows(summarize(board, cards, { agents: app.agents, members: app.members, labels: app.labelById(), nowMs: Date.now() }), { boardId: board.boardId ?? '', agents: app.agents });
    return {
      ui: listUi,
      boardId: board.boardId ?? '', boardName: board.name ?? '', stageCount: board.stages.length,
      groups: groupRows(rows, app.listGroupBy, app.listSort, stageList, app.members, app.agents),
      emptyStages: app.listGroupBy === 'stage' ? stageList.filter((s) => s.count === 0).map((s) => s.name) : [],
      cardCount: rows.length, needsCount: rows.filter((r) => r.state.needsYou).length,
      quickCounts: quickCounts(rows), totalCostUsd: rows.reduce((a, r) => a + r.s.cost, 0),
      groupBy: app.listGroupBy, sort: app.listSort, filtersOn: filtersActive(app.filters),
      hasCards: board.cards.some((c) => !c.archivedAt),
      stages: [...board.stages].sort((a, b) => a.order - b.order).map((s) => ({ key: s.key, name: s.name })),
      onGroupBy: (g) => (app.listGroupBy = g),
      onSort: (k) => (app.listSort = nextSort(app.listSort, k)),
      onSetSort: (s) => (app.listSort = s),
      onMove: (id, key) => app.moveCard(id, key),
      onOpen: (id) => app.openCard(id),
      onOpenMoveDialog: (id) => app.openMoveDialog(id),
    };
  });
</script>

{#snippet listTools()}{#if listProps && List.toolbar}<List.toolbar {...listProps} />{/if}{/snippet}

<AppShell
  here="plan"
  section={app.view}
  boardName={app.board?.name ?? 'Untitled board'}
  plan="boards"
  live={shellModel.liveToggle}
  bleed={app.view === 'board' || vibe === 'quiet'}
  ownHeading={app.view === 'list' && vibe !== 'daylight'}
>
  {#if model && app.view === 'board' && empty}
    <BoardTopRow filters={app.filters} />
    <BoardEmpty {model} intro={app.board?.intro} {me} onCompose={() => app.requestCompose()} />
  {:else if model && app.view === 'board'}
    <BoardView {model} filters={app.filters} onCompose={() => app.requestCompose()} />
  {:else if app.view === 'list'}
    <BoardTopRow filters={app.filters} tools={List.toolbar ? listTools : undefined} />
    {#if listProps}<List.body {...listProps} />{/if}
  {/if}
</AppShell>
