<!-- apps/web/src/routes/dev/workspace-review/+page.svelte -->
<script lang="ts">
  /** The review composite of five workspace tabs (SP-Workspace-Other-*), drawn the way the workspace pages are. Dev builds only. */
  import { appearance } from '$lib/appearance.svelte';
  import { WORKSPACE_LAYOUTS, WORKSPACE_REVIEW_LAYOUTS } from '$lib/layouts';
  import AppShell from '$lib/components/shell/AppShell.svelte';
  import { shellModel } from '$lib/components/shell/shell-model.svelte';
  import { needsPart } from '$lib/components/shell/shell-words';
  import { workspaceCounts } from '$lib/components/workspace/workspace-counts.svelte';

  /** The artboard draws the resume form open on fixture card 1dfc, with this note typed in. */
  const initial = { expandedResume: 'card_e10fb4fe39a91dfc', resumeText: 'The commit is on the branch now. Pick up from the handoff step.' };
  const vibe = $derived(appearance.value.vibe);
  const Frame = $derived(WORKSPACE_LAYOUTS[vibe]);
  const Review = $derived(WORKSPACE_REVIEW_LAYOUTS[vibe]);
  // Only Studio's workspace references draw a status line (as on the workspace pages).
  const status = $derived(vibe === 'studio' ? shellModel.pageStatus(['Workspace', needsPart(shellModel.attentionCount)]) : null);
  // Loaded during init (ssr is off): the busy mark is held before the first paint.
  void workspaceCounts.refresh();
</script>

<AppShell here="workspace" section="workspace" boardName={null} view={null} showing={null} {status} bleed={vibe === 'quiet'} ownHeading>
  <Frame tab="review" {vibe}><Review {initial} /></Frame>
</AppShell>
