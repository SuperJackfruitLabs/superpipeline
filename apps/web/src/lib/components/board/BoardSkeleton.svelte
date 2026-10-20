<script lang="ts">
  /**
   * A board that has not arrived yet, inside the real shell (the rail and top bar stay; no logo
   * screen after the first boot). The board view draws four stage columns with ghost cards, the List
   * view rows; any other board page a few rows. A board that could not be read says why: not there for
   * you (404/403, with a way home) or could not load (5xx, network, timeout, with Try again).
   */
  import { onMount } from 'svelte';
  import SkeletonRows from '$lib/components/parts/SkeletonRows.svelte';
  import LoadFailed from '$lib/components/parts/LoadFailed.svelte';
  import { MISSING_BOARD_COPY, SKELETON_DELAY_MS, UNREACHABLE_COPY, type FailKind } from '$lib/loading';
  import { loadingStatus } from '$lib/loading.svelte';
  import { viewport } from '$lib/viewport.svelte';

  let { form, failure, slow = false, onRetry }: { form: 'board' | 'list' | 'page'; failure: FailKind | null; slow?: boolean; onRetry: () => unknown } = $props();
  const COLUMNS = [3, 2, 3, 2];
  let on = $state(false);
  onMount(() => {
    if (form !== 'board') return;
    const t = setTimeout(() => (on = true), SKELETON_DELAY_MS);
    const drop = loadingStatus.add('Loading the board…');
    return () => { clearTimeout(t); drop(); };
  });
</script>

<div class="sp-board-wait" data-board-skeleton>
  <!-- One h1 per page: the phone header always draws one, so on a phone this is an h2. -->
  <svelte:element this={viewport.narrow ? 'h2' : 'h1'} class="vk-visually-hidden">{failure === 'missing' ? 'Board not found' : failure ? 'The board could not load' : 'Loading the board'}</svelte:element>
  {#if failure === 'missing'}
    <LoadFailed message={MISSING_BOARD_COPY} home />
  {:else if failure}
    <LoadFailed message={UNREACHABLE_COPY} {onRetry} home />
  {:else if form === 'board'}
    <div class="sp-skeleton sp-board-wait__cols" class:sp-skeleton--on={on} aria-busy="true" data-skeleton>
      <span class="sp-skeleton__word sp-skeleton__word--quiet" aria-hidden="true">Loading…</span>
      <span class="sp-skeleton__word sp-skeleton__word--studio" aria-hidden="true">LOADING</span>
      {#each COLUMNS as n, c (c)}
        <div class="sp-board-wait__col" aria-hidden="true">
          <span class="vk-skeleton sp-board-wait__head"></span>
          {#each Array.from({ length: n }, (_, i) => i) as i (i)}<span class="sp-board-wait__card"><span class="vk-skeleton" style="width: {i % 2 ? '64%' : '82%'};"></span><span class="vk-skeleton sp-skeleton__meta"></span></span>{/each}
        </div>
      {/each}
      {#if slow}<span class="sp-skeleton__slow">Still loading — the server is slow.</span>{/if}
    </div>
  {:else}
    <SkeletonRows label={form === 'list' ? 'Loading the cards…' : 'Loading the board…'} rows={form === 'list' ? 8 : 4} rowHeight={form === 'list' ? 44 : 52} {slow} />
  {/if}
</div>

<style>
  .sp-board-wait { padding: var(--vk-space-4); min-width: 0; }
  .sp-board-wait__cols { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--vk-space-4); align-items: start; }
  .sp-board-wait__col { display: flex; flex-direction: column; gap: var(--vk-space-3); min-width: 0; }
  .sp-board-wait__head { width: 50%; height: 14px; }
  .sp-board-wait__card { display: flex; flex-direction: column; gap: 8px; min-height: 84px; padding: var(--vk-space-3); border: 1px solid var(--vk-color-line); border-radius: var(--vk-radius-md, 10px); }
  .sp-board-wait__card :global(.vk-skeleton) { margin: 0; }
  :global([data-vibe='paper']) .sp-board-wait__card { border-radius: 0; border-width: 0 0 1px; }
  :global([data-vibe='studio']) .sp-board-wait__card { border-radius: 0; }
  :global([data-vibe='quiet']) .sp-board-wait__col { display: none; }
  .sp-board-wait__cols > :global(.sp-skeleton__word), .sp-board-wait__cols > :global(.sp-skeleton__slow) { grid-column: 1 / -1; }
  @media (max-width: 899.98px) {
    .sp-board-wait__cols { grid-template-columns: minmax(0, 1fr); }
    .sp-board-wait__col:nth-child(n + 4) { display: none; }
  }
</style>
