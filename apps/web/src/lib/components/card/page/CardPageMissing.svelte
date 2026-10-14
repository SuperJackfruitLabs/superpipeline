<!-- apps/web/src/lib/components/card/page/CardPageMissing.svelte -->
<script lang="ts">
  /**
   * The card page before its board has loaded (a skeleton in aria-busy), for a board that is not there
   * for you (404/403), for a board that could not load (5xx, network, timeout: Try again), and for a
   * card the board does not hold.
   */
  import SkeletonRows from '$lib/components/parts/SkeletonRows.svelte';
  import LoadFailed from '$lib/components/parts/LoadFailed.svelte';
  import { MISSING_BOARD_COPY, UNREACHABLE_COPY } from '$lib/loading';

  let { kind, boardName, boardHref, onRetry }: { kind: 'loading' | 'missing' | 'gone' | 'error'; boardName: string; boardHref: string; onRetry?: () => unknown } = $props();
</script>

<main id="content" style="max-width: 72ch; margin: 0 auto; padding: var(--vk-space-7) var(--vk-space-5); display: flex; flex-direction: column; gap: var(--vk-space-3);">
  {#if kind === 'loading'}
    <h1 class="vk-visually-hidden">Card</h1>
    <SkeletonRows label="Loading the card…" rows={6} rowHeight={48} />
  {:else if kind === 'gone'}
    <h1 style="margin: 0; font: 700 var(--vk-text-xl)/1.2 var(--vk-font-display);">Board not found</h1>
    <LoadFailed message={MISSING_BOARD_COPY} home />
  {:else if kind === 'error'}
    <h1 style="margin: 0; font: 700 var(--vk-text-xl)/1.2 var(--vk-font-display);">The card could not load</h1>
    <LoadFailed message={UNREACHABLE_COPY} {onRetry} home />
  {:else}
    <h1 style="margin: 0; font: 700 var(--vk-text-xl)/1.2 var(--vk-font-display);">Card not found</h1>
    <p>This card is not on {boardName} any more.</p>
    <p><a href={boardHref}>Back to the board</a></p>
  {/if}
</main>
