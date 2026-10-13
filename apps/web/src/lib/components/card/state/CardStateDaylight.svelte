<!-- apps/web/src/lib/components/card/state/CardStateDaylight.svelte -->
<script lang="ts">
  /**
   * The three card states with no live decision, in Daylight (cells C, D, F): the archived banner
   * and its Restore, the done block, and the loading shape. No signal in any of them.
   */
  import '../daylight-states.css';
  import { Face } from '@superjackfruit/vibekit';
  import { whenLabel } from '$lib/when';
  import Icon from '$lib/components/parts/Icon.svelte';
  import { archivedReason, archivedTitle, doneLine, loadingBars, loadingNote, restoreNote } from '../card-words';
  import type { CardModel } from '../card-model.svelte';

  let { kind, model: m }: { kind: 'archived' | 'restore' | 'done' | 'loading'; model: CardModel } = $props();
  const card = $derived(m.card!);
  const who = $derived(m.agent.name || 'The agent');
  const said = $derived(typeof m.handoff?.summary === 'string' ? m.handoff.summary : null);
  const handedOn = $derived(typeof m.handoff?.handedOn === 'string' ? m.handoff.handedOn : null);
</script>

{#if kind === 'archived' && card.archivedAt}
  <div class="ds-banner" role="status"><Icon name="archive" size={22} /><div><b>{archivedTitle(card.archivedAt)}</b><span class="ds-quiet">{archivedReason(card.archivedAt, m.decidedGates)}</span></div></div>
{:else if kind === 'restore'}
  <div class="ds-btns"><button class="vk-button vk-button--primary" type="button" disabled={m.archiving} onclick={() => m.restore()}><Icon name="restore" size={18} /> {m.archiving ? 'Restoring…' : 'Restore'}</button><span class="ds-quiet">{restoreNote(m.stageName)}</span></div>
{:else if kind === 'done'}
  <div class="ds-done" role="status"><span class="ds-check"><Icon name="check" size={24} /></span><div><b>Done</b><span style="font-size: var(--vk-text-sm);">{doneLine(m.stageName, card.stateSince ?? '', card.attemptCount, new Date())}</span></div></div>
  {#if said}
    <div class="ds-msg"><Face id={who} label={who} mood="done" size={36} ring="mood" /><div class="ds-bubble"><span class="ds-who">{who} · finished it</span><p class="ds-say">{said}</p>{#if card.stateSince}<span class="ds-time">{whenLabel(card.stateSince, new Date())}</span>{/if}</div></div>
  {/if}
  {#if handedOn}<div class="ds-hand"><b style="font-size: var(--vk-text-sm);">Handed on</b><span class="ds-quiet">{handedOn}</span></div>{/if}
{:else if kind === 'loading'}
  <div class="ds-row" style="gap: 3px;">{#each loadingBars(m.stages.length, m.stageIndex) as f, i (i)}<span class="ds-sk" style="flex: {f} 1 0%; height: 7px;"></span>{/each}</div>
  <div class="ds-msg"><Face id={who} label={who} mood="thinking" size={36} ring="mood" /><div style="display: flex; flex-direction: column; gap: var(--vk-space-2);"><span class="ds-sk" style="width: 40%;"></span><span class="ds-sk ds-sk--blk"></span></div></div>
  <p class="ds-quiet" role="status">{loadingNote(m.agent.name)}</p>
{/if}
