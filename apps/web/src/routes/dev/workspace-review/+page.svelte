<!-- apps/web/src/routes/dev/workspace-review/+page.svelte -->
<script lang="ts">
  /** The review composite of five workspace tabs (SP-Workspace-Other-*), drawn the way the workspace pages are. Dev builds only. */
  import { appearance } from '$lib/appearance.svelte';
  import { WORKSPACE_LAYOUTS, WORKSPACE_REVIEW_LAYOUTS } from '$lib/layouts';
  import AppShell from '$lib/components/shell/AppShell.svelte';
  import { shellModel } from '$lib/components/shell/shell-model.svelte';
  import { workspaceCounts } from '$lib/components/workspace/workspace-counts.svelte';

  /** The artboard draws the resume form open on fixture card 1dfc, with this note typed in. */
  const initial = { expandedResume: 'card_e10fb4fe39a91dfc', resumeText: 'The commit is on the branch now. Pick up from the handoff step.' };
  const vibe = $derived(appearance.value.vibe);
  const Frame = $derived(WORKSPACE_LAYOUTS[vibe]);
  const Review = $derived(WORKSPACE_REVIEW_LAYOUTS[vibe]);
  // Loaded during init (ssr is off): the busy mark is held before the first paint.
  void workspaceCounts.refresh();
</script>

<AppShell live={shellModel.liveToggle} here="crew" section="crew" boardName={null} bleed={vibe === 'quiet'} ownHeading>
  <Frame tab="review" {vibe}><Review {initial} /></Frame>
</AppShell>
