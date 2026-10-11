<script lang="ts">
  /**
   * Studio's card is a dashboard (spec §5.2): the numbers and the stage track on top, a readout of
   * what the agent needs, five tabs for the rest, and a command bar that stays in view at the end
   * of the scrolling body. The shell hands every section in; this file only places them.
   */
  import { onMount } from 'svelte';
  import { StageTrack, greeting } from '@superjackfruit/vibekit';
  import Tabs from '$lib/components/Tabs.svelte';
  import Words from '$lib/components/Words.svelte';
  import { ageLabel } from '$lib/age';
  import { leadText } from '$lib/copy';
  import GateStudioBar from '../gate/GateStudioBar.svelte';
  import GateStudioFrame from '../gate/GateStudioFrame.svelte';
  import QuestionStudioBar from '../question/QuestionStudioBar.svelte';
  import QuestionStudioFrame from '../question/QuestionStudioFrame.svelte';
  import type { CardLayoutProps } from './types';

  let { card, vibe, phase, boardName, stages, stageIndex, ageHours, lead, agent, sections, counts, editing, gate, question }: CardLayoutProps = $props();
  let active = $state('spec');

  const numbers = $derived([
    { label: 'stage', value: `${stageIndex + 1}/${stages.length}` },
    { label: 'attempts', value: String(card.attemptCount) },
    { label: `${card.state} for`, value: ageLabel(ageHours) ?? '—' },
    { label: 'cost', value: `$${card.costUsd.toFixed(2)}` },
    { label: 'blocks', value: String(counts.links) },
    { label: 'sub-tasks', value: `${counts.openChildren}/${counts.children}` },
  ]);
  const tabs = $derived([
    { id: 'spec', label: 'Spec', panel: spec },
    { id: 'log', label: `Log ${counts.runs}`, panel: log },
    { id: 'links', label: `Links ${counts.links + counts.children + counts.refs}`, panel: links },
    { id: 'talk', label: 'Talk', panel: talk },
    { id: 'cost', label: 'Cost', panel: cost },
  ]);
  // The bars below can be as tall as a long block reason; the scroller pads by what they measure.
  let barHeight = $state(0);
  let now = $state(new Date());
  onMount(() => {
    const t = setInterval(() => (now = new Date()), 30_000);
    return () => clearInterval(t);
  });
  const clock = $derived(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
</script>

{#snippet spec()}
  {@render sections.description()}
  {@render sections.criteria()}
  {@render sections.plan()}
  {@render sections.details()}
  {@render sections.project()}
  {@render sections.facts()}
{/snippet}
{#snippet log()}
  {@render sections.activity()}
  {@render sections.decisions()}
  {@render sections.handoff()}
  {@render sections.attempts()}
{/snippet}
{#snippet links()}
  {@render sections.links()}
  {@render sections.subtasks()}
  {@render sections.references()}
  {@render sections.related()}
{/snippet}
{#snippet talk()}
  {@render sections.comments()}
{/snippet}
{#snippet cost()}
  {@render sections.cost()}
  {@render sections.delivery()}
{/snippet}

<!-- pr-14 leaves room for the shell's 44px close target. Capped, so a long block reason cannot
     push the body off a phone; it scrolls, and a keyboard can reach it. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div role="region" aria-label="Card summary" tabindex="0" class="border-border max-h-[40dvh] flex-none overflow-y-auto border-b p-4 pr-14 pb-3">
  <p class="eyebrow text-muted-foreground font-mono flex flex-wrap justify-between gap-x-3"><span>‹ {boardName} / {card.id.slice(-4)}</span><span>{clock} {greeting(phase, 'studio')}</span></p>
  {#if editing}
    {@render sections.editForm()}
  {:else}
    <h2 id="drawer-title" class="mt-1 text-lg leading-snug font-semibold">{card.title}</h2>
  {/if}
  <div class="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6" role="group" aria-label="Card numbers">
    {#each numbers as n (n.label)}
      <p class="bg-surface border-border flex flex-wrap items-baseline gap-x-1.5 rounded-[var(--vk-radius-sm)] border px-2 py-1"><span class="eyebrow">{n.label}</span> <span class="font-mono text-sm font-semibold">{n.value}</span></p>
    {/each}
  </div>
  <div class="mt-3"><StageTrack stages={stages.map((s) => s.name)} current={stageIndex} stopped={lead.needsYou} label="Stages" /></div>
  <p class="readout font-mono mt-3 flex items-start gap-2 text-sm">
    <span class="status-led mt-1 inline-block size-2.5 flex-none rounded-full" data-mood={agent.mood} data-blink={lead.needsYou} aria-hidden="true"></span>
    <span><b>{agent.name}</b> · <Words text={leadText(lead, vibe)} /></span>
  </p>
</div>

<!--
  The scrolling body. The gate or question (what is asked, the lead, the immutable subject) comes
  before the tabs; the bars at the end are `sticky` inside it, so nothing between may clip or
  transform. `scroll-padding-bottom` follows the bars' measured height, so a focused control is
  never left under them (WCAG 2.4.11); each bar is capped and scrolls on its own.
  Unbroken tokens (handoffs, tool arguments, references) must not push the panel sideways.
-->
<div class="min-h-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto px-4 py-4" style="overflow-wrap:anywhere;scroll-padding-bottom:{barHeight + 16}px">
  {@render sections.error()}
  {#if question}
    <QuestionStudioFrame elicitation={question.elicitation} agent={question.agent} />
  {:else if gate}
    <GateStudioFrame gate={gate.gate} {agent} {lead} {vibe} />
  {/if}
  <div class="flex flex-wrap items-center gap-2">
    {@render sections.status()}
    {@render sections.editButton()}
  </div>
  <div><Tabs label="Card sections" {tabs} bind:active /></div>
  {@render sections.cardActions()}
  <div class="sticky bottom-0 -mx-1" bind:clientHeight={barHeight}>
    {#if question}
      <QuestionStudioBar model={question.model} elicitation={question.elicitation} agent={question.agent} />
    {:else if gate}
      <GateStudioBar boardId={gate.boardId} gate={gate.gate} error={gate.error} onResponse={gate.onResponse} />
    {/if}
    <div class="resume-bar bg-surface border-border max-h-[35dvh] overflow-y-auto border-t px-1 py-2 empty:hidden">{@render sections.resume()}</div>
  </div>
</div>
