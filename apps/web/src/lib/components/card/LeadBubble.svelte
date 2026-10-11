<script lang="ts">
  import type { Vibe } from '@superjackfruit/vibekit';
  import AgentFace from '$lib/components/AgentFace.svelte';
  import LeadWords from '$lib/components/LeadWords.svelte';
  import type { CardLead } from './card-lead';
  import type { CardAgent } from './layouts/types';
  let { lead, agent, vibe, label }: { lead: CardLead; agent: CardAgent; vibe: Vibe; label: string } = $props();
</script>

<div class="lead flex items-start gap-2" data-needs={lead.needsYou}>
  {#if agent.id}<AgentFace agentId={agent.id} name={agent.name} iconUrl={agent.iconUrl} mood={agent.mood} size={36} variant="mood" />{/if}
  <div class="min-w-0 flex-1">
    <div class="eyebrow {lead.needsYou ? 'text-signal-text' : 'text-muted-foreground'}">{label}</div>
    <p class="agent-voice mt-1 rounded-[var(--vk-radius-lg)] rounded-tl-[var(--vk-radius-sm)] p-3 text-base leading-relaxed whitespace-pre-wrap" style="background:{lead.needsYou ? 'var(--vk-color-signal-wash)' : 'var(--vk-color-raised)'}"><LeadWords {lead} {vibe} /></p>
    {#if lead.at}<time class="text-muted-foreground mt-1 block text-[11px]" datetime={lead.at}>{new Date(lead.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>{/if}
  </div>
</div>
