<!-- apps/web/src/lib/components/workspace/WorkspaceFrame.svelte -->
<script lang="ts">
  import './workspace.css';
  import PageMain from '$lib/components/parts/PageMain.svelte';
  import WorkspaceHeader from './WorkspaceHeader.svelte';
  import { REVIEW_DESCRIPTION, WORKSPACE_DESCRIPTION } from './workspace-copy';
  import type { WorkspaceFrameProps } from './types';
  let { tab, children }: WorkspaceFrameProps = $props();
</script>

<PageMain scope="scr-ws scr-ws-{tab}">
  <WorkspaceHeader current={tab === 'review' ? 'needs-you' : tab} description={tab === 'review' ? REVIEW_DESCRIPTION : WORKSPACE_DESCRIPTION[tab]} />
  {@render children()}
</PageMain>
