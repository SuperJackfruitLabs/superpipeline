<script lang="ts">
  /** The answer: options and a note, or a free answer, on a bar that stays in view at the end of the card. */
  import type { Mood } from '@superjackfruit/vibekit';
  import type { Elicitation } from '$lib/api';
  import { Button } from '$lib/components/ui/button';
  import type { QuestionAnswer } from './question-answer.svelte';

  let { model, elicitation, agent }: { model: QuestionAnswer; elicitation: Elicitation; agent: { id: string | null; name: string; iconUrl: string | null; mood: Mood } } = $props();
</script>

<div class="command-bar bg-surface border-border sticky bottom-0 -mx-1 border-t px-1 py-2 max-h-[35dvh] overflow-y-auto">
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
