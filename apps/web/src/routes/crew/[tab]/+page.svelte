<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import CrewView from '$lib/components/workspace/CrewView.svelte';
  import { CREW_TAB_IDS, type CrewTab } from '$lib/components/workspace/workspace-counts.svelte';

  const tab = $derived((CREW_TAB_IDS as readonly string[]).includes(page.params.tab ?? '') ? (page.params.tab as CrewTab) : null);
  // An unknown tab lands somewhere rather than on a blank page that looks like a failure.
  $effect(() => { if (tab === null) void goto('/crew/agents', { replaceState: true }); });
</script>

{#if tab}<CrewView {tab} />{/if}
