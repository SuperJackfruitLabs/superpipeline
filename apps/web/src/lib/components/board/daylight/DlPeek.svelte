<!-- apps/web/src/lib/components/board/daylight/DlPeek.svelte -->
<script lang="ts">
  /** What the card's agent says, beside the tile, from 1440px (SB §3.3 Peek). */
  import { Button, Face, IconButton } from '@superjackfruit/vibekit';
  import { app } from '$lib/stores/app.svelte';
  import { KIND_SAYS, peekEyebrow } from '../board-words';
  import type { CardSummary } from '../card-summary';

  let { s, actionLabel, onAct, onClose }: { s: CardSummary; actionLabel: string | null; onAct: () => void; onClose: () => void } = $props();
  const speaker = $derived(s.lastAgent ?? s.delegate);
  const says = $derived(s.kind ? (KIND_SAYS[s.kind] ?? null) : null);
</script>

<aside class="dl-peek" aria-label="Peek">
  <IconButton class="dl-close" icon="x" label="Close peek" onclick={onClose} />
  <span class="eyebrow">{peekEyebrow(s)}</span>
  <h3>{s.title}</h3>
  {#if speaker && s.stopReason}
    <div class="dl-say">
      <Face id={speaker.name} label={speaker.name} mood={s.urgency === 'needs' ? 'needs' : 'working'} size={36} src={speaker.iconUrl ?? undefined} />
      <p class="dl-bubble" style="margin: 0px;"><span class="who">{speaker.name}{says ? ` · ${says}` : ''}</span><span class="dl-clamp">{s.stopReason}</span></p>
    </div>
  {/if}
  <div class="dl-peekfoot">
    {#if actionLabel}<Button variant="primary" onclick={onAct}>{actionLabel}</Button>{/if}
    <Button variant="secondary" onclick={() => app.openCard(s.id)}>Open card to read it all</Button>
  </div>
  <span class="dl-hint" style="margin: 0px;">Opens when you point at or focus a card · Esc closes</span>
</aside>
