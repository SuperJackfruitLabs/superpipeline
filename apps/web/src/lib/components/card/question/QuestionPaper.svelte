<!-- apps/web/src/lib/components/card/question/QuestionPaper.svelte -->
<script lang="ts">
  /** An agent's question in Paper (SP-Card-States-Paper B): the letter asks once, then the reply. */
  import '../paper-states.css';
  import { Button, Face, Field, type Vibe } from '@superjackfruit/vibekit';
  import type { Elicitation } from '$lib/api';
  import { PAPER_CAPTIONS, firstName, paperSalutation, paperWhen } from '../paper-words';
  import type { CardAgent } from '../layouts/types';
  import type { QuestionAnswer } from './question-answer.svelte';

  /** `showQuestion` false: the caller already says the question. */
  let { model, elicitation, agent, personName = 'there', showQuestion = true }: { model: QuestionAnswer; elicitation: Elicitation; agent: CardAgent; vibe: Vibe; personName?: string; showQuestion?: boolean } = $props();
  const id = $derived(`q-answer-${elicitation.id}`);
  const name = $derived(agent.name || 'The agent');
  // Busy keeps the button enabled (aria-disabled, clicks ignored) so it keeps focus.
  const send = (e: Event) => { e.preventDefault(); if (!model.answering) void model.submit(); };
</script>

<div class="elicitation" style="display: contents">
  {#if showQuestion}
    <p class="pcs-dear">{paperSalutation(personName)}</p>
    <p class="pcs-voice" style="white-space: pre-wrap; overflow-wrap: anywhere">{elicitation.question}</p>
    <div class="pcs-sign">
      <Face id={name} label={name} mood="needs" size={32} />
      <div><span class="n">{name}</span><p class="pcs-small">{elicitation.createdAt ? paperWhen(elicitation.createdAt, new Date().toISOString()) : ''}{elicitation.signal === 'auth' ? `${elicitation.createdAt ? ' · ' : ''}needs you to sign in` : ''}</p></div>
    </div>
  {/if}
  <form class="pcs-reply" onsubmit={send}>
    <h3 class="pcs-h">Your reply</h3>
    {#if elicitation.options.length > 0}
      <fieldset class="pcs-choices">
        <legend>Your answer</legend>
        {#each elicitation.options as opt (opt.name)}
          <label class="pcs-choice"><input type="radio" name="q-{elicitation.id}" value={opt.name} bind:group={model.selected} /><span><b>{opt.title}</b></span></label>
        {/each}
      </fieldset>
      <Field {id} control="textarea" rows={4} label="Add a note for the agent (optional)" bind:value={model.text} />
      {#if model.error}<p class="vk-field__error" role="alert">{model.error}</p>{/if}
      <div class="pcs-row"><Button type="submit" aria-disabled={model.answering ? 'true' : undefined} aria-busy={model.answering ? 'true' : undefined}>Send reply</Button></div>
    {:else}
      <Field {id} control="textarea" rows={4} label="Your answer goes straight back to {name}" hint={model.error ? undefined : PAPER_CAPTIONS.question} error={model.error ?? undefined} bind:value={model.text} />
      <!-- Field draws the error; this says it out loud when it appears. -->
      <span class="vk-visually-hidden" role="alert">{model.error ?? ''}</span>
      <div class="pcs-row"><Button type="submit" aria-disabled={model.answering ? 'true' : undefined} aria-busy={model.answering ? 'true' : undefined}>Send answer</Button></div>
    {/if}
    <span class="vk-visually-hidden" role="status">{model.answering ? 'Sending…' : ''}</span>
  </form>
</div>
