<!-- apps/web/src/lib/components/workspace/agents/CapabilityChips.svelte -->
<script lang="ts">
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import type { CapabilityRecord } from '$lib/api';
  import { chipKeys, isUnusedCap } from '../agent-status';
  import { AgentsModel } from '../agents-model.svelte';

  let {
    selected = $bindable(), typed = $bindable(), registry, labelledBy, inputId, form, wrapInput,
  }: { selected: string[]; typed: string; registry: CapabilityRecord[]; labelledBy: string; inputId: string; form: 'page' | 'studio' | 'dialog'; wrapInput: boolean } = $props();

  const keys = $derived(chipKeys(registry, selected));
  function flip(k: string): void {
    selected = selected.includes(k) ? selected.filter((x) => x !== k) : [...selected, k];
  }
  function onKey(e: KeyboardEvent): void {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    selected = AgentsModel.addTyped(selected, typed);
    typed = '';
  }
</script>

{#snippet input()}
  <label class={form === 'dialog' ? 'vk-visually-hidden' : 'sr'} for={inputId}>New capability</label>
  {#if form === 'dialog'}
    <input class="vk-field__input" id={inputId} placeholder="Add a capability" bind:value={typed} onkeydown={onKey} />
  {:else}
    <input class={form === 'studio' ? 'ar-in' : 'input'} id={inputId} placeholder="Add a capability" style="width: 200px; min-height: 36px;" bind:value={typed} onkeydown={onKey} />
  {/if}
{/snippet}

<div class={form === 'studio' ? 'wa-caps' : 'caps'} role="group" aria-labelledby={labelledBy}>
  {#each keys as k (k)}
    <button class={form === 'studio' ? 'wa-pick' : 'chip pick'} aria-pressed={selected.includes(k)} type="button" data-unused={isUnusedCap(k, registry) ? '' : undefined} onclick={() => flip(k)}>{#if selected.includes(k)}<LineIcon name="check" size={14} stroke={form === 'studio' ? 1.75 : 1.8} />{/if}{k}</button>
  {/each}
  {#if wrapInput}<span style="display: inline-flex; gap: 6px;">{@render input()}</span>{:else}{@render input()}{/if}
</div>
