<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { appearance } from '$lib/appearance.svelte';
  import { WORKSPACE_LAYOUTS, WORKSPACE_TABS } from '$lib/layouts';
  import { WORKSPACE_TAB_IDS, type WorkspaceTab } from '$lib/components/workspace/workspace-counts.svelte';

  const tab = $derived((WORKSPACE_TAB_IDS as readonly string[]).includes(page.params.tab ?? '') ? (page.params.tab as WorkspaceTab) : null);
  // An unknown tab lands somewhere rather than on a blank page that looks like a failure.
  $effect(() => { if (tab === null) void goto('/workspace/agents', { replaceState: true }); });
  const vibe = $derived(appearance.value.vibe);
  const Frame = $derived(WORKSPACE_LAYOUTS[vibe]);
  const Tab = $derived(tab ? WORKSPACE_TABS[vibe][tab] : null);
</script>

{#if tab && Tab}
  <Frame {tab} {vibe}><Tab {vibe} /></Frame>
{/if}
