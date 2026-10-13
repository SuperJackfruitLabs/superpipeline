<!-- apps/web/src/lib/components/card/state/CardStateStudio.svelte -->
<script lang="ts">
  /** Studio's archived banner (ink, no signal), its Restore row, and the loading readout (cell F). */
  import '../studio/card-studio.css';
  import '../studio/card-states-studio.css';
  import Icon from '$lib/components/parts/Icon.svelte';
  import { archivedReason } from '../card-words';
  import { archivedBanner, restoreHint } from '../studio/studio-format';
  import type { CardModel } from '../card-model.svelte';

  let { kind, model: m }: { kind: 'archived' | 'reason' | 'restore' | 'loading'; model: CardModel } = $props();
</script>

{#if kind === 'archived' && m.card?.archivedAt}
  <div class="ss-banner" role="status"><Icon name="archive" size={16} strokeWidth={1.75} />{archivedBanner(m.card.archivedAt)}<span>No decisions open</span></div>
{:else if kind === 'reason' && m.card?.archivedAt}
  <div class="ar-q off"><h3>Archived · reason</h3><blockquote>{archivedReason(m.card.archivedAt, m.decidedGates)}</blockquote></div>
{:else if kind === 'restore'}
  <div class="ss-row"><button class="ar-btn" type="button" aria-disabled={m.archiving ? 'true' : undefined} onclick={() => { if (!m.archiving) void m.restore(); }}><Icon name="restore" size={15} strokeWidth={1.75} />Restore</button><span class="vk-visually-hidden" role="status">{m.archiving ? 'Restoring…' : ''}</span><span class="ar-hint">{restoreHint(m.stageIndex, m.stageName)}</span></div>
{:else if kind === 'loading'}
  <div class="ss-figs"><div><span class="ss-sk"></span><span>Stage</span></div><div><span class="ss-sk"></span><span>Attempts</span></div><div><span class="ss-sk"></span><span>Waiting</span></div><div><span class="ss-sk"></span><span>Cost</span></div></div>
  <div class="ar-q off"><h3 role="status">Loading readout…</h3><span class="ss-sk"></span><span class="ss-sk" style="width: 80%;"></span><span class="ss-sk" style="width: 60%;"></span></div>
{/if}
