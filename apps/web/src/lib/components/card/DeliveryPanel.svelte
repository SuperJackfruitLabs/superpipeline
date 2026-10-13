<script lang="ts">
  /** The approved-delivery controls (pre-sweep, shared by every vibe until a reference redraws them). */
  import { Button } from '$lib/components/ui/button';
  import { safeHref } from './spec-details';
  import type { CardModel } from './card-model.svelte';
  let { model: m }: { model: CardModel } = $props();
  const card = $derived(m.card);
</script>

{#if m.deliveryGate?.approvalSubject}
  <section class="sec">
    <div class="border-border bg-inset rounded-[10px] border p-3.5">
      <div class="mb-2 flex items-center justify-between gap-2">
        <span class="wordmark text-sm font-semibold">Approved delivery</span>
        <span class="mono text-muted-foreground text-[10px] uppercase">{m.deliveryGate.delivery?.mode}</span>
      </div>

      {#if m.gateError}
        <p role="alert" class="border-coral/40 text-coral mono mb-2.5 rounded-[7px] border px-3 py-2 text-xs">{m.gateError}</p>
      {/if}

      {#if m.deliveryGate.decision === 'approve_manual'}
        <p class="text-muted-foreground mb-3 text-xs">Post these authoritative frozen bytes yourself. No publisher can claim this card.</p>
        <div class="space-y-3">
          {#each m.manualItems as item (item.index)}
            <div class="bg-surface border-border rounded-[7px] border p-2.5">
              <div class="mb-2 flex items-center justify-between gap-2">
                <span class="mono text-[10px] uppercase">Post {item.index + 1}</span>
                <Button size="sm" variant="outline" onclick={() => void m.delivery.copy(item.index, item.text)}>
                  {m.delivery.copied === item.index ? 'Copied' : 'Copy exact text'}
                </Button>
              </div>
              <pre class="font-sans text-xs whitespace-pre-wrap">{item.text}</pre>
              {#if item.media.length > 0}
                <div class="mt-2 flex flex-wrap gap-2">
                  {#each item.media as media (media.digest)}
                    {#if safeHref(media.href)}
                      <a class="mono text-marigold text-[11px] underline" href={safeHref(media.href)!} download={media.filename} title={media.altText || media.digest}>
                        Download {media.filename}
                      </a>
                    {:else}
                      <span class="mono text-muted-foreground text-[11px]" title={media.digest}>Media download unavailable</span>
                    {/if}
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <div class="mt-3 flex flex-col gap-2">
          <label for="manual-live-url" class="mono text-[11px]">Live post URL</label>
          <div class="flex gap-2">
            <input id="manual-live-url" bind:value={m.delivery.liveUrl} type="url" placeholder="https://x.com/…/status/…" class="bg-surface border-border min-w-0 flex-1 rounded-[7px] border px-2.5 py-2 text-xs" />
            <Button size="sm" disabled={m.delivery.saving || m.delivery.liveUrl.trim() === ''} onclick={() => void m.delivery.change({ liveUrl: m.delivery.liveUrl.trim() })}>Record URL</Button>
          </div>
          {#if m.deliveryGate.delivery?.liveUrl}
            <p class="mono text-[11px]">
              Recorded: <a class="underline" href={m.deliveryGate.delivery.liveUrl} target="_blank" rel="noreferrer">{m.deliveryGate.delivery.liveUrl}</a>
              · read-back {m.deliveryGate.delivery.readBackStatus === 'not_checked' ? 'not available' : m.deliveryGate.delivery.readBackStatus}
            </p>
          {/if}
          <Button size="sm" variant="outline" disabled={m.delivery.saving || !!m.deliveryGate.delivery?.liveUrl} onclick={() => void m.delivery.change({ mode: 'automatic' })}>
            Switch to automatic delivery
          </Button>
        </div>
      {:else if card?.state !== 'working'}
        <p class="text-muted-foreground mb-2 text-xs">Automatic delivery has not started. You can still take over manually without approving a new digest.</p>
        <Button size="sm" variant="outline" disabled={m.delivery.saving} onclick={() => void m.delivery.change({ mode: 'manual' })}>Switch to manual delivery</Button>
      {:else}
        <p class="text-muted-foreground text-xs">Automatic delivery has started; switching is fenced.</p>
      {/if}
    </div>
  </section>
{/if}
