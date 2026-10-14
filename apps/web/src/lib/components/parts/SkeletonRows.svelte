<script lang="ts">
  /**
   * A loading stand-in: vibekit's .vk-skeleton bars inside an aria-busy region, with the words for screen readers.
   * Drawn only while nothing has loaded, so resting screens never contain it.
   */
  let { label, rows = 3 }: { label: string; rows?: number } = $props();
  const WIDTHS = ['92%', '74%', '58%', '83%', '66%'];
</script>

<div class="sp-skeleton" aria-busy="true" data-skeleton>
  <span class="vk-visually-hidden" role="status">{label}</span>
  {#each Array.from({ length: rows }, (_, i) => i) as i (i)}<span class="vk-skeleton" aria-hidden="true" style="width: {WIDTHS[i % WIDTHS.length]};"></span>{/each}
</div>
