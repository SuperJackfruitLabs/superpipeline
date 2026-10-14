<script lang="ts">
  /** The Inbox, the app's home (nav v2). It reads every board, so it sits outside `/b/[boardId]`. */
  import InboxView from '$lib/components/inbox/InboxView.svelte';
  import Onboarding from '$lib/components/Onboarding.svelte';
  import { app } from '$lib/stores/app.svelte';
</script>

{#if app.needsBoard}<Onboarding />{:else}<InboxView />{/if}
