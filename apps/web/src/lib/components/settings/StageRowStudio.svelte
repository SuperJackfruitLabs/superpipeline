<!-- apps/web/src/lib/components/settings/StageRowStudio.svelte -->
<script lang="ts">
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import type { Stage } from '$lib/api';
  import { ago, cardsHere, ownerLabel, ownerText, ruleLine, stageCards, wipLine, worksBy } from './settings-words';
  import type { SettingsModel } from './settings-model.svelte';

  let { stage, index, model }: { stage: Stage; index: number; model: SettingsModel } = $props();
  const k = $derived(stage.key);
  const cards = $derived(model.cardsPerStage[stage.key] ?? 0);
  const by = $derived(worksBy(stage));
  const caps = $derived(ownerText(stage).split(',').map((x) => x.trim()).filter(Boolean));
  const saved = $derived(model.ruleSavedAt[stage.key]);
  const rule = $derived(ruleLine(stage));
</script>

<li>
  <details class="st-stage">
    <summary>
      <span class="st-no">{String(index + 1).padStart(2, '0')}</span>
      <span class="st-sw c{Math.min(index + 1, 7)}" aria-hidden="true"></span>
      <span class="st-line">
        <span class="st-name">{stage.name}</span>
        <span class="st-own"><LineIcon name={by === 'person' ? 'person' : 'agent'} size={14} />{ownerLabel(stage, model.agents)}</span>
        {#if stage.gate === 'approval'}<span class="st-tag"><LineIcon name="home" size={14} />Approval gate</span>{/if}
        <span class={rule === 'No standing rule' ? 'st-rule none' : 'st-rule'}>{rule}</span>
      </span>
      <span class="st-ct">{stageCards(cards)}<br />{wipLine(stage.wipLimit)}</span>
      <span class="st-chev" aria-hidden="true"><LineIcon name="chev-down" size={20} /></span>
    </summary>
    <div class="stage-body">
      <div class="ar-field"><label for="st-name-{k}">Stage name</label><input class="ar-in" id="st-name-{k}" bind:value={stage.name} /></div>
      <div class="ar-field"><span class="lab">Key</span><p class="st-key"><span class="code">{stage.key}</span><span class="ar-hint">fixed — cards, runs and gates refer to it</span></p></div>
      <div class="ar-field full">
        <span class="lab" id="st-own-{k}">Who works this stage</span>
        <div class="st-seg" role="group" aria-labelledby="st-own-{k}">
          <button aria-pressed={by === 'person'} type="button" onclick={() => model.setWorksBy(stage, 'person')}><LineIcon name="person" size={16} />A person</button>
          <button aria-pressed={by === 'agent'} type="button" onclick={() => model.setWorksBy(stage, 'agent')}><LineIcon name="agent" size={16} />An agent</button>
        </div>
      </div>
      {#if by === 'agent'}
        <div class="ar-field">
          <label for="st-cap-{k}">Capability</label>
          <input class="ar-in" id="st-cap-{k}" value={ownerText(stage)} onblur={(e) => model.setOwner(stage, e.currentTarget.value)} />
          <p class="ar-hint">Comma-separated. Agents holding it claim cards here. Saves when you leave the field.</p>
        </div>
        {#if caps.length >= 2}
          <div class="st-seg" role="group" aria-label="How the capabilities combine" style="align-self: end;">
            <button aria-pressed={!stage.requires?.any} type="button" onclick={() => model.setMatch(stage, 'all')}>Needs all</button>
            <button aria-pressed={!!stage.requires?.any} type="button" onclick={() => model.setMatch(stage, 'any')}>Any one</button>
          </div>
        {:else}
          <p class="ar-hint" style="align-self: end;">With two or more capabilities, choose “needs all” or “any one” here.</p>
        {/if}
      {/if}
      <div class="ar-field"><label for="st-wip-{k}">WIP limit</label><input class="ar-in" id="st-wip-{k}" type="number" placeholder="No limit" min="0" value={stage.wipLimit ?? ''} oninput={(e) => (stage.wipLimit = e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value))} /></div>
      <div class="ar-field">
        <span class="lab">Approval</span>
        <label class="st-check"><input type="checkbox" checked={stage.gate === 'approval'} onchange={(e) => (stage.gate = e.currentTarget.checked ? 'approval' : undefined)} /><span>Approval gate — a person approves before a card leaves this stage</span></label>
      </div>
      <div class="ar-field full">
        <label for="st-rule-{k}">Standing rule for this stage</label>
        <textarea class="ar-ta st-ta" id="st-rule-{k}" value={stage.instructions ?? ''} onblur={(e) => void model.saveRule(stage, e.currentTarget.value)}></textarea>
        {#if saved !== undefined}<p class="st-saved"><LineIcon name="check" size={16} />Rule saved · {ago(saved, model.now)}</p>{/if}
      </div>
      <div class="st-foot">
        <button class="ar-btn2" type="button" aria-label="Move {stage.name} earlier" disabled={index === 0} onclick={() => model.move(index, -1)}><LineIcon name="arrow-up" size={16} />Move earlier</button>
        <button class="ar-btn2" type="button" aria-label="Move {stage.name} later" disabled={index === model.draft.length - 1} onclick={() => model.move(index, 1)}><LineIcon name="arrow-down" size={16} />Move later</button>
        <span class="st-here">{cardsHere(cards)}</span>
        <button class="ar-btn2 btn-destructive" type="button" aria-label="Remove stage {stage.name}" disabled={cards > 0 || model.draft.length <= 1} onclick={() => model.removeStage(stage.key)}><LineIcon name="trash" size={16} />Remove stage</button>
      </div>
      <p class="ar-hint full">A stage holding cards cannot be removed until they are moved; the last stage cannot be removed.</p>
    </div>
  </details>
</li>
