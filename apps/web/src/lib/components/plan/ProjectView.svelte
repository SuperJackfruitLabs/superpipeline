<script lang="ts">
  /**
   * Plan · Projects (nav v2): the workspace's projects, its own section of Plan with no board
   * switcher. The vibe picks the list's layout; a project opens in a drawer over it (or its page,
   * on a phone), and New project opens the dialog.
   */
  import { goto } from '$app/navigation';
  import { appearance } from '$lib/appearance.svelte';
  import { PROJECTS_LAYOUTS } from '$lib/layouts';
  import AppShell from '$lib/components/shell/AppShell.svelte';
  import { shellModel } from '$lib/components/shell/shell-model.svelte';
  import { plural } from '$lib/words';
  import { ProjectsModel } from './projects-model.svelte';
  import ProjectDialog from './projects/ProjectDialog.svelte';
  import ProjectDrawer from './projects/ProjectDrawer.svelte';

  const model = new ProjectsModel();
  const vibe = $derived(appearance.value.vibe);
  const Layout = $derived(PROJECTS_LAYOUTS[vibe]);
  // Loaded during init (ssr is off): the busy mark is held before the first paint.
  void model.refresh();
  // Only Studio's references draw a status line.
  const status = $derived(vibe === 'studio' ? shellModel.pageStatus([model.pending ? 'Projects' : plural(model.projects.length, 'project', 'projects'), 'across the workspace']) : null);
</script>

<AppShell here="plan" section="projects" boardName={null} view={null} plan="projects" showing="Projects belong to the workspace, not to a board." {status} bleed={vibe === 'quiet'} ownHeading primary={{ label: 'New project', onclick: () => (model.dialogOpen = true) }}>
  <!-- Keyed on pending: the list arrives as a fresh frame rather than moving the waiting one (phone CLS). -->
  {#key model.pending}<Layout {model} {vibe} />{/key}
</AppShell>

{#key model.drawerId}
  {#if model.drawerId}
    <ProjectDrawer projectId={model.drawerId} onclose={() => (model.drawerId = null)} onchanged={() => void model.refresh()} />
  {/if}
{/key}
<ProjectDialog bind:open={model.dialogOpen} onsaved={(id) => void goto(`/plan/projects/${id}`)} onclose={() => {}} />
