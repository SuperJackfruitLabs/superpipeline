<!-- apps/web/src/routes/dev/card-states/+page@.svelte -->
<script lang="ts">
  /** Dev-only: every card state on one page, for the pixel harness (SP-Card-States-<Vibe>). */
  import { app } from '$lib/stores/app.svelte';
  import { getAgents, getBoard } from '$lib/api';
  import type { CardSource } from '$lib/components/card/card-model.svelte';
  import CardStatesGallery from '$lib/components/card/states/CardStatesGallery.svelte';
  import { GALLERY_BOARD_IDS, GALLERY_CELLS } from './cells';

  let sources = $state<Record<string, CardSource> | null>(null);
  let failed = $state<string | null>(null);
  let started = false;
  $effect(() => {
    if (app.authState !== 'ready' || started) return;
    started = true;
    void app.markBusy((async () => {
      try {
        const [agents, ...boards] = await Promise.all([getAgents(), ...GALLERY_BOARD_IDS.map((id) => getBoard(id))]);
        sources = Object.fromEntries(boards.map((b) => [b.boardId!, { board: b, agents }]));
      } catch (e) {
        failed = String(e);
      }
    })());
  });
</script>

<svelte:head><title>Card states</title></svelte:head>
{#if sources}
  <CardStatesGallery specs={GALLERY_CELLS} {sources} />
{:else if failed}
  <p role="alert">{failed}</p>
{:else}
  <p role="status">Loading the card states…</p>
{/if}
