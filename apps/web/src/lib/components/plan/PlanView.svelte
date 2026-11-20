<script lang="ts">
  /**
   * Plan · Boards: the board or the list, inside the shell. Each view draws the board's top row
   * (`BoardTopRow`), the List with its two pickers; `?view=` picks the view from a link. Projects is Plan's other section
   * (`/plan/projects`, nav v2): an old `?view=projects` link is sent there.
   */
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { app } from '$lib/stores/app.svelte';
  import { appearance } from '$lib/appearance.svelte';
  import { isOldProjectsLink, viewFromSearch } from '$lib/view-param';
  import BoardEmpty from '$lib/components/board/BoardEmpty.svelte';
  import BoardTopRow from '$lib/components/board/BoardTopRow.svelte';
  import BoardView from '$lib/components/board/BoardView.svelte';
  import { buildBoardModel } from '$lib/components/board/board-model';
  import { stageSummaries, summarize } from '$lib/components/board/card-summary';
  import AppShell from '$lib/components/shell/AppShell.svelte';
  import { shellModel } from '$lib/components/shell/shell-model.svelte';
  import { buildRows, groupRows, nextSort } from './list/list-model';
  import { ListUi } from './list/list-ui.svelte';
  import ListView from './list/ListView.svelte';
  import type { ListViewProps } from './list/types';

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

  /** The List's transient state lives here, so a re-mounted view keeps it. */
  const listUi = new ListUi();
  const listProps = $derived.by((): ListViewProps | null => {
    const board = app.board;
    if (!board || app.view !== 'list') return null;
    const cards = app.filteredCards();
    const stageList = stageSummaries(board, cards, app.agents);
    const rows = buildRows(summarize(board, cards, { agents: app.agents, members: app.members, labels: app.labelById(), nowMs: Date.now() }), { boardId: board.boardId ?? '', agents: app.agents });
    return {
      ui: listUi, filters: app.filters,
      boardId: board.boardId ?? '', boardName: board.name ?? '',
      groups: groupRows(rows, app.listGroupBy, app.listSort, stageList, app.members, app.agents),
      emptyStages: app.listGroupBy === 'stage' ? stageList.filter((s) => s.count === 0).map((s) => s.name) : [],
      needsCount: rows.filter((r) => r.state.needsYou).length,
      groupBy: app.listGroupBy, sort: app.listSort,
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

<AppShell
  here="plan"
  section={app.view}
  boardName={app.board?.name ?? 'Untitled board'}
  plan="boards"
  live={shellModel.liveToggle}
  bleed={app.view === 'board' || vibe === 'quiet'}
>
  {#if model && app.view === 'board' && empty}
    <BoardTopRow filters={app.filters} />
    <BoardEmpty {model} intro={app.board?.intro} {me} onCompose={() => app.requestCompose()} />
  {:else if model && app.view === 'board'}
    <BoardView {model} filters={app.filters} />
  {:else if listProps}
    <ListView {...listProps} />
  {/if}
</AppShell>
