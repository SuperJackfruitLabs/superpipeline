<script lang="ts">
  import type { Mood, Vibe } from '@superjackfruit/vibekit';
  import type { Elicitation } from '$lib/api';
  import type { QuestionAnswer } from './question-answer.svelte';

  let { model, elicitation, agent }: { model: QuestionAnswer; elicitation: Elicitation; agent: { id: string | null; name: string; iconUrl: string | null; mood: Mood }; vibe: Vibe } = $props();
</script>

<section class="sec elicitation" aria-label="Your decision">
  <fieldset class="border-2 border-[var(--vk-color-text)] p-4">
    <legend class="px-1 font-semibold">Your decision is needed</legend>
    <p class="text-sm">⚑ {elicitation.signal === 'auth' ? 'awaiting your sign-in' : 'awaiting your answer'}</p>
    <p class="text-sm" title={elicitation.agentId}>{agent.name} is waiting</p>
    <p class="mt-2 whitespace-pre-wrap">{elicitation.question}</p>
    {#if elicitation.options.length > 0}
      <div class="mt-3 grid gap-1">
        {#each elicitation.options as opt (opt.name)}
          <label class="flex min-h-[var(--vk-target-min)] gap-3">
            <input type="radio" name="q-{elicitation.id}" value={opt.name} bind:group={model.selected} class="mt-1 size-5 shrink-0" />
            <span><b>{opt.title}</b></span>
          </label>
        {/each}
      </div>
      <label for="q-note-{elicitation.id}" class="mt-3 mb-1 block text-sm">Note for {agent.name} (optional)</label>
      <textarea id="q-note-{elicitation.id}" bind:value={model.text} rows="2" placeholder="Goes straight back to the waiting agent with your choice." class="w-full resize-y border-2 border-[var(--vk-color-text)] bg-transparent px-2.5 py-2 text-base"></textarea>
      <div class="mt-2">
        {#if model.error}<p role="alert" class="mb-2 text-sm">{model.error}</p>{/if}
        <button type="button" class="vk-button vk-button--primary" disabled={model.answering} onclick={() => model.submit()}>Submit decision</button>
      </div>
    {:else}
      <label for="q-answer-{elicitation.id}" class="mt-3 mb-1 block text-sm">Your answer</label>
      <textarea id="q-answer-{elicitation.id}" bind:value={model.text} rows="3" placeholder="Your answer goes straight back to the waiting agent." class="w-full resize-y border-2 border-[var(--vk-color-text)] bg-transparent px-2.5 py-2 text-base"></textarea>
      <div class="mt-2">
        {#if model.error}<p role="alert" class="mb-2 text-sm">{model.error}</p>{/if}
        <button type="button" class="vk-button vk-button--primary" disabled={model.answering} onclick={() => model.send()}>Send answer</button>
      </div>
    {/if}
  </fieldset>
</section>
