<!-- apps/web/src/lib/components/card/question/QuestionQuiet.svelte -->
<script lang="ts">
  /** An agent's question in Quiet (SP-Card-States-Quiet B): one signal-edged fieldset, asked once, then the answer. */
  import '../quiet-states.css';
  import { Button, Face, Field, type Vibe } from '@superjackfruit/vibekit';
  import type { Elicitation } from '$lib/api';
  import { QUIET_CAPTIONS } from '../quiet-words';
  import type { CardAgent } from '../layouts/types';
  import type { QuestionAnswer } from './question-answer.svelte';

  /** `showQuestion` false: the caller already says the question. */
  let { model, elicitation, agent, showQuestion = true }: { model: QuestionAnswer; elicitation: Elicitation; agent: CardAgent; vibe: Vibe; showQuestion?: boolean } = $props();
  const id = $derived(`q-answer-${elicitation.id}`);
  const name = $derived(agent.name || 'The agent');
  // Busy keeps the button enabled (aria-disabled, clicks ignored) so it keeps focus.
  const send = (e: Event) => { e.preventDefault(); if (!model.answering) void model.submit(); };
</script>

<form class="elicitation" onsubmit={send} style="display: contents">
  <fieldset>
    <legend>{elicitation.signal === 'auth' ? 'Your sign-in is needed' : 'Your answer is needed'}</legend>
    {#if showQuestion}
      <p class="qcs-by"><span class="qcs-face"><Face id={name} label={name} mood="needs" size={20} /></span>{name} asked:</p>
      <p style="white-space: pre-wrap">{elicitation.question}</p>
    {/if}
    {#if elicitation.options.length > 0}
      {#each elicitation.options as opt (opt.name)}
        <label class="qcs-radio"><input type="radio" name="q-{elicitation.id}" value={opt.name} bind:group={model.selected} /><span><b>{opt.title}</b></span></label>
      {/each}
      <Field {id} control="textarea" rows={4} label="Note for {name} (optional)" bind:value={model.text} />
      {#if model.error}<p class="vk-field__error" role="alert">{model.error}</p>{/if}
      <div class="qcs-row"><Button type="submit" aria-disabled={model.answering ? 'true' : undefined} aria-busy={model.answering ? 'true' : undefined}>Submit decision</Button></div>
    {:else}
      <Field {id} control="textarea" rows={4} label="Your answer (it goes straight to {name})" hint={model.error ? undefined : QUIET_CAPTIONS.question} error={model.error ?? undefined} bind:value={model.text} />
      <span class="vk-visually-hidden" role="alert">{model.error ?? ''}</span>
      <div class="qcs-row"><Button type="submit" aria-disabled={model.answering ? 'true' : undefined} aria-busy={model.answering ? 'true' : undefined}>Send answer</Button></div>
    {/if}
    <span class="vk-visually-hidden" role="status">{model.answering ? 'Sending…' : ''}</span>
  </fieldset>
</form>
