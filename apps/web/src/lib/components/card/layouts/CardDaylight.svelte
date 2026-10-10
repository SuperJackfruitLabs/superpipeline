<script lang="ts">
  /**
   * Daylight's card: today's drawer order, so nothing moves yet. The shell hands every section in;
   * this file only places them (spec §7.5). It never asks which vibe is on — it is handed `vibe`
   * for the panels that draw words and faces.
   */
  import GateDaylight from '../gate/GateDaylight.svelte';
  import QuestionDaylight from '../question/QuestionDaylight.svelte';
  import type { CardLayoutProps } from './types';
  let { card, vibe, stageName, lead, agent, sections, editing, gate, question }: CardLayoutProps = $props();
</script>

<!-- dw-head; pr-12 leaves room for the shell's close button -->
<div class="dw-head border-border flex-none border-b p-4 pr-12 pb-3.5">
  {#if editing}
    {@render sections.editForm()}
  {:else}
    <!-- dw-crumbs row -->
    <div class="dw-crumbs mb-2 flex items-center gap-2">
      <span class="dw-stage eyebrow" style="color:var(--marigold)">{stageName}</span>
    </div>
    <!-- dw-title -->
    <div class="flex items-start gap-2">
      <h2 id="drawer-title" class="wordmark dw-title min-w-0 flex-1 text-[17px] leading-snug font-semibold">{card.title}</h2>
      {@render sections.editButton()}
    </div>
    {@render sections.status()}
    {@render sections.facts()}
  {/if}
</div>

<!-- dw-body -->
<!--
  The drawer renders text nobody on this side wrote: handoffs, tool arguments, references, card
  specs, an agent's own words. Any of it can be one long unbroken token, and on a phone one such
  token pushes the whole panel sideways. The rule is set here so a new section cannot forget it;
  `pre` blocks keep their own scrolling.
-->
<div class="dw-body min-h-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto px-4 py-4" style="overflow-wrap:anywhere">
  {@render sections.error()}
  {@render sections.description()}
  <!-- the agent's open question — the card is parked until someone answers it -->
  {#if question}<QuestionDaylight model={question.model} elicitation={question.elicitation} agent={question.agent} {vibe} />{/if}
  <!-- gate panel — only when a pending gate exists -->
  {#if gate}<GateDaylight boardId={gate.boardId} gate={gate.gate} error={gate.error} onResponse={gate.onResponse} {agent} {lead} {vibe} />{/if}
  {@render sections.delivery()}
  {@render sections.resume()}
  {@render sections.plan()}
  {@render sections.criteria()}
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
