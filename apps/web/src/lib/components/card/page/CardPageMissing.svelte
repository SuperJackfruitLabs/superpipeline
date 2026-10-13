<!-- apps/web/src/lib/components/card/page/CardPageMissing.svelte -->
<script lang="ts">
  /** The card page before its board has loaded, and for a card the board does not hold. */
  let { kind, boardName, boardHref }: { kind: 'loading' | 'missing' | 'error'; boardName: string; boardHref: string } = $props();
</script>

<main id="content" style="max-width: 72ch; margin: 0 auto; padding: var(--vk-space-7) var(--vk-space-5); display: flex; flex-direction: column; gap: var(--vk-space-3);">
  {#if kind === 'loading'}
    <h1 class="vk-visually-hidden">Card</h1>
    <p role="status">Loading the card…</p>
  {:else if kind === 'error'}
    <h1 style="margin: 0; font: 700 var(--vk-text-xl)/1.2 var(--vk-font-display);">Board not available</h1>
    <p role="alert">This board could not be opened. It may not exist, or you may not have access to it.</p>
    <p><a href="/">Back to your boards</a></p>
  {:else}
    <h1 style="margin: 0; font: 700 var(--vk-text-xl)/1.2 var(--vk-font-display);">Card not found</h1>
    <p>This card is not on {boardName} any more.</p>
    <p><a href={boardHref}>Back to the board</a></p>
  {/if}
</main>
