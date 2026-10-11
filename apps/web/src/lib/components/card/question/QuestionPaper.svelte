<script lang="ts">
  import type { Mood, Vibe } from '@superjackfruit/vibekit';
  import type { Elicitation } from '$lib/api';
  import type { QuestionAnswer } from './question-answer.svelte';

  /** `showQuestion` false: the caller (Paper's letter) already says the question. */
  let { model, elicitation, agent, showQuestion = true }: { model: QuestionAnswer; elicitation: Elicitation; agent: { id: string | null; name: string; iconUrl: string | null; mood: Mood }; vibe: Vibe; showQuestion?: boolean } = $props();
</script>

<section class="sec elicitation" aria-labelledby="q-{elicitation.id}">
  <h3 id="q-{elicitation.id}" class="eyebrow text-signal-text">⚑ {elicitation.signal === 'auth' ? 'awaiting your sign-in' : 'awaiting your answer'}</h3>
  <p class="eyebrow mt-1" title={elicitation.agentId}>{agent.name} is waiting</p>
  {#if showQuestion}<p class="agent-voice mt-2 whitespace-pre-wrap">{elicitation.question}</p>{/if}
  {#if model.error}<p role="alert" class="text-signal-text mt-2 text-sm">{model.error}</p>{/if}
  <fieldset class="mt-3">
    <legend class="font-display">Your reply</legend>
    {#if elicitation.options.length > 0}
      {#each elicitation.options as opt (opt.name)}
        <label class="flex min-h-[var(--vk-target-min)] items-center gap-3">
          <input type="radio" name="q-{elicitation.id}" value={opt.name} bind:group={model.selected} class="size-5" /> {opt.title}
        </label>
      {/each}
      <textarea bind:value={model.text} rows="2" aria-label="Add a note for the agent (optional)" placeholder="Add a note for the agent (optional)…" class="bg-surface mt-2 w-full resize-none rounded-[var(--vk-radius-md)] border-2 px-2.5 py-2 text-base outline-none" style="border-color:var(--vk-color-line)"></textarea>
      <button type="button" class="vk-button vk-button--primary mt-2" disabled={model.answering} onclick={() => model.submit()}>Send reply</button>
    {:else}
      <textarea bind:value={model.text} rows="3" aria-label="Your answer" placeholder="Your answer — this goes straight back to the waiting agent…" class="bg-surface w-full resize-none rounded-[var(--vk-radius-md)] border-2 px-2.5 py-2 text-base outline-none" style="border-color:var(--vk-color-line)"></textarea>
      <button type="button" class="vk-button vk-button--primary mt-2" disabled={model.answering} onclick={() => model.send()}>Send answer</button>
    {/if}
  </fieldset>
</section>
