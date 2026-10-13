<!-- apps/web/src/lib/components/card/states/CardStatesPaper.svelte -->
<script lang="ts">
  /** SP-Card-States-Paper: six letter tops, each the drawer's own parts at cell size. */
  import '../paper-states.css';
  import { Face } from '@superjackfruit/vibekit';
  import { app } from '$lib/stores/app.svelte';
  import { displayPrincipal } from '$lib/names';
  import GatePaper from '../gate/GatePaper.svelte';
  import QuestionPaper from '../question/QuestionPaper.svelte';
  import CardStatePaper from '../state/CardStatePaper.svelte';
  import { firstName, paperArchivedLine, paperCellLine, paperDoneLine, PAPER_LABELS, reTitle } from '../paper-words';
  import type { CardModel } from '../card-model.svelte';
  import type { CardStatesProps } from '../layouts/types';

  let { cells, vibe }: CardStatesProps = $props();
  const owner = (m: CardModel) => displayPrincipal(m.card?.ownerUserId ?? '', app.members);
  const person = $derived(firstName(app.user?.name ?? app.user?.login ?? 'there'));
  const said = (m: CardModel) => (typeof m.handoff?.summary === 'string' ? m.handoff.summary : null);
  const handedOn = (m: CardModel) => (typeof m.handoff?.handedOn === 'string' ? m.handoff.handedOn : null);
  const who = (m: CardModel) => m.agent.name || 'The agent';
</script>

{#snippet kicker()}<span class="pcs-eyebrow pcs-eyebrow--sig"><span class="pcs-dot"></span>A letter that needs a reply</span>{/snippet}

<div class="pcs">
  <div style="display: flex; flex-direction: column; gap: 4px;">
    <h1 class="pcs-h1">Card states, in Paper</h1>
    <p class="pcs-small">Each panel is the top of the letter. Vermilion appears only where a reply is needed now.</p>
  </div>
  <div class="pcs-grid">
    <div class="pcs-cell" data-cell="gate">
      <span class="pcs-label">{PAPER_LABELS[0]}</span>
      {#if cells.gate.model.card}
        {@const m = cells.gate.model}
        <article class="pcs-sheet" aria-labelledby="pcs-a-t">
          {@render kicker()}
          <h2 id="pcs-a-t" class="pcs-title">{reTitle(m.card!.title, true)}</h2>
          <p class="pcs-line">{paperCellLine({ board: m.boardName, i: m.stageIndex, n: m.stages.length, stage: m.stageName, kind: 'review' })}</p>
          {#if cells.gate.gate}<GatePaper {...cells.gate.gate} agent={m.agent} lead={m.lead!} {vibe} personName={person} />{/if}
        </article>
      {/if}
    </div>
    <div class="pcs-cell" data-cell="question">
      <span class="pcs-label">{PAPER_LABELS[1]}</span>
      {#if cells.question.model.card}
        {@const m = cells.question.model}
        <article class="pcs-sheet" aria-labelledby="pcs-b-t">
          {@render kicker()}
          <h2 id="pcs-b-t" class="pcs-title">{reTitle(m.card!.title, false)}</h2>
          <p class="pcs-line">{paperCellLine({ board: m.boardName, i: m.stageIndex, n: m.stages.length, stage: m.stageName, kind: 'question' })}</p>
          {#if cells.question.question}<QuestionPaper model={cells.question.question.model} elicitation={cells.question.question.elicitation} agent={cells.question.question.agent} {vibe} personName={person} />{/if}
        </article>
      {/if}
    </div>
    <div class="pcs-cell" data-cell="archived">
      <span class="pcs-label">{PAPER_LABELS[2]}</span>
      {#if cells.archived.model.card}
        {@const m = cells.archived.model}
        <article class="pcs-sheet" aria-labelledby="pcs-c-t">
          <CardStatePaper kind="archived" model={m} />
          <h2 id="pcs-c-t" class="pcs-title">{reTitle(m.card!.title, false)}</h2>
          <p class="pcs-line">{paperArchivedLine({ board: m.boardName, i: m.stageIndex, n: m.stages.length, stage: m.stageName, owner: owner(m) })}</p>
          {#if m.card?.spec?.description}<p class="pcs-voice pcs-voice--muted">{String(m.card.spec.description)}</p>{/if}
          <div class="pcs-sign"><Face id={who(m)} label={who(m)} mood="resting" size={28} /><div><span class="n">{who(m)}</span><p class="pcs-small">Last worked it</p></div></div>
          <CardStatePaper kind="restore" model={m} />
        </article>
      {/if}
    </div>
    <div class="pcs-cell" data-cell="done">
      <span class="pcs-label">{PAPER_LABELS[3]}</span>
      {#if cells.done.model.card}
        {@const m = cells.done.model}
        <article class="pcs-sheet" aria-labelledby="pcs-d-t">
          <h2 id="pcs-d-t" class="pcs-title">{reTitle(m.card!.title, false)}</h2>
          <p class="pcs-line">{paperDoneLine({ board: m.boardName, stage: m.stageName, priority: m.card!.priority, owner: owner(m) })}</p>
          <CardStatePaper kind="done" model={m} />
          {#if said(m)}
            <p class="pcs-dear">Dear {person},</p>
            <p class="pcs-voice">{said(m)}</p>
            <div class="pcs-sign"><Face id={who(m)} label={who(m)} mood="done" size={32} /><div><span class="n">{who(m)}</span><p class="pcs-small">Finished it{m.provenance?.known ? ` · asked by ${m.queuedByName}` : ''}</p></div></div>
          {/if}
          {#if handedOn(m)}<details class="pcs-enc" open><summary><span class="t">Handed on</span></summary><div class="pcs-encbody"><p class="pcs-small">{handedOn(m)}</p></div></details>{/if}
        </article>
      {/if}
    </div>
    <div class="pcs-cell" data-cell="error">
      <span class="pcs-label">{PAPER_LABELS[4]}</span>
      {#if cells.error.model.card}
        {@const m = cells.error.model}
        <article class="pcs-sheet" aria-labelledby="pcs-e-t">
          <h2 id="pcs-e-t" class="pcs-title">{reTitle(m.card!.title, true)}</h2>
          {#if cells.error.gate}<GatePaper {...cells.error.gate} agent={m.agent} lead={m.lead!} {vibe} part="controls" />{/if}
        </article>
      {/if}
    </div>
    <div class="pcs-cell" data-cell="loading">
      <span class="pcs-label">{PAPER_LABELS[5]}</span>
      {#if cells.loading.model.card}
        {@const m = cells.loading.model}
        <article class="pcs-sheet pcs-load" aria-busy="true" aria-labelledby="pcs-f-t">
          <h2 id="pcs-f-t" class="pcs-title">{reTitle(m.card!.title, false)}</h2>
          <CardStatePaper kind="loading" model={m} />
        </article>
      {/if}
    </div>
  </div>
</div>
