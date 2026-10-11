<script lang="ts">
  /**
   * Daylight's card is a conversation (spec §5.2): what the agent needs, then the reply, then
   * everything else. The shell hands every section in; this file only places them. It never asks
   * which vibe is on — it is handed `vibe` for the panels that draw words and faces.
   */
  import { say, StageTrack } from '@superjackfruit/vibekit';
  import GateDaylight from '../gate/GateDaylight.svelte';
  import QuestionDaylight from '../question/QuestionDaylight.svelte';
  import LeadBubble from '../LeadBubble.svelte';
  import type { CardLayoutProps } from './types';

  let { card, vibe, stages, stageIndex, stageName, lead, agent, sections, editing, gate, question }: CardLayoutProps = $props();
  let briefOpen = $state(false);
  // Re-decide only when the card or its needs-you state changes, never on a live refresh: a
  // person who opened the brief keeps it open while the agent works.
  let briefFor = '';
  $effect(() => {
    const k = `${card.id}:${lead.needsYou}`;
    if (k !== briefFor) { briefFor = k; briefOpen = !lead.needsYou; }
  });
  const label = $derived(lead.needsYou ? say('agent.needsYou', vibe, { agent: agent.name }) : agent.name);
  const replying = $derived(!!question || !!gate);
</script>

<!-- dw-head; pr-14 leaves room for the shell's 44px close target -->
<div class="dw-head border-border flex-none border-b p-4 pr-14 pb-3.5">
  {#if editing}
    {@render sections.editForm()}
  {:else}
    <div class="dw-stage eyebrow" style="color:var(--marigold)">{stageName}</div>
    <div class="mt-1 flex items-start gap-2">
      <h2 id="drawer-title" class="wordmark dw-title min-w-0 flex-1 text-[17px] leading-snug font-semibold">{card.title}</h2>
      {@render sections.editButton()}
    </div>
    <div class="mt-3"><StageTrack stages={stages.map((s) => s.name)} current={stageIndex} stopped={lead.needsYou} label="Stages" /></div>
    {@render sections.status()}
    {@render sections.facts()}
  {/if}
</div>

<!--
  The drawer renders text nobody on this side wrote: handoffs, tool arguments, references, card
  specs, an agent's own words. Any of it can be one long unbroken token, and on a phone one such
  token pushes the whole panel sideways. The rule is set here so a new section cannot forget it;
  `pre` blocks keep their own scrolling.
-->
<div class="dw-body min-h-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto px-4 py-4" style="overflow-wrap:anywhere">
  {@render sections.error()}

  <section aria-label="The brief">
    <button type="button" class="pinned-brief bg-raised flex w-full items-center gap-2 rounded-[var(--vk-radius-md)] px-3 text-left text-sm" style="min-height:var(--vk-target-min)" aria-expanded={briefOpen} aria-controls="brief-{card.id}" onclick={() => (briefOpen = !briefOpen)}>
      <span aria-hidden="true">📌</span> What {agent.name} was asked <span class="text-muted-foreground ml-auto">{briefOpen ? 'hide' : 'show'}</span>
    </button>
    <div id="brief-{card.id}" hidden={!briefOpen} class="mt-3 space-y-4">
      {@render sections.description()}
      {@render sections.criteria()}
    </div>
  </section>

  <div class="conversation space-y-3" class:sticky-reply={replying}>
    {#if question}
      <QuestionDaylight model={question.model} elicitation={question.elicitation} agent={question.agent} {vibe} />
    {:else if gate}
      <GateDaylight boardId={gate.boardId} gate={gate.gate} error={gate.error} onResponse={gate.onResponse} {agent} {lead} {vibe} />
    {:else}
      <LeadBubble {lead} {agent} {vibe} {label} />
    {/if}
    {@render sections.resume()}
  </div>

  {@render sections.delivery()}
  {@render sections.plan()}
  {@render sections.details()}
  {@render sections.project()}
  {@render sections.links()}
  {@render sections.subtasks()}
  {@render sections.activity()}
  {@render sections.decisions()}
  {@render sections.comments()}
  {@render sections.handoff()}
  {@render sections.cost()}
  {@render sections.attempts()}
  {@render sections.related()}
  {@render sections.references()}
  {@render sections.cardActions()}
</div>
