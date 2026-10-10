<script lang="ts">
  import type { Mood, Vibe } from '@superjackfruit/vibekit';
  import type { Elicitation } from '$lib/api';
  import { Button } from '$lib/components/ui/button';
  import AgentFace from '$lib/components/AgentFace.svelte';
  import type { QuestionAnswer } from './question-answer.svelte';

  let { model, elicitation, agent }: { model: QuestionAnswer; elicitation: Elicitation; agent: { id: string | null; name: string; iconUrl: string | null; mood: Mood }; vibe: Vibe } = $props();
</script>

<section class="sec" aria-labelledby="q-{elicitation.id}">
  <div class="elicitation rounded-[var(--vk-radius-lg)] border-2 p-3.5" style="border-color:var(--vk-color-signal);background:var(--vk-color-signal-wash)">
    <div class="mb-2 flex flex-wrap items-center gap-2">
      <h3 id="q-{elicitation.id}" class="wordmark text-signal-text text-sm font-semibold">⚑ {elicitation.signal === 'auth' ? 'awaiting your sign-in' : 'awaiting your answer'}</h3>
      <span class="eyebrow ml-auto" title={elicitation.agentId}>{agent.name} is waiting</span>
    </div>
    <div class="mb-3 flex items-start gap-2">
      <AgentFace agentId={elicitation.agentId} name={agent.name} iconUrl={agent.iconUrl} mood="needs" size={36} variant="mood" />
      <p class="agent-voice bg-surface flex-1 rounded-[var(--vk-radius-md)] p-3 text-base leading-relaxed whitespace-pre-wrap">{elicitation.question}</p>
    </div>
    {#if model.error}<p role="alert" class="text-signal-text mb-2 text-sm">{model.error}</p>{/if}
    {#if elicitation.options.length > 0}
      <div class="flex flex-wrap gap-2">
        {#each elicitation.options as opt, i (opt.name)}
          <Button size="sm" variant={i === 0 ? 'default' : 'outline'} disabled={model.answering} onclick={() => model.send(opt.name)} style="min-height:var(--tap)">{opt.title}</Button>
        {/each}
      </div>
      <textarea bind:value={model.text} rows="2" aria-label="Add a note for the agent (optional)" placeholder="Add a note for the agent (optional)…" class="bg-surface border-border mt-2.5 w-full resize-none rounded-[var(--vk-radius-md)] border-2 px-2.5 py-2 text-base outline-none" style="border-color:var(--vk-color-signal)"></textarea>
    {:else}
      <textarea bind:value={model.text} rows="3" aria-label="Your answer" placeholder="Your answer — this goes straight back to the waiting agent…" class="bg-surface border-border w-full resize-none rounded-[var(--vk-radius-md)] border-2 px-2.5 py-2 text-base outline-none" style="border-color:var(--vk-color-signal)"></textarea>
      <div class="mt-2 flex justify-end"><Button size="sm" disabled={model.answering} onclick={() => model.send()} style="min-height:var(--tap)">Send answer</Button></div>
    {/if}
  </div>
</section>
