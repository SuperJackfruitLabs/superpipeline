<!-- apps/web/src/lib/components/card/states/CardStatesStudio.svelte -->
<script lang="ts">
  /** SP-Card-States-Studio: six panels, each the drawer's own parts at cell size. */
  import '../page/card-page-studio.css';
  import '../studio/card-studio.css';
  import '../studio/card-states-studio.css';
  import { Face, StageTrack } from '@superjackfruit/vibekit';
  import GateStudioBar from '../gate/GateStudioBar.svelte';
  import GateStudioFrame from '../gate/GateStudioFrame.svelte';
  import QuestionStudioBar from '../question/QuestionStudioBar.svelte';
  import QuestionStudioFrame from '../question/QuestionStudioFrame.svelte';
  import CardStateStudio from '../state/CardStateStudio.svelte';
  import { initials } from '../card-words';
  import { stripAria, stripKind } from '../state-words';
  import { quoteHeader, runEnded, figAge } from '../studio/studio-format';
  import type { CardModel } from '../card-model.svelte';
  import type { CardStatesProps } from '../layouts/types';

  let { cells, vibe }: CardStatesProps = $props();
  const owner = (m: CardModel) => m.ownerName;
  const said = (m: CardModel) => (typeof m.handoff?.summary === 'string' ? m.handoff.summary : null);
  const handedOn = (m: CardModel) => (typeof m.handoff?.handedOn === 'string' ? m.handoff.handedOn : null);
  const who = (m: CardModel) => m.agent.name || 'The agent';
  const finished = (m: CardModel) => (m.card?.stateSince ? runEnded(m.card.stateSince) : '');
</script>

{#snippet bar(m: CardModel, tail: string)}<div class="ss-bar">{m.boardName} / {tail}</div>{/snippet}
{#snippet track(m: CardModel)}
  <StageTrack stages={m.stages.map((s) => s.name)} current={m.stageIndex} state={m.lead?.needsYou && !m.archived ? 'stopped' : 'current'} form="cell" label={stripAria(m.stageIndex, m.stages.length, m.stageName, stripKind(m.lead!, m.archived), 'cell')} />
{/snippet}

<div class="ar ss" data-vibe="studio">
  <header class="ss-head">
    <span class="kick">Superpipeline · card states</span>
    <h1>Card states · Studio</h1>
    <p>Labels in Azeret Mono, sentences in Archivo, the agent’s own words in Newsreader. Vermilion only where a person is needed now; done is the darkest blue, archived is ink.</p>
  </header>
  <div class="ss-grid">
    <div class="ss-cell" data-cell="gate">
      <div class="ss-label"><span class="no">A</span><b>Approval gate</b></div>
      {#if cells.gate.model.card}
        {@const m = cells.gate.model}
        <section class="ss-panel" aria-labelledby="ss-a-t">
          {@render bar(m, m.stageName)}
          <div class="ss-body">
            <h2 id="ss-a-t" class="ss-title">{m.card!.title}</h2>
            {@render track(m)}
            {#if cells.gate.gate}<GateStudioFrame gate={cells.gate.gate.gate} agent={m.agent} lead={m.lead} {vibe} />{/if}
          </div>
          {#if cells.gate.gate}<GateStudioBar {...cells.gate.gate} registerKeys={() => {}} />{/if}
        </section>
      {/if}
    </div>
    <div class="ss-cell" data-cell="question">
      <div class="ss-label"><span class="no">B</span><b>Agent question</b></div>
      {#if cells.question.model.card}
        {@const m = cells.question.model}
        <section class="ss-panel" aria-labelledby="ss-b-t">
          {@render bar(m, m.stageName)}
          <div class="ss-body">
            <h2 id="ss-b-t" class="ss-title">{m.card!.title}</h2>
            {@render track(m)}
            {#if cells.question.question}<QuestionStudioFrame elicitation={cells.question.question.elicitation} agent={cells.question.question.agent} />{/if}
          </div>
          {#if cells.question.question}<QuestionStudioBar model={cells.question.question.model} elicitation={cells.question.question.elicitation} agent={cells.question.question.agent} />{/if}
        </section>
      {/if}
    </div>
    <div class="ss-cell" data-cell="archived">
      <div class="ss-label"><span class="no">C</span><b>Archived</b></div>
      {#if cells.archived.model.card}
        {@const m = cells.archived.model}
        <section class="ss-panel" aria-labelledby="ss-c-t">
          <CardStateStudio kind="archived" model={m} />
          <div class="ss-body">
            <h2 id="ss-c-t" class="ss-title">{m.card!.title}</h2>
            {@render track(m)}
            <CardStateStudio kind="reason" model={m} />
            <table class="ss-kv"><tbody>
              <tr><td>Board</td><td>{m.boardName}</td></tr>
              <tr><td>Last agent</td><td><span class="ss-ag"><Face id={who(m)} label={who(m)} mood="resting" size={20} />{who(m)}</span></td></tr>
              <tr><td>Owner</td><td><span class="ss-ag"><span class="ar-ini" aria-hidden="true" style="width: 20px; height: 20px; font-size: 8px;">{initials(owner(m))}</span>{owner(m)}</span></td></tr>
              <tr><td>Attempts</td><td class="mono">{m.card!.attemptCount}</td></tr>
            </tbody></table>
          </div>
          <div class="ss-cmd"><CardStateStudio kind="restore" model={m} /></div>
        </section>
      {/if}
    </div>
    <div class="ss-cell" data-cell="done">
      <div class="ss-label"><span class="no">D</span><b>Done</b></div>
      {#if cells.done.model.card}
        {@const m = cells.done.model}
        {@const age = figAge(0)}
        <section class="ss-panel" aria-labelledby="ss-d-t">
          {@render bar(m, m.stageName)}
          <div class="ss-body">
            <h2 id="ss-d-t" class="ss-title">{m.card!.title}</h2>
            <div class="ss-figs">
              <div><b class="st"><span class="u done"></span>Done</b><span>State</span></div>
              <div><b>{finished(m).split(' ').slice(0, 2).join(' ')}</b><span>Finished {finished(m).split(' ')[2] ?? age.value}</span></div>
              <div><b>{m.card!.attemptCount}</b><span>Attempts</span></div>
              <div><b>P{m.card!.priority}</b><span>Priority</span></div>
            </div>
            {#if said(m)}<div class="ar-q done"><h3><Face id={who(m)} label={who(m)} mood="done" size={24} ring="mood" />{quoteHeader(who(m), 'done')}</h3><blockquote>{said(m)}</blockquote></div>{/if}
            <table class="ss-kv"><tbody>
              {#if handedOn(m)}<tr><td>Handed on</td><td>{handedOn(m)}</td></tr>{/if}
              {#if m.provenance?.known}<tr><td>Asked by</td><td><span class="ss-ag"><Face id={m.queuedByName} label={m.queuedByName} mood="working" size={20} />{m.queuedByName}</span></td></tr>{/if}
              <tr><td>Owner</td><td><span class="ss-ag"><span class="ar-ini" aria-hidden="true" style="width: 20px; height: 20px; font-size: 8px;">{initials(owner(m))}</span>{owner(m)}</span></td></tr>
            </tbody></table>
          </div>
        </section>
      {/if}
    </div>
    <div class="ss-cell" data-cell="error">
      <div class="ss-label"><span class="no">E</span><b>Decision error</b></div>
      {#if cells.error.model.card}
        {@const m = cells.error.model}
        <section class="ss-panel" aria-labelledby="ss-e-t">
          {@render bar(m, m.stageName)}
          <div class="ss-body"><h2 id="ss-e-t" class="ss-title">{m.card!.title}</h2></div>
          {#if cells.error.gate}<GateStudioBar {...cells.error.gate} />{/if}
        </section>
      {/if}
    </div>
    <div class="ss-cell" data-cell="loading">
      <div class="ss-label"><span class="no">F</span><b>Loading</b></div>
      {#if cells.loading.model.card}
        {@const m = cells.loading.model}
        <section class="ss-panel" aria-busy="true" aria-labelledby="ss-f-t">
          {@render bar(m, m.shortId)}
          <div class="ss-body">
            <h2 id="ss-f-t" class="ss-title">{m.card!.title}</h2>
            <CardStateStudio kind="loading" model={m} />
          </div>
        </section>
      {/if}
    </div>
  </div>
  <ol class="ar-notes" aria-label="Notes" style="grid-template-columns: minmax(0px, 1fr);">
    <li><span class="k">1</span><span>The full digest is copied by the button beside it; only its first eight characters are shown, and the seal repeats them.</span></li>
  </ol>
</div>
