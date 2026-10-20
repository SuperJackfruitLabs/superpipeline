<script lang="ts">
  /**
   * The screen before the app has a page to draw: signing in, then finding your boards. Never blank:
   * the vibe's background (app.html's first frame), the mark and wordmark centred, one polite status
   * line; from 8 s it says the server is slow, from 20 s it says it could not reach Superpipeline and
   * offers Try again. Quiet draws the words alone.
   */
  import { onMount } from 'svelte';
  import { appearance } from '$lib/appearance.svelte';
  import LogoMotion from '$lib/components/LogoMotion.svelte';
  import LoadFailed from '$lib/components/parts/LoadFailed.svelte';
  import { REQUEST_TIMEOUT_MS, SLOW_COPY, SLOW_MS, UNREACHABLE_COPY } from '$lib/loading';

  let { label, heading, onRetry = () => location.reload() }: { label: string; heading: string; onRetry?: () => void } = $props();
  let phase = $state<'waiting' | 'slow' | 'failed'>('waiting');
  const quiet = $derived(appearance.value.vibe === 'quiet');
  let timers: ReturnType<typeof setTimeout>[] = [];
  function start(): void {
    timers.forEach(clearTimeout);
    phase = 'waiting';
    timers = [setTimeout(() => (phase = 'slow'), SLOW_MS), setTimeout(() => (phase = 'failed'), REQUEST_TIMEOUT_MS)];
  }
  function retry(): void { start(); onRetry(); }
  onMount(() => { start(); return () => timers.forEach(clearTimeout); });
</script>

<main class="sp-boot min-h-viewport safe-x flex flex-1 flex-col items-center justify-center gap-3 text-center" data-boot={phase}>
  <h1 class="sr-only">{heading}</h1>
  {#if !quiet}
    <!-- The large mark: the pack's Channel animation, once per session (LogoMotion holds that rule). -->
    <LogoMotion size={72} playIntro />
    <div class="wordmark text-lg" aria-hidden="true">superpipeline</div>
  {/if}
  {#if phase === 'failed'}
    <LoadFailed message={UNREACHABLE_COPY} onRetry={retry} />
  {:else}
    <p class="text-muted-foreground flex items-center gap-2 text-sm" class:mono={!quiet} role="status">
      {#if !quiet}<span class="live-dot" aria-hidden="true"></span>{/if}{label}{#if phase === 'slow'}<span> {SLOW_COPY}</span>{/if}
    </p>
  {/if}
</main>
