<script lang="ts">
  /**
   * The old Operate address. Operate is the Inbox now (nav v2): a link to a board's Operate opens
   * the Inbox showing that board, chosen in memory only (`inboxScope`), as if picked under Show.
   */
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { inboxScope } from '$lib/components/inbox/inbox-scope.svelte';

  $effect(() => {
    inboxScope.choose(page.params.boardId ?? null);
    void goto('/inbox', { replaceState: true });
  });
</script>
