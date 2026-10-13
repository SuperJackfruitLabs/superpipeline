<script lang="ts">
  /**
   * The root the Plan, Workspace and Settings pages share: `div.page.{scope}`. The shell owns the one
   * `main` (id `#main`) and its gutters, so a page never draws its own landmark.
   */
  import type { Snippet } from 'svelte';
  let { scope, children }: { scope: string; children: Snippet } = $props();
</script>

<div class="page {scope}">{@render children()}</div>
