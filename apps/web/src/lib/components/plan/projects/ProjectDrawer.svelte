<script lang="ts">
  /**
   * A project over the Projects list (SP-Project-Drawer): vibekit's Drawer, the same content as the
   * page in its compact form, and "Open full page". Closing returns focus to the row that opened it.
   * A phone never opens it: the list links straight to the page.
   */
  import { Button, Drawer } from '@superjackfruit/vibekit';
  import { plural } from '$lib/words';
  import { ProjectPageModel } from '../project-page-model.svelte';
  import ProjectBody from './ProjectBody.svelte';

  let { projectId, onclose, onchanged }: { projectId: string; onclose: () => void; onchanged: () => void } = $props();

  // One model per project id; the parent keys this component on the id.
  // svelte-ignore state_referenced_locally
  const model = new ProjectPageModel(projectId);
  void model.load();
  let open = $state(true);
  const eyebrow = $derived(`Project · ${plural(model.cards.length, 'card', 'cards')} on ${plural(model.boards.length, 'board', 'boards')}`);
</script>

{#snippet tools()}<Button variant="tool" href="/plan/projects/{projectId}">Open full page</Button>{/snippet}

<Drawer bind:open title={model.project?.name ?? 'Project'} {eyebrow} width="560px" class="pjdrawer" {tools} onclose={() => { open = false; onclose(); }}>
  <ProjectBody {model} compact ondeleted={() => { open = false; onchanged(); onclose(); }} {onchanged} />
</Drawer>
