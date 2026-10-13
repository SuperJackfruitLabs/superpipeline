<!-- apps/web/src/lib/components/operate/BoardLogPage.svelte -->
<script lang="ts">
  import './spend.css';
  import PageMain from '$lib/components/parts/PageMain.svelte';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import BoardLog from './BoardLog.svelte';
  import type { BoardLogPageProps } from './spend-types';
  let { boardId, events, error }: BoardLogPageProps = $props();
</script>

<PageMain scope="scr-spend">
  <a class="t-meta back-link" href="/b/{boardId}/operate/telemetry"><LineIcon name="chev-left" size={16} />Back to Operate · spend</a>
  <BoardLog {events} {error} collapsedRows={Infinity} fullLogHref={null} />
</PageMain>
