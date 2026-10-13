<script lang="ts">
  /**
   * Plan: the board, the list or the projects, inside the vibe's shell. The view switch and the
   * Filter button live in the shell now; `?view=` picks the view from a link.
   */
  import { page } from '$app/state';
  import { getUsage } from '$lib/api';
  import { app } from '$lib/stores/app.svelte';
  import { appearance } from '$lib/appearance.svelte';
  import { viewport } from '$lib/viewport.svelte';
  import { BOARD_EMPTY_FORMS, BOARD_LAYOUTS, LIST_LAYOUTS } from '$lib/layouts';
  import { viewFromSearch } from '$lib/view-param';
  import BoardEmpty from '$lib/components/board/BoardEmpty.svelte';
  import { buildBoardModel } from '$lib/components/board/board-model';
  import { stageSummaries, summarize } from '$lib/components/board/card-summary';
  import DlGreeting from '$lib/components/board/daylight/DlGreeting.svelte';
  import PdHello from '$lib/components/board/daylight/PdHello.svelte';
  import AppShell from '$lib/components/shell/AppShell.svelte';
  import { shellModel } from '$lib/components/shell/shell-model.svelte';
  import { needsPart, PROJECTS_NOTE } from '$lib/components/shell/shell-words';
  import { plural } from '$lib/words';
  import ProjectView from './ProjectView.svelte';
  import { buildRows, filtersActive, groupRows, nextSort, quickCounts } from './list/list-model';
  import { ListUi } from './list/list-ui.svelte';
  import type { ListLayoutProps } from './list/types';

  $effect(() => {
    const v = viewFromSearch(page.url.searchParams);
    if (v) app.setView(v);
  });

  const vibe = $derived(appearance.value.vibe);

  /** The week's spend, for the Studio figures; fetched once per board. */
  let spend7d = $state<number | null>(null);
  $effect(() => {
    const id = app.board?.boardId;
    if (!id) return;
    let live = true;
    void app.markBusy(getUsage(id, '7d').then((u) => { if (live) spend7d = u.totalCostUsd; }, () => { if (live) spend7d = null; }));
    return () => { live = false; };
  });

  const me = $derived(app.user ? { id: app.user.userId, name: shellModel.userName, initials: shellModel.initials } : null);
  const model = $derived(
    app.board ? buildBoardModel(app.board, app.filteredCards(), { agents: app.agents, members: app.members, labels: app.labelById(), nowMs: Date.now(), me, spend7d }) : null,
  );
  /** No live card at all (filters ignored): the board explains itself instead of drawing empty lanes. */
  const empty = $derived(!!app.board && app.board.cards.every((c) => c.archivedAt !== null));
  /** The empty board explains itself on a phone too; its stylesheet folds to one column below 900px. */
  const showEmpty = $derived(empty);
  // Studio's empty board keeps the page gutters (SP-Board-Empty-Studio: the card at x 104, 1296 wide); its full board bleeds.
  /** Daylight's greeting sits in the shell's sky (the band on a desktop, the hello on a phone); not on an empty board (O-13). */
  const greet = $derived(vibe === 'daylight' && app.view === 'board' && model !== null && !empty);

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

  const projects = $derived(app.view === 'projects');
  const status = $derived(
    app.view !== 'board' && vibe !== 'studio'
      ? null // only Studio's List and Projects references draw a status line
      : projects
        ? shellModel.pageStatus([plural(app.projects.length, 'project', 'projects'), `${plural(shellModel.liveCount, 'card', 'cards')} on this board`, needsPart(shellModel.needsCount)])
        : shellModel.boardStatus,
  );
</script>

{#snippet listTools()}{#if listProps && List.toolbar}<List.toolbar {...listProps} />{/if}{/snippet}
{#snippet dlSky()}{#if model}{#if viewport.phone}<PdHello {model} phase={shellModel.phonePhase} firstName={shellModel.firstName} />{:else}<DlGreeting {model} phase={appearance.phase} firstName={shellModel.firstName} />{/if}{/if}{/snippet}

<AppShell
  here="plan"
  section={app.view}
  boardName={app.board?.name ?? 'Untitled board'}
  view={app.view}
  showing={projects ? PROJECTS_NOTE : shellModel.showing}
  paperShowing={projects ? PROJECTS_NOTE : shellModel.paperShowing}
  editionCount={shellModel.editionCount}
  studioSubRight={projects ? null : shellModel.studioSubRight}
  {status}
  sky={greet ? dlSky : undefined}
  bleed={(app.view === 'board' && !(showEmpty && vibe === 'studio')) || vibe === 'quiet'}
  subTools={app.view === 'list' && List.toolbar ? listTools : undefined}
  ownHeading={projects || (app.view === 'list' && vibe !== 'daylight')}
>
  {#if model && app.view === 'board' && showEmpty}
    <BoardEmpty {model} intro={app.board?.intro} form={BOARD_EMPTY_FORMS[vibe]} {me} onCompose={() => app.requestCompose()} />
  {:else if model && app.view === 'board'}
    {@const Board = BOARD_LAYOUTS[vibe][viewport.phone ? 'phone' : 'desktop']}
    <Board {model} {vibe} phase={appearance.phase} onCompose={() => app.requestCompose()} />
  {:else if app.view === 'list'}
    {#if listProps}<List.body {...listProps} />{/if}
  {:else if app.view === 'projects'}
    <ProjectView />
  {/if}
</AppShell>
