<script lang="ts">
  // Bare /plan: Plan · Boards on the open board, or Projects when there is no board yet.
  import { goto } from '$app/navigation';
  import { app } from '$lib/stores/app.svelte';
  $effect(() => void goto(app.boardId ? `/b/${app.boardId}` : '/plan/projects', { replaceState: true }));
</script>
