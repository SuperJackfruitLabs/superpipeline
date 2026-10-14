<script lang="ts">
  /** A project's page (SP-ProjectPage, SP-Phone-Project): the shell, "Back to Projects", the project. */
  import { goto } from '$app/navigation';
  import { appearance } from '$lib/appearance.svelte';
  import AppShell from '$lib/components/shell/AppShell.svelte';
  import PageMain from '$lib/components/parts/PageMain.svelte';
  import { ProjectPageModel } from '../project-page-model.svelte';
  import ProjectBody from './ProjectBody.svelte';

  let { projectId }: { projectId: string } = $props();
  // svelte-ignore state_referenced_locally
  const model = new ProjectPageModel(projectId);
  void model.load();
  const vibe = $derived(appearance.value.vibe);
</script>

<AppShell here="plan" section="project" boardName={null} view={null} plan="projects" title={model.project?.name ?? 'Project'} showing={null} bleed={vibe === 'quiet'} ownHeading>
  <PageMain scope="scr-project">
    <a class="pjb-back" href="/plan/projects">Back to Projects</a>
    <ProjectBody {model} ondeleted={() => void goto('/plan/projects', { replaceState: true })} />
  </PageMain>
</AppShell>
