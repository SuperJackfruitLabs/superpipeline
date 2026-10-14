<script lang="ts">
  // Bare /crew has no tab to show; agents is the one people come here for.
  import { goto } from '$app/navigation';
  $effect(() => void goto('/crew/agents', { replaceState: true }));
</script>
