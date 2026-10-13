<!-- apps/web/src/lib/components/workspace/LabelManager.svelte -->
<script lang="ts">
  import { Button } from '@superjackfruit/vibekit';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import { showsInferredBadge } from './label-manager';
  import { LabelsModel } from './labels-model.svelte';
  import { labelsHeading } from './workspace-words';
  import ColourPicker from './ColourPicker.svelte';
  import PanelTag from './PanelTag.svelte';
  import type { WorkspaceTabProps } from './types';

  let { review }: WorkspaceTabProps = $props();
  const model = new LabelsModel();
  let picker: ColourPicker;
  // Loaded during init (ssr is off): the busy mark is held before the first paint.
  void model.refresh();
</script>

<section class="panel" aria-labelledby="lt-h">
  <div class="panel-head" style="flex-direction: column; align-items: flex-start;">
    {#if review}<PanelTag text={review.tag} />{/if}
    <h2 class="t-h2" id="lt-h">{model.labels === null ? 'Labels' : labelsHeading(model.labels.length)}</h2>
    <p class="t-meta">Renames save when you leave the field. “Inferred” means a card created it.</p>
  </div>
  {#if model.labels === null}
    <p class="panel-body t-meta" role="status">Loading labels…</p>
  {:else}
    <ul style="list-style: none; margin: 0px; padding: 0px;">
      {#each model.labels as l (l.id)}
        <li class="lrow">
          <button class="swatch" aria-label="Colour of {l.name}" type="button" style="background: {l.colour};" onclick={() => picker.open((c) => void model.recolour(l, c))}></button>
          <span><label class="sr" for="lb-{l.name}">Name</label><input class="input" id="lb-{l.name}" value={l.name} style="min-height: 40px;" onblur={(e) => void model.rename(l, e.currentTarget.value)} onkeydown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} /></span>
          {#if showsInferredBadge(l.origin)}<span class="chip chip-line">inferred</span>{:else}<span></span>{/if}
          <button class="iconbtn" aria-label="Remove label {l.name}" type="button" disabled={model.removing === l.id} onclick={() => void model.remove(l)}><LineIcon name="trash" /></button>
        </li>
      {/each}
    </ul>
  {/if}
  <form class="panel-body" style="border-top: 1px solid var(--vk-color-line); display: flex; gap: var(--vk-space-2); align-items: flex-end;" onsubmit={(e) => { e.preventDefault(); void model.add(); }}>
    <button class="swatch" aria-label="Colour of the new label" type="button" style="background: {model.newColour ?? 'var(--vk-mood-needs)'}; margin-bottom: 6px;" onclick={() => picker.open((c) => (model.newColour = c))}></button>
    <div class="field" style="flex: 1 1 0%;"><label for="lb-new">New label</label><input class="input" id="lb-new" placeholder="Name" bind:value={model.newName} /></div>
    <Button variant="secondary" class="btn-sm" type="submit" aria-disabled={model.creating ? 'true' : undefined}>Add</Button>
    <span class="sr" role="status">{model.creating ? 'Adding the label…' : ''}</span>
  </form>
  {#if model.error}<p class="hint" role="alert" style="padding: 0 var(--vk-space-5) var(--vk-space-4); color: var(--vk-color-signal-text);">{model.error}</p>{/if}
  <ColourPicker bind:this={picker} />
</section>
