<!-- apps/web/src/lib/components/card/states/CardStatesDaylight.svelte -->
<script lang="ts">
  /** SP-Card-States-Daylight: six card tops, each the drawer's own parts at cell size. */
  import '../daylight-states.css';
  import { Face, StageTrack } from '@superjackfruit/vibekit';
  import { app } from '$lib/stores/app.svelte';
  import { displayPrincipal } from '$lib/names';
  import GateDaylight from '../gate/GateDaylight.svelte';
  import QuestionDaylight from '../question/QuestionDaylight.svelte';
  import CardStateDaylight from '../state/CardStateDaylight.svelte';
  import { ownerChip } from '../card-words';
  import { stripAria, stripKind } from '../state-words';
  import type { CardModel } from '../card-model.svelte';
  import type { CardStatesProps } from '../layouts/types';

  let { cells, vibe }: CardStatesProps = $props();
  const owner = (m: CardModel) => ownerChip(displayPrincipal(m.card?.ownerUserId ?? '', app.members));
</script>

{#snippet head(m: CardModel, id: string, eyebrow: string)}
  <span class="ds-eyebrow">{eyebrow}</span>
  <h2 {id} class="ds-title">{m.card?.title}</h2>
{/snippet}

{#snippet track(m: CardModel)}
  <StageTrack stages={m.stages.map((s) => s.name)} current={m.stageIndex} state={m.lead?.needsYou && !m.archived ? 'stopped' : 'current'} form="cell" label={stripAria(m.stageIndex, m.stages.length, m.stageName, stripKind(m.lead!, m.archived), 'cell')} />
{/snippet}

<div class="ds">
  <div style="display: flex; flex-direction: column; gap: 4px;">
    <h1 class="ds-h1">Card states · Daylight</h1>
    <p class="ds-quiet">Each panel is the top of the card drawer. Coral appears only where a person is needed now.</p>
  </div>
  <div class="ds-grid">
    <div class="ds-cell">
      <span class="ds-label"><b>A · Approval gate</b>: the subject is shown before the buttons</span>
      <section class="ds-card" aria-labelledby="a-t">
        {@render head(cells.gate.model, 'a-t', `${cells.gate.model.boardName} · ${cells.gate.model.stageName}`)}
        {@render track(cells.gate.model)}
        {#if cells.gate.gate}<GateDaylight {...cells.gate.gate} agent={cells.gate.model.agent} lead={cells.gate.model.lead!} {vibe} />{/if}
      </section>
    </div>
    <div class="ds-cell">
      <span class="ds-label"><b>B · Agent question</b>: asked once, then the answer box</span>
      <section class="ds-card" aria-labelledby="b-t">
        {@render head(cells.question.model, 'b-t', `${cells.question.model.boardName} · ${cells.question.model.stageName}`)}
        {@render track(cells.question.model)}
        {#if cells.question.question}<QuestionDaylight model={cells.question.question.model} elicitation={cells.question.question.elicitation} agent={cells.question.question.agent} {vibe} />{/if}
      </section>
    </div>
    <div class="ds-cell">
      <span class="ds-label"><b>C · Archived</b>: no live controls, no coral</span>
      <section class="ds-card" aria-labelledby="c-t">
        {#if cells.archived.model.card}
          {@const m = cells.archived.model}
          <CardStateDaylight kind="archived" model={m} />
          {@render head(m, 'c-t', `${m.boardName} · ${m.stageName}`)}
          {@render track(m)}
          <div class="ds-row"><span class="ds-chip"><Face id={m.agent.name} label={m.agent.name} mood="resting" size={24} /> {m.agent.name} · last worked it</span><span class="ds-chip" style="padding-left: 10px;">{owner(m)}</span></div>
          {#if m.card?.spec?.description}<p class="ds-quiet">{String(m.card.spec.description)}</p>{/if}
          <CardStateDaylight kind="restore" model={m} />
        {/if}
      </section>
    </div>
    <div class="ds-cell">
      <span class="ds-label"><b>D · Done</b>: who finished it, when, and what it handed on</span>
      <section class="ds-card" aria-labelledby="d-t">
        {#if cells.done.model.card}
          {@const m = cells.done.model}
          {@render head(m, 'd-t', `${m.boardName} · ${m.stageName}`)}
          <CardStateDaylight kind="done" model={m} />
          <div class="ds-row">
            <span class="ds-chip" style="padding-left: 10px;">{owner(m)}</span>
            {#if m.provenance?.known}<span class="ds-chip"><Face id={m.queuedByName} label={m.queuedByName} mood="resting" size={24} /> Asked by {m.queuedByName}</span>{/if}
            {#if (m.card?.priority ?? 0) > 0}<span class="ds-chip" style="padding-left: 10px;">P{m.card?.priority}</span>{/if}
          </div>
        {/if}
      </section>
    </div>
    <div class="ds-cell">
      <span class="ds-label"><b>E · Decision error</b>: shown beside the buttons, not at the top</span>
      <section class="ds-card" aria-labelledby="e-t">
        {@render head(cells.error.model, 'e-t', `${cells.error.model.boardName} · ${cells.error.model.stageName}`)}
        {#if cells.error.gate}<GateDaylight {...cells.error.gate} agent={cells.error.model.agent} lead={cells.error.model.lead!} {vibe} part="controls" />{/if}
      </section>
    </div>
    <div class="ds-cell">
      <span class="ds-label"><b>F · Loading</b>: the shape of the card, and words for screen readers</span>
      <section class="ds-card ds-load" aria-busy="true" aria-labelledby="f-t">
        {@render head(cells.loading.model, 'f-t', cells.loading.model.boardName)}
        <CardStateDaylight kind="loading" model={cells.loading.model} />
      </section>
    </div>
  </div>
</div>
