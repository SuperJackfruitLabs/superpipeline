<script lang="ts">
  /**
   * Plan · Projects (nav v2): the workspace's projects, its own section of Plan with no board
   * switcher. One composition in every vibe (`ProjectsView`); a project opens in a drawer over it
   * (or its page, on a phone), and New project opens the dialog.
   */
  import { goto } from '$app/navigation';
  import { appearance } from '$lib/appearance.svelte';
  import AppShell from '$lib/components/shell/AppShell.svelte';
  import { shellModel } from '$lib/components/shell/shell-model.svelte';
  import { ProjectsModel } from './projects-model.svelte';
  import ProjectDialog from './projects/ProjectDialog.svelte';
  import ProjectDrawer from './projects/ProjectDrawer.svelte';
  import ProjectsView from './projects/ProjectsView.svelte';

  const model = new ProjectsModel();
  const vibe = $derived(appearance.value.vibe);
  // Loaded during init (ssr is off): the busy mark is held before the first paint.
  void model.refresh();
</script>

<AppShell live={shellModel.liveToggle} here="plan" section="projects" boardName={null} plan="projects" bleed={vibe === 'quiet'} ownHeading primary={{ label: 'New project', onclick: () => (model.dialogOpen = true) }}>
  <!-- Keyed on pending: the list arrives as a fresh frame rather than moving the waiting one (phone CLS). -->
  {#key model.pending}<ProjectsView {model} />{/key}
</AppShell>

{#key model.drawerId}
  {#if model.drawerId}
    <ProjectDrawer projectId={model.drawerId} onclose={() => (model.drawerId = null)} onchanged={() => void model.refresh()} />
  {/if}
{/key}
<ProjectDialog bind:open={model.dialogOpen} onsaved={(id) => void goto(`/plan/projects/${id}`)} onclose={() => {}} />
