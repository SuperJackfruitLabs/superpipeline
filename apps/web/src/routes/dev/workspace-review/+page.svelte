<!-- apps/web/src/routes/dev/workspace-review/+page.svelte -->
<script lang="ts">
  /**
   * The workspace panels outside Crew, together for review. Dev builds only. A minimal wrapper (a
   * heading and a line) in every vibe: Crew's own tabs are CrewView at /crew.
   */
  import { appearance } from '$lib/appearance.svelte';
  import AppShell from '$lib/components/shell/AppShell.svelte';
  import PageMain from '$lib/components/parts/PageMain.svelte';
  import { shellModel } from '$lib/components/shell/shell-model.svelte';
  import { workspaceCounts } from '$lib/components/workspace/workspace-counts.svelte';
  import WorkspaceReview from '$lib/components/workspace/review/WorkspaceReview.svelte';
  import { REVIEW_DESCRIPTION } from '$lib/components/workspace/review/review-copy';
  import '$lib/components/workspace/workspace.css';

  /** The resume form starts open on fixture card 1dfc, with this note typed in. */
  const initial = { expandedResume: 'card_e10fb4fe39a91dfc', resumeText: 'The commit is on the branch now. Pick up from the handoff step.' };
  const vibe = $derived(appearance.value.vibe);
  // Loaded during init (ssr is off): the busy mark is held before the first paint.
  void workspaceCounts.refresh();
</script>

<AppShell live={shellModel.liveToggle} here="crew" section="crew" boardName={null} bleed={vibe === 'quiet'} ownHeading>
  <PageMain scope="scr-ws scr-ws-review">
    <h1 class="t-h1">Workspace review</h1>
    <p class="t-body" style="color: var(--vk-color-muted); max-width: 70ch;">{REVIEW_DESCRIPTION}</p>
    <WorkspaceReview {initial} />
  </PageMain>
</AppShell>
