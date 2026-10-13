<!-- apps/web/src/routes/b/[boardId]/operate/log/+page.svelte -->
<script lang="ts">
  /** The whole board log (up to 500 events), opened from Spend. */
  import { page } from '$app/state';
  import { getBoardEvents, type BoardEvent } from '$lib/api';
  import { appearance } from '$lib/appearance.svelte';
  import { BOARD_LOG_LAYOUTS } from '$lib/layouts';
  import AppShell from '$lib/components/shell/AppShell.svelte';
  import { shellModel } from '$lib/components/shell/shell-model.svelte';
  import { needsPart } from '$lib/components/shell/shell-words';
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
  const Layout = $derived(BOARD_LOG_LAYOUTS[vibe]);
  // Only Studio's Spend reference draws a status line.
  const status = $derived(vibe === 'studio' ? shellModel.pageStatus(['Board log', needsPart(shellModel.attentionCount)]) : null);
</script>

<AppShell here="operate" section="spend" boardName={app.board?.name ?? 'Untitled board'} view={null} showing={null} {status} bleed={vibe === 'quiet'}>
  <Layout {vibe} {boardId} {events} {error} />
</AppShell>
