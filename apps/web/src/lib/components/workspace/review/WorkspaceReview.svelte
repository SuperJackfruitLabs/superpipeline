<!-- apps/web/src/lib/components/workspace/review/WorkspaceReview.svelte -->
<script lang="ts">
  /** Labels and Connections moved to Settings (SettingsView); this composite keeps the Crew-side tabs. */
  import NeedsYouTab from '../NeedsYouTab.svelte';
  import PeopleTab from '../PeopleTab.svelte';
  import CapabilitiesTab from '../CapabilitiesTab.svelte';
  import type { WorkspaceTabProps } from '../types';
  import { CAPS_REVIEW_NOTE, NEEDS_REVIEW_NOTE } from './review-copy';
  let { initial }: { initial: WorkspaceTabProps['initial'] } = $props();
</script>

<div class="grid2">
  <div style="display: flex; flex-direction: column; gap: var(--vk-space-5); min-width: 0px;">
    <NeedsYouTab review={{ tag: 'Needs you tab', note: NEEDS_REVIEW_NOTE }} {initial} />
  </div>
  <div style="display: flex; flex-direction: column; gap: var(--vk-space-5); min-width: 0px;">
    <PeopleTab review={{ tag: 'People tab' }} />
  </div>
  <CapabilitiesTab review={{ tag: 'Capabilities tab', note: CAPS_REVIEW_NOTE, span2: true }} />
</div>
