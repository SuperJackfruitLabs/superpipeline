<script lang="ts">
  /**
   * The loading stand-in every screen shares (loading-audit design rules). It reserves the space of
   * the rows it stands for from the first frame, shows its bars only after 150 ms (a fast answer
   * flashes nothing), and sits in aria-busy. Its words go to the screen's one polite status line
   * (`loadingStatus`, drawn by +layout.svelte), so a screen with three of these still says one thing.
   *
   * By vibe (app.css, .sp-skeleton): Daylight soft rounded bars with a gentle shimmer; Paper hairline
   * ruled blank lines, no shimmer; Studio grey blocks with a mono LOADING label; Quiet the word
   * "Loading…" alone, no bars, no motion. Reduced motion stops every animation (vibekit).
   *
   * `rowHeight` sizes each row to the real one it stands for (two lines: a title and a meta line),
   * so the page does not jump when the rows arrive.
   *
   * `slow` (from 8 s) adds "Still loading — the server is slow." and, given `onRetry`, Try again:
   * a wait that has gone on says what to do, it does not rest on bars.
   */
  import { onMount } from 'svelte';
  import { Button } from '@superjackfruit/vibekit';
  import { SKELETON_DELAY_MS, SLOW_COPY, TRY_AGAIN } from '$lib/loading';
  import { loadingStatus } from '$lib/loading.svelte';

  let { label, rows = 3, rowHeight, slow = false, onRetry }: { label: string; rows?: number; rowHeight?: number; slow?: boolean; onRetry?: () => unknown } = $props();
  const WIDTHS = ['92%', '74%', '58%', '83%', '66%'];
  let on = $state(false);
  let retrying = $state(false);
  async function retry(): Promise<void> {
    if (!onRetry || retrying) return;
    retrying = true;
    try { await onRetry(); } finally { retrying = false; }
  }
  onMount(() => {
    const t = setTimeout(() => (on = true), SKELETON_DELAY_MS);
    const drop = loadingStatus.add(label);
    return () => { clearTimeout(t); drop(); };
  });
</script>

<div class="sp-skeleton" class:sp-skeleton--on={on} class:sp-skeleton--rows={!!rowHeight} aria-busy="true" data-skeleton>
  <span class="sp-skeleton__word sp-skeleton__word--quiet" aria-hidden="true">Loading…</span>
  <span class="sp-skeleton__word sp-skeleton__word--studio" aria-hidden="true">LOADING</span>
  {#each Array.from({ length: rows }, (_, i) => i) as i (i)}
    {#if rowHeight}
      <span class="sp-skeleton__row" aria-hidden="true" style="min-height: {rowHeight}px;"><span class="vk-skeleton" style="width: {WIDTHS[i % WIDTHS.length]};"></span><span class="vk-skeleton sp-skeleton__meta"></span></span>
    {:else}
      <span class="vk-skeleton" aria-hidden="true" style="width: {WIDTHS[i % WIDTHS.length]};"></span>
    {/if}
  {/each}
  {#if slow}<span class="sp-skeleton__slow" data-slow>{SLOW_COPY}</span>{#if onRetry}<Button variant="secondary" class="btn-sm" type="button" busy={retrying} onclick={retry}>{TRY_AGAIN}</Button>{/if}{/if}
</div>
