<script lang="ts">
  /** One project's page (nav v2), at its own address like a card's. */
  import { page } from '$app/state';
  import ProjectPage from '$lib/components/plan/projects/ProjectPage.svelte';
</script>

{#key page.params.projectId}
  <ProjectPage projectId={page.params.projectId!} />
{/key}
