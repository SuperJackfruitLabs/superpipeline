<script lang="ts">
  /** The gate as Studio's card shows it above the tabs: who, what, the lead and the immutable subject. */
  import type { Mood, Vibe } from '@superjackfruit/vibekit';
  import type { Gate } from '$lib/api';
  import Words from '$lib/components/Words.svelte';
  import { leadText } from '$lib/copy';
  import type { CardLead } from '../card-lead';
  import { sealOf } from './gate-decision.svelte';

  let { gate, agent, lead, vibe }: {
    gate: Gate; agent: { id: string | null; name: string; iconUrl: string | null; mood: Mood }; lead: CardLead; vibe: Vibe;
  } = $props();
</script>

<section class="sec" aria-labelledby="gate-h-{gate.id}">
  <p class="mb-2 flex items-center gap-2 text-xs">
    <span class="status-led inline-block size-2.5 rounded-full" data-mood="needs" aria-hidden="true"></span>
    <span class="uppercase font-mono">{agent.name} · needs decision</span>
  </p>
  <h3 id="gate-h-{gate.id}" class="eyebrow text-signal-text mb-2 text-sm font-semibold">⚑ awaiting your review</h3>
  <p class="agent-voice font-mono mb-3 text-base"><Words text={leadText(lead, vibe)} /></p>
  {#if gate.approvalSubject}
    <div class="bg-surface border-border font-mono mb-3 rounded-[var(--vk-radius-md)] border p-2.5 text-xs">
      <div class="mb-1 font-semibold">Immutable approval subject · revision {gate.approvalSubject.revision}</div>
      <div class="text-muted-foreground break-all">{gate.approvalSubject.id}</div>
      <div class="text-muted-foreground break-all">{gate.approvalSubject.digest}</div>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex: a scrollable region must be keyboard reachable -->
      <pre tabindex="0" role="region" aria-label="Approval subject, canonical JSON" class="mt-2 max-h-64 overflow-auto whitespace-pre-wrap">{JSON.stringify(gate.approvalSubject.canonical, null, 2)}</pre>
      <div class="mt-2">Approving exactly this version · sealed {sealOf(gate.approvalSubject.digest)}</div>
    </div>
  {/if}
</section>
