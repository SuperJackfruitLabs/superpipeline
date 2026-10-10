<!-- apps/web/src/lib/components/card/LibraryArtifact.svelte -->
<script lang="ts">
  import { untrack } from 'svelte';
  import { mountArtifact, type Mounted } from '$lib/vendor/superlibrary-embed/superlibrary-embed.js';
  import { LIBRARY_URL, embedCallbacks, needsReconnect, reasonFor, sentenceFor } from '$lib/superlibrary';
  import { reconnect } from '$lib/reconnect';
  import { appearance } from '$lib/appearance.svelte';

  let { itemId, version, title, open: startOpen = false }: { itemId: string; version?: number; title: string; open?: boolean } = $props();
  let open = $state(untrack(() => startOpen));
  let host = $state<HTMLElement | null>(null);
  let failure = $state<unknown>(null);
  const href = $derived(`${LIBRARY_URL}/a/${itemId}${version ? `/v/${version}` : ''}`);
  const frameId = `lib-${Math.random().toString(36).slice(2, 10)}`;

  // The embed renders every kind in a sandboxed frame on Superlibrary's content origin (spec §9).
  $effect(() => {
    const el = host;
    if (!open || !el) {
      failure = null;
      return;
    }
    let live = true;
    let mounted: Mounted | null = null;
    failure = null;
    mountArtifact(el, { itemId, ...(version ? { version } : {}), title, appUrl: LIBRARY_URL, height: 360, ...embedCallbacks() })
      .then((m) => { if (live) mounted = m; else m.destroy(); })
      .catch((e: unknown) => { if (live) failure = e; });
    return () => { live = false; mounted?.destroy(); };
  });
</script>

<div class="border-border rounded-[7px] border p-2">
  <div class="flex flex-wrap items-center gap-2">
    <button type="button" class="border-border hover:border-marigold/50 min-h-[44px] rounded-[5px] border px-2 text-xs" aria-expanded={open} aria-controls={open ? frameId : undefined} onclick={() => (open = !open)}>
      {open ? 'Hide preview' : 'Show preview'}
    </button>
    <a {href} target="_blank" rel="noopener noreferrer" class="flex min-h-[44px] min-w-0 flex-1 items-center text-xs [overflow-wrap:anywhere] hover:underline">{title}</a>
  </div>
  {#if open}<div id={frameId} class="mt-2" bind:this={host}></div>{/if}
  {#if failure}
    <div role="alert" class="mt-2 text-xs">
      <p class="text-signal-text">{sentenceFor(failure, appearance.value.vibe)}</p>
      {#if needsReconnect(failure)}
        <p class="text-muted-foreground mt-1 mono">{reasonFor(failure)}</p>
        <button type="button" class="vk-button vk-button--secondary mt-2" onclick={() => reconnect()}>Reconnect</button>
      {/if}
    </div>
  {/if}
</div>
