<!-- apps/web/src/lib/components/workspace/WorkspaceFrameStudio.svelte -->
<script lang="ts">
  import './workspace-studio.css';
  import WorkspaceHeaderStudio from './WorkspaceHeaderStudio.svelte';
  import { REVIEW_DESCRIPTION, WORKSPACE_DESCRIPTION } from './workspace-copy';
  import type { WorkspaceFrameProps } from './types';
  let { tab, children }: WorkspaceFrameProps = $props();
  const description = $derived(tab === 'review' ? REVIEW_DESCRIPTION : WORKSPACE_DESCRIPTION[tab]);
</script>

<!-- The shell owns the one main; Agents is `wa-main`, every other tab and the review route `wo-main`. -->
{#if tab === 'agents'}
  <div class="wa-main"><WorkspaceHeaderStudio current="agents" {description} form="agents" />{@render children()}</div>
{:else}
  <div class="wo-main"><WorkspaceHeaderStudio current={tab === 'review' ? 'needs-you' : tab} {description} form="other" />{@render children()}</div>
{/if}
