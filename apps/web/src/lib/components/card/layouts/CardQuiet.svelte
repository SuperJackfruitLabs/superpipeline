<script lang="ts">
  /**
   * Quiet's card is one plain page (spec §5.2): the way back, the title, one line of meta, the
   * decision if there is one, then every fact under a heading in a fixed order. No disclosures, no
   * motion. The shell hands every section in; this file only places them.
   */
  import LeadWords from '$lib/components/LeadWords.svelte';
  import { ageLabel } from '$lib/age';
  import { app } from '$lib/stores/app.svelte';
  import GateQuiet from '../gate/GateQuiet.svelte';
  import QuestionQuiet from '../question/QuestionQuiet.svelte';
  import type { CardLayoutProps } from './types';

  let { card, vibe, boardName, stages, stageIndex, stageName, ageHours, lead, agent, sections, counts, editing, gate, question }: CardLayoutProps = $props();
  const age = $derived(ageLabel(ageHours));
  const meta = $derived(
    `Stage ${stageIndex + 1} of ${stages.length}: ${stageName} · Agent: ${agent.name || 'nobody yet'} · ${card.state}${age ? ` ${age === 'just now' ? age : `${age} ago`}` : ''}`,
  );
  // A card that needs you but has no panel of its own (stopped, failed, over budget) is drawn as
  // a fieldset; the gate and the question bring their own.
  const decides = $derived(lead.needsYou && !gate && !question);
</script>

<!--
  A heading over an empty section is a stop that leads nowhere for someone moving by headings, so
  an empty one says so. Driven by the counts the shell passes; every section still renders.
-->
{#snippet none(empty: boolean, words = 'None.')}{#if empty}<p class="text-muted-foreground mt-2 text-sm">{words}</p>{/if}{/snippet}

<!-- pr-14 leaves room for the shell's 44px close target -->
<div class="font-body flex-none px-4 pt-4 pr-14 pb-3">
  <button type="button" class="vk-link inline-flex min-h-[var(--vk-target-min)] items-center text-sm underline" onclick={() => app.closeCard()}>← {boardName} board</button>
  <!-- The title stays in the page while editing (visually hidden), so the dialog keeps its name. -->
  <h2 id="drawer-title" class="mt-1 text-xl leading-snug font-semibold" class:sr-only={editing}>{card.title}</h2>
  {#if editing}
    {@render sections.editForm()}
  {:else}
    <p class="text-muted-foreground mt-1 text-sm">{meta}</p>
  {/if}
</div>

<!-- Unbroken tokens (handoffs, tool arguments, references) must not push the panel sideways. -->
<div class="font-body mx-auto min-h-0 w-full max-w-[640px] flex-1 space-y-6 overflow-x-hidden overflow-y-auto px-4 pb-8" style="overflow-wrap:anywhere">
  {@render sections.error()}

  <!--
    One place for the decision, whatever the card needs: the panel, or the lead in a fieldset, then
    the resume snippet, which decides its own visibility. Only this wrapper and its words vary.
  -->
  <svelte:element this={decides ? 'fieldset' : 'div'} class={decides ? 'border-2 border-[var(--vk-color-text)] p-4' : ''}>
    {#if decides}<legend class="px-1 font-semibold">Your decision is needed</legend>{/if}
    {#if question}
      <QuestionQuiet model={question.model} elicitation={question.elicitation} agent={question.agent} {vibe} />
    {:else if gate}
      <GateQuiet boardId={gate.boardId} gate={gate.gate} error={gate.error} onResponse={gate.onResponse} {agent} {lead} {vibe} />
    {:else}
      <p><LeadWords {lead} {vibe} /></p>
    {/if}
    <div class="mt-3">{@render sections.resume()}</div>
  </svelte:element>

  <section aria-labelledby="q-details">
    <h3 id="q-details" class="text-base font-semibold">Details</h3>
    <div class="mt-2 space-y-3">
      {@render sections.status()}
      {@render sections.facts()}
      {@render sections.details()}
      {@render sections.editButton()}
    </div>
  </section>
  <section aria-labelledby="q-description"><h3 id="q-description" class="text-base font-semibold">Description</h3>{@render none(!counts.description)}<div class="mt-2">{@render sections.description()}</div></section>
  <section aria-labelledby="q-criteria"><h3 id="q-criteria" class="text-base font-semibold">Acceptance criteria</h3>{@render none(!counts.criteria)}<div class="mt-2">{@render sections.criteria()}</div></section>
  <section aria-labelledby="q-plan"><h3 id="q-plan" class="text-base font-semibold">Plan</h3>{@render none(!counts.planSteps)}<div class="mt-2">{@render sections.plan()}</div></section>
  <section aria-labelledby="q-history"><h3 id="q-history" class="text-base font-semibold">History</h3><div class="mt-2">{@render sections.activity()}</div></section>
  <section aria-labelledby="q-decisions"><h3 id="q-decisions" class="text-base font-semibold">Decisions</h3>{@render none(!counts.decisions)}<div class="mt-2">{@render sections.decisions()}</div></section>
  <section aria-labelledby="q-comments"><h3 id="q-comments" class="text-base font-semibold">Comments</h3><div class="mt-2">{@render sections.comments()}</div></section>
  <section aria-labelledby="q-links"><h3 id="q-links" class="text-base font-semibold">Links</h3><div class="mt-2">{@render sections.links()}</div></section>
  <section aria-labelledby="q-subtasks"><h3 id="q-subtasks" class="text-base font-semibold">Sub-tasks</h3><div class="mt-2">{@render sections.subtasks()}</div></section>
  <section aria-labelledby="q-project"><h3 id="q-project" class="text-base font-semibold">Project</h3><div class="mt-2">{@render sections.project()}</div></section>
  <section aria-labelledby="q-handoff"><h3 id="q-handoff" class="text-base font-semibold">Handoff</h3>{@render none(!counts.handoff)}<div class="mt-2">{@render sections.handoff()}</div></section>
  <section aria-labelledby="q-cost"><h3 id="q-cost" class="text-base font-semibold">Cost</h3>{@render none(!counts.cost)}<div class="mt-2">{@render sections.cost()}</div></section>
  <section aria-labelledby="q-attempts"><h3 id="q-attempts" class="text-base font-semibold">Attempts</h3>{@render none(!(counts.attempts > 1), counts.attempts === 1 ? 'One attempt.' : 'None.')}<div class="mt-2">{@render sections.attempts()}</div></section>
  <section aria-labelledby="q-delivery"><h3 id="q-delivery" class="text-base font-semibold">Delivery</h3>{@render none(!counts.deliveryActive)}<div class="mt-2">{@render sections.delivery()}</div></section>
  <section aria-labelledby="q-references"><h3 id="q-references" class="text-base font-semibold">References</h3><div class="mt-2">{@render sections.references()}</div></section>
  <section aria-labelledby="q-related"><h3 id="q-related" class="text-base font-semibold">Related prior work</h3><div class="mt-2">{@render sections.related()}</div></section>
  <section aria-labelledby="q-actions"><h3 id="q-actions" class="text-base font-semibold">Card actions</h3><div class="mt-2">{@render sections.cardActions()}</div></section>
</div>
