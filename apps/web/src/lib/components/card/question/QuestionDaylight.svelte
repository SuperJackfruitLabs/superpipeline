<!-- apps/web/src/lib/components/card/question/QuestionDaylight.svelte -->
<script lang="ts">
  /** An agent's question in Daylight (SP-Card-States-Daylight B): asked once, then the answer box. */
  import '../daylight-states.css';
  import { Button, Face, Field, type Vibe } from '@superjackfruit/vibekit';
  import type { Elicitation } from '$lib/api';
  import { whenLabel } from '$lib/when';
  import Icon from '$lib/components/parts/Icon.svelte';
  import type { CardAgent } from '../layouts/types';
  import type { QuestionAnswer } from './question-answer.svelte';

  let { model, elicitation, agent }: { model: QuestionAnswer; elicitation: Elicitation; agent: CardAgent; vibe: Vibe } = $props();
  const id = $derived(`q-answer-${elicitation.id}`);
  const name = $derived(agent.name || 'The agent');
  // Busy keeps the buttons enabled (aria-disabled, clicks ignored) so the pressed one keeps focus.
  const send = (opt: string) => { if (!model.answering) void model.send(opt); };
</script>

<div class="elicitation" style="display: contents">
  <div class="ds-msg">
    <Face id={name} label={name} mood="needs" size={36} ring="mood" />
    <div class="ds-bubble ds-bubble--sig">
      <span class="ds-who">{name} · {elicitation.signal === 'auth' ? 'needs you to sign in' : 'has a question'}</span>
      <p class="ds-say" style="white-space: pre-wrap; overflow-wrap: anywhere">{elicitation.question}</p>
      {#if elicitation.createdAt}<span class="ds-time">{whenLabel(elicitation.createdAt, new Date())}</span>{/if}
    </div>
  </div>
  <form style="display: flex; flex-direction: column; gap: var(--vk-space-3); margin-left: 48px;" onsubmit={(e) => { e.preventDefault(); if (!model.answering) void model.submit(); }}>
    {#if elicitation.options.length > 0}
      <div class="ds-btns">
        {#each elicitation.options as opt, i (opt.name)}
          <Button variant={i === 0 ? 'primary' : 'secondary'} aria-disabled={model.answering ? 'true' : undefined} onclick={() => send(opt.name)}>{opt.title}</Button>
        {/each}
      </div>
      <Field {id} control="textarea" rows={2} label="Add a note for the agent (optional)" bind:value={model.text} />
      {#if model.error}<p class="vk-field__error" role="alert">{model.error}</p>{/if}
    {:else}
      <Field {id} control="textarea" label="Your answer" hint={model.error ? undefined : 'With no answer: “Type an answer first.”'} error={model.error ?? undefined} placeholder="It goes straight back to {name}." bind:value={model.text} />
      <!-- Field draws the error; this says it out loud when it appears. -->
      <span class="vk-visually-hidden" role="alert">{model.error ?? ''}</span>

      <div class="ds-btns"><Button type="submit" aria-disabled={model.answering ? 'true' : undefined} aria-busy={model.answering ? 'true' : undefined}>{#snippet icon()}<Icon name="send" size={18} />{/snippet}Send answer</Button></div>
    {/if}
  </form>
  <span class="vk-visually-hidden" role="status">{model.answering ? 'Sending…' : ''}</span>
</div>
