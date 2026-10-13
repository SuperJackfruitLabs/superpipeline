<!-- apps/web/src/lib/components/card/state/CardStatePaper.svelte -->
<script lang="ts">
  /**
   * The card states with no live decision, in Paper (cells C, D, F): the archived banner and its
   * Restore, the done mark, and the loading letter. No signal in any of them.
   */
  import '../paper-states.css';
  import { Button } from '@superjackfruit/vibekit';
  import { dayMonth } from '$lib/when';
  import Icon from '$lib/components/parts/Icon.svelte';
  import { archivedReason } from '../card-words';
  import { paperDoneStatus, paperRestoreNote } from '../paper-words';
  import type { CardModel } from '../card-model.svelte';

  let { kind, model: m }: { kind: 'archived' | 'restore' | 'done' | 'loading'; model: CardModel } = $props();
  const card = $derived(m.card);
</script>

{#if kind === 'archived' && card?.archivedAt}
  <div class="pcs-banner" role="status"><Icon name="archive" size={22} /><div><b>Archived {dayMonth(card.archivedAt)}</b><p class="pcs-small">{archivedReason(card.archivedAt, m.decidedGates)}</p></div></div>
{:else if kind === 'restore'}
  <div class="pcs-row">
    <Button aria-disabled={m.archiving ? 'true' : undefined} onclick={() => { if (!m.archiving) void m.restore(); }}>{#snippet icon()}<Icon name="restore" size={18} />{/snippet}Restore</Button>
    <span class="vk-visually-hidden" role="status">{m.archiving ? 'Restoring…' : ''}</span>
    <span class="pcs-small">{paperRestoreNote(m.stageName)}</span>
  </div>
{:else if kind === 'done' && card}
  <div class="pcs-done" role="status"><b>This is done.</b><span class="pcs-small">{paperDoneStatus(card.stateSince ?? card.createdAt, card.attemptCount, new Date().toISOString())}</span></div>
{:else if kind === 'loading'}
  <span class="pcs-sk pcs-sk--55"></span>
  <span class="pcs-sk pcs-sk--30"></span>
  <span class="pcs-sk"></span><span class="pcs-sk"></span><span class="pcs-sk pcs-sk--70"></span>
  <p class="pcs-small pcs-loadnote" role="status">Opening the letter…</p>
{/if}
