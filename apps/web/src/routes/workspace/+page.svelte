<script lang="ts">
  // The old Workspace address: it is Crew now (nav v2).
  import { goto } from '$app/navigation';
  $effect(() => void goto('/crew/agents', { replaceState: true }));
</script>
