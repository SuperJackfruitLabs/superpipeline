<!-- apps/web/src/lib/components/operate/BoardLogView.svelte -->
<script lang="ts">
  /**
   * The whole board log (up to 500 events), opened from Spend: one composition in every vibe, the
   * back link and the log a page at a time (rule 7). The masthead names the board, so the page has
   * no signature slot.
   */
  import './spend.css';
  import PageMain from '$lib/components/parts/PageMain.svelte';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import BoardLog from './BoardLog.svelte';
  import { LOG_PAGE } from './operate-words';
  import type { BoardLogViewProps } from './spend-types';

  let { boardId, events, error }: BoardLogViewProps = $props();
</script>

<PageMain scope="scr-spend">
  <a class="t-meta back-link" href="/b/{boardId}/operate/telemetry"><LineIcon name="chev-left" size={16} />Back to spend</a>
  <BoardLog {events} {error} collapsedRows={LOG_PAGE} fullLogHref={null} paged />
</PageMain>
