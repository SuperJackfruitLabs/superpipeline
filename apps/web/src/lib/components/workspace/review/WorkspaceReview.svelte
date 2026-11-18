<!-- apps/web/src/lib/components/workspace/review/WorkspaceReview.svelte -->
<script lang="ts">
  /** The workspace panels outside Crew's own page, side by side. Dev review route only. */
  import NeedsYouTab from '../NeedsYouTab.svelte';
  import CrewView from '../CrewView.svelte';
  import type { WorkspaceTabProps } from '../types';
  import { NEEDS_REVIEW_NOTE } from './review-copy';
  let { initial }: { initial: WorkspaceTabProps['initial'] } = $props();
</script>

<div class="grid2">
  <div style="display: flex; flex-direction: column; gap: var(--vk-space-5); min-width: 0px;">
    <NeedsYouTab review={{ tag: 'Needs you tab', note: NEEDS_REVIEW_NOTE }} {initial} />
  </div>
  <div style="display: flex; flex-direction: column; gap: var(--vk-space-5); min-width: 0px;">
    <CrewView tab="people" />
  </div>
</div>
