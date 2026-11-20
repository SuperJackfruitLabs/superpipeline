<!-- apps/web/src/lib/components/workspace/CapabilitiesTable.svelte -->
<script lang="ts">
  /**
   * Crew's Capabilities tab: one table (capability, description, held by, asked for by, actions).
   * Describing, implying and removing live under each row's actions menu; a form opens above the
   * table for the first two. A capability no board asks for, or no agent holds, gets a note.
   */
  import { Button, DataTable, Face, LoadMore, Menu, type Column, type MenuItem } from '@superjackfruitlabs/vibekit-ui';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import { autogrow } from '$lib/autogrow';
  import type { CapabilityRecord } from '$lib/api';
  import { CapabilitiesModel } from './capabilities-model.svelte';
  import { agentCountText, holdersOf, INFERRED_TITLE } from './capability-notes';
  import { CREW_NEW_LABEL, onCrewNew, requestCrewNew } from './crew-new';
  import { askedByText, CREW_EMPTY, CREW_FAILED, CREW_LOADING, similarText } from './workspace-words';
  import CrewLoad from './CrewLoad.svelte';
  import NewCapabilityDialog from './dialogs/NewCapabilityDialog.svelte';
  import { rowFocus } from '$lib/focus-row';

  const PAGE = 10;
  const model = new CapabilitiesModel();
  // Loaded during init (ssr is off): the busy mark is held before the first paint.
  void model.refresh();
  let creating = $state(false);
  let limit = $state(PAGE);
  function openNew(): void { model.resetNew(); creating = true; }
  // What the New dialog just made is what the person wants to see: show every row.
  $effect(() => { if (model.lastAdded) limit = Infinity; });
  $effect(() => onCrewNew('capabilities', openNew));

  const shown = $derived(model.rows.slice(0, limit));

  function items(c: CapabilityRecord): MenuItem[] {
    return [
      { label: 'Edit description', onselect: () => model.startDescribe(c) },
      { label: 'Add an implied capability', onselect: () => model.startImply(c.key) },
      ...(c.implies ?? []).map((to) => ({ label: `Stop implying ${to}`, onselect: () => void model.unimply(c.key, to) })),
      { separator: true },
      { label: `Remove ${c.key}`, danger: true, onselect: () => void model.remove(c) },
    ];
  }

  const columns: Column<CapabilityRecord>[] = [
    { key: 'key', label: 'Capability', cell: name },
    { key: 'description', label: 'Description', cell: description },
    { key: 'held', label: 'Held by', cell: held },
    { key: 'asked', label: 'Asked for by', cell: asked },
    { key: 'actions', label: 'Actions', align: 'end', cell: actions },
  ];
  /** The rows, for focus after "Show N more" (the first new row). */
  let rowsEl = $state<HTMLElement | null>(null);
</script>

{#snippet name(c: CapabilityRecord)}
  <span class="crew-cap"><b>{c.key}</b>{#if c.origin === 'inferred'}<span class="crew-chip" title={INFERRED_TITLE}>inferred</span>{/if}{#each c.implies ?? [] as to (to)}<span class="crew-chip">implies {to}</span>{/each}</span>
{/snippet}
{#snippet description(c: CapabilityRecord)}{#if c.description}<span class="crew-desc" data-desc>{c.description}</span>{:else}<span class="crew-muted">No description</span>{/if}{/snippet}
{#snippet held(c: CapabilityRecord)}
  <span class="crew-held"><span class="crew-stack" aria-hidden="true">{#each holdersOf(c, model.agents).slice(0, 4) as a (a.id)}<Face id={a.name} label={a.name} mood="resting" size={24} src={a.iconUrl ?? undefined} ring />{/each}</span>{agentCountText(c.agentCount)}</span>
{/snippet}
{#snippet asked(c: CapabilityRecord)}{askedByText(c.boardCount)}{/snippet}
{#snippet actions(c: CapabilityRecord)}
  <Menu label="Actions for {c.key}" items={items(c)} width={280}>
    {#snippet trigger(props)}<button {...props} type="button" class="vk-button vk-button--quiet crew-act" aria-label="Actions for {c.key}"><LineIcon name="dots" size={20} /></button>{/snippet}
  </Menu>
{/snippet}
{#snippet empty()}
  <div class="crew-empty"><p>{CREW_EMPTY.capabilities}</p><Button onclick={() => requestCrewNew('capabilities')}>{CREW_NEW_LABEL.capabilities}</Button></div>
{/snippet}

<CrewLoad phase={model.load.phase} loading={CREW_LOADING.capabilities} failed={CREW_FAILED.capabilities} onRetry={() => model.retry()}>
  {#if model.notes.length > 0}
    <ul class="crew-notes">
      {#each model.notes as n (n.key)}<li><strong>{n.key}</strong> {n.text} <a href={n.link.href}>{n.link.label}</a>{n.tail}</li>{/each}
    </ul>
  {/if}
  {#if model.similar.length > 0}<p class="crew-hint" role="status">{similarText(model.similar)}</p>{/if}
  {#if model.error}<p class="crew-error" role="alert">{model.error}</p>{/if}
  {#if model.describing}
    <form class="crew-form" aria-label="Describe {model.describing}" onsubmit={(e) => { e.preventDefault(); void model.saveDescribe(); }}>
      <div class="crew-field crew-wide">
        <label for="cd-{model.describing}">Description of {model.describing}</label>
        <textarea class="vk-field__input crew-grow" id="cd-{model.describing}" rows="1" placeholder="Add a description" use:autogrow={model.describeText} bind:value={model.describeText}></textarea>
      </div>
      <div class="crew-form-acts crew-wide">
        <Button type="submit">Save</Button>
        <Button variant="quiet" onclick={() => (model.describing = null)}>Cancel</Button>
      </div>
    </form>
  {:else if model.implyingFor}
    <form class="crew-form" aria-label="Add an implied capability to {model.implyingFor}" onsubmit={(e) => { e.preventDefault(); void model.imply(model.implyingFor!); }}>
      <div class="crew-field">
        <label for="im-{model.implyingFor}">{model.implyingFor} implies</label>
        <input class="vk-field__input" id="im-{model.implyingFor}" placeholder="e.g. analysis" bind:value={model.implyTo} />
        <p class="crew-hint">An agent holding {model.implyingFor} also counts as holding this one.</p>
      </div>
      <div class="crew-form-acts crew-wide">
        <Button type="submit">Add</Button>
        <Button variant="quiet" onclick={() => (model.implyingFor = null)}>Cancel</Button>
      </div>
    </form>
  {/if}
  <div bind:this={rowsEl}><DataTable label="Capabilities" {columns} rows={shown} rowKey={(c) => c.id} {empty} /></div>
  {#if model.rows.length > PAGE}
    <LoadMore shown={shown.length} total={model.rows.length} label="Show {Math.min(PAGE, model.rows.length - shown.length)} more" onmore={() => { limit += PAGE; }} focusTarget={(i) => rowFocus(rowsEl, i)} />
  {/if}
</CrewLoad>

<NewCapabilityDialog bind:open={creating} {model} />
