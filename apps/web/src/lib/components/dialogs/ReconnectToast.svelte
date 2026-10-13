<script lang="ts">
  /** The quiet renewal, said once: no scrim, the page stays usable (D-16). No reference draws it. */
  import { Toast } from '@superjackfruit/vibekit';
  import { app } from '$lib/stores/app.svelte';
  import { auth } from '$lib/auth-recovery.svelte';
  import { toastSub } from './reconnect-copy';
</script>

{#if auth.state === 'renewing'}
  <div class="rc-toast-wrap">
    <Toast message="Signing you back in…" detail={toastSub(app.openCardId !== null)} tone="busy" />
  </div>
{/if}
