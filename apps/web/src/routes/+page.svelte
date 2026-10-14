<script lang="ts">
  /**
   * The front door. It is a redirect, not a screen: the app opens on the Inbox (nav v2).
   *
   * `app.init()` resolves which board to open — the remembered one, then the first one — and sets
   * `needsBoard` when there is none, so a workspace with no board still lands on onboarding.
   */
  import { goto } from '$app/navigation';
  import { app } from '$lib/stores/app.svelte';
  import Onboarding from '$lib/components/Onboarding.svelte';
  import LoadFailed from '$lib/components/parts/LoadFailed.svelte';
  import { UNREACHABLE_COPY } from '$lib/loading';
  import { returnToHeld } from '$lib/reconnect';

  $effect(() => {
    // After a Reconnect the layout sends the person back to where they were instead.
    if (app.authState === 'ready' && app.boardId && !returnToHeld()) void goto('/inbox', { replaceState: true });
  });
</script>

{#if app.needsBoard}
  <Onboarding />
{:else if app.bootFailure}
  <main class="flex flex-1 flex-col items-center justify-center gap-3 text-center">
    <h1 class="sr-only">Superpipeline</h1>
    <LoadFailed message={UNREACHABLE_COPY} onRetry={() => app.retry()} />
  </main>
{:else}
  <main class="flex flex-1 flex-col items-center justify-center gap-3 text-center">
    <h1 class="sr-only">Opening your inbox</h1>
    <div class="mono text-muted-foreground flex items-center gap-2 text-xs"><span class="live-dot"></span>finding your boards…</div>
  </main>
{/if}
