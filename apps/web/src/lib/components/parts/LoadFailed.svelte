<script lang="ts">
  /**
   * A read that failed, said as one: "Couldn't load X." and Try again (never "nothing here", never the
   * raw "Error: getBoard failed (500)"). `home` adds a way back to the Inbox for a whole page that failed.
   */
  import { Button } from '@superjackfruit/vibekit';
  import { TRY_AGAIN } from '$lib/loading';

  let { message, onRetry, home = false }: { message: string; onRetry?: () => unknown; home?: boolean } = $props();
  let busy = $state(false);
  async function retry(): Promise<void> {
    if (!onRetry || busy) return;
    busy = true;
    try { await onRetry(); } finally { busy = false; }
  }
</script>

<div class="sp-failed" data-failed>
  <p>{message}</p>
  {#if onRetry}<Button variant="secondary" class="btn-sm" type="button" {busy} onclick={retry}>{TRY_AGAIN}</Button>{/if}
  {#if home}<Button variant="quiet" class="btn-sm" href="/inbox">Go to your Inbox</Button>{/if}
</div>
