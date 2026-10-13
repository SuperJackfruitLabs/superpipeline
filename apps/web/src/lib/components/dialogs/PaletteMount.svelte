<script lang="ts">
  /**
   * The command palette (SP-Dlg-Palette): vibekit's CommandPalette, fed by `palette-index.ts`. The
   * index ranks and filters (cards in urgency order with their short id, boards in switcher order,
   * at most four agents by the O-11 rule, actions and account); vibekit draws, highlights and keeps
   * the keyboard. ⌘K / Ctrl-K toggles it anywhere.
   */
  import { createRawSnippet, mount, unmount, untrack, type Component } from 'svelte';
  import { getBoard, type Stage } from '$lib/api';
  import { goto } from '$app/navigation';
  import { CommandPalette, Face, type PaletteGroup } from '@superjackfruit/vibekit';
  import { app } from '$lib/stores/app.svelte';
  import { appearance } from '$lib/appearance.svelte';
  import { signOut } from '$lib/components/shell/account';
  import { groupByUrgency, summarize } from '$lib/components/board/card-summary';
  import Icon from '$lib/components/parts/Icon.svelte';
  import { personName } from './person';
  import { switcherOrder } from './switcher-model';
  import { buildPaletteIndex, filterPalette, groupCount, paletteCount, soleOwnerOrder, type PaletteItem } from './palette-index';
  import './css/pal.css';

  let query = $state('');

  /** A snippet that mounts a component (vibekit's item icon is a Snippet; the icon is per item). */
  function mounted<P extends Record<string, unknown>>(C: Component<P>, props: P, cls = '') {
    return createRawSnippet(() => ({
      render: () => `<span class="${cls}" style="display: contents"></span>`,
      setup: (el) => { const m = mount(C, { target: el, props }); return () => void unmount(m); },
    }));
  }
  const needsChip = createRawSnippet(() => ({ render: () => '<span class="chip chip--needs">Waiting on you</span>' }));

  const cards = $derived.by(() => {
    const b = app.board;
    if (!b) return [];
    const list = summarize(b, b.cards.filter((c) => !c.archivedAt), { agents: app.agents, members: app.members, labels: app.labelById(), nowMs: Date.now() });
    return groupByUrgency(list).flatMap((g) => g.cards);
  });
  /** An empty board's stages are the only place its crew shows (O-11); they are fetched once, when the palette opens. */
  let emptyStages = $state<Record<string, Stage[]>>({});
  const emptyBoards = $derived(switcherOrder(app.boards, app.boardId).filter((b) => b.cardCount === 0 && b.id !== app.boardId));
  $effect(() => {
    if (!app.cmdkOpen) return;
    for (const b of untrack(() => emptyBoards)) {
      if (untrack(() => emptyStages[b.id])) continue;
      getBoard(b.id).then((x) => { emptyStages = { ...emptyStages, [b.id]: x.stages }; }, () => {});
    }
  });
  const sole = $derived(soleOwnerOrder([
    ...(app.board ? [{ stages: app.board.stages }] : []),
    ...emptyBoards.map((b) => ({ stages: emptyStages[b.id] ?? [] })),
  ], app.agents));
  const index = $derived(buildPaletteIndex({
    board: app.board && app.boardId ? { id: app.boardId, name: app.board.name ?? '' } : null,
    cards, boards: switcherOrder(app.boards, app.boardId), currentBoardId: app.boardId,
    agents: app.agents, theme: appearance.theme, personName: personName(app.user, app.members),
  }));
  const result = $derived(filterPalette(index, query, sole));

  function run(i: PaletteItem): void {
    const a = i.act;
    app.cmdkOpen = false;
    if (a.kind === 'goto') void goto(a.href);
    else if (a.kind === 'compose') app.requestCompose(a.sentence ?? '');
    else if (a.kind === 'appearance') appearance.pickerOpen = true;
    else if (a.kind === 'theme') appearance.toggleTheme();
    else void signOut();
  }
  function icon(i: PaletteItem) {
    return typeof i.icon === 'string'
      ? mounted(Icon as unknown as Component<Record<string, unknown>>, { name: i.icon, size: 18 })
      : mounted(Face as unknown as Component<Record<string, unknown>>, { id: i.icon.agentId, label: i.icon.name, mood: 'resting', size: 28 });
  }

  const groups = $derived.by((): PaletteGroup[] => {
    const q = query.trim();
    if (result.total === 0 && q !== '' && app.boardId) {
      const label = `Dispatch a card called “${q}”`;
      return [{ heading: 'Actions', items: [{ id: 'act:dispatch-q', label, hint: `No matches for “${q}”.`, enter: 'Open composer', onselect: () => run({ id: 'act:dispatch-q', group: 'Actions', label, sub: '', needs: false, meta: '', icon: 'plus', verb: 'Open composer', act: { kind: 'compose', sentence: q } }) }] }];
    }
    return result.groups.map((g) => ({
      heading: g.group,
      meta: groupCount(g.items.length),
      items: g.items.map((i) => ({ id: i.id, label: i.label, hint: i.sub, meta: i.meta || undefined, enter: i.verb, icon: icon(i), badge: i.needs ? needsChip : undefined, onselect: () => run(i) })),
    }));
  });

  function onKeydown(e: KeyboardEvent): void {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      app.toggleCmdk();
    }
  }
  $effect(() => {
    if (!app.cmdkOpen) query = '';
  });
</script>

<svelte:window onkeydown={onKeydown} />

<CommandPalette bind:open={app.cmdkOpen} bind:query label="Search cards, boards, agents and actions" placeholder="Jump to a card, board, agent, or action…"
  {groups} empty="Nothing matches." width="700px" clear="Clear the search" class="pal" filter={false}
  count={(_n, q) => paletteCount(result.total, q, app.board?.name ?? null)}>
  {#snippet footer()}
    <span><span class="kbd">↑</span><span class="kbd">↓</span> move</span>
    <span><span class="kbd">↵</span> open</span>
    <span><span class="kbd">esc</span> close</span>
    <span class="pal-grow"></span>
    <span><span class="kbd">⌘</span><span class="kbd">K</span> opens this anywhere</span>
  {/snippet}
</CommandPalette>
