<!-- apps/web/src/lib/components/workspace/CrewLoad.svelte -->
<script lang="ts">
  /**
   * A Crew tab's list read, per contract rule 11: the skeleton holds the space, from 8 s it says the
   * server is slow with Try again, a failed read says so with Try again, and only a read list shows
   * the table (`children`). Never an empty list in place of an unknown one.
   */
  import type { Snippet } from 'svelte';
  import type { LoadPhase } from '$lib/loading.svelte';
  import SkeletonRows from '$lib/components/parts/SkeletonRows.svelte';
  import LoadFailed from '$lib/components/parts/LoadFailed.svelte';

  let { phase, loading, failed, onRetry, children }: { phase: LoadPhase; loading: string; failed: string; onRetry: () => unknown; children: Snippet } = $props();
</script>

{#if phase === 'failed'}
  <LoadFailed message={failed} {onRetry} />
{:else if phase === 'ready'}
  {@render children()}
{:else}
  <SkeletonRows label={loading} rows={4} rowHeight={56} slow={phase === 'slow'} {onRetry} />
{/if}
