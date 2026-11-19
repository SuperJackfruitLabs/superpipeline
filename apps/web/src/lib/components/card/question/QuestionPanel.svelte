<!-- apps/web/src/lib/components/card/question/QuestionPanel.svelte -->
<script lang="ts">
  /**
   * An agent's question, in place of the card's sentence (composition contract §11.3; card-states.html
   * "Question pending"): the question as a sentence, its options as choices, or an answer in your own
   * words. Answer is the one primary; Move sits beside it. A strict approval reads in plain words
   * (ApprovalDetail), its digest behind a toggle. The same in every vibe.
   */
  import { Button, Choice, Field } from '@superjackfruitlabs/vibekit-ui';
  import type { QuestionBinding } from '../bindings';
  import { QUESTION_FREE_LABEL, QUESTION_ONLY_LABEL, questionLead } from '../card-words';
  import ApprovalDetail from './ApprovalDetail.svelte';

  let { model, elicitation, agent, onMove }: QuestionBinding & { onMove: () => void } = $props();
  const id = $derived(`q-answer-${elicitation.id}`);
  const group = $derived(`q-${elicitation.id}`);
  /** The picked choice, from the radios' change (Choice keeps its own binding). */
  const pick = (e: Event): void => { const t = e.target as HTMLInputElement; if (t.type === 'radio') model.selected = t.value; };
  // Busy keeps the button enabled (aria-disabled, clicks ignored) so it keeps focus; the status says it.
  function send(e: Event): void {
    e.preventDefault();
    if (!model.answering) void model.submit();
  }
</script>

<form class="cv-panel elicitation" data-row="question" onsubmit={send}>
  <div class="cv-panel__body">
    {#if elicitation.detail}
      <p class="cv-sentence"><b>{questionLead(agent.name, elicitation.signal === 'auth')}</b></p>
      <ApprovalDetail detail={elicitation.detail} />
    {:else}
      <p class="cv-sentence cv-pre"><b>{questionLead(agent.name, elicitation.signal === 'auth')}</b> {elicitation.question}</p>
    {/if}
    {#if elicitation.options.length > 0}
      <fieldset class="cv-choices" onchange={pick}>
        <legend class="vk-visually-hidden">Your answer</legend>
        {#each elicitation.options as opt (opt.name)}
          <Choice type="radio" card name={group} value={opt.name} group={model.selected ?? undefined} label={opt.title} description={opt.description} />
        {/each}
      </fieldset>
    {/if}
    <Field {id} control="textarea" rows={2} label={elicitation.options.length > 0 ? QUESTION_FREE_LABEL : QUESTION_ONLY_LABEL} placeholder="Say what the agent should do" bind:value={model.text} />
    {#if model.error}<p class="cv-alert" role="alert">{model.error}</p>{/if}
  </div>
  <div class="cv-act">
    <Button type="submit" variant="primary" aria-disabled={model.answering ? 'true' : undefined} data-busy={model.answering ? 'true' : undefined}>Answer</Button>
    <Button variant="secondary" onclick={onMove}>Move</Button>
  </div>
  <span class="vk-visually-hidden" role="status">{model.answering ? 'Sending…' : ''}</span>
</form>
