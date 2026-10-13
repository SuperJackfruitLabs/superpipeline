<!-- apps/web/src/lib/components/operate/BoardLogPageStudio.svelte -->
<script lang="ts">
  import './spend-studio.css';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import BoardLogStudio from './BoardLogStudio.svelte';
  import type { BoardLogPageProps } from './spend-types';
  let { boardId, events, error }: BoardLogPageProps = $props();
</script>

<div class="sp-main">
  <div class="sp-line"><a class="ar-lk quiet" href="/b/{boardId}/operate/telemetry"><LineIcon name="chev-left" size={16} />Back to Operate · spend</a></div>
  <BoardLogStudio {events} {error} collapsedRows={Infinity} fullLogHref={null} no="01" />
</div>
