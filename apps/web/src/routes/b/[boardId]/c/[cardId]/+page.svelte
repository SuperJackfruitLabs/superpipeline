<script lang="ts">
  /**
   * A card, by address — Plan with its drawer open.
   *
   * The drawer is rendered by the board layout from `app.openCardId`, so this route's whole job is
   * to set it. A card the snapshot does not contain leaves it closed rather than opening an empty
   * drawer, which reads as a broken card instead of a stale link. It waits for the route's board to be
   * the open board: another board's snapshot (a remembered board still loading) says nothing about this card.
   */
  import { untrack } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import { page } from '$app/state';
  import { app } from '$lib/stores/app.svelte';
  import PlanView from '$lib/components/plan/PlanView.svelte';

  /**
   * The address opens the card once, when a board read holds it. It used to open it again on every later
   * run of this effect: `noteLoaded` reads `openCardId`, and each board read is a new `app.board`, so
   * Close and Esc on a drawer reached by its address put it straight back (the address stays this
   * route's: closing replaces the URL shallowly, and `page.params` keeps the card).
   *
   * A real navigation to the address (⌘K's Open card on the card just closed, a link) opens it again:
   * `afterNavigate` forgets what was opened. A shallow `replaceState` (closing) does not fire it.
   */
  let opened: string | null = null;
  let missed: string | null = null;
  function openFromAddress(): void {
    const cardId = page.params.cardId;
    const boardId = page.params.boardId;
    if (!cardId || !boardId || app.boardId !== boardId || app.board?.boardId !== boardId) return;
    const at = `${boardId}/${cardId}`;
    if (opened === at) return;
    if (app.board.cards.some((c) => c.id === cardId)) {
      opened = at;
      app.openCardId = cardId;
    } else if (missed !== at) {
      // Not on the board: closed once, and a later read that holds it still opens it.
      missed = at;
      app.openCardId = null;
    }
    untrack(() => app.noteLoaded());
  }
  $effect(openFromAddress);
  afterNavigate(() => {
    opened = null;
    missed = null;
    untrack(openFromAddress);
  });
</script>

<PlanView />
