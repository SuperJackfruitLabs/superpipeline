<!-- apps/web/src/lib/components/workspace/studio/LabelsStudio.svelte -->
<script lang="ts">
  import { autogrow } from '$lib/autogrow';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import { showsInferredBadge } from '../label-manager';
  import { LabelsModel } from '../labels-model.svelte';
  import { labelsHeading } from '../workspace-words';
  import ColourPicker from '../ColourPicker.svelte';
  import type { WorkspaceTabProps } from '../types';

  let { review }: WorkspaceTabProps = $props();
  const model = new LabelsModel();
  let picker: ColourPicker;
  // Loaded during init (ssr is off): the busy mark is held before the first paint.
  void model.refresh();
</script>

<section class="ar-sec" aria-labelledby="lt-h">
  <div class="hd"><span class="no">{review?.no ?? '01'}</span>{#if review}<span class="kick">{review.tag}</span>{/if}<h2 id="lt-h">{model.labels === null ? 'Labels' : labelsHeading(model.labels.length)}</h2></div>
  <p class="wo-lede">Renames save when you leave the field. “Inferred” means a card created it.</p>
  {#if model.labels === null}
    <p class="ar-hint" role="status">Loading labels…</p>
  {:else}
    <table class="ar-tbl wo-tbl">
      <caption class="sr">Labels</caption>
      <thead><tr><th style="width: 60px;" scope="col">Colour</th><th scope="col">Name</th><th style="width: 96px;" scope="col">Origin</th><th style="width: 54px;" scope="col"><span class="sr">Remove</span></th></tr></thead>
      <tbody>
        {#each model.labels as l (l.id)}
          <tr>
            <td><button class="wo-sw" aria-label="Colour of {l.name}" type="button" style="background: {l.colour};" onclick={() => picker.open((c) => void model.recolour(l, c), l.name)}></button></td>
            <td><label class="sr" for="lb-{l.name}">Name</label><textarea class="ar-in grow" id="lb-{l.name}" rows="1" use:autogrow={l.name} value={l.name} onblur={(e) => void model.rename(l, e.currentTarget.value)} onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}></textarea></td>
            <td>{#if showsInferredBadge(l.origin)}<span class="wo-tag">inferred</span>{/if}</td>
            <td><button class="ar-ib wo-del" aria-label="Remove label {l.name}" type="button" disabled={model.removing === l.id} onclick={() => void model.remove(l)}><LineIcon name="trash" stroke={1.75} /></button></td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
  <form class="wo-add" onsubmit={(e) => { e.preventDefault(); void model.add(); }}>
    <button class="wo-sw" aria-label="Colour of the new label" type="button" style="background: {model.newColour ?? 'var(--vk-mood-needs)'}; margin-bottom: 8px;" onclick={() => picker.open((c) => (model.newColour = c), 'the new label')}></button>
    <div class="ar-field"><label for="lb-new">New label</label><input class="ar-in" id="lb-new" placeholder="Name" bind:value={model.newName} /></div>
    <button class="ar-btn2" type="submit" disabled={model.creating}>Add</button>
    {#if model.error}<p class="ar-hint" role="alert">{model.error}</p>{/if}
  </form>
  <ColourPicker bind:this={picker} />
</section>
