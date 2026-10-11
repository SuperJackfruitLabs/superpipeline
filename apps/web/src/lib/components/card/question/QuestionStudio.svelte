<script lang="ts">
  import type { Mood, Vibe } from '@superjackfruit/vibekit';
  import type { Elicitation } from '$lib/api';
  import { Button } from '$lib/components/ui/button';
  import type { QuestionAnswer } from './question-answer.svelte';

  let { model, elicitation, agent }: { model: QuestionAnswer; elicitation: Elicitation; agent: { id: string | null; name: string; iconUrl: string | null; mood: Mood }; vibe: Vibe } = $props();
</script>

<!-- display:contents: the command bar sticks to the card's scrolling body, not to this section -->
<section class="sec elicitation contents" aria-labelledby="q-{elicitation.id}">
  <p class="mt-5 mb-2 flex items-center gap-2 text-xs">
    <span class="status-led inline-block size-2.5 rounded-full" data-mood="needs" aria-hidden="true"></span>
    <span class="uppercase font-mono" title={elicitation.agentId}>{agent.name} is waiting</span>
  </p>
  <h3 id="q-{elicitation.id}" class="eyebrow text-signal-text mb-2 text-sm font-semibold">⚑ {elicitation.signal === 'auth' ? 'awaiting your sign-in' : 'awaiting your answer'}</h3>
  <p class="agent-voice font-mono mb-3 text-base leading-relaxed whitespace-pre-wrap">{elicitation.question}</p>
  <div class="command-bar bg-surface border-border sticky bottom-0 -mx-1 border-t px-1 py-2">
    {#if model.error}<p role="alert" class="text-signal-text font-mono mb-2 text-sm">{model.error}</p>{/if}
    {#if elicitation.options.length > 0}
      <input type="text" bind:value={model.text} aria-label="Note to {agent.name}" placeholder="Add a note for the agent (optional)…" class="bg-surface font-mono mb-2 w-full rounded-[var(--vk-radius-md)] border-2 px-2.5 py-2 text-base outline-none" style="border-color:var(--vk-color-line)" />
      <div class="flex flex-wrap gap-2">
        {#each elicitation.options as opt, i (opt.name)}
          <Button variant={i === 0 ? 'default' : 'outline'} disabled={model.answering} onclick={() => model.send(opt.name)} style="min-height:var(--tap)">{opt.title}</Button>
        {/each}
      </div>
    {:else}
      <textarea bind:value={model.text} rows="3" aria-label="Your answer" placeholder="Your answer — this goes straight back to the waiting agent…" class="bg-surface font-mono w-full resize-none rounded-[var(--vk-radius-md)] border-2 px-2.5 py-2 text-base outline-none" style="border-color:var(--vk-color-line)"></textarea>
      <div class="mt-2 flex justify-end"><Button disabled={model.answering} onclick={() => model.send()} style="min-height:var(--tap)">Send answer</Button></div>
    {/if}
  </div>
</section>
