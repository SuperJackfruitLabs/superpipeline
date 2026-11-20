<!-- apps/web/src/routes/b/[boardId]/operate/log/+page.svelte -->
<script lang="ts">
  /** The whole board log (up to 500 events), opened from Spend: one composition in every vibe (BoardLogView). */
  import { page } from '$app/state';
  import { getBoardEvents, type BoardEvent } from '$lib/api';
  import { appearance } from '$lib/appearance.svelte';
  import BoardLogView from '$lib/components/operate/BoardLogView.svelte';
  import AppShell from '$lib/components/shell/AppShell.svelte';
  import { shellModel } from '$lib/components/shell/shell-model.svelte';
  import { app } from '$lib/stores/app.svelte';
  import { newestFirst } from '$lib/components/operate/spend-format';

  const boardId = $derived(page.params.boardId ?? '');
  let events = $state<BoardEvent[] | null>(null);
  let error = $state<string | null>(null);
  $effect(() => {
    const req = getBoardEvents(boardId, 500);
    app.markBusy(req);
    req.then((e) => { events = newestFirst(e); error = null; }).catch((e: unknown) => { events = []; error = e instanceof Error ? e.message : String(e); });
  });
  const vibe = $derived(appearance.value.vibe);
</script>

<AppShell live={shellModel.liveToggle} here="plan" section="log" boardName={app.board?.name ?? 'Untitled board'} bleed={vibe === 'quiet'}>
  <BoardLogView {boardId} {events} {error} />
</AppShell>
