<!-- apps/web/src/lib/components/settings/LabelsTable.svelte -->
<script lang="ts">
  /**
   * Labels as a compact table (composition contract, Settings): colour and name, origin ("you" or
   * "inferred"), used on N cards, Remove. A name is words at rest; clicking it turns that one cell into
   * a field (Enter or leaving it saves through the labels model, Escape cancels). Paged with "Show N
   * more". In the workspace scope New label is the section's one action; in a board's scope the table
   * lists the labels that board's cards carry and has no action of its own.
   *
   * "Used on" is counted from `cards` (a card's `labels` are label ids): the open board's cards. The
   * API has no per-label count across boards, so the section's line says which board was counted.
   */
  import { tick } from 'svelte';
  import { Button, DataTable, Field, LoadMore, SectionHeader, type Column } from '@superjackfruitlabs/vibekit-ui';
  import type { Card, Label } from '$lib/api';
  import SkeletonRows from '$lib/components/parts/SkeletonRows.svelte';
  import LoadFailed from '$lib/components/parts/LoadFailed.svelte';
  import ColourPicker from '$lib/components/workspace/ColourPicker.svelte';
  import type { LabelsModel } from '$lib/components/workspace/labels-model.svelte';
  import { labelsHeading } from '$lib/components/workspace/workspace-words';
  import { labelOrigin, labelsMeta, labelUse, LABELS_PAGE, showMore, usedOn } from './settings-words';
  import { rowFocus } from '$lib/focus-row';

  let { model, scope = 'workspace', cards = null, boardName = null, n }: {
    model: LabelsModel;
    scope?: 'workspace' | 'board';
    /** The cards "used on" counts from; null when no board is open (no counts). */
    cards?: Pick<Card, 'labels' | 'archivedAt'>[] | null;
    boardName?: string | null;
    /** The section's ordinal (Studio and Paper draw it). */
    n: number;
  } = $props();

  const use = $derived(cards ? labelUse(cards) : null);
  const rows = $derived.by(() => {
    const all = model.labels ?? [];
    return scope === 'board' ? all.filter((l) => (use?.[l.id] ?? 0) > 0) : all;
  });
  let expanded = $state(false);
  const shown = $derived(expanded ? rows : rows.slice(0, LABELS_PAGE));

  let picker: ColourPicker;
  let editing = $state<string | null>(null);
  let cancelled = false;
  let adding = $state(false);

  async function startRename(l: Label): Promise<void> {
    editing = l.id;
    cancelled = false;
    await tick();
    (document.getElementById(`lb-${l.id}`) as HTMLInputElement | null)?.focus();
  }
  async function finishRename(l: Label, value: string): Promise<void> {
    if (editing !== l.id) return;
    editing = null;
    if (cancelled) return;
    await model.rename(l, value);
  }
  function onkey(e: KeyboardEvent, l: Label): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.currentTarget as HTMLInputElement).blur();
      // The field leaves with the blur: focus goes back to the name, not to the page.
      void tick().then(() => document.getElementById(`lb-name-${l.id}`)?.focus());
    }
    else if (e.key === 'Escape') { e.preventDefault(); cancelled = true; editing = null; void tick().then(() => document.getElementById(`lb-name-${l.id}`)?.focus()); }
  }
  async function add(): Promise<void> {
    await model.add();
    if (!model.error) adding = false;
  }

  const columns: Column<Label>[] = [
    { key: 'name', label: 'Label', cell: name },
    { key: 'origin', label: 'Origin', cell: origin },
    { key: 'used', label: 'Used on', cell: used },
    { key: 'actions', label: 'Actions', align: 'end', cell: actions },
  ];
  /** The rows, for focus after "Show N more" (the first new row). */
  let rowsEl = $state<HTMLElement | null>(null);
</script>

{#snippet name(l: Label)}
  <span class="set-label">
    <button class="set-swatch" type="button" aria-label="Colour of {l.name}" style:--sw={l.colour} onclick={() => picker.open((c) => void model.recolour(l, c), l.name)}></button>
    {#if editing === l.id}
      <span class="set-rename" style:--n={l.name.length}><Field id="lb-{l.id}" label="Name of {l.name}" labelHidden value={l.name} onblur={(e) => void finishRename(l, (e.currentTarget as HTMLInputElement).value)} onkeydown={(e) => onkey(e, l)} /></span>
    {:else}
      <button class="set-name" id="lb-name-{l.id}" type="button" aria-label="Rename {l.name}" onclick={() => void startRename(l)}>{l.name}</button>
    {/if}
  </span>
{/snippet}
{#snippet origin(l: Label)}{labelOrigin(l.origin)}{/snippet}
{#snippet used(l: Label)}{use ? usedOn(use[l.id] ?? 0) : ''}{/snippet}
{#snippet actions(l: Label)}
  <Button variant="quiet" type="button" aria-label="Remove label {l.name}" disabled={model.removing === l.id} onclick={() => void model.remove(l)}>Remove</Button>
{/snippet}
{#snippet empty()}<p class="set-empty">{scope === 'board' ? 'No card on this board carries a label yet.' : labelsHeading(0)}</p>{/snippet}
{#snippet newLabel()}
  {#if scope === 'workspace'}<Button variant="secondary" type="button" aria-expanded={adding} onclick={() => (adding = !adding)}>New label</Button>{/if}
{/snippet}

<section class="set-sec">
  <SectionHeader {n} title="Labels" meta={labelsMeta(scope, boardName)} action={newLabel} />
  {#if adding && scope === 'workspace'}
    <form class="set-form" aria-label="New label" onsubmit={(e) => { e.preventDefault(); void add(); }}>
      <button class="set-swatch" type="button" aria-label="Colour of the new label" style:--sw={model.newColour ?? 'var(--vk-mood-needs)'} onclick={() => picker.open((c) => (model.newColour = c), 'the new label')}></button>
      <Field id="lb-new" label="New label name" labelHidden placeholder="Name" bind:value={model.newName} />
      <Button variant="secondary" type="submit" busy={model.creating}>Add</Button>
      <Button variant="quiet" type="button" onclick={() => (adding = false)}>Cancel</Button>
      <span class="sr" role="status">{model.creating ? 'Adding the label…' : ''}</span>
    </form>
  {/if}
  {#if model.load.phase === 'failed'}
    <LoadFailed message="Couldn't load labels." onRetry={() => model.retry()} />
  {:else if model.labels === null}
    <SkeletonRows label="Loading labels…" rows={4} rowHeight={48} slow={model.load.phase === 'slow'} onRetry={() => model.retry()} />
  {:else}
    <div bind:this={rowsEl}><DataTable label="Labels" {columns} rows={shown} rowKey={(l) => l.id} {empty} /></div>
    {#if !expanded && rows.length > LABELS_PAGE}
      <LoadMore shown={shown.length} total={rows.length} label={showMore(rows.length - shown.length)} onmore={() => { expanded = true; }} focusTarget={(i) => rowFocus(rowsEl, i)} />
    {/if}
  {/if}
  {#if model.error}<p class="set-error" role="alert">{model.error}</p>{/if}
  <ColourPicker bind:this={picker} />
</section>
