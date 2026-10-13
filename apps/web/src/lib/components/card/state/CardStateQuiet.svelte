<!-- apps/web/src/lib/components/card/state/CardStateQuiet.svelte -->
<script lang="ts">
  /** The card states with no live decision, in Quiet (cells C, D, F): notices in ink or green, no signal. */
  import '../quiet-states.css';
  import { Button } from '@superjackfruit/vibekit';
  import { dayMonth } from '$lib/when';
  import { archivedReason } from '../card-words';
  import { quietRestore } from '../quiet-words';
  import type { CardModel } from '../card-model.svelte';

  let { kind, model: m }: { kind: 'archived' | 'restore' | 'loading'; model: CardModel } = $props();
</script>

{#if kind === 'archived' && m.card?.archivedAt}
  <div class="qcs-notice" role="status"><b>Archived {dayMonth(m.card.archivedAt)}</b><span>{archivedReason(m.card.archivedAt, m.decidedGates)} Nothing on this card waits for you.</span></div>
{:else if kind === 'restore'}
  <div class="qcs-row">
    <Button aria-disabled={m.archiving ? 'true' : undefined} onclick={() => { if (!m.archiving) void m.restore(); }}>Restore</Button>
    <span class="vk-visually-hidden" role="status">{m.archiving ? 'Restoring…' : ''}</span>
    <span class="qcs-meta">{quietRestore(m.stageName)}</span>
  </div>
{:else if kind === 'loading'}
  <p role="status">Loading the card. This can take a few seconds.</p>
  <p class="qcs-meta">Still loading: the stage, what the agent said, and the history.</p>
{/if}
