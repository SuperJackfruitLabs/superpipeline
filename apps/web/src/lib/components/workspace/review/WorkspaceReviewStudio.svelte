<!-- apps/web/src/lib/components/workspace/review/WorkspaceReviewStudio.svelte -->
<script lang="ts">
  import NeedsYouStudio from '../studio/NeedsYouStudio.svelte';
  import CapabilitiesStudio from '../studio/CapabilitiesStudio.svelte';
  import LabelsStudio from '../studio/LabelsStudio.svelte';
  import PeopleStudio from '../studio/PeopleStudio.svelte';
  import ConnectionsStudio from '../studio/ConnectionsStudio.svelte';
  import type { WorkspaceTabProps } from '../types';
  import { CAPS_REVIEW_NOTE, CONNECTIONS_REVIEW_NOTE, NEEDS_REVIEW_NOTE } from './review-copy';
  let { initial }: { initial: WorkspaceTabProps['initial'] } = $props();
</script>

<NeedsYouStudio review={{ tag: 'Needs you tab', note: NEEDS_REVIEW_NOTE, no: '01' }} {initial} />
<CapabilitiesStudio review={{ tag: 'Capabilities tab', note: CAPS_REVIEW_NOTE, no: '02' }} />
<div class="wo-split">
  <div class="wo-stackcol">
    <LabelsStudio review={{ tag: 'Labels tab', no: '03' }} />
    <PeopleStudio review={{ tag: 'People tab', no: '04' }} />
  </div>
  <ConnectionsStudio review={{ tag: 'Connections tab', note: CONNECTIONS_REVIEW_NOTE, no: '05' }} />
</div>
