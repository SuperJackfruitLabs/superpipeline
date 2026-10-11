<script lang="ts">
  import type { Vibe } from '@superjackfruit/vibekit';
  import AgentFace from '$lib/components/AgentFace.svelte';
  import LeadWords from '$lib/components/LeadWords.svelte';
  import type { CardSummary } from './card-summary';

  let { summary, vibe, onOpen }: { summary: CardSummary | null; vibe: Vibe; onOpen: (id: string) => void } = $props();
  const action = $derived(
    !summary ? null : summary.questionFrom ? 'Answer' : summary.gatePending ? 'Review' : summary.lead.kind === 'stopped' || summary.lead.kind === 'failed' ? 'Resume' : 'Open',
  );
  let actionButton = $state<HTMLButtonElement>();
  /** Where a tile's P key sends focus. */
  export function focusAction(): void {
    actionButton?.focus();
  }
</script>

<aside aria-label="Peek" class="border-border bg-surface flex w-[320px] shrink-0 flex-col gap-3 overflow-y-auto border-l p-4">
  <div class="eyebrow">Peek</div>
  {#if summary}
    <p class="font-display text-lg leading-snug">{summary.title}</p>
    <div class="flex items-start gap-2">
      {#if summary.delegate}<AgentFace agentId={summary.delegate.id} name={summary.delegate.name} iconUrl={summary.delegate.iconUrl} mood={summary.mood} size={36} variant="mood" />{/if}
      <p class="agent-voice bg-raised min-h-[3rem] flex-1 rounded-[var(--vk-radius-md)] p-3 text-sm"><LeadWords lead={summary.lead} {vibe} /></p>
    </div>
    <button bind:this={actionButton} type="button" class="vk-button tap {summary.lead.needsYou ? 'vk-button--signal' : 'vk-button--secondary'}" onclick={() => onOpen(summary.id)}>{action}</button>
  {:else}
    <p class="text-muted-foreground text-sm">Point at a card to see what its agent says.</p>
  {/if}
</aside>
