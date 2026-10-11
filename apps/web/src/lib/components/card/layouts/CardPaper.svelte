<script lang="ts">
  /**
   * Paper's card is a letter from the agent (spec §5.2): the agent's words and the reply come
   * first; the brief, the history, the waiting work, the attachments and the correspondence are
   * labelled enclosures. The shell hands every section in; this file only places them.
   */
  import AgentFace from '$lib/components/AgentFace.svelte';
  import LeadWords from '$lib/components/LeadWords.svelte';
  import { LIGHT_WORDS } from '$lib/copy';
  import GatePaper from '../gate/GatePaper.svelte';
  import QuestionPaper from '../question/QuestionPaper.svelte';
  import type { CardLayoutProps } from './types';

  let { card, vibe, phase, boardName, personName, lead, agent, sections, counts, editing, gate, question }: CardLayoutProps = $props();
  const time = $derived(lead.at ? new Date(lead.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
  const SUMMARY = 'flex min-h-[var(--vk-target-min)] cursor-pointer items-center focus-visible:outline-2 focus-visible:outline-offset-2';
</script>

<!-- pr-12 leaves room for the shell's 44px close target -->
<div class="flex-none px-6 pt-5 pr-12">
  <p class="text-muted-foreground text-sm">‹ {boardName} · in {LIGHT_WORDS[phase]}</p>
  {#if lead.needsYou}<p class="eyebrow text-signal-text mt-2">● A letter that needs a reply</p>{/if}
  <!-- The title stays in the page while editing (visually hidden), so the dialog keeps its name. -->
  <h2 id="drawer-title" class="font-display mt-1 text-2xl" class:sr-only={editing}>Re: {card.title}</h2>
  {#if editing}{@render sections.editForm()}{/if}
</div>

<!-- Unbroken tokens (handoffs, tool arguments, references) must not push the panel sideways. -->
<div class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-6 py-4" style="overflow-wrap:anywhere">
  {@render sections.error()}

  <article class="letter agent-voice text-[17px] leading-relaxed">
    <p>Dear {personName},</p>
    <p class="mt-3"><LeadWords {lead} {vibe} /></p>
    <footer class="mt-4 flex items-center gap-2 not-italic">
      {#if agent.id}<AgentFace agentId={agent.id} name={agent.name} iconUrl={agent.iconUrl} mood={agent.mood} size={32} variant="portrait" />{/if}
      <!-- "delegate" only when the named agent holds the card; nobody may hold it yet. -->
      <span class="font-body text-sm">{#if agent.name}<b>{agent.name}</b>{#if card.delegateAgentId} · delegate{/if}{:else}Nobody holds this card yet{/if}{#if lead.at} · <time datetime={lead.at}>{time}</time>{/if}</span>
    </footer>
  </article>

  <div class="mt-3 text-sm">{@render sections.status()}{@render sections.facts()}</div>

  <section class="mt-6" aria-label="Your reply">
    {#if question}
      <QuestionPaper model={question.model} elicitation={question.elicitation} agent={question.agent} {vibe} />
    {:else if gate}
      <!-- The letter above already carries the agent's sentence. -->
      <GatePaper boardId={gate.boardId} gate={gate.gate} error={gate.error} onResponse={gate.onResponse} {agent} {lead} {vibe} showLead={false} />
    {/if}
    {@render sections.resume()}
  </section>

  <h3 class="eyebrow mt-8">Enclosed</h3>
  <details class="border-border border-b py-1" open={!lead.needsYou}>
    <summary class={SUMMARY}>The brief · {counts.criteria} things to prove</summary>
    <div class="space-y-4 py-3">
      {@render sections.description()}
      {@render sections.criteria()}
      {@render sections.plan()}
      {@render sections.details()}
      {@render sections.project()}
    </div>
  </details>
  <details class="border-border border-b py-1">
    <summary class={SUMMARY}>What happened · {counts.runs} runs</summary>
    <div class="space-y-4 py-3">
      {@render sections.activity()}
      {@render sections.decisions()}
      {@render sections.handoff()}
      {@render sections.attempts()}
      {@render sections.cost()}
    </div>
  </details>
  <details class="border-border border-b py-1">
    <summary class={SUMMARY}>Who is waiting · {counts.links + counts.children}</summary>
    <div class="space-y-4 py-3">
      {@render sections.links()}
      {@render sections.subtasks()}
    </div>
  </details>
  <details class="border-border border-b py-1" open={counts.deliveryActive}>
    <summary class={SUMMARY}>Attached · {counts.refs}</summary>
    <div class="space-y-4 py-3">
      {@render sections.references()}
      {@render sections.related()}
      {@render sections.delivery()}
    </div>
  </details>
  <details class="border-border border-b py-1" open>
    <summary class={SUMMARY}>Correspondence</summary>
    <div class="py-3">{@render sections.comments()}</div>
  </details>

  <footer class="border-border mt-8 flex flex-wrap items-center gap-4 border-t pt-4">
    {@render sections.editButton()}
    {@render sections.cardActions()}
  </footer>
</div>
