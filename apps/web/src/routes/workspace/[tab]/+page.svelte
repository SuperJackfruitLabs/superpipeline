<script lang="ts">
  /**
   * Old Workspace links keep working (nav v2): Needs you is the Inbox, Labels and Connections are in
   * Settings, and Agents, People and Capabilities are Crew.
   */
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { workspaceRedirect } from '$lib/components/workspace/workspace-redirect';

  $effect(() => void goto(workspaceRedirect(page.params.tab ?? ''), { replaceState: true }));
</script>
