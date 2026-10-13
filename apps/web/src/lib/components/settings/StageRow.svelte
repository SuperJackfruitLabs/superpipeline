<!-- apps/web/src/lib/components/settings/StageRow.svelte -->
<script lang="ts">
  import { Button } from '@superjackfruit/vibekit';
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
</script>

{#snippet ic_arrow_up_16()}<LineIcon name="arrow-up" size={16} />{/snippet}
{#snippet ic_arrow_down_16()}<LineIcon name="arrow-down" size={16} />{/snippet}
{#snippet ic_trash_16()}<LineIcon name="trash" size={16} />{/snippet}

<details class="stage">
  <summary>
    <span class="num t-num">{index + 1}</span>
    <span class="sumline">
      <span class="t-h3">{stage.name}</span>
      <span class="chip chip-line"><LineIcon name={by === 'person' ? 'person' : 'agent'} size={14} />{ownerLabel(stage, model.agents)}</span>
      {#if stage.gate === 'approval'}<span class="chip"><LineIcon name="home" size={14} />Approval gate</span>{/if}
      <span class="sumrule">{ruleLine(stage)}</span>
    </span>
    <span class="t-meta t-num" style="text-align: right; white-space: nowrap;">{stageCards(cards)}<br />{wipLine(stage.wipLimit)}</span>
    <span class="disc-ico" aria-hidden="true"><LineIcon name="chev-down" size={20} /></span>
  </summary>
  <div class="stage-body">
    <div class="field"><label for="st-name-{k}">Stage name</label><input class="input" id="st-name-{k}" bind:value={stage.name} /></div>
    <div class="field">
      <span class="lbl">Key</span>
      <p class="t-body" style="min-height: 44px; display: flex; align-items: center; gap: 8px;"><span class="code" style="flex: 0 0 auto; white-space: nowrap;">{stage.key}</span><span class="t-meta">fixed — cards, runs and gates refer to it</span></p>
    </div>
    <div class="field full">
      <span class="lbl" id="st-own-{k}">Who works this stage</span>
      <div class="seg" role="group" aria-labelledby="st-own-{k}">
        <button aria-pressed={by === 'person'} type="button" onclick={() => model.setWorksBy(stage, 'person')}><LineIcon name="person" size={16} />A person</button>
        <button aria-pressed={by === 'agent'} type="button" onclick={() => model.setWorksBy(stage, 'agent')}><LineIcon name="agent" size={16} />An agent</button>
      </div>
    </div>
    {#if by === 'agent'}
      <div class="field">
        <label for="st-cap-{k}">Capability</label>
        <input class="input" id="st-cap-{k}" value={ownerText(stage)} onblur={(e) => model.setOwner(stage, e.currentTarget.value)} />
        <p class="hint">Comma-separated. Agents holding it claim cards here. Saves when you leave the field.</p>
      </div>
      {#if caps.length >= 2}
        <div class="seg" role="group" aria-label="How the capabilities combine" style="align-self: end;">
          <button aria-pressed={!stage.requires?.any} type="button" onclick={() => model.setMatch(stage, 'all')}>Needs all</button>
          <button aria-pressed={!!stage.requires?.any} type="button" onclick={() => model.setMatch(stage, 'any')}>Any one</button>
        </div>
      {:else}
        <p class="hint" style="align-self: end;">With two or more capabilities, choose “needs all” or “any one” here.</p>
      {/if}
    {/if}
    <div class="field"><label for="st-wip-{k}">WIP limit</label><input class="input" id="st-wip-{k}" type="number" placeholder="No limit" min="0" value={stage.wipLimit ?? ''} oninput={(e) => (stage.wipLimit = e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value))} /></div>
    <div class="field">
      <span class="lbl">Approval</span>
      <label class="check"><input type="checkbox" checked={stage.gate === 'approval'} onchange={(e) => (stage.gate = e.currentTarget.checked ? 'approval' : undefined)} /><span>Approval gate — a person approves before a card leaves this stage</span></label>
    </div>
    <div class="field full">
      <label for="st-rule-{k}">Standing rule for this stage</label>
      <textarea class="input" id="st-rule-{k}" value={stage.instructions ?? ''} onblur={(e) => void model.saveRule(stage, e.currentTarget.value)}></textarea>
      {#if saved !== undefined}<p class="saved"><LineIcon name="check" size={16} />Rule saved · {ago(saved, model.now)}</p>{/if}
    </div>
    <div class="stage-foot">
      <Button variant="secondary" type="button" aria-label="Move {stage.name} earlier" disabled={index === 0} onclick={() => model.move(index, -1)} icon={ic_arrow_up_16}>Move earlier</Button>
      <Button variant="secondary" type="button" aria-label="Move {stage.name} later" disabled={index === model.draft.length - 1} onclick={() => model.move(index, 1)} icon={ic_arrow_down_16}>Move later</Button>
      <span class="t-meta t-num" style="margin-left: auto;">{cardsHere(cards)}</span>
      <Button variant="danger" type="button" aria-label="Remove stage {stage.name}" disabled={cards > 0 || model.draft.length <= 1} onclick={() => model.removeStage(stage.key)} icon={ic_trash_16}>Remove stage</Button>
    </div>
    <p class="hint full">A stage holding cards cannot be removed until they are moved; the last stage cannot be removed.</p>
  </div>
</details>
