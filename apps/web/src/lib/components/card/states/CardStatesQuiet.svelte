<!-- apps/web/src/lib/components/card/states/CardStatesQuiet.svelte -->
<script lang="ts">
  /** SP-Card-States-Quiet: six panels, each the drawer's own parts at cell size. No motion. */
  import '../quiet-states.css';
  import { Face } from '@superjackfruit/vibekit';
  import { whenLong, quietArchivedMeta, quietCellMeta } from '../quiet-words';
  import { clockHM } from '$lib/when';
  import GateQuiet from '../gate/GateQuiet.svelte';
  import QuestionQuiet from '../question/QuestionQuiet.svelte';
  import CardStateQuiet from '../state/CardStateQuiet.svelte';
  import type { CardModel } from '../card-model.svelte';
  import type { CardStatesProps } from '../layouts/types';

  let { cells, vibe }: CardStatesProps = $props();
  const owner = (m: CardModel) => m.ownerName;
  const handedOn = (m: CardModel) => (typeof m.handoff?.handedOn === 'string' ? m.handoff.handedOn : null);
  const who = (m: CardModel) => m.agent.name || 'The agent';
  const cell = (m: CardModel, tail: string) => quietCellMeta({ board: m.boardName, i: m.stageIndex, n: m.stages.length, stage: m.stageName, agent: who(m), tail });
</script>

<div class="qcs" data-vibe="quiet">
  <div style="display: flex; flex-direction: column; gap: 4px;">
    <h1>Card states, Quiet</h1>
    <p class="qcs-meta">Each panel is the top of the card. Orange appears only where your decision is needed now. No motion.</p>
  </div>
  <div class="qcs-grid">
    <div class="qcs-cell" data-cell="gate">
      <span class="qcs-label">A. Approval gate</span>
      {#if cells.gate.model.card}
        {@const m = cells.gate.model}
        <section class="qcs-panel" aria-labelledby="qcs-a-t">
          <h2 id="qcs-a-t">{m.card!.title}</h2>
          <p class="qcs-meta">{cell(m, `Waiting for your review${m.lead?.at ? ` since ${clockHM(m.lead.at)}` : ''}`)}</p>
          {#if cells.gate.gate}<GateQuiet {...cells.gate.gate} agent={m.agent} lead={m.lead!} {vibe} />{/if}
        </section>
      {/if}
    </div>
    <div class="qcs-cell" data-cell="question">
      <span class="qcs-label">B. Agent question</span>
      {#if cells.question.model.card}
        {@const m = cells.question.model}
        <section class="qcs-panel" aria-labelledby="qcs-b-t">
          <h2 id="qcs-b-t">{m.card!.title}</h2>
          <p class="qcs-meta">{cell(m, `Asked${cells.question.question?.elicitation.createdAt ? ` at ${clockHM(cells.question.question.elicitation.createdAt)}` : ''}`)}</p>
          {#if cells.question.question}<QuestionQuiet model={cells.question.question.model} elicitation={cells.question.question.elicitation} agent={cells.question.question.agent} {vibe} />{/if}
        </section>
      {/if}
    </div>
    <div class="qcs-cell" data-cell="archived">
      <span class="qcs-label">C. Archived</span>
      {#if cells.archived.model.card}
        {@const m = cells.archived.model}
        <section class="qcs-panel" aria-labelledby="qcs-c-t">
          <CardStateQuiet kind="archived" model={m} />
          <h2 id="qcs-c-t">{m.card!.title}</h2>
          <p class="qcs-meta">{quietArchivedMeta({ board: m.boardName, i: m.stageIndex, n: m.stages.length, stage: m.stageName })}<span class="qcs-face" style="vertical-align: -4px;"><Face id={who(m)} label={who(m)} mood="resting" size={20} /></span> {who(m)} · Owner: {owner(m)}</p>
          {#if m.card?.spec?.description}<p>{String(m.card.spec.description)}</p>{/if}
          <CardStateQuiet kind="restore" model={m} />
        </section>
      {/if}
    </div>
    <div class="qcs-cell" data-cell="done">
      <span class="qcs-label">D. Done</span>
      {#if cells.done.model.card}
        {@const m = cells.done.model}
        <section class="qcs-panel" aria-labelledby="qcs-d-t">
          <div class="qcs-notice qcs-notice--ok" role="status"><b>Completed</b><span>On {m.card?.stateSince ? whenLong(m.card.stateSince) : ''}, after {m.card!.attemptCount} attempts.</span></div>
          <h2 id="qcs-d-t">{m.card!.title}</h2>
          <dl class="qcs-dl">
            <dt>Finished by</dt><dd><span class="qcs-face" style="vertical-align: -4px;"><Face id={who(m)} label={who(m)} mood="done" size={20} /></span> {who(m)}</dd>
            <dt>Final stage</dt><dd>{m.stageName}, {m.boardName}</dd>
            <dt>Owner</dt><dd>{owner(m)}</dd>
            {#if m.provenance?.known}<dt>Asked by</dt><dd>{m.queuedByName}</dd>{/if}
            {#if handedOn(m)}<dt>Handed on</dt><dd>{handedOn(m)}</dd>{/if}
          </dl>
        </section>
      {/if}
    </div>
    <div class="qcs-cell" data-cell="error">
      <span class="qcs-label">E. Decision error</span>
      {#if cells.error.model.card}
        {@const m = cells.error.model}
        <section class="qcs-panel" aria-labelledby="qcs-e-t">
          <h2 id="qcs-e-t">{m.card!.title}</h2>
          {#if cells.error.gate}<GateQuiet {...cells.error.gate} agent={m.agent} lead={m.lead!} {vibe} part="controls" />{/if}
        </section>
      {/if}
    </div>
    <div class="qcs-cell" data-cell="loading">
      <span class="qcs-label">F. Loading</span>
      {#if cells.loading.model.card}
        {@const m = cells.loading.model}
        <section class="qcs-panel" aria-busy="true" aria-labelledby="qcs-f-t">
          <h2 id="qcs-f-t">{m.card!.title}</h2>
          <CardStateQuiet kind="loading" model={m} />
        </section>
      {/if}
    </div>
  </div>
</div>
