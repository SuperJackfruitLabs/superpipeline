<script lang="ts">
  /** The question as Studio's card shows it above the tabs: who is waiting and what they ask. */
  import type { Mood } from '@superjackfruit/vibekit';
  import type { Elicitation } from '$lib/api';

  /** `showQuestion` false: the caller (Studio's card readout) already says the question. */
  let { elicitation, agent, showQuestion = true }: { elicitation: Elicitation; agent: { id: string | null; name: string; iconUrl: string | null; mood: Mood }; showQuestion?: boolean } = $props();
</script>

<section class="sec elicitation" aria-labelledby="q-{elicitation.id}">
  <p class="mb-2 flex items-center gap-2 text-xs">
    <span class="status-led inline-block size-2.5 rounded-full" data-mood="needs" aria-hidden="true"></span>
    <span class="uppercase font-mono" title={elicitation.agentId}>{agent.name} is waiting</span>
  </p>
  <h3 id="q-{elicitation.id}" class="eyebrow text-signal-text mb-2 text-sm font-semibold">⚑ {elicitation.signal === 'auth' ? 'awaiting your sign-in' : 'awaiting your answer'}</h3>
  {#if showQuestion}<p class="agent-voice font-mono mb-3 text-base leading-relaxed whitespace-pre-wrap">{elicitation.question}</p>{/if}
</section>
